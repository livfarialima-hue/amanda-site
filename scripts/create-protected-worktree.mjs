import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const PROJECT_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

function git(root, args) {
  const result = spawnSync("git", args, {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
  });
  if (result.status !== 0) {
    throw new Error(String(result.stderr || result.stdout || "git failed").trim());
  }
  return String(result.stdout || "").trim();
}

export function validateWorktreeSlug(value) {
  const slug = String(value || "").trim().toLowerCase();
  if (
    !/^[a-z0-9][a-z0-9-]{1,46}[a-z0-9]$/.test(slug)
    || slug.includes("--")
  ) {
    throw new Error(
      "Use um slug de 3 a 48 caracteres com letras minusculas, numeros e hifens simples.",
    );
  }
  return slug;
}

function timestamp(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value || "00";
  return `${get("year")}${get("month")}${get("day")}-${get("hour")}${get("minute")}${get("second")}`;
}

export function planProtectedWorktree({ mainRoot, slug, now = new Date() }) {
  const safeSlug = validateWorktreeSlug(slug);
  const suffix = timestamp(now);
  const branch = `codex/${safeSlug}-${suffix}`;
  const target = path.resolve(mainRoot, "tmp", `worktree-${safeSlug}-${suffix}`);
  const safeParent = `${path.resolve(mainRoot, "tmp")}${path.sep}`;
  if (!target.startsWith(safeParent)) {
    throw new Error("O worktree planejado saiu da pasta tmp protegida.");
  }
  return { branch, target };
}

function mainWorktree(root) {
  const output = git(root, ["worktree", "list", "--porcelain"]);
  const first = output.split(/\r?\n/).find((line) => line.startsWith("worktree "));
  if (!first) throw new Error("Worktree principal nao encontrado.");
  return path.resolve(first.slice(9));
}

export function createProtectedWorktree({
  root = PROJECT_ROOT,
  slug,
  fetchFirst = true,
} = {}) {
  const mapPath = path.resolve(root, "ops/BRUNA-MODULE-MAP.json");
  const moduleMap = JSON.parse(readFileSync(mapPath, "utf8"));
  const mainRoot = mainWorktree(root);
  if (fetchFirst) {
    git(root, ["fetch", moduleMap.remote]);
  }
  const plan = planProtectedWorktree({ mainRoot, slug });
  if (existsSync(plan.target)) throw new Error(`Destino ja existe: ${plan.target}`);
  const branchExists = spawnSync(
    "git",
    ["show-ref", "--verify", "--quiet", `refs/heads/${plan.branch}`],
    { cwd: root, windowsHide: true },
  );
  if (branchExists.status === 0) throw new Error(`Branch ja existe: ${plan.branch}`);
  const remoteBranchExists = spawnSync(
    "git",
    [
      "show-ref",
      "--verify",
      "--quiet",
      `refs/remotes/${moduleMap.remote}/${plan.branch}`,
    ],
    { cwd: root, windowsHide: true },
  );
  if (remoteBranchExists.status === 0) {
    throw new Error(`Branch remota ja existe: ${moduleMap.remote}/${plan.branch}`);
  }
  git(root, [
    "worktree",
    "add",
    "-b",
    plan.branch,
    plan.target,
    `${moduleMap.remote}/${moduleMap.canonicalBranch}`,
  ]);
  return {
    ...plan,
    baseRef: `${moduleMap.remote}/${moduleMap.canonicalBranch}`,
    shareCommand: `git -C "${plan.target}" push -u ${moduleMap.remote} ${plan.branch}`,
  };
}

function parseArgs(argv) {
  const slug = argv.find((arg) => !arg.startsWith("--"));
  return { slug, fetchFirst: !argv.includes("--no-fetch") };
}

const isDirectRun = process.argv[1]
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isDirectRun) {
  try {
    const result = createProtectedWorktree({
      root: process.cwd(),
      ...parseArgs(process.argv.slice(2)),
    });
    process.stdout.write("PROTECTED_WORKTREE_CREATED\n");
    process.stdout.write(`BRANCH=${result.branch}\n`);
    process.stdout.write(`PATH=${result.target}\n`);
    process.stdout.write(`BASE=${result.baseRef}\n`);
    process.stdout.write(`NEXT=${result.shareCommand}\n`);
  } catch (error) {
    process.stderr.write(`PROTECTED_WORKTREE_BLOCKED: ${error.message}\n`);
    process.exitCode = 1;
  }
}
