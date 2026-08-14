import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = readFileSync(
  new URL("./SyntheticHealth.gs", import.meta.url),
  "utf8",
);

function load() {
  const sandbox = {
    Array,
    Date,
    JSON,
    Object,
    String,
    classificarAcaoReaperClassificacao_() {
      return { action: "requeue" };
    },
    normalizarEventoOperacional_(input) {
      return { ok: true, type: input.type };
    },
  };
  vm.runInNewContext(
    `${source}\nglobalThis.__test = { ` +
      "avaliarContratosTesteSintetico_, SYNTHETIC_HEALTH_HEADERS };",
    sandbox,
  );
  return sandbox.__test;
}

test("synthetic check validates contracts without patient fields", () => {
  const { avaliarContratosTesteSintetico_, SYNTHETIC_HEALTH_HEADERS } = load();
  const result = avaliarContratosTesteSintetico_(new Date());

  assert.deepEqual(JSON.parse(JSON.stringify(result)), {
    classificationOk: true,
    handoffOk: true,
  });
  const headers = Array.from(SYNTHETIC_HEALTH_HEADERS).join(" ");
  assert.doesNotMatch(headers, /telefone|nome|mensagem|email/i);
});
