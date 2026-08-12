import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./Code.gs", import.meta.url),
  "utf8",
);

test("external professionals are recorded without deleting lead history", () => {
  const start = source.indexOf(
    "function registrarContatoProfissionalExterno_",
  );
  const end = source.indexOf(
    "function removerContatoProfissionalExterno_",
    start,
  );
  assert.ok(start >= 0 && end > start);
  const implementation = source.slice(start, end);
  assert.match(implementation, /_WHATSAPP_ROTAS_EXTERNAS/);
  assert.match(implementation, /preserved:\s*true/);
  assert.doesNotMatch(implementation, /\.clearContent\s*\(/);
  assert.doesNotMatch(implementation, /\.deleteRow\s*\(/);
});
