import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(relativePath) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

const consultation = read("../conteudos/consulta-cirurgia-plastica/index.html");
const costs = read("../conteudos/quanto-custa-cirurgia-plastica-facial-sao-paulo/index.html");
const enhancements = read("./site-enhancements.js");

test("the two conversion articles use the complete homepage footer", () => {
  for (const page of [consultation, costs]) {
    const footer = page.match(/<footer class="cv-footer">[\s\S]*?<\/footer>/)?.[0] || "";
    assert.match(footer, /class="cv-footer-brand"/);
    assert.match(footer, /class="cv-footer-map"/);
    assert.match(footer, /class="cv-footer-meta"/);
    assert.match(footer, /data-cta-location="footer"/);
    assert.doesNotMatch(footer, /cv-shell cv-footer-grid/);
    assert.doesNotMatch(footer, /cv-footer-links/);
  }
});

test("the curated video viewer is not created on pages without video", () => {
  const guard = enhancements.indexOf(
    "if (!document.querySelector('[data-curated-video], video:not([data-inline-video])')) return;",
  );
  const append = enhancements.indexOf("document.body.appendChild(modal);", guard);
  assert.ok(guard > 0);
  assert.ok(append > guard);
});
