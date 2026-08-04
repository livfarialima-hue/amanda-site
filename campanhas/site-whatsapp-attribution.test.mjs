import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const siteRoot = dirname(dirname(fileURLToPath(import.meta.url)));

function htmlFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if ([".git", "node_modules", ".codex-remote-attachments", "tmp"].includes(entry.name)) return [];
    const target = join(directory, entry.name);
    return entry.isDirectory() ? htmlFiles(target) : target.endsWith(".html") ? [target] : [];
  });
}

test("all website WhatsApp CTAs can receive an attribution code", () => {
  let whatsappCtas = 0;
  let pagesWithWhatsApp = 0;

  htmlFiles(siteRoot).forEach((file) => {
    const html = readFileSync(file, "utf8");
    const ctas = [...html.matchAll(/<a\b[^>]*href=["'][^"']*(?:wa\.me|whatsapp\.com)[^"']*["'][^>]*>/gi)];
    if (!ctas.length) return;

    pagesWithWhatsApp += 1;
    assert.match(html, /conversion-tracking\.js/, `${file} precisa carregar o script de atribuição`);

    ctas.forEach(({ 0: tag }) => {
      whatsappCtas += 1;
      assert.match(tag, /data-track=["']whatsapp["']/i, `${file} tem CTA sem data-track`);
      assert.match(tag, /data-procedure=["'][A-Za-z0-9_-]+["']/i, `${file} tem CTA sem código de página`);
    });
  });

  assert.ok(pagesWithWhatsApp >= 40, "a varredura deve cobrir todas as páginas de contato");
  assert.ok(whatsappCtas >= 190, "a varredura deve cobrir todos os CTAs do site");
});
