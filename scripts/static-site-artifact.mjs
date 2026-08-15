import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const STATIC_PUBLISH_DIRECTORY = "tmp/netlify-deploy";

function normalizeRelative(value) {
  return value.replaceAll("\\", "/").replace(/^\.\//, "").replace(/^\//, "");
}

function escapeRegex(value) {
  return value.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
}

function ignoreRuleRegex(rawRule) {
  let rule = normalizeRelative(rawRule.trim());
  const directoryRule = rule.endsWith("/");
  if (directoryRule) rule = rule.slice(0, -1);

  let pattern = "";
  for (let index = 0; index < rule.length; index += 1) {
    const character = rule[index];
    if (character === "*" && rule[index + 1] === "*") {
      if (rule[index + 2] === "/") {
        pattern += "(?:.*/)?";
        index += 2;
      } else {
        pattern += ".*";
        index += 1;
      }
    } else if (character === "*") {
      pattern += "[^/]*";
    } else if (character === "?") {
      pattern += "[^/]";
    } else {
      pattern += escapeRegex(character);
    }
  }

  const prefix = rule.includes("/") ? "^" : "(?:^|/)";
  const suffix = directoryRule ? "(?:/.*)?$" : "$";
  return new RegExp(`${prefix}${pattern}${suffix}`);
}

export function readNetlifyIgnore(root = SCRIPT_ROOT) {
  const ignorePath = path.join(root, ".netlifyignore");
  if (!existsSync(ignorePath)) return [];
  return readFileSync(ignorePath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => ({
      negate: line.startsWith("!"),
      raw: line.startsWith("!") ? line.slice(1) : line,
    }))
    .map((entry) => ({ ...entry, regex: ignoreRuleRegex(entry.raw) }));
}

export function isNetlifyIgnored(relativePath, rules) {
  const normalized = normalizeRelative(relativePath).replace(/\/$/, "");
  let ignored = false;
  for (const rule of rules) {
    if (rule.regex.test(normalized)) ignored = !rule.negate;
  }
  return ignored;
}

function collectFiles(directory, sourceRoot, rules, output = []) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    const relative = normalizeRelative(path.relative(sourceRoot, absolute));
    if (isNetlifyIgnored(relative, rules)) continue;
    if (entry.isDirectory()) collectFiles(absolute, sourceRoot, rules, output);
    else if (entry.isFile()) output.push(relative);
  }
  return output;
}

export function planStaticArtifact({ root = SCRIPT_ROOT } = {}) {
  const rules = readNetlifyIgnore(root);
  return {
    root,
    rules,
    files: collectFiles(root, root, rules).sort(),
  };
}

function assertSafeOutput(root, outputDirectory) {
  const resolvedRoot = path.resolve(root);
  const outputRoot = path.resolve(resolvedRoot, outputDirectory);
  const relative = normalizeRelative(path.relative(resolvedRoot, outputRoot));
  if (
    outputRoot === resolvedRoot
    || !outputRoot.startsWith(`${resolvedRoot}${path.sep}`)
    || relative !== STATIC_PUBLISH_DIRECTORY
  ) {
    throw new Error(`Unsafe static artifact output: ${outputDirectory}`);
  }
  return outputRoot;
}

export function buildStaticSite({
  root = SCRIPT_ROOT,
  outputDirectory = STATIC_PUBLISH_DIRECTORY,
} = {}) {
  const outputRoot = assertSafeOutput(root, outputDirectory);
  const plan = planStaticArtifact({ root });
  rmSync(outputRoot, { recursive: true, force: true });
  mkdirSync(outputRoot, { recursive: true });

  for (const relative of plan.files) {
    const source = path.join(root, ...relative.split("/"));
    const destination = path.join(outputRoot, ...relative.split("/"));
    mkdirSync(path.dirname(destination), { recursive: true });
    copyFileSync(source, destination);
  }

  return {
    outputDirectory: normalizeRelative(path.relative(root, outputRoot)),
    files: plan.files,
  };
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectRun) {
  const result = buildStaticSite();
  process.stdout.write(`${JSON.stringify({
    outputDirectory: result.outputDirectory,
    files: result.files.length,
  }, null, 2)}\n`);
}
