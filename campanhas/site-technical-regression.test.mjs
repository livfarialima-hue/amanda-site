import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");

function publicHtmlFiles(directory = root) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if ([".git", "node_modules", ".netlify", "tmp"].includes(entry.name)) {
      continue;
    }
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...publicHtmlFiles(absolute));
    else if (entry.name === "index.html") files.push(absolute);
  }
  return files;
}

test("public images reserve space and videos expose a poster", () => {
  for (const file of publicHtmlFiles()) {
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

test("OpenAI search and training crawlers have explicit independent rules", () => {
  const robots = readFileSync(path.join(root, "robots.txt"), "utf8");

  assert.match(robots, /User-agent:\s*OAI-SearchBot\s+Allow:\s*\//i);
  assert.match(robots, /User-agent:\s*GPTBot\s+Allow:\s*\//i);
});
