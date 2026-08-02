import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";
const KEY_FILE_PATTERN = /^[a-f0-9-]{8,128}\.txt$/i;

function decodeXml(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function readSitemapEntries(rootDir) {
  const sitemapPath = path.join(rootDir, "sitemap.xml");
  if (!existsSync(sitemapPath)) throw new Error("sitemap.xml não encontrado.");

  const xml = readFileSync(sitemapPath, "utf8");
  const entries = [];
  const blockPattern = /<url>([\s\S]*?)<\/url>/gi;
  for (const blockMatch of xml.matchAll(blockPattern)) {
    const block = blockMatch[1];
    const loc = block.match(/<loc>([\s\S]*?)<\/loc>/i)?.[1]?.trim();
    const lastmod = block.match(/<lastmod>([\s\S]*?)<\/lastmod>/i)?.[1]?.trim() || "";
    if (loc) entries.push({ url: decodeXml(loc), lastmod });
  }
  if (!entries.length) throw new Error("Nenhuma URL encontrada no sitemap.xml.");
  return entries;
}

function findIndexNowKey(rootDir) {
  const candidates = readdirSync(rootDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && KEY_FILE_PATTERN.test(entry.name))
    .map((entry) => {
      const key = entry.name.slice(0, -4);
      const content = readFileSync(path.join(rootDir, entry.name), "utf8").trim();
      return content === key ? { key, filename: entry.name } : null;
    })
    .filter(Boolean);

  if (candidates.length !== 1) {
    throw new Error("É necessário exatamente um arquivo de chave IndexNow válido na raiz publicada.");
  }
  return candidates[0];
}

function canonicalUrlFromFile(filename, origin) {
  const normalized = filename.replaceAll("\\", "/").replace(/^\.\//, "");
  if (normalized === "index.html") return `${origin}/`;
  if (!normalized.endsWith("/index.html")) return null;
  return `${origin}/${normalized.slice(0, -"index.html".length)}`;
}

function changedPageUrls(gitRoot, origin) {
  const current = process.env.COMMIT_REF || "";
  const previous = process.env.CACHED_COMMIT_REF || "";
  if (!current || !previous || current === previous) return [];

  try {
    const output = execFileSync(
      "git",
      ["diff", "--name-only", "--diff-filter=ACDMRTUXB", previous, current, "--", "*.html"],
      { cwd: gitRoot, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    );
    return output
      .split(/\r?\n/)
      .map((filename) => filename.trim())
      .filter(Boolean)
      .map((filename) => canonicalUrlFromFile(filename, origin))
      .filter(Boolean);
  } catch {
    return [];
  }
}

function latestSitemapUrls(entries) {
  const latest = entries.reduce((value, entry) => entry.lastmod > value ? entry.lastmod : value, "");
  return latest ? entries.filter((entry) => entry.lastmod === latest).map((entry) => entry.url) : [];
}

function selectUrls({ entries, gitRoot, origin, all, since, explicitUrls }) {
  if (explicitUrls.length) return explicitUrls;
  if (all) return entries.map((entry) => entry.url);
  if (since) return entries.filter((entry) => entry.lastmod >= since).map((entry) => entry.url);

  const changed = changedPageUrls(gitRoot, origin);
  return changed.length ? changed : latestSitemapUrls(entries);
}

function validateUrls(urls, host) {
  return [...new Set(urls)].filter((value) => {
    try {
      const url = new URL(value);
      return url.protocol === "https:" && url.hostname === host;
    } catch {
      return false;
    }
  }).slice(0, 10_000);
}

export async function runIndexNow({
  rootDir = process.cwd(),
  gitRoot = process.cwd(),
  all = false,
  since = "",
  explicitUrls = [],
  dryRun = false,
  fetchImpl = globalThis.fetch,
} = {}) {
  const entries = readSitemapEntries(rootDir);
  const firstUrl = new URL(entries[0].url);
  const host = firstUrl.hostname;
  const origin = firstUrl.origin;
  const { key, filename } = findIndexNowKey(rootDir);
  const urls = validateUrls(selectUrls({ entries, gitRoot, origin, all, since, explicitUrls }), host);

  if (!urls.length) return { status: "skipped", host, urlCount: 0, urls: [] };
  if (dryRun) return { status: "dry-run", host, urlCount: urls.length, urls };
  if (typeof fetchImpl !== "function") throw new Error("Este ambiente não oferece suporte a fetch.");

  const response = await fetchImpl(INDEXNOW_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host,
      key,
      keyLocation: `${origin}/${filename}`,
      urlList: urls,
    }),
  });

  if (response.status !== 200 && response.status !== 202) {
    const detail = (await response.text()).trim().slice(0, 300);
    throw new Error(`IndexNow respondeu HTTP ${response.status}${detail ? `: ${detail}` : ""}`);
  }

  return { status: response.status === 200 ? "submitted" : "accepted", host, urlCount: urls.length, urls };
}

function parseCliArgs(argv) {
  const options = { all: false, since: "", dryRun: false, explicitUrls: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--all") options.all = true;
    else if (argument === "--dry-run") options.dryRun = true;
    else if (argument === "--since") options.since = argv[index += 1] || "";
    else if (argument.startsWith("--since=")) options.since = argument.slice("--since=".length);
    else if (/^https:\/\//i.test(argument)) options.explicitUrls.push(argument);
    else throw new Error(`Argumento desconhecido: ${argument}`);
  }
  if (options.since && !/^\d{4}-\d{2}-\d{2}$/.test(options.since)) {
    throw new Error("Use --since no formato AAAA-MM-DD.");
  }
  return options;
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectRun) {
  try {
    const result = await runIndexNow(parseCliArgs(process.argv.slice(2)));
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
