import assert from "node:assert/strict";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { auditSite } from "../scripts/check-site-technical.mjs";
import {
  buildStaticSite,
  planStaticArtifact,
} from "../scripts/static-site-artifact.mjs";

const root = path.resolve(import.meta.dirname, "..");
const trackingAssetVersion = "20260823-price-range-1";
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
  writeFixtureFile(fixtureRoot, ".netlifyignore", ".netlify/\nauditorias/\nops/\n");
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
  writeFixtureFile(fixtureRoot, "ops/CHANGE-CANDIDATE.json", "{\"status\":\"tested_local\"}");
  return fixtureRoot;
}

test("public images and videos reserve space, and videos expose a poster", () => {
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
      assert.match(match[0], /\bwidth=["']\d+["']/i, file);
      assert.match(match[0], /\bheight=["']\d+["']/i, file);
    }
  }
});

test("inline videos reserve their intrinsic aspect ratio before playback", () => {
  const result = auditSite({ root });
  for (const page of result.pages) {
    if (page.status !== 200) continue;
    const file = path.join(root, page.file);
    const html = readFileSync(file, "utf8");
    for (const match of html.matchAll(/<video\b[^>]*\bdata-inline-video\b[^>]*>/gi)) {
      const width = match[0].match(/\bwidth=["'](\d+)["']/i)?.[1];
      const height = match[0].match(/\bheight=["'](\d+)["']/i)?.[1];
      assert.ok(width && height, `${file} inline video dimensions`);
      assert.match(
        match[0],
        new RegExp(`\\bstyle=["'][^"']*aspect-ratio:\\s*${width}\\s*\\/\\s*${height}`),
        `${file} inline video aspect ratio`,
      );
    }
  }
});

test("portrait inline videos use matching first-frame posters", () => {
  const expectedPosters = new Map([
    ["video-apresentacao-clinica-liv.mp4", "video-apresentacao-clinica-liv-poster.webp"],
    ["queixa-e-solucao-face.mp4", "queixa-e-solucao-face-poster.webp"],
    ["olhar-envelhecido-blefaroplastia.mp4", "olhar-envelhecido-blefaroplastia-poster.webp"],
    ["medo-de-resultados-exagerados.mp4", "medo-de-resultados-exagerados-poster.webp"],
    ["otoplastia-em-crianca.mp4", "otoplastia-em-crianca-poster.webp"],
  ]);
  let matchedVideos = 0;
  const result = auditSite({ root });
  for (const page of result.pages) {
    if (page.status !== 200) continue;
    const file = path.join(root, page.file);
    const html = readFileSync(file, "utf8");
    for (const match of html.matchAll(/<video\b[^>]*\bdata-inline-video\b[^>]*>[\s\S]*?<\/video>/gi)) {
      const source = match[0].match(/<source\b[^>]*\bsrc=["']([^"']+)["']/i)?.[1] || "";
      const sourceName = source.split("?")[0].split("/").at(-1);
      const expectedPoster = expectedPosters.get(sourceName);
      if (!expectedPoster) continue;
      assert.match(match[0], new RegExp(`\\bposter=["'][^"']*${expectedPoster.replaceAll(".", "\\.")}["']`, "i"), file);
      assert.match(match[0], /\bdata-preserve-poster\b/i, file);
      const poster = match[0].match(/\bposter=["']([^"']+)["']/i)?.[1] || "";
      assert.ok(existsSync(path.resolve(path.dirname(file), poster)), `${file} poster exists`);
      matchedVideos += 1;
    }
  }
  assert.equal(matchedVideos, 15);
});

test("otoplasty team photos use the compact mobile media height", () => {
  for (const relativePage of ["otoplastia-adulto/index.html", "otoplastia-infantil/index.html"]) {
    const html = readFileSync(path.join(root, relativePage), "utf8");
    assert.match(html, /care-gallery img[^{}]*\{height:280px;aspect-ratio:auto\}/i, relativePage);
    assert.match(html, /equipe-cirurgica-01\.jpg/i, relativePage);
  }
});

test("all classic conversion pages request the mobile media stylesheet revision", () => {
  const pages = [
    "index.html",
    "avaliacao-facial/index.html",
    "blefaroplastia/index.html",
    "conteudos/consulta-cirurgia-plastica/index.html",
    "contorno-corporal/index.html",
    "injetaveis/index.html",
    "lifting-cervical/index.html",
    "lifting-facial/index.html",
    "lipo-de-papada/index.html",
    "mama/index.html",
    "otoplastia/index.html",
  ];
  for (const relativePage of pages) {
    const html = readFileSync(path.join(root, relativePage), "utf8");
    assert.match(
      html,
      /conversion-pages-classic-visual\.css\?v=20260912-mobile-media-1/i,
      relativePage,
    );
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

test("lifting facial loads the current compact mobile treatment for its quick answer", () => {
  const html = readFileSync(
    path.join(root, "lifting-facial/index.html"),
    "utf8",
  );
  const css = readFileSync(
    path.join(root, "campanhas/conversion-pages.css"),
    "utf8",
  );
  const quickAnswer = html.match(
    /<section class="cv-quick-answer"[\s\S]*?<\/section>/i,
  )?.[0] || "";
  const whatsappLinks = [...html.matchAll(
    /<a\b[^>]*data-track="whatsapp"[^>]*>/gi,
  )];

  assert.ok(quickAnswer, "lifting facial must keep its quick-answer section");
  assert.match(
    html,
    /conversion-pages\.css\?v=20260912-sitewide-contrast-1/i,
    "the page must force mobile browsers to fetch the corrected stylesheet",
  );
  assert.equal(whatsappLinks.length, 6, "all six WhatsApp conversion links must remain present");
  assert.match(
    css,
    /html\[data-procedure="lifting-facial"\] \.cv-quick-answer-grid div\s*\{[^}]*border:\s*1px solid var\(--line\);[^}]*border-left:\s*3px solid var\(--green\);[^}]*border-radius:\s*16px;/i,
    "the mobile answer blocks must render as compact cards",
  );
  assert.match(
    css,
    /html\[data-procedure="lifting-facial"\] \.cv-quick-answer-grid dd\s*\{[^}]*margin:\s*0;/i,
    "definition text must never fall back to the browser's indented default",
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
  const medicalProcedure = structuredData["@graph"]?.find(
    (item) => item["@type"] === "MedicalProcedure",
  );

  assert.match(html, /<title>Cervicoplastia \(lifting cervical\) em São Paulo/i);
  assert.match(html, /<h1>Cervicoplastia:/i);
  assert.match(html, /também chamada de lifting cervical/i);
  assert.match(html, /Cervicoplastia e lifting cervical são a mesma cirurgia\?/i);
  assert.match(html, /rel="canonical" href="https:\/\/draamandaschroeder\.com\.br\/lifting-cervical\/"/i);
  assert.equal(
    medicalPage?.about?.["@id"],
    "https://draamandaschroeder.com.br/lifting-cervical/#procedure",
  );
  assert.equal(medicalProcedure?.name, "Cervicoplastia");
  assert.deepEqual(
    medicalProcedure?.alternateName,
    ["Lifting cervical", "Lifting de pescoço", "Cirurgia do pescoço"],
  );
});

test("cervical pages expose visible answer-first medical content and matching review metadata", () => {
  const cases = [
    {
      relativePage: "lifting-cervical/index.html",
      canonical: "https://draamandaschroeder.com.br/lifting-cervical/",
      procedureName: "Cervicoplastia",
      visibleTerm: /Cervicoplastia, lifting cervical e lifting de pescoço/i,
    },
    {
      relativePage: "lipo-de-papada/index.html",
      canonical: "https://draamandaschroeder.com.br/lipo-de-papada/",
      procedureName: "Lipoaspiração submentoniana",
      visibleTerm: /Lipo de papada e lipoaspiração submentoniana/i,
    },
  ];

  for (const item of cases) {
    const html = readFileSync(path.join(root, item.relativePage), "utf8");
    const structuredData = JSON.parse(
      html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i)?.[1] || "{}",
    );
    const graph = structuredData["@graph"] || [];
    const physician = graph.find((entry) => entry["@type"] === "Person" && entry["@id"] === "https://draamandaschroeder.com.br/#physician");
    const procedure = graph.find((entry) => entry["@type"] === "MedicalProcedure");
    const medicalPage = graph.find((entry) => entry["@type"] === "MedicalWebPage");
    const whatsappLinks = [...html.matchAll(
      /<a\b[^>]*data-track="whatsapp"[^>]*>/gi,
    )].map((match) => match[0]);

    assert.match(html, /class="cv-quick-answer"/i, item.relativePage);
    assert.match(html, item.visibleTerm, item.relativePage);
    assert.match(
      html,
      /Conteúdo médico revisado em <time datetime="2026-08-31">31 de agosto de 2026<\/time> por Dra\. Amanda Schroeder/i,
      item.relativePage,
    );
    assert.equal(procedure?.name, item.procedureName, item.relativePage);
    assert.equal(medicalPage?.url, item.canonical, item.relativePage);
    assert.equal(medicalPage?.dateModified, "2026-09-12", item.relativePage);
    assert.equal(medicalPage?.lastReviewed, "2026-08-31", item.relativePage);
    assert.equal(
      medicalPage?.reviewedBy?.["@id"],
      "https://draamandaschroeder.com.br/#physician",
      item.relativePage,
    );
    assert.equal(
      medicalPage?.medicalAudience?.audienceType,
      "Patient",
      item.relativePage,
    );
    assert.equal(physician?.telephone, "+55 11 96195-7144", item.relativePage);
    assert.equal(whatsappLinks.length, 6, item.relativePage);
    assert.ok(
      whatsappLinks.every((link) => /href="https:\/\/wa\.me\/5511961957144\?/i.test(link)),
      `${item.relativePage} must preserve the WhatsApp destination`,
    );
    assert.deepEqual(
      whatsappLinks.map((link) => link.match(/data-cta-location="([^"]+)"/i)?.[1]),
      ["header", "hero", "consultation", "final", "footer", "sticky"],
      item.relativePage,
    );
  }

  const sitemap = readFileSync(path.join(root, "sitemap.xml"), "utf8");
  assert.match(
    sitemap,
    /<loc>https:\/\/draamandaschroeder\.com\.br\/lifting-cervical\/<\/loc><lastmod>2026-09-12<\/lastmod>/i,
  );
  assert.match(
    sitemap,
    /<loc>https:\/\/draamandaschroeder\.com\.br\/lipo-de-papada\/<\/loc><lastmod>2026-09-12<\/lastmod>/i,
  );
});

test("lifting facial pages distinguish the surgical procedure and preserve conversion tracking", () => {
  const cases = [
    {
      relativePage: "lifting-facial/index.html",
      canonical: "https://draamandaschroeder.com.br/lifting-facial/",
      reviewPattern: /Conteúdo médico revisado em <time datetime="2026-09-01">1º de setembro de 2026<\/time>/i,
      ctaLocations: ["header", "hero", "consultation", "final", "footer", "sticky"],
    },
    {
      relativePage: "conteudos/quanto-custa-lifting-facial-sao-paulo/index.html",
      canonical: "https://draamandaschroeder.com.br/conteudos/quanto-custa-lifting-facial-sao-paulo/",
      reviewPattern: /O conteúdo foi atualizado em 1º de setembro de 2026/i,
      ctaLocations: ["header", "price_range_reference", "consultation", "final_price_range_reference", "footer", "sticky_price_continuity_v1"],
    },
  ];

  for (const item of cases) {
    const html = readFileSync(path.join(root, item.relativePage), "utf8");
    const structuredData = JSON.parse(
      html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i)?.[1] || "{}",
    );
    const graph = structuredData["@graph"] || [];
    const procedure = graph.find((entry) => entry["@type"] === "MedicalProcedure");
    const medicalPage = graph.find((entry) => {
      const types = Array.isArray(entry["@type"]) ? entry["@type"] : [entry["@type"]];
      return types.includes("MedicalWebPage");
    });
    const whatsappLinks = [...html.matchAll(
      /<a\b[^>]*data-track="whatsapp"[^>]*>/gi,
    )].map((match) => match[0]);

    assert.match(html, /lifting sem cirurgia/i, item.relativePage);
    assert.match(html, /Endolift/i, item.relativePage);
    assert.match(html, item.reviewPattern, item.relativePage);
    assert.equal(procedure?.name, "Lifting facial", item.relativePage);
    assert.deepEqual(procedure?.alternateName, ["Ritidoplastia", "Facelift"], item.relativePage);
    assert.equal(procedure?.procedureType, "SurgicalProcedure", item.relativePage);
    assert.equal(medicalPage?.url, item.canonical, item.relativePage);
    assert.equal(medicalPage?.dateModified, "2026-09-12", item.relativePage);
    assert.equal(medicalPage?.lastReviewed, "2026-09-01", item.relativePage);
    assert.equal(medicalPage?.about?.["@id"], procedure?.["@id"], item.relativePage);
    assert.equal(medicalPage?.mainEntity?.["@id"], procedure?.["@id"], item.relativePage);
    assert.equal(medicalPage?.reviewedBy?.["@id"], "https://draamandaschroeder.com.br/#physician", item.relativePage);
    assert.equal(medicalPage?.medicalAudience?.audienceType, "Patient", item.relativePage);
    assert.equal(whatsappLinks.length, 6, item.relativePage);
    assert.ok(
      whatsappLinks.every((link) => /href="https:\/\/wa\.me\/5511961957144\?/i.test(link)),
      `${item.relativePage} must preserve the WhatsApp destination`,
    );
    assert.deepEqual(
      whatsappLinks.map((link) => link.match(/data-cta-location="([^"]+)"/i)?.[1]),
      item.ctaLocations,
      item.relativePage,
    );
  }

  const sitemap = readFileSync(path.join(root, "sitemap.xml"), "utf8");
  assert.match(
    sitemap,
    /<loc>https:\/\/draamandaschroeder\.com\.br\/lifting-facial\/<\/loc><lastmod>2026-09-12<\/lastmod>/i,
  );
  assert.match(
    sitemap,
    /<loc>https:\/\/draamandaschroeder\.com\.br\/conteudos\/quanto-custa-lifting-facial-sao-paulo\/<\/loc><lastmod>2026-09-12<\/lastmod>/i,
  );
});

test("blepharoplasty and cervical price guides are canonical, medical and conversion-safe", () => {
  const cases = [
    {
      relativePage: "conteudos/quanto-custa-blefaroplastia-sao-paulo/index.html",
      canonical: "https://draamandaschroeder.com.br/conteudos/quanto-custa-blefaroplastia-sao-paulo/",
      procedureName: "Blefaroplastia",
      procedureCode: "blefaroplastia-preco",
      ctaLocations: ["header", "price_planning", "consultation", "final_price_planning", "footer", "sticky_price_planning"],
    },
    {
      relativePage: "conteudos/quanto-custa-lifting-cervical-sao-paulo/index.html",
      canonical: "https://draamandaschroeder.com.br/conteudos/quanto-custa-lifting-cervical-sao-paulo/",
      procedureName: "Cervicoplastia",
      procedureCode: "lifting-cervical-preco",
      ctaLocations: ["header", "price_range_reference", "consultation", "final_price_range_reference", "footer", "sticky_price_range_reference"],
    },
  ];

  for (const item of cases) {
    const html = readFileSync(path.join(root, item.relativePage), "utf8");
    const structuredData = JSON.parse(
      html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i)?.[1] || "{}",
    );
    const graph = structuredData["@graph"] || [];
    const procedure = graph.find((entry) => entry["@type"] === "MedicalProcedure");
    const medicalPage = graph.find((entry) => {
      const types = Array.isArray(entry["@type"]) ? entry["@type"] : [entry["@type"]];
      return types.includes("MedicalWebPage");
    });
    const whatsappLinks = [...html.matchAll(/<a\b[^>]*data-track="whatsapp"[^>]*>/gi)]
      .map((match) => match[0]);

    assert.match(html, new RegExp(`rel="canonical" href="${item.canonical.replaceAll("/", "\\/")}"`, "i"));
    assert.match(html, new RegExp(`data-procedure="${item.procedureCode}"`, "i"));
    assert.equal(procedure?.name, item.procedureName, item.relativePage);
    assert.equal(procedure?.procedureType, "SurgicalProcedure", item.relativePage);
    assert.equal(medicalPage?.url, item.canonical, item.relativePage);
    assert.equal(medicalPage?.dateModified, "2026-09-12", item.relativePage);
    assert.equal(medicalPage?.lastReviewed, "2026-09-12", item.relativePage);
    assert.equal(medicalPage?.reviewedBy?.["@id"], "https://draamandaschroeder.com.br/#physician", item.relativePage);
    assert.equal(whatsappLinks.length, 6, item.relativePage);
    assert.deepEqual(
      whatsappLinks.map((link) => link.match(/data-cta-location="([^"]+)"/i)?.[1]),
      item.ctaLocations,
      item.relativePage,
    );
    assert.doesNotMatch(html, /R\$\s*(?:18|26|42)\s*(?:mil|[–-])/i, item.relativePage);
  }

  const sitemap = readFileSync(path.join(root, "sitemap.xml"), "utf8");
  assert.match(sitemap, /quanto-custa-blefaroplastia-sao-paulo\/<\/loc><lastmod>2026-09-12<\/lastmod>/i);
  assert.match(sitemap, /quanto-custa-lifting-cervical-sao-paulo\/<\/loc><lastmod>2026-09-12<\/lastmod>/i);
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

test("educational articles are concise, sourced and discoverable from the library", () => {
  const articles = [
    {
      file: "conteudos/como-escolher-cirurgiao-plastico/index.html",
      canonical: "https://draamandaschroeder.com.br/conteudos/como-escolher-cirurgiao-plastico/",
      required: [/CRM e RQE não significam a mesma coisa/i, /portal\.cfm\.org\.br\/busca-medicos/i],
    },
    {
      file: "conteudos/recuperacao-blefaroplastia/index.html",
      canonical: "https://draamandaschroeder.com.br/conteudos/recuperacao-blefaroplastia/",
      required: [/alteração súbita da visão/i, /plasticsurgery\.org\/cosmetic-procedures\/eyelid-surgery\/recovery/i],
    },
    {
      file: "conteudos/minilifting-lifting-facial-deep-plane/index.html",
      canonical: "https://draamandaschroeder.com.br/conteudos/minilifting-lifting-facial-deep-plane/",
      required: [/não significa que seja a melhor opção para todas as pessoas/i, /pubmed\.ncbi\.nlm\.nih\.gov\/41100833/i],
    },
    {
      file: "conteudos/como-se-preparar-cirurgia-plastica/index.html",
      canonical: "https://draamandaschroeder.com.br/conteudos/como-se-preparar-cirurgia-plastica/",
      required: [/Não suspenda anticoagulantes/i, /asahq\.org\/preparing-for-surgery/i, /Jejum e exames/i],
    },
    {
      file: "conteudos/recuperacao-lifting-cervical/index.html",
      canonical: "https://draamandaschroeder.com.br/conteudos/recuperacao-lifting-cervical/",
      required: [/não aguarde resposta por WhatsApp/i, /não faça compressas frias por conta própria/i, /neck-lift\/recovery/i],
    },
    {
      file: "conteudos/otomodelacao-ou-otoplastia/index.html",
      canonical: "https://draamandaschroeder.com.br/conteudos/otomodelacao-ou-otoplastia/",
      required: [/Moldagem em bebês é uma situação diferente/i, /chop\.edu\/treatments\/ear-molding/i, /não é um tratamento para perda de audição/i],
    },
  ];

  articles.push({
    file: "conteudos/lip-lifting-ou-preenchimento-labial/index.html",
    canonical: "https://draamandaschroeder.com.br/conteudos/lip-lifting-ou-preenchimento-labial/",
    required: [/não encurta a pele entre o nariz e o lábio superior/i, /cicatriz nessa região/i, /raramente, complicações graves na circulação/i, /clevelandclinic\.org\/health\/procedures\/lip-lift/, /fda\.gov\/medical-devices/, /data-procedure="lip-lifting"/],
  });

  for (const article of articles) {
    const html = readFileSync(path.join(root, article.file), "utf8");
    assert.match(html, new RegExp(`<link href="${article.canonical.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}" rel="canonical"`), article.file);
    assert.match(html, /Conteúdo educativo · Atualizado/i, article.file);
    assert.doesNotMatch(html, /Conteúdo médico revisado|preparado para revisão|Gate editorial/i, article.file);
    const articleSchema = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
      .flatMap((match) => JSON.parse(match[1])["@graph"] || [])
      .find((item) => item["@id"] === article.canonical + "#article");
    assert.ok(articleSchema, article.file);
    assert.equal(articleSchema.author, undefined, article.file);
    assert.equal(articleSchema.reviewedBy, undefined, article.file);
    assert.equal(articleSchema.lastReviewed, undefined, article.file);
    assert.match(html, /class="article-references"/i, article.file);
    assert.match(html, /data-track="whatsapp"/i, article.file);
    assert.match(html, /(?:não|nem) substitui (?:avaliação|exame) médic[oa]/i, article.file);
    assert.doesNotMatch(html, /R\$\s*\d/i, article.file);
    article.required.forEach((pattern) => assert.match(html, pattern, article.file));

    // Prefer focused answers; required clinical coverage above still applies.
    const body = html.match(/<div class="article-body">([\s\S]*?)<details class="article-references">/)?.[1] || "";
    const readableText = body.replace(/<[^>]+>/g, " ").replace(/&[a-z0-9#]+;/gi, " ").trim();
    const words = readableText.split(/\s+/).length;
    assert.ok(words >= 150 && words <= 450, article.file + ": focused body must be 150–450 words, got " + words);
    assert.ok([...body.matchAll(/<h2>/g)].length <= 6, article.file + " should not read like a manual");
    for (const paragraph of body.matchAll(/<p>([\s\S]*?)<\/p>/g)) {
      assert.ok(paragraph[1].replace(/<[^>]+>/g, " ").trim().split(/\s+/).length <= 85, article.file + " needs short paragraphs");
    }
    assert.match(html, /(?:consulta com a|Na consulta, a|Converse com a) (?:Dra\. )?Amanda/i, article.file + " needs a clear, respectful invitation");
  }

  const library = readFileSync(path.join(root, "conteudos/index.html"), "utf8");
  const uniqueArticleLinks = new Set(
    [...library.matchAll(/class="cl-article" href="([^"]+)"/g)].map((match) => match[1]),
  );
  assert.equal(uniqueArticleLinks.size, 28);
  assert.match(library, /data-content-total>28 leituras educativas/);
  assert.match(library, /class="cl-library-count" data-content-total>28 conteúdos/);
  articles.forEach((article) => {
    const relativeHref = article.file.replace(/^conteudos\//, "").replace(/index\.html$/, "");
    assert.match(library, new RegExp(`class="cl-article" href="${relativeHref.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`));
  });

  const libraryScript = readFileSync(path.join(root, "campanhas/content-library.js"), "utf8");
  assert.match(libraryScript, /querySelectorAll\('\[data-content-total\]'\)/);
  assert.match(libraryScript, /articles\.length/);

  const enhancementsCss = readFileSync(path.join(root, "campanhas/site-enhancements.css"), "utf8");
  assert.match(
    enhancementsCss,
    /@media \(min-width: 901px\)[\s\S]*?\.article-page > \.article-hero\.consultation-article-hero,[\s\S]*?\.article-page > \.article-hero\.professional-article-hero\s*\{[\s\S]*?padding-inline:\s*max\(19px, calc\(50% - 560px\)\);/i,
    "article heroes must stay aligned to the site's 1120px desktop content axis",
  );
  assert.match(
    enhancementsCss,
    /\.consultation-hero-media img\s*\{[^}]*width:\s*100%;[^}]*height:\s*auto;[^}]*aspect-ratio:\s*4\s*\/\s*5;/i,
    "the consultation hero image must not inherit its fixed HTML height",
  );
  assert.match(
    enhancementsCss,
    /\.professional-hero-media img\s*\{[^}]*width:\s*100%;[^}]*height:\s*auto;[^}]*aspect-ratio:\s*4\s*\/\s*5;/i,
    "the professional hero image must preserve its responsive aspect ratio",
  );
});


test("expanded educational articles preserve prior material and do not claim unperformed medical review", () => {
  const expected = [
    ["cuidados-cicatrizacao-cirurgia", /Quando usar silicone ou fazer massagem/i, /aad\.org\/public\/diseases\/a-z\/scars-treatment/],
    ["papada-contorno-cervical", /Quando retirar gordura pode não ser suficiente/i, /plasticsurgery\.org\/cosmetic-procedures\/liposuction/],
    ["seguranca-cirurgia-plastica", /Três perguntas para levar à consulta/i, /cirurgiaplastica\.org\.br\/seguranca-do-paciente\/seguranca-e-riscos/],
  ];
  for (const [slug, heading, source] of expected) {
    const html = readFileSync(path.join(root, "conteudos", slug, "index.html"), "utf8");
    assert.match(html, heading, slug);
    assert.match(html, source, slug);
    assert.match(html, /class="article-references"/, slug);
    assert.match(html, /Conteúdo educativo · Atualizado/i, slug);
    assert.doesNotMatch(html, /Revisado pela|Conteúdo médico revisado/i, slug);
    const schema = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
    assert.equal(schema.author, undefined, slug);
    assert.equal(schema.reviewedBy, undefined, slug);
    assert.equal(schema.lastReviewed, undefined, slug);
    assert.match(html, /data-track="whatsapp"/, slug);
    assert.match(html, /href="\.\.\/(?:como-se-preparar-cirurgia-plastica|recuperacao-lifting-cervical)\//, slug);
  }
  const safety = readFileSync(path.join(root, "conteudos/seguranca-cirurgia-plastica/index.html"), "utf8");
  assert.match(safety, /amanda-planejamento-congresso\.webp/);
  assert.match(safety, /anestesia-geral-seguranca\.mp4/);
  assert.match(safety, /Dr\. Daniel Added/);
  assert.equal([...safety.matchAll(/class="faq-item"/g)].length, 7);
  const scars = readFileSync(path.join(root, "conteudos/cuidados-cicatrizacao-cirurgia/index.html"), "utf8");
  assert.match(scars, /data-source-id="posts_1-51"/);
  const neck = readFileSync(path.join(root, "conteudos/papada-contorno-cervical/index.html"), "utf8");
  assert.equal([...neck.matchAll(/data-source-id="reels-25"/g)].length, 3);
  const libraryScript = readFileSync(path.join(root, "campanhas/content-library.js"), "utf8");
  assert.match(libraryScript, /'preparo', 'preparacao', 'preparar', 'preoperatorio'/);
  assert.match(libraryScript, /'orelha', 'orelhas', 'otoplastia', 'otomodelacao'/);
});

test("library search prioritizes exact topic terms while preserving plain-language synonyms", () => {
  const script = readFileSync(path.join(root, "campanhas/content-library.js"), "utf8");
  const normalization = script.slice(script.indexOf("  var normalize ="), script.indexOf("  var articles ="));
  const scoring = script.slice(script.indexOf("  var variantsFor ="), script.indexOf("  var createResult ="));
  const score = runInNewContext(normalization + scoring + "; scoreArticle;");
  const neck = { titleSearch: "cuidados depois do lifting cervical", labelSearch: "recuperacao cervical", bodySearch: "inchaco curativos sono trabalho direcao exercicio pescoco" };
  const eyelid = { titleSearch: "como organizar a recuperacao da blefaroplastia", labelSearch: "recuperacao", bodySearch: "olhos secos edema trabalho telas face e pescoco" };
  assert.ok(score(neck, "recuperação cervical") > score(eyelid, "recuperação cervical"));
  assert.ok(score(neck, "recuperação do pescoço") > 0);
  assert.equal(score(neck, "recuperação astronomia"), 0, "unmatched words must not create unrelated results");
  assert.ok(score(neck, "recuperação pescoço") > 0);
  const prep = { titleSearch: "como se preparar para uma cirurgia plastica", labelSearch: "preparo e seguranca", bodySearch: "medicamentos exames acompanhante" };
  assert.ok(score(prep, "pré-operatório") > 0);
  const ear = { titleSearch: "otomodelacao ou otoplastia", labelSearch: "orelhas", bodySearch: "moldagem em bebes e tecnicas para adultos" };
  assert.ok(score(ear, "orelha") > 0);
  assert.equal(score(ear, "recuperação cervical"), 0);
});

test("offline site gate covers sitemap, expected 200, canonical, robots, H1, orphans and redirects", () => {
  const result = auditSite({ root });

  assert.deepEqual(result.errors, []);
  assert.equal(result.publishDirectory, "tmp/netlify-deploy");
  assert.equal(result.summary.sitemapUrls, 54);
  assert.equal(result.summary.expectedHttp200, 54);
  assert.equal(result.summary.selfCanonical, 54);
  assert.equal(result.summary.indexable, 54);
  assert.equal(result.summary.oneH1, 54);
  assert.equal(result.summary.orphanPages, 0);
  assert.equal(result.summary.auditFilesInArtifact, 0);
  assert.ok(result.summary.redirects >= 1);
});

test("forced permanent redirects are accepted without accepting temporary redirects or loops", () => {
  const fixtureRoot = createFixture();
  try {
    writeFixtureFile(fixtureRoot, "_redirects", "/antiga/ /boa/ 301!\n");
    assert.deepEqual(auditSite({ root: fixtureRoot }).errors, []);
    writeFixtureFile(fixtureRoot, "_redirects", "/antiga/ /boa/ 302!\n");
    assert.ok(auditSite({ root: fixtureRoot }).errors.some(e => e.code === "REDIRECT_NOT_PERMANENT"));
    writeFixtureFile(fixtureRoot, "_redirects", "/ciclo-a/ /ciclo-b/ 301!\n/ciclo-b/ /ciclo-a/ 301!\n");
    assert.ok(auditSite({ root: fixtureRoot }).errors.some(e => e.code === "REDIRECT_CYCLE"));
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test("audit and operations files are excluded from the generated deploy artifact", () => {
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
    assert.equal(result.summary.operationsFilesInArtifact, 0);
    assert.ok(artifact.files.includes("index.html"));
    assert.ok(artifact.files.includes("sitemap.xml"));
    assert.ok(!artifact.files.some((file) => file.startsWith("auditorias/")));
    assert.ok(!artifact.files.some((file) => file.startsWith("ops/")));
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

test("safety-first pages explain integrated care and the surgical package without promotional promises", () => {
  const pages = [
    "index.html",
    "avaliacao-facial/index.html",
    "blefaroplastia/index.html",
    "lifting-facial/index.html",
    "lifting-cervical/index.html",
    "conteudos/seguranca-cirurgia-plastica/index.html",
  ];
  for (const file of pages) {
    const html = readFileSync(path.join(root, file), "utf8");
    const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] || "";
    const visible = main.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    assert.match(visible, /sua segurança vem primeiro/i, file);
    assert.match(visible, /pacote cirúrgico inclui a consulta cardiológica pré-operatória na própria LIV/i, file);
    assert.match(visible, /cardiologista com formação na USP/i, file);
    assert.match(visible, /anestesistas.{0,80}selecionados criteriosamente, com atenção à formação/i, file);
    assert.match(visible, /(?:troca de informações|comunicação entre os profissionais|comunicação com a cirurgiã)/i, file);
    assert.match(html, /id="seguranca-integrada"/, file);
    assert.doesNotMatch(visible, /segurança garantida|cirurgia sem risco|mais segura que|consulta grátis|ganhe a consulta|equipe da USP|clínica vinculada à USP|exames incluídos|liberação automática/i, file);
    if (!file.startsWith("conteudos/")) {
      assert.match(main, /href="(?:\.\.\/)?conteudos\/seguranca-cirurgia-plastica\/"/, file);
    }
  }
});

test("safety guide distinguishes the cardiac consultation, initial appointment and anesthesia evaluation", () => {
  const html = readFileSync(path.join(root, "conteudos/seguranca-cirurgia-plastica/index.html"), "utf8");
  const cardiac = html.match(/<section[^>]*id="seguranca-integrada"[^>]*>([\s\S]*?)<\/section>/)?.[1] || "";
  assert.match(cardiac, /Dr\. Daniel Added, médico cardiologista com formação na USP — CRM-SP 199104 · RQE 145565/);
  assert.match(html, /primeira consulta com a Dra\. Amanda, que é contratada separadamente/);
  assert.match(html, /A consulta com o cardiologista substitui a avaliação anestésica\?/);
  assert.match(html, /Não\. São avaliações com funções diferentes/);
  assert.match(html, /Os cuidados e os exames são definidos conforme cada paciente/);
  assert.match(html, /não tornam uma cirurgia isenta de complicações/);
  assert.equal((html.match(/class="faq-item"/g) || []).length, 7);
  assert.doesNotMatch(html, /reviewedBy|Revisado pela|Conteúdo médico revisado/i);
  const bleph = readFileSync(path.join(root, "blefaroplastia/index.html"), "utf8");
  assert.match(bleph, /Fechamento, sintomas, olho seco e função das pálpebras/);
  assert.match(bleph, /Avaliação oftalmológica pode ser solicitada/);
});

test("communication guidance ties the safety message to confirmed facts and channel limits", () => {
  const north = readFileSync(path.join(root, "campanhas/NORTE-ESTRATEGICO-GOOGLE-ADS.md"), "utf8");
  const guide = readFileSync(path.join(root, "campanhas/GUIA-LINGUAGEM-TRAFEGO-PAGO.md"), "utf8");
  assert.match(north, /## 29\. Decisão autorizada de 12\/09\/2026 — segurança em primeiro lugar e equipe integrada/);
  assert.match(guide, /Diretriz vigente: seção 29 do Norte Estratégico/);
  assert.match(guide, /A primeira consulta com Amanda é separada/);
  assert.match(guide, /A USP qualifica a formação do cardiologista; não é selo da clínica/);
  assert.match(guide, /não modifica campanhas ou respostas automáticas/);
  assert.match(north, /revisão clínica posterior quando disponível, sem apresentá-la como já feita/);
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
