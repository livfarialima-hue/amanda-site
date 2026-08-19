import assert from "node:assert/strict";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { auditSite } from "../scripts/check-site-technical.mjs";
import {
  buildStaticSite,
  planStaticArtifact,
} from "../scripts/static-site-artifact.mjs";

const root = path.resolve(import.meta.dirname, "..");
const trackingAssetVersion = "20260815-attribution4";
const trackingAssets = [
  "conversion-tracking.js",
  "tracking-config.js",
  "tracking-loader.js",
];

function writeFixtureFile(fixtureRoot, relativePath, content) {
  const target = path.join(fixtureRoot, relativePath);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, content, "utf8");
}

function page({ canonical, body, robots = "index,follow", links = "" }) {
  return `<!doctype html><html lang="pt-BR"><head><meta name="robots" content="${robots}"><link rel="canonical" href="${canonical}"></head><body>${body}${links}</body></html>`;
}

function createFixture() {
  const fixtureRoot = mkdtempSync(path.join(os.tmpdir(), "site-technical-"));
  writeFixtureFile(fixtureRoot, "netlify.toml", "[build]\ncommand = \"node scripts/build-static-site.mjs\"\npublish = \"tmp/netlify-deploy\"\n");
  writeFixtureFile(fixtureRoot, ".netlifyignore", ".netlify/\nauditorias/\n");
  writeFixtureFile(fixtureRoot, "robots.txt", "User-agent: *\nAllow: /\nSitemap: https://draamandaschroeder.com.br/sitemap.xml\n");
  writeFixtureFile(fixtureRoot, "sitemap.xml", "<urlset><url><loc>https://draamandaschroeder.com.br/</loc></url><url><loc>https://draamandaschroeder.com.br/boa/</loc></url></urlset>");
  writeFixtureFile(fixtureRoot, "_redirects", "/antiga/ /boa/ 301\n");
  writeFixtureFile(fixtureRoot, "index.html", page({
    canonical: "https://draamandaschroeder.com.br/",
    body: "<h1>Início</h1>",
    links: '<a href="/boa/">Boa</a>',
  }));
  writeFixtureFile(fixtureRoot, "boa/index.html", page({
    canonical: "https://draamandaschroeder.com.br/boa/",
    body: "<h1>Boa</h1>",
    links: '<a href="/">Início</a>',
  }));
  writeFixtureFile(fixtureRoot, "auditorias/interna/relatorio.md", "interno");
  return fixtureRoot;
}

test("public images reserve space and videos expose a poster", () => {
  const result = auditSite({ root });
  for (const page of result.pages) {
    if (page.status !== 200) continue;
    const file = path.join(root, page.file);
    const html = readFileSync(file, "utf8");
    for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
      assert.match(match[0], /\bwidth=["']\d+["']/i, file);
      assert.match(match[0], /\bheight=["']\d+["']/i, file);
    }
    for (const match of html.matchAll(/<video\b[^>]*>/gi)) {
      assert.match(match[0], /\bposter=["'][^"']+["']/i, file);
    }
  }
});

test("cervical campaign video is prominent, accessible and performance-safe on both relevant pages", () => {
  const videoRelativePath = "campanhas/assets/lifting-cervical/contorno-cervical-explicado-v1.mp4";
  const posterRelativePath = "campanhas/assets/lifting-cervical/contorno-cervical-explicado-poster-v1.webp";
  const videoPath = path.join(root, videoRelativePath);
  const posterPath = path.join(root, posterRelativePath);

  assert.ok(existsSync(videoPath), "optimized cervical video must exist");
  assert.ok(existsSync(posterPath), "cervical video poster must exist");
  assert.ok(statSync(videoPath).size <= 6 * 1024 * 1024, "optimized video must stay at or below 6 MiB");
  assert.ok(statSync(posterPath).size <= 100 * 1024, "poster must stay at or below 100 KiB");

  for (const relativePage of ["lifting-cervical/index.html", "lipo-de-papada/index.html"]) {
    const html = readFileSync(path.join(root, relativePage), "utf8");
    const featuredSection = html.match(/<section class="cv-section cv-section--dark cv-featured-video"[\s\S]*?<\/section>/i)?.[0] || "";

    assert.ok(featuredSection, `${relativePage} must expose the featured cervical video section`);
    assert.match(featuredSection, /<video\b[^>]*\bcontrols\b[^>]*\bplaysinline\b[^>]*\bpreload="none"/i);
    assert.match(featuredSection, /\bwidth="720"\s+height="720"/i);
    assert.match(featuredSection, /\bdata-inline-video\b/i);
    assert.match(featuredSection, /\bdata-preserve-poster\b/i);
    assert.match(featuredSection, /\baria-label="[^"]+"/i);
    assert.match(featuredSection, new RegExp(videoRelativePath.replaceAll("/", "\\/")));
    assert.match(featuredSection, new RegExp(posterRelativePath.replaceAll("/", "\\/")));
  }

  const artifactFiles = planStaticArtifact({ root }).files;
  assert.ok(!artifactFiles.includes("Campanha cervical 1x1  arrumado final.mp4"));
  assert.ok(!artifactFiles.includes("Campanha Lifting Cervical - Reels Stories 9x16 - ritmo e audio.mp4"));

  const visualCss = readFileSync(path.join(root, "campanhas/conversion-pages-classic-visual.css"), "utf8");
  assert.match(
    visualCss,
    /@media \(max-width: 920px\)[\s\S]*?\.cv-featured-video \.cv-story--featured-video\s*{\s*grid-template-columns:\s*minmax\(0, 1fr\);/i,
    "featured cervical video must collapse to a single column on tablet and mobile"
  );
  assert.match(
    visualCss,
    /@media \(max-width: 680px\)[\s\S]*?\.cv-featured-video \.cv-story-media\s*{\s*width:\s*min\(100%, 330px\);/i,
    "featured cervical video must stay within the known-good mobile video width"
  );
});

test("the cervical page connects cervicoplastia and lifting cervical without changing the canonical URL", () => {
  const html = readFileSync(
    path.join(root, "lifting-cervical/index.html"),
    "utf8",
  );
  const structuredData = JSON.parse(
    html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i)?.[1] || "{}",
  );
  const medicalPage = structuredData["@graph"]?.find(
    (item) => item["@type"] === "MedicalWebPage",
  );

  assert.match(html, /<title>Cervicoplastia \(lifting cervical\) em São Paulo/i);
  assert.match(html, /<h1>Cervicoplastia:/i);
  assert.match(html, /também chamada de lifting cervical/i);
  assert.match(html, /Cervicoplastia e lifting cervical são a mesma cirurgia\?/i);
  assert.match(html, /rel="canonical" href="https:\/\/draamandaschroeder\.com\.br\/lifting-cervical\/"/i);
  assert.equal(medicalPage?.about?.name, "Cervicoplastia");
  assert.deepEqual(
    medicalPage?.about?.alternateName,
    ["Lifting cervical", "Lifting de pescoço"],
  );
});

test("OpenAI search and training crawlers have explicit independent rules", () => {
  const robots = readFileSync(path.join(root, "robots.txt"), "utf8");

  assert.match(robots, /User-agent:\s*OAI-SearchBot\s+Allow:\s*\//i);
  assert.match(robots, /User-agent:\s*GPTBot\s+Allow:\s*\//i);
});

test("all public pages use one current version for every tracking asset", () => {
  const publicPageFiles = new Set(
    auditSite({ root }).pages
      .filter((page) => page.status === 200)
      .map((page) => page.file.replaceAll("\\", "/")),
  );
  const expected = trackingAssets
    .map((asset) => `${asset}?v=${trackingAssetVersion}`)
    .sort();
  const htmlFiles = planStaticArtifact({ root }).files
    .filter((file) => file.endsWith(".html"));

  for (const relativeFile of htmlFiles) {
    const file = path.join(root, relativeFile);
    const html = readFileSync(file, "utf8");
    const references = [...html.matchAll(
      /\b((?:tracking-config|tracking-loader|conversion-tracking)\.js(?:\?v=[A-Za-z0-9_-]+)?)/g,
    )].map((match) => match[1]).sort();

    if (publicPageFiles.has(relativeFile)) {
      assert.deepEqual(references, expected, file);
    } else {
      references.forEach((reference) => {
        assert.match(
          reference,
          new RegExp(`\\?v=${trackingAssetVersion}$`),
          file,
        );
      });
    }
  }
});

test("offline site gate covers sitemap, expected 200, canonical, robots, H1, orphans and redirects", () => {
  const result = auditSite({ root });

  assert.deepEqual(result.errors, []);
  assert.equal(result.publishDirectory, "tmp/netlify-deploy");
  assert.equal(result.summary.sitemapUrls, 44);
  assert.equal(result.summary.expectedHttp200, 44);
  assert.equal(result.summary.selfCanonical, 44);
  assert.equal(result.summary.indexable, 44);
  assert.equal(result.summary.oneH1, 44);
  assert.equal(result.summary.orphanPages, 0);
  assert.equal(result.summary.auditFilesInArtifact, 0);
  assert.ok(result.summary.redirects >= 1);
});

test("auditorias are excluded from the generated deploy artifact", () => {
  const fixtureRoot = createFixture();
  try {
    const result = auditSite({ root: fixtureRoot });
    const artifact = buildStaticSite({ root: fixtureRoot });
    const artifactResult = auditSite({
      root: path.join(fixtureRoot, artifact.outputDirectory),
      artifact: true,
    });
    assert.deepEqual(result.errors, []);
    assert.deepEqual(artifactResult.errors, []);
    assert.equal(result.summary.auditFilesInArtifact, 0);
    assert.ok(artifact.files.includes("index.html"));
    assert.ok(artifact.files.includes("sitemap.xml"));
    assert.ok(!artifact.files.some((file) => file.startsWith("auditorias/")));
    assert.equal(
      readFileSync(path.join(fixtureRoot, artifact.outputDirectory, "index.html"), "utf8"),
      readFileSync(path.join(fixtureRoot, "index.html"), "utf8"),
    );
    assert.equal(result.summary.expectedHttp200, 2);
    assert.equal(result.summary.selfCanonical, 2);
    assert.equal(result.summary.indexable, 2);
    assert.equal(result.summary.oneH1, 2);
    assert.equal(result.summary.orphanPages, 0);
    assert.equal(result.summary.redirects, 1);
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test("offline site gate fails closed for missing pages, noindex, canonical, H1, orphan and redirect regressions", () => {
  const fixtureRoot = createFixture();
  try {
    writeFixtureFile(fixtureRoot, "sitemap.xml", "<urlset><url><loc>https://draamandaschroeder.com.br/</loc></url><url><loc>https://draamandaschroeder.com.br/boa/</loc></url><url><loc>https://draamandaschroeder.com.br/ausente/</loc></url></urlset>");
    writeFixtureFile(fixtureRoot, "index.html", page({
      canonical: "https://draamandaschroeder.com.br/errada/",
      robots: "noindex,follow",
      body: "<p>Sem H1</p>",
    }));
    writeFixtureFile(fixtureRoot, "_redirects", "/ciclo-a/ /ciclo-b/ 301\n/ciclo-b/ /ciclo-a/ 301\n");

    const result = auditSite({ root: fixtureRoot });
    const codes = new Set(result.errors.map((entry) => entry.code));
    assert.equal(result.ok, false);
    assert.ok(codes.has("MISSING_STATIC_DOCUMENT"));
    assert.ok(codes.has("CANONICAL_MISMATCH"));
    assert.ok(codes.has("ROBOTS_NOINDEX"));
    assert.ok(codes.has("H1_COUNT"));
    assert.ok(codes.has("ORPHAN_PAGE"));
    assert.ok(codes.has("REDIRECT_CYCLE"));
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});
