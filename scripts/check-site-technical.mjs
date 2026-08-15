import {
  existsSync,
  readFileSync,
  statSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  planStaticArtifact,
  STATIC_PUBLISH_DIRECTORY,
} from "./static-site-artifact.mjs";

const SCRIPT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CANONICAL_ORIGIN = "https://draamandaschroeder.com.br";

function normalizeRelative(value) {
  return value.replaceAll("\\", "/").replace(/^\.\//, "").replace(/^\//, "");
}

function attributesFromTag(tag) {
  const attributes = new Map();
  const pattern = /([:\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  for (const match of tag.matchAll(pattern)) {
    attributes.set(match[1].toLowerCase(), match[2] ?? match[3] ?? match[4] ?? "");
  }
  return attributes;
}

function tags(html, name) {
  return [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, "gi"))].map((match) => match[0]);
}

function canonicalFromHtml(html) {
  for (const tag of tags(html, "link")) {
    const attributes = attributesFromTag(tag);
    const rel = (attributes.get("rel") || "").toLowerCase().split(/\s+/);
    if (rel.includes("canonical")) return attributes.get("href") || "";
  }
  return "";
}

function robotsFromHtml(html) {
  for (const tag of tags(html, "meta")) {
    const attributes = attributesFromTag(tag);
    if ((attributes.get("name") || "").toLowerCase() === "robots") {
      return attributes.get("content") || "";
    }
  }
  return "";
}

function sitemapUrls(xml) {
  return [...xml.matchAll(/<loc>([\s\S]*?)<\/loc>/gi)]
    .map((match) => match[1].trim())
    .filter(Boolean);
}

function routeFile(pathname, publishRoot) {
  if (pathname === "/") return path.join(publishRoot, "index.html");
  return path.join(publishRoot, ...pathname.replace(/^\//, "").split("/"), "index.html");
}

function routeFromIndexFile(relativeFile) {
  const normalized = normalizeRelative(relativeFile);
  if (normalized === "index.html") return "/";
  if (!normalized.endsWith("/index.html")) return null;
  return `/${normalized.slice(0, -"index.html".length)}`;
}

function parseRedirects(content) {
  return content
    .split(/\r?\n/)
    .map((line) => line.replace(/#.*$/, "").trim())
    .filter(Boolean)
    .map((line) => {
      const [source, target, status = "301"] = line.split(/\s+/);
      return { source, target, status: Number(status) };
    });
}

function parseRobots(content) {
  const groups = new Map();
  let agents = [];
  const sitemaps = [];
  for (const originalLine of content.split(/\r?\n/)) {
    const line = originalLine.replace(/#.*$/, "").trim();
    if (!line) continue;
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    const key = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    if (key === "user-agent") {
      agents = [value.toLowerCase()];
      if (!groups.has(agents[0])) groups.set(agents[0], []);
    } else if (key === "allow" || key === "disallow") {
      for (const agent of agents) groups.get(agent)?.push({ directive: key, value });
    } else if (key === "sitemap") {
      sitemaps.push(value);
    }
  }
  return { groups, sitemaps };
}

function isDocumentLikePath(pathname) {
  const finalSegment = pathname.split("/").filter(Boolean).at(-1) || "";
  return !finalSegment.includes(".");
}

function resourceBaseline(html, pageUrl, publishRoot) {
  const resources = new Set();
  const missingResources = new Set();
  for (const name of ["img", "video", "source", "script", "link"]) {
    for (const tag of tags(html, name)) {
      const attributes = attributesFromTag(tag);
      const linkRel = (attributes.get("rel") || "").toLowerCase().split(/\s+/);
      const reference = name === "link"
        ? (linkRel.some((rel) => ["stylesheet", "icon", "preload", "modulepreload"].includes(rel)) ? attributes.get("href") : "")
        : attributes.get("src");
      if (!reference) continue;
      try {
        const url = new URL(reference, pageUrl);
        if (url.origin !== CANONICAL_ORIGIN) continue;
        const relative = normalizeRelative(decodeURIComponent(url.pathname));
        const absolute = path.resolve(publishRoot, relative);
        if (absolute.startsWith(`${publishRoot}${path.sep}`) && existsSync(absolute) && statSync(absolute).isFile()) {
          resources.add(absolute);
        } else {
          missingResources.add(relative);
        }
      } catch {
        // Invalid resource references are handled by browser/build QA when relevant.
      }
    }
  }
  for (const tag of tags(html, "video")) {
    const poster = attributesFromTag(tag).get("poster");
    if (!poster) continue;
    try {
      const url = new URL(poster, pageUrl);
      if (url.origin !== CANONICAL_ORIGIN) continue;
      const relative = normalizeRelative(decodeURIComponent(url.pathname));
      const absolute = path.resolve(publishRoot, relative);
      if (absolute.startsWith(`${publishRoot}${path.sep}`) && existsSync(absolute) && statSync(absolute).isFile()) {
        resources.add(absolute);
      } else {
        missingResources.add(relative);
      }
    } catch {
      // Invalid poster references are handled by browser/build QA when relevant.
    }
  }

  const measured = [...resources].map((absolute) => ({
    file: normalizeRelative(path.relative(publishRoot, absolute)),
    bytes: statSync(absolute).size,
  }));
  const largest = measured.sort((left, right) => right.bytes - left.bytes)[0] || null;
  const imageTags = tags(html, "img");
  const videoTags = tags(html, "video");
  const scriptTags = tags(html, "script");

  return {
    referencedBytes: measured.reduce((total, resource) => total + resource.bytes, 0),
    largestResource: largest,
    missingResources: [...missingResources].sort(),
    imageCount: imageTags.length,
    imagesWithoutDimensions: imageTags.filter((tag) => {
      const attributes = attributesFromTag(tag);
      return !/^\d+$/.test(attributes.get("width") || "") || !/^\d+$/.test(attributes.get("height") || "");
    }).length,
    videoCount: videoTags.length,
    videosWithoutPoster: videoTags.filter((tag) => !attributesFromTag(tag).get("poster")).length,
    googleFontsStylesheet: /fonts\.googleapis\.com/i.test(html),
    synchronousExternalScripts: scriptTags.filter((tag) => {
      const attributes = attributesFromTag(tag);
      return attributes.has("src") && !attributes.has("defer") && !attributes.has("async") && attributes.get("type") !== "module";
    }).length,
  };
}

function error(code, detail, url = "") {
  return { code, detail, ...(url ? { url } : {}) };
}

export function auditSite({ root = SCRIPT_ROOT, artifact = false } = {}) {
  const errors = [];
  const configPath = path.join(root, "netlify.toml");
  const config = existsSync(configPath) ? readFileSync(configPath, "utf8") : "";
  const publishMatch = config.match(/(?:^|\n)\s*publish\s*=\s*["']([^"']+)["']/i);
  const commandMatch = config.match(/(?:^|\n)\s*command\s*=\s*["']([^"']+)["']/i);
  if (!artifact) {
    if (!publishMatch) errors.push(error("PUBLISH_DIR_UNDECLARED", "netlify.toml must declare build.publish"));
    if (normalizeRelative(publishMatch?.[1] || "") !== STATIC_PUBLISH_DIRECTORY) {
      errors.push(error("PUBLISH_DIR_NOT_ISOLATED", publishMatch?.[1] || "missing"));
    }
    if (commandMatch?.[1] !== "node scripts/build-static-site.mjs") {
      errors.push(error("STATIC_BUILD_COMMAND_MISMATCH", commandMatch?.[1] || "missing"));
    }
  }
  const publishDirectory = artifact ? "(artifact root)" : normalizeRelative(publishMatch?.[1] || "");

  const artifactPlan = planStaticArtifact({ root });
  const ignoreRules = artifactPlan.rules;
  const artifactFiles = artifactPlan.files;
  const auditFilesInArtifact = artifactFiles.filter((file) => file === "auditorias" || file.startsWith("auditorias/"));
  if (auditFilesInArtifact.length) {
    errors.push(error("AUDIT_ARTIFACT_LEAK", auditFilesInArtifact.join(", ")));
  }
  if (!artifact && !ignoreRules.some((rule) => !rule.negate && rule.raw.replaceAll("\\", "/") === "auditorias/")) {
    errors.push(error("AUDIT_IGNORE_RULE_MISSING", ".netlifyignore must contain auditorias/"));
  }

  const sitemapPath = path.join(root, "sitemap.xml");
  const robotsPath = path.join(root, "robots.txt");
  const redirectsPath = path.join(root, "_redirects");
  const sitemap = existsSync(sitemapPath) ? sitemapUrls(readFileSync(sitemapPath, "utf8")) : [];
  const sitemapSet = new Set(sitemap);
  if (!sitemap.length) errors.push(error("SITEMAP_EMPTY", "sitemap.xml has no loc entries"));
  if (sitemapSet.size !== sitemap.length) errors.push(error("SITEMAP_DUPLICATE", "sitemap.xml contains duplicate URLs"));

  const redirects = existsSync(redirectsPath) ? parseRedirects(readFileSync(redirectsPath, "utf8")) : [];
  const redirectBySource = new Map(redirects.map((redirect) => [redirect.source, redirect]));
  for (const redirect of redirects) {
    if (![301, 308].includes(redirect.status)) errors.push(error("REDIRECT_NOT_PERMANENT", JSON.stringify(redirect)));
    if (redirect.source === redirect.target) errors.push(error("REDIRECT_SELF_LOOP", JSON.stringify(redirect)));
    if (sitemapSet.has(new URL(redirect.source, CANONICAL_ORIGIN).href)) {
      errors.push(error("REDIRECT_SOURCE_IN_SITEMAP", redirect.source));
    }
    if (redirect.target.startsWith("/")) {
      const target = new URL(redirect.target, CANONICAL_ORIGIN).href;
      if (!sitemapSet.has(target)) errors.push(error("REDIRECT_TARGET_NOT_CANONICAL", redirect.target));
    }
  }
  for (const redirect of redirects) {
    const visited = new Set();
    let current = redirect.source;
    while (redirectBySource.has(current)) {
      if (visited.has(current)) {
        errors.push(error("REDIRECT_CYCLE", [...visited, current].join(" -> ")));
        break;
      }
      visited.add(current);
      const target = redirectBySource.get(current).target;
      current = target.startsWith("/") ? new URL(target, CANONICAL_ORIGIN).pathname : "";
    }
  }

  if (existsSync(robotsPath)) {
    const robots = parseRobots(readFileSync(robotsPath, "utf8"));
    const wildcardAllowsRoot = (robots.groups.get("*") || []).some((entry) => entry.directive === "allow" && entry.value === "/");
    if (!wildcardAllowsRoot) errors.push(error("ROBOTS_WILDCARD_NOT_ALLOWED", "User-agent * must allow /"));
    if (!robots.sitemaps.includes(`${CANONICAL_ORIGIN}/sitemap.xml`)) {
      errors.push(error("ROBOTS_SITEMAP_MISMATCH", robots.sitemaps.join(", ")));
    }
  } else {
    errors.push(error("ROBOTS_MISSING", "robots.txt not found"));
  }

  const pages = [];
  const pageByPath = new Map();
  for (const pageUrl of sitemap) {
    let parsedUrl;
    try {
      parsedUrl = new URL(pageUrl);
    } catch {
      errors.push(error("SITEMAP_URL_INVALID", pageUrl));
      continue;
    }
    if (parsedUrl.origin !== CANONICAL_ORIGIN || parsedUrl.search || parsedUrl.hash) {
      errors.push(error("SITEMAP_URL_NOT_CANONICAL", pageUrl));
    }
    if (parsedUrl.pathname !== "/" && !parsedUrl.pathname.endsWith("/")) {
      errors.push(error("SITEMAP_ROUTE_FORMAT", pageUrl));
    }

    const file = routeFile(parsedUrl.pathname, root);
    const status = existsSync(file) && statSync(file).isFile() ? 200 : 404;
    const page = {
      url: parsedUrl.href,
      pathname: parsedUrl.pathname,
      file: normalizeRelative(path.relative(root, file)),
      status,
      canonical: "",
      robots: "",
      h1Count: 0,
      inlinks: 0,
      outlinks: 0,
      htmlBytes: 0,
      resources: null,
      internalTargets: new Set(),
    };
    pages.push(page);
    pageByPath.set(page.pathname, page);

    if (status !== 200) {
      errors.push(error("MISSING_STATIC_DOCUMENT", `${page.file} => expected 200, got ${status}`, page.url));
      continue;
    }

    const html = readFileSync(file, "utf8");
    page.htmlBytes = statSync(file).size;
    page.canonical = canonicalFromHtml(html);
    page.robots = robotsFromHtml(html);
    page.h1Count = [...html.matchAll(/<h1\b[^>]*>[\s\S]*?<\/h1>/gi)].length;
    page.resources = resourceBaseline(html, page.url, root);

    if (page.canonical !== page.url) errors.push(error("CANONICAL_MISMATCH", page.canonical || "missing", page.url));
    if (!page.robots) errors.push(error("ROBOTS_META_MISSING", "meta robots missing", page.url));
    if (/(?:^|,)\s*noindex\b/i.test(page.robots)) errors.push(error("ROBOTS_NOINDEX", page.robots, page.url));
    if (page.h1Count !== 1) errors.push(error("H1_COUNT", String(page.h1Count), page.url));
    if (page.resources.imagesWithoutDimensions) {
      errors.push(error("IMAGE_DIMENSIONS_MISSING", String(page.resources.imagesWithoutDimensions), page.url));
    }
    if (page.resources.videosWithoutPoster) {
      errors.push(error("VIDEO_POSTER_MISSING", String(page.resources.videosWithoutPoster), page.url));
    }
    if (page.resources.synchronousExternalScripts) {
      errors.push(error("SYNCHRONOUS_EXTERNAL_SCRIPT", String(page.resources.synchronousExternalScripts), page.url));
    }
    if (page.resources.missingResources.length) {
      errors.push(error("MISSING_LOCAL_RESOURCE", page.resources.missingResources.join(", "), page.url));
    }

    for (const tag of tags(html, "a")) {
      const href = attributesFromTag(tag).get("href");
      if (!href || /^(?:mailto:|tel:|javascript:)/i.test(href)) continue;
      try {
        const target = new URL(href, page.url);
        if (target.origin !== CANONICAL_ORIGIN) continue;
        if (pageByPath.has(target.pathname) || sitemap.some((url) => new URL(url).pathname === target.pathname)) {
          page.internalTargets.add(target.pathname);
        } else if (redirectBySource.has(target.pathname)) {
          page.internalTargets.add(target.pathname);
        } else if (isDocumentLikePath(target.pathname) && !target.pathname.startsWith("/.netlify/functions/")) {
          errors.push(error("BROKEN_INTERNAL_ROUTE", target.pathname, page.url));
        }
      } catch {
        errors.push(error("INVALID_INTERNAL_LINK", href, page.url));
      }
    }
  }

  for (const page of pages) {
    page.outlinks = page.internalTargets.size;
    for (const targetPath of page.internalTargets) {
      const target = pageByPath.get(targetPath);
      if (target && target.pathname !== page.pathname) target.inlinks += 1;
    }
  }
  for (const page of pages) {
    if (page.pathname !== "/" && page.inlinks === 0) errors.push(error("ORPHAN_PAGE", "no internal inlinks", page.url));
  }

  const sitemapRoutes = new Set(pages.map((page) => page.pathname));
  for (const file of artifactFiles.filter((relative) => relative === "index.html" || relative.endsWith("/index.html"))) {
    const route = routeFromIndexFile(file);
    if (route && !sitemapRoutes.has(route)) errors.push(error("HTML_OUTSIDE_SITEMAP", file, `${CANONICAL_ORIGIN}${route}`));
  }

  const largestResources = pages
    .filter((page) => page.resources?.largestResource)
    .map((page) => ({ url: page.url, ...page.resources.largestResource }))
    .sort((left, right) => right.bytes - left.bytes);

  return {
    ok: errors.length === 0,
    publishDirectory,
    summary: {
      sitemapUrls: sitemap.length,
      expectedHttp200: pages.filter((page) => page.status === 200).length,
      selfCanonical: pages.filter((page) => page.canonical === page.url).length,
      indexable: pages.filter((page) => page.robots && !/(?:^|,)\s*noindex\b/i.test(page.robots)).length,
      oneH1: pages.filter((page) => page.h1Count === 1).length,
      orphanPages: pages.filter((page) => page.pathname !== "/" && page.inlinks === 0).length,
      redirects: redirects.length,
      artifactFiles: artifactFiles.length,
      auditFilesInArtifact: auditFilesInArtifact.length,
      pagesWithGoogleFonts: pages.filter((page) => page.resources?.googleFontsStylesheet).length,
      pagesWithVideo: pages.filter((page) => page.resources?.videoCount).length,
      videoTags: pages.reduce((total, page) => total + (page.resources?.videoCount || 0), 0),
      largestReferencedResource: largestResources[0] || null,
    },
    pages: pages.map(({ internalTargets, ...page }) => page),
    redirects,
    errors,
  };
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectRun) {
  const rootArgumentIndex = process.argv.indexOf("--root");
  const requestedRoot = rootArgumentIndex >= 0 ? process.argv[rootArgumentIndex + 1] : "";
  if (rootArgumentIndex >= 0 && !requestedRoot) throw new Error("--root requires a directory");
  const result = auditSite({
    root: requestedRoot ? path.resolve(requestedRoot) : SCRIPT_ROOT,
    artifact: process.argv.includes("--artifact"),
  });
  const output = process.argv.includes("--summary")
    ? {
        ok: result.ok,
        publishDirectory: result.publishDirectory,
        summary: result.summary,
        redirects: result.redirects,
        errors: result.errors,
      }
    : result;
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
  if (!result.ok) process.exitCode = 1;
}
