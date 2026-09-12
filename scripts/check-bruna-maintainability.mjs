import {
  existsSync,
  readFileSync,
  readdirSync,
} from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const PROJECT_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const MODULE_MAP_PATH = "ops/BRUNA-MODULE-MAP.json";
const CHANGE_CANDIDATE_PATH = "ops/CHANGE-CANDIDATE.json";

function normalizePath(value) {
  return String(value || "").trim().replaceAll("\\", "/").replace(/^\.\//, "");
}

function uniqueSorted(values) {
  return [...new Set(values.map(normalizePath).filter(Boolean))].sort();
}

function readJson(root, relativePath) {
  return JSON.parse(readFileSync(path.resolve(root, relativePath), "utf8"));
}

function git(root, args) {
  const result = spawnSync("git", args, {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
  });
  return {
    ok: result.status === 0,
    status: result.status,
    stdout: String(result.stdout || "").trim(),
    stderr: String(result.stderr || "").trim(),
  };
}

function statusPath(line) {
  const raw = String(line || "").slice(3).trim();
  return normalizePath(raw.includes(" -> ") ? raw.split(" -> ").at(-1) : raw);
}

export function collectCurrentChanges(root, moduleMap) {
  const remoteRef = `${moduleMap.remote}/${moduleMap.canonicalBranch}`;
  const mergeBase = git(root, ["merge-base", "HEAD", remoteRef]);
  if (!mergeBase.ok || !mergeBase.stdout) {
    throw new Error(
      `Nao foi possivel determinar o baseline ${remoteRef}: ${mergeBase.stderr}`,
    );
  }
  const diff = git(root, [
    "diff",
    "--name-only",
    "--diff-filter=ACMRTUXB",
    mergeBase.stdout,
    "--",
  ]);
  const status = git(root, [
    "status",
    "--porcelain=v1",
    "--untracked-files=all",
  ]);
  if (!diff.ok || !status.ok) {
    throw new Error(`Nao foi possivel ler o diff: ${diff.stderr || status.stderr}`);
  }
  const diffPaths = diff.stdout ? diff.stdout.split(/\r?\n/) : [];
  const untracked = status.stdout
    ? status.stdout
        .split(/\r?\n/)
        .filter((line) => line.startsWith("?? "))
        .map(statusPath)
    : [];
  return {
    baseCommit: mergeBase.stdout,
    files: uniqueSorted([...diffPaths, ...untracked]),
  };
}

function collectFiles(directory, root, output = []) {
  if (!existsSync(directory)) return output;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) collectFiles(absolute, root, output);
    else if (entry.isFile()) output.push(normalizePath(path.relative(root, absolute)));
  }
  return output;
}

function importedNamesFromFacade(source, sourcePath, root, facadePath) {
  const names = [];
  const importPattern = /import\s*\{([\s\S]*?)\}\s*from\s*["']([^"']+)["'];?/g;
  for (const match of source.matchAll(importPattern)) {
    const resolved = normalizePath(
      path.relative(
        root,
        path.resolve(root, path.dirname(sourcePath), match[2]),
      ),
    );
    if (resolved !== facadePath) continue;
    for (const rawName of match[1].split(",")) {
      const imported = rawName.trim().split(/\s+as\s+/i)[0];
      if (imported) names.push(imported);
    }
  }
  return names;
}

export function buildOwnershipIndex(moduleMap) {
  const byPath = new Map();
  for (const module of moduleMap.modules || []) {
    for (const file of [...(module.sourceFiles || []), ...(module.testFiles || [])]) {
      const normalized = normalizePath(file);
      if (!byPath.has(normalized)) byPath.set(normalized, []);
      byPath.get(normalized).push(module.id);
    }
  }
  return byPath;
}

export function validateBrunaMaintainability({
  root = PROJECT_ROOT,
  moduleMap,
  baselineModuleMap,
  candidate,
  changedFiles = [],
  readText = (relativePath) => readFileSync(path.resolve(root, relativePath), "utf8"),
  fileExists = (relativePath) => existsSync(path.resolve(root, relativePath)),
  sourceInventory,
} = {}) {
  const errors = [];
  const checks = [];
  const fail = (code, message) => errors.push({ code, message });
  const pass = (code, message) => checks.push({ code, message });

  if (!moduleMap || moduleMap.schemaVersion !== 1) {
    fail("BRUNA_MODULE_MAP_SCHEMA_INVALID", "Mapa de modulos precisa usar schemaVersion 1.");
    return { ok: false, errors, checks, changedModules: [], recommendedTests: [] };
  }
  if (!/^[a-z0-9][a-z0-9-]+$/.test(moduleMap.canonicalBranch || "")) {
    fail("BRUNA_CANONICAL_BRANCH_INVALID", "Branch canonica ausente ou invalida.");
  }
  if (!Array.isArray(moduleMap.modules) || moduleMap.modules.length === 0) {
    fail("BRUNA_MODULES_EMPTY", "O mapa precisa declarar pelo menos um modulo.");
  }

  const ids = new Set();
  const sourceOwners = new Map();
  const ownership = buildOwnershipIndex(moduleMap);
  for (const module of moduleMap.modules || []) {
    if (!module.id || ids.has(module.id)) {
      fail("BRUNA_MODULE_ID_DUPLICATE", `Modulo ausente ou repetido: ${module.id || "vazio"}.`);
      continue;
    }
    ids.add(module.id);
    const sources = uniqueSorted(module.sourceFiles || []);
    const tests = uniqueSorted(module.testFiles || []);
    if (!sources.length || !tests.length) {
      fail(
        "BRUNA_MODULE_CONTRACT_INCOMPLETE",
        `${module.id} precisa declarar arquivos fonte e testes focados.`,
      );
    }
    if (!sources.includes(normalizePath(module.ownerFile))) {
      fail("BRUNA_OWNER_OUTSIDE_MODULE", `${module.id}: ownerFile precisa pertencer ao modulo.`);
    }
    for (const source of sources) {
      const previous = sourceOwners.get(source);
      if (previous) {
        fail(
          "BRUNA_SOURCE_OWNER_DUPLICATE",
          `${source} pertence simultaneamente a ${previous} e ${module.id}.`,
        );
      } else {
        sourceOwners.set(source, module.id);
      }
      if (!fileExists(source)) fail("BRUNA_SOURCE_MISSING", `${module.id}: ausente ${source}.`);
    }
    for (const testFile of tests) {
      if (!fileExists(testFile)) fail("BRUNA_TEST_MISSING", `${module.id}: ausente ${testFile}.`);
    }
    for (const budget of module.growthBudgets || []) {
      const budgetPath = normalizePath(budget.path);
      if (!sources.includes(budgetPath) || !Number.isInteger(budget.maxLines) || budget.maxLines < 1) {
        fail("BRUNA_GROWTH_BUDGET_INVALID", `${module.id}: limite invalido para ${budgetPath}.`);
        continue;
      }
      if (!fileExists(budgetPath)) continue;
      const normalizedSource = readText(budgetPath).replace(/\r\n/g, "\n");
      const lines = normalizedSource ? normalizedSource.split("\n").length : 0;
      if (lines > budget.maxLines) {
        fail(
          "BRUNA_MONOLITH_GROWTH_LIMIT",
          `${budgetPath} tem ${lines} linhas; limite arquitetural ${budget.maxLines}. Extraia uma responsabilidade antes de ampliar.`,
        );
      }
    }
  }

  if (baselineModuleMap?.schemaVersion === 1) {
    const baselineOwnership = buildOwnershipIndex(baselineModuleMap);
    for (const [protectedPath] of baselineOwnership) {
      if (fileExists(protectedPath) && !ownership.has(protectedPath)) {
        fail(
          "BRUNA_SOURCE_PROTECTION_REMOVED",
          `${protectedPath} continua no repositorio, mas saiu do mapa protegido.`,
        );
      }
    }

    const currentBudgets = new Map(
      (moduleMap.modules || []).flatMap((module) =>
        (module.growthBudgets || []).map((budget) => [
          normalizePath(budget.path),
          budget.maxLines,
        ]),
      ),
    );
    for (const baselineModule of baselineModuleMap.modules || []) {
      for (const budget of baselineModule.growthBudgets || []) {
        const budgetPath = normalizePath(budget.path);
        if (!fileExists(budgetPath)) continue;
        if (!currentBudgets.has(budgetPath)) {
          fail(
            "BRUNA_GROWTH_BUDGET_REMOVED",
            `${budgetPath} continua no repositorio, mas perdeu o limite de crescimento.`,
          );
        } else if (currentBudgets.get(budgetPath) > budget.maxLines) {
          fail(
            "BRUNA_GROWTH_BUDGET_RAISED",
            `${budgetPath} elevou o limite de ${budget.maxLines} para ${currentBudgets.get(budgetPath)}. Extraia uma responsabilidade em vez de ampliar o teto.`,
          );
        }
      }
    }

    const currentPurePolicies = new Set(uniqueSorted(moduleMap.purePolicies || []));
    for (const purePath of uniqueSorted(baselineModuleMap.purePolicies || [])) {
      if (fileExists(purePath) && !currentPurePolicies.has(purePath)) {
        fail(
          "BRUNA_PURE_POLICY_PROTECTION_REMOVED",
          `${purePath} continua no repositorio, mas deixou de ser protegido como politica pura.`,
        );
      }
    }

    const baselineLegacyConsumers = new Set(
      uniqueSorted(baselineModuleMap.compatibilityFacade?.allowedLegacyConsumers || []),
    );
    const newLegacyConsumers = uniqueSorted(
      moduleMap.compatibilityFacade?.allowedLegacyConsumers || [],
    ).filter((consumer) => !baselineLegacyConsumers.has(consumer));
    if (newLegacyConsumers.length) {
      fail(
        "BRUNA_COMPATIBILITY_ALLOWLIST_EXPANDED",
        `Novos consumidores foram liberados na fachada legada: ${newLegacyConsumers.join(", ")}.`,
      );
    }
  }

  for (const purePath of uniqueSorted(moduleMap.purePolicies || [])) {
    if (!fileExists(purePath)) {
      fail("BRUNA_PURE_POLICY_MISSING", `Politica pura ausente: ${purePath}.`);
      continue;
    }
    const source = readText(purePath).toLowerCase().replace(/\s+/g, "");
    for (const marker of moduleMap.forbiddenEffectMarkers || []) {
      const normalizedMarker = String(marker).toLowerCase().replace(/\s+/g, "");
      if (normalizedMarker && source.includes(normalizedMarker)) {
        fail(
          "BRUNA_PURE_POLICY_EFFECT",
          `${purePath} contem marcador de efeito externo proibido: ${marker}.`,
        );
      }
    }
  }

  const facade = moduleMap.compatibilityFacade || {};
  const facadePath = normalizePath(facade.path);
  const ownedExports = new Set(facade.ownedExports || []);
  const allowedLegacy = new Set(uniqueSorted(facade.allowedLegacyConsumers || []));
  const inventory = sourceInventory || collectFiles(
    path.resolve(root, "netlify/functions"),
    root,
  );
  for (const sourcePath of inventory.filter((file) => file.endsWith(".mjs") && !file.endsWith(".test.mjs"))) {
    if (sourcePath === facadePath || !fileExists(sourcePath)) continue;
    const legacyImports = importedNamesFromFacade(
      readText(sourcePath),
      sourcePath,
      root,
      facadePath,
    ).filter((name) => ownedExports.has(name));
    if (legacyImports.length && !allowedLegacy.has(sourcePath)) {
      fail(
        "BRUNA_NEW_COMPATIBILITY_IMPORT",
        `${sourcePath} importa ${legacyImports.join(", ")} pela fachada legada; importe do modulo proprietario.`,
      );
    }
  }

  const changed = uniqueSorted(changedFiles);
  const changedModules = uniqueSorted(
    changed.flatMap((file) => ownership.get(file) || []).filter((id) => ids.has(id)),
  );
  const recommendedTests = uniqueSorted(
    (moduleMap.modules || [])
      .filter((module) => changedModules.includes(module.id))
      .flatMap((module) => module.testFiles || []),
  );
  if (changedModules.length) {
    const baseCommit = String(candidate?.baseCommit || "");
    if (!/^[0-9a-f]{40}$/.test(baseCommit)) {
      fail("BRUNA_ROLLBACK_BASE_MISSING", "Mudanca em modulo protegido exige baseCommit completo.");
    }
    if (!String(candidate?.rollback?.local || "").includes(baseCommit)) {
      fail(
        "BRUNA_ROLLBACK_NOT_PINNED",
        "Rollback local precisa citar literalmente o baseCommit protegido.",
      );
    }
    const declared = new Set(uniqueSorted(candidate?.scope?.files || []));
    const undeclared = changed.filter((file) => sourceOwners.has(file) && !declared.has(file));
    if (undeclared.length) {
      fail(
        "BRUNA_PROTECTED_CHANGE_UNDECLARED",
        `Arquivos protegidos fora do candidato: ${undeclared.join(", ")}.`,
      );
    }
  }

  if (!errors.length) {
    pass("BRUNA_MODULE_MAP_VALID", `${ids.size} modulos protegidos com proprietarios unicos.`);
    pass(
      "BRUNA_GROWTH_BUDGETS_VALID",
      "Arquivos quentes permanecem dentro dos limites de crescimento declarados.",
    );
    pass(
      "BRUNA_PURE_POLICIES_VALID",
      "Politicas puras continuam sem marcadores de efeito externo.",
    );
    pass(
      "BRUNA_COMPATIBILITY_IMPORTS_VALID",
      "Nenhum consumidor novo usa reexportacao legada de politica.",
    );
  }

  return {
    ok: errors.length === 0,
    errors,
    checks,
    changedModules,
    recommendedTests,
  };
}

export function runBrunaMaintainability({ root = PROJECT_ROOT } = {}) {
  const moduleMap = readJson(root, MODULE_MAP_PATH);
  const candidate = readJson(root, CHANGE_CANDIDATE_PATH);
  const changes = collectCurrentChanges(root, moduleMap);
  const baselineResult = git(root, [
    "show",
    `${moduleMap.remote}/${moduleMap.canonicalBranch}:${MODULE_MAP_PATH}`,
  ]);
  const baselineModuleMap = baselineResult.ok
    ? JSON.parse(baselineResult.stdout)
    : null;
  return {
    ...validateBrunaMaintainability({
      root,
      moduleMap,
      baselineModuleMap,
      candidate,
      changedFiles: changes.files,
    }),
    baseCommit: changes.baseCommit,
    changedFiles: changes.files,
  };
}

const isDirectRun = process.argv[1]
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isDirectRun) {
  try {
    const result = runBrunaMaintainability();
    process.stdout.write(
      `BRUNA_MAINTAINABILITY_STATUS=${result.ok ? "OK" : "BLOCKED"}\n`,
    );
    for (const check of result.checks) {
      process.stdout.write(`OK ${check.code}: ${check.message}\n`);
    }
    process.stdout.write(
      `CHANGED_PROTECTED_MODULES=${result.changedModules.join(",") || "none"}\n`,
    );
    if (result.recommendedTests.length) {
      process.stdout.write(
        `FOCUSED_TESTS=node --test ${result.recommendedTests.join(" ")}\n`,
      );
    }
    for (const error of result.errors) {
      process.stderr.write(`ERROR ${error.code}: ${error.message}\n`);
    }
    process.exitCode = result.ok ? 0 : 1;
  } catch (error) {
    process.stderr.write(`BRUNA_MAINTAINABILITY_STATUS=BLOCKED\nERROR ${error.message}\n`);
    process.exitCode = 1;
  }
}
