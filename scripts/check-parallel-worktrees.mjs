import { readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  buildOwnershipIndex,
  collectCurrentChanges,
} from "./check-bruna-maintainability.mjs";

const PROJECT_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

function normalizePath(value) {
  return String(value || "").trim().replaceAll("\\", "/").replace(/^\.\//, "");
}

function uniqueSorted(values) {
  return [...new Set(values.map(normalizePath).filter(Boolean))].sort();
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

function pathsFromStatus(output) {
  return uniqueSorted(
    String(output || "")
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => {
        const raw = line.slice(3).trim();
        return raw.includes(" -> ") ? raw.split(" -> ").at(-1) : raw;
      }),
  );
}

function parseWorktrees(output) {
  const records = [];
  let current = null;
  for (const line of String(output || "").split(/\r?\n/)) {
    if (line.startsWith("worktree ")) {
      if (current) records.push(current);
      current = { path: line.slice(9), head: "", branch: "" };
    } else if (current && line.startsWith("HEAD ")) {
      current.head = line.slice(5);
    } else if (current && line.startsWith("branch ")) {
      current.branch = line.slice(7).replace(/^refs\/heads\//, "");
    }
  }
  if (current) records.push(current);
  return records;
}

function pathsForHead(root, canonicalRef, head) {
  if (!head) return [];
  const merged = git(root, ["merge-base", "--is-ancestor", head, canonicalRef]);
  if (merged.ok) return [];
  const base = git(root, ["merge-base", head, canonicalRef]);
  if (!base.ok || !base.stdout) return [];
  const diff = git(root, [
    "diff",
    "--name-only",
    "--diff-filter=ACMRTUXB",
    `${base.stdout}..${head}`,
    "--",
  ]);
  return diff.ok && diff.stdout ? uniqueSorted(diff.stdout.split(/\r?\n/)) : [];
}

function modulesForPaths(paths, ownership) {
  return uniqueSorted(paths.flatMap((file) => ownership.get(file) || []));
}

export function detectParallelConflicts({
  currentFiles = [],
  plannedModules = [],
  otherWork = [],
  moduleMap,
} = {}) {
  const ownership = buildOwnershipIndex(moduleMap);
  const knownModules = new Set((moduleMap.modules || []).map((module) => module.id));
  const unknownModules = uniqueSorted(plannedModules).filter((id) => !knownModules.has(id));
  const currentPaths = uniqueSorted(currentFiles);
  const currentModules = uniqueSorted([
    ...modulesForPaths(currentPaths, ownership),
    ...plannedModules,
  ]);
  const conflicts = [];

  for (const work of otherWork) {
    const paths = uniqueSorted(work.files || []);
    const modules = modulesForPaths(paths, ownership);
    const exactPaths = currentPaths.filter((file) => paths.includes(file) && ownership.has(file));
    const overlappingModules = currentModules.filter((id) => modules.includes(id));
    if (!exactPaths.length && !overlappingModules.length) continue;
    conflicts.push({
      branch: work.branch || "detached",
      location: work.location || "unknown",
      kind: work.kind || "worktree",
      exactPaths,
      modules: overlappingModules,
    });
  }

  return {
    ok: unknownModules.length === 0 && conflicts.length === 0,
    unknownModules,
    currentModules,
    conflicts,
  };
}

function registeredWork(root, canonicalRef, currentRoot) {
  const listed = git(root, ["worktree", "list", "--porcelain"]);
  if (!listed.ok) throw new Error(`Falha ao listar worktrees: ${listed.stderr}`);
  const output = [];
  for (const record of parseWorktrees(listed.stdout)) {
    if (path.resolve(record.path) === path.resolve(currentRoot)) continue;
    const status = git(record.path, ["status", "--porcelain=v1", "--untracked-files=all"]);
    const dirtyPaths = status.ok ? pathsFromStatus(status.stdout) : [];
    const branchPaths = pathsForHead(root, canonicalRef, record.head);
    const files = uniqueSorted([...dirtyPaths, ...branchPaths]);
    if (!files.length) continue;
    output.push({
      branch: record.branch,
      location: normalizePath(record.path),
      kind: dirtyPaths.length ? "registered-dirty-worktree" : "registered-branch",
      files,
    });
  }
  return output;
}

function recentRemoteWork(root, moduleMap, canonicalRef, excludedBranches) {
  const refs = git(root, [
    "for-each-ref",
    "--format=%(refname:short)|%(objectname)|%(committerdate:unix)",
    `refs/remotes/${moduleMap.remote}/codex/`,
  ]);
  if (!refs.ok || !refs.stdout) return [];
  const nowSeconds = Math.floor(Date.now() / 1000);
  const maxAge = Number(moduleMap.remoteBranchLookbackDays || 14) * 86400;
  const output = [];
  for (const line of refs.stdout.split(/\r?\n/)) {
    const [branch, head, rawTimestamp] = line.split("|");
    if (!branch || !head || excludedBranches.has(branch.replace(`${moduleMap.remote}/`, ""))) continue;
    if (nowSeconds - Number(rawTimestamp || 0) > maxAge) continue;
    const files = pathsForHead(root, canonicalRef, head);
    if (!files.length) continue;
    output.push({
      branch,
      location: branch,
      kind: "recent-remote-branch",
      files,
    });
  }
  return output;
}

export function runParallelCheck({
  root = PROJECT_ROOT,
  plannedModules = [],
  includeRemotes = true,
} = {}) {
  const moduleMap = JSON.parse(
    readFileSync(path.resolve(root, "ops/BRUNA-MODULE-MAP.json"), "utf8"),
  );
  if (includeRemotes) {
    const fetched = git(root, ["fetch", moduleMap.remote]);
    if (!fetched.ok) {
      throw new Error(
        `Falha ao atualizar branches de ${moduleMap.remote}; a verificacao entre PCs nao seria confiavel: ${fetched.stderr}`,
      );
    }
  }
  const canonicalRef = `${moduleMap.remote}/${moduleMap.canonicalBranch}`;
  const currentRootResult = git(root, ["rev-parse", "--show-toplevel"]);
  const currentBranchResult = git(root, ["branch", "--show-current"]);
  if (!currentRootResult.ok) throw new Error(currentRootResult.stderr);
  const changes = collectCurrentChanges(root, moduleMap);
  const registered = registeredWork(root, canonicalRef, currentRootResult.stdout);
  const registeredBranches = new Set(
    registered.map((record) => record.branch).filter(Boolean),
  );
  registeredBranches.add(currentBranchResult.stdout);
  const remotes = includeRemotes
    ? recentRemoteWork(root, moduleMap, canonicalRef, registeredBranches)
    : [];
  return {
    ...detectParallelConflicts({
      currentFiles: changes.files,
      plannedModules,
      otherWork: [...registered, ...remotes],
      moduleMap,
    }),
    currentBranch: currentBranchResult.stdout,
    baseCommit: changes.baseCommit,
    inspectedWork: registered.length + remotes.length,
  };
}

function commandLineOptions(argv) {
  const plannedModules = [];
  let includeRemotes = true;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--module" && argv[index + 1]) {
      plannedModules.push(argv[index + 1]);
      index += 1;
    } else if (arg === "--local-only") {
      includeRemotes = false;
    }
  }
  return { plannedModules, includeRemotes };
}

const isDirectRun = process.argv[1]
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isDirectRun) {
  try {
    const result = runParallelCheck(commandLineOptions(process.argv.slice(2)));
    process.stdout.write(`PARALLEL_WORK_STATUS=${result.ok ? "OK" : "BLOCKED"}\n`);
    process.stdout.write(
      `CURRENT_PROTECTED_MODULES=${result.currentModules.join(",") || "none"}\n`,
    );
    process.stdout.write(`INSPECTED_PARALLEL_WORK=${result.inspectedWork}\n`);
    for (const moduleId of result.unknownModules) {
      process.stderr.write(`ERROR UNKNOWN_MODULE: ${moduleId}\n`);
    }
    for (const conflict of result.conflicts) {
      process.stderr.write(
        `ERROR PARALLEL_OVERLAP: ${conflict.branch} (${conflict.kind}) conflita em modulos [${conflict.modules.join(", ")}]${conflict.exactPaths.length ? ` e arquivos [${conflict.exactPaths.join(", ")}]` : ""}. Local: ${conflict.location}\n`,
      );
    }
    process.exitCode = result.ok ? 0 : 1;
  } catch (error) {
    process.stderr.write(`PARALLEL_WORK_STATUS=BLOCKED\nERROR ${error.message}\n`);
    process.exitCode = 1;
  }
}
