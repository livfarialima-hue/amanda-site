import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const MANIFEST_PATH = "netlify/functions/lib/bruna-policy/manifest.json";
const GOVERNANCE_PATH = "docs/GOVERNANCA-OPERACIONAL-LOCAL-E-DRIVE.md";
const OPERATIONS_PATH = "docs/whatsapp-clinica-liv-operacao.md";
const EXECUTIVE_PLAN_PATH = "docs/PLANO-EXECUTIVO-AUDITORIAS-E-PENDENCIAS.md";
const ATTRIBUTES_PATH = ".gitattributes";

function readUtf8(root, path) {
  return readFileSync(join(root, path), "utf8").replace(/\r\n/g, "\n");
}

function sha256File(root, path) {
  return createHash("sha256")
    .update(readFileSync(join(root, path)))
    .digest("hex");
}

function collectMarkdown(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return collectMarkdown(path);
    return entry.isFile() && entry.name.toLowerCase().endsWith(".md")
      ? [path]
      : [];
  });
}

function runGit(root, args) {
  const result = spawnSync("git", args, {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
  });
  return {
    ok: result.status === 0,
    output: String(result.stdout || "").trim(),
    error: String(result.stderr || "").trim(),
  };
}

function isFullSha(value) {
  return /^[0-9a-f]{40}$/.test(String(value || ""));
}

function isDeployId(value) {
  return /^[0-9a-f]{24}$/.test(String(value || ""));
}

export function validateOperationalConsistency({
  root = process.cwd(),
  checkGit = true,
} = {}) {
  const absoluteRoot = resolve(root);
  const errors = [];
  const warnings = [];
  const checks = [];
  const fail = (code, message) => errors.push({ code, message });
  const pass = (code, message) => checks.push({ code, message });

  const requiredPaths = [
    MANIFEST_PATH,
    GOVERNANCE_PATH,
    OPERATIONS_PATH,
    EXECUTIVE_PLAN_PATH,
    ATTRIBUTES_PATH,
    "scripts/reconcile-local-release.ps1",
    "package.json",
  ];
  for (const path of requiredPaths) {
    if (!existsSync(join(absoluteRoot, path))) {
      fail("MISSING_REQUIRED_FILE", `Arquivo obrigatório ausente: ${path}`);
    }
  }
  if (errors.length) return { ok: false, status: "BLOCKED", errors, warnings, checks };

  let manifest;
  try {
    manifest = JSON.parse(readUtf8(absoluteRoot, MANIFEST_PATH));
  } catch (error) {
    fail("INVALID_MANIFEST", `Manifesto inválido: ${error.message}`);
    return { ok: false, status: "BLOCKED", errors, warnings, checks };
  }

  const version = manifest.bundleVersion;
  if (
    manifest.promptVersion !== `bruna-concierge-${version}` ||
    manifest.knowledgeSnapshot !== `kb-${version}`
  ) {
    fail(
      "VERSION_DIVERGENCE",
      "bundleVersion, promptVersion e knowledgeSnapshot não representam a mesma versão.",
    );
  } else {
    pass("VERSION_ALIGNED", `Pacote Bruna alinhado na versão ${version}.`);
  }

  const release = manifest.release || {};
  const documentation = manifest.documentation || {};
  for (const [field, value] of [
    ["functionalCommit", release.functionalCommit],
    ["lastObservedProductionCommit", release.lastObservedProductionCommit],
    ["rollbackCommit", release.rollbackCommit],
  ]) {
    if (!isFullSha(value)) fail("INVALID_COMMIT", `${field} precisa conter SHA completo.`);
  }
  for (const [field, value] of [
    ["functionalDeployId", release.functionalDeployId],
    ["lastObservedProductionDeployId", release.lastObservedProductionDeployId],
    ["rollbackDeployId", release.rollbackDeployId],
  ]) {
    if (!isDeployId(value)) fail("INVALID_DEPLOY", `${field} precisa conter o ID exato do deploy.`);
  }
  if (release.status !== "published") {
    fail("RELEASE_NOT_PUBLISHED", "O recibo técnico não está marcado como published.");
  }

  const canonicalPath = documentation.canonicalLocalPath;
  if (!canonicalPath || !existsSync(join(absoluteRoot, canonicalPath))) {
    fail("CANONICAL_MANUAL_MISSING", "O manual canônico registrado não existe.");
  } else {
    const canonical = readUtf8(absoluteRoot, canonicalPath);
    if (!canonical.includes(`**Versão:** ${version}`)) {
      fail("MANUAL_VERSION_DIVERGENCE", "A versão do manual não coincide com o manifesto.");
    }
    if (!canonical.includes(documentation.driveActiveFileId || "__missing__")) {
      fail("DRIVE_ID_DIVERGENCE", "O manual não aponta para o arquivo ativo registrado no Drive.");
    }
    const localHash = sha256File(absoluteRoot, canonicalPath);
    if (localHash !== documentation.driveProjectionSha256) {
      fail(
        "DRIVE_PROJECTION_HASH_DIVERGENCE",
        "O manual local mudou depois da última igualdade registrada com a projeção do Drive.",
      );
    } else {
      pass("DRIVE_PROJECTION_RECEIPT", `Hash da projeção ativa: ${localHash}.`);
    }
  }

  const activeMarker =
    "> **Fonte canônica:** este arquivo versionado é o único manual ativo do comportamento da Bruna.";
  const activeManuals = collectMarkdown(join(absoluteRoot, "docs"))
    .filter((path) => readFileSync(path, "utf8").includes(activeMarker))
    .map((path) => relative(absoluteRoot, path).replace(/\\/g, "/"));
  if (activeManuals.length !== 1 || activeManuals[0] !== canonicalPath) {
    fail(
      "ACTIVE_MANUAL_DUPLICATE",
      `Esperado um único manual ativo em ${canonicalPath}; encontrados: ${activeManuals.join(", ") || "nenhum"}.`,
    );
  } else {
    pass("SINGLE_ACTIVE_MANUAL", `Manual ativo único: ${canonicalPath}.`);
  }

  const operations = readUtf8(absoluteRoot, OPERATIONS_PATH);
  const executivePlan = readUtf8(absoluteRoot, EXECUTIVE_PLAN_PATH);
  for (const [label, content] of [
    ["manual operacional", operations],
    ["plano executivo", executivePlan],
  ]) {
    for (const [field, value] of [
      ["commit funcional", release.functionalCommit?.slice(0, 7)],
      ["deploy funcional", release.functionalDeployId],
      ["commit de rollback", release.rollbackCommit?.slice(0, 7)],
      ["deploy de rollback", release.rollbackDeployId],
    ]) {
      if (!value || !content.includes(value)) {
        fail("RELEASE_RECORD_DIVERGENCE", `${label} não contém ${field} registrado no manifesto.`);
      }
    }
  }

  const governance = readUtf8(absoluteRoot, GOVERNANCE_PATH);
  if (!governance.includes("npm.cmd run ops:check")) {
    fail("GOVERNANCE_GATE_MISSING", "A governança não documenta o gate ops:check.");
  }

  const attributes = readUtf8(absoluteRoot, ATTRIBUTES_PATH);
  if (!attributes.includes("* text=auto eol=lf") || !attributes.includes("*.zip binary")) {
    fail("LINE_ENDING_POLICY_MISSING", ".gitattributes não contém a política esperada.");
  } else {
    pass("LINE_ENDINGS_GOVERNED", "Política versionada: textos em LF e binários protegidos.");
  }

  const rootArtifacts = readdirSync(absoluteRoot, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isFile() &&
        (/^\.codex-sync-.*\.zip$/i.test(entry.name) ||
          /^clinica-liv-release-.*\.zip$/i.test(entry.name)),
    )
    .map((entry) => entry.name);
  if (rootArtifacts.length) {
    fail(
      "ROOT_RELEASE_ARTIFACT",
      `Pacotes temporários devem sair da raiz: ${rootArtifacts.join(", ")}.`,
    );
  } else {
    pass("ROOT_WITHOUT_RELEASE_PACKAGES", "Nenhum pacote transitório na raiz.");
  }

  if (checkGit) {
    const branch = runGit(absoluteRoot, ["rev-parse", "--abbrev-ref", "HEAD"]);
    const status = runGit(absoluteRoot, ["status", "--porcelain=v1"]);
    const observedAncestor = runGit(absoluteRoot, [
      "merge-base",
      "--is-ancestor",
      release.lastObservedProductionCommit,
      "HEAD",
    ]);
    if (!branch.ok || branch.output !== "reestruturacao-site") {
      fail("WRONG_BRANCH", `Branch esperada: reestruturacao-site; atual: ${branch.output || branch.error}.`);
    }
    if (!observedAncestor.ok) {
      fail(
        "LOCAL_HEAD_DIVERGENCE",
        `A branch local não contém a última produção observada ${release.lastObservedProductionCommit}.`,
      );
    }
    if (!status.ok || status.output) {
      fail("DIRTY_WORKTREE", "O worktree precisa estar limpo no fechamento do release.");
    }
    if (!errors.some((item) => ["WRONG_BRANCH", "LOCAL_HEAD_DIVERGENCE", "DIRTY_WORKTREE"].includes(item.code))) {
      pass("GIT_RELEASE_EQUALITY", "Branch contém a última produção observada e o worktree está limpo.");
    }
  } else {
    warnings.push({
      code: "GIT_CHECK_SKIPPED",
      message: "Comparação de branch, HEAD e worktree foi omitida nesta execução.",
    });
  }

  const syncPending = errors.some((item) =>
    [
      "DRIVE_PROJECTION_HASH_DIVERGENCE",
      "LOCAL_HEAD_DIVERGENCE",
      "DIRTY_WORKTREE",
      "WRONG_BRANCH",
    ].includes(item.code),
  );
  return {
    ok: errors.length === 0,
    status: errors.length === 0 ? "OK" : syncPending ? "SYNC_PENDING" : "BLOCKED",
    errors,
    warnings,
    checks,
  };
}

function printResult(result) {
  console.log(`OPS_CHECK_STATUS=${result.status}`);
  for (const item of result.checks) console.log(`OK ${item.code}: ${item.message}`);
  for (const item of result.warnings) console.warn(`WARN ${item.code}: ${item.message}`);
  for (const item of result.errors) console.error(`ERROR ${item.code}: ${item.message}`);
}

const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isMain) {
  const result = validateOperationalConsistency({
    root: process.cwd(),
    checkGit: !process.argv.includes("--skip-git"),
  });
  printResult(result);
  process.exit(result.ok ? 0 : result.status === "SYNC_PENDING" ? 2 : 1);
}
