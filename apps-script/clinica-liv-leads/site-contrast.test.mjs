import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const root = new URL("../../", import.meta.url);
const stylesheet = readFileSync(new URL("campanhas/secondary-conversion.css", root), "utf8");
const secondaryPages = [
  "abdominoplastia",
  "braquioplastia",
  "lip-lifting",
  "lipoaspiracao",
  "mamoplastia-redutora",
  "mastopexia",
  "mastopexia-com-protese",
  "ninfoplastia",
  "pos-bariatrica",
  "protese-de-mama",
];

function luminance(hex) {
  const channels = hex.match(/[a-f\d]{2}/gi).map((value) => parseInt(value, 16) / 255);
  const linear = channels.map((value) => value <= 0.04045
    ? value / 12.92
    : ((value + 0.055) / 1.055) ** 2.4);
  return (0.2126 * linear[0]) + (0.7152 * linear[1]) + (0.0722 * linear[2]);
}

function contrast(foreground, background) {
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

test("secondary procedure colors meet WCAG AA contrast", () => {
  assert.ok(contrast("#fffaf7", "#62473e") >= 4.5);
  assert.ok(contrast("#f0dfd7", "#62473e") >= 4.5);
  assert.ok(contrast("#584940", "#f0e6e0") >= 4.5);
});

test("secondary procedure stylesheet contains scoped contrast overrides", () => {
  assert.match(stylesheet, /main \.secondary-practical :is\(\.eyebrow, h2, p\)/);
  assert.match(stylesheet, /footer :is\(a, span, strong, p, button\)/);
  assert.match(stylesheet, /footer \.footer-navigation \.footer-nav-group > strong/);
});

test("every secondary procedure page requests the contrast-fixed stylesheet", () => {
  for (const page of secondaryPages) {
    const html = readFileSync(new URL(`${page}/index.html`, root), "utf8");
    assert.match(html, /secondary-conversion\.css\?v=20260814-contrast-1/);
  }
});
