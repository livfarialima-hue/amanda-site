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
    decomporReferenciaAquisicao_(reference) {
      const parts = String(reference || "").split("-");
      return {
        campaign: parts[0] || "",
        creative: parts[1] || "",
        cta: parts.slice(2).join("-"),
      };
    },
  };
  vm.runInNewContext(
    `${source}\nglobalThis.__test = { ` +
      "avaliarContratoAtribuicaoMetaSite_, " +
      "avaliarContratosTesteSintetico_, SYNTHETIC_HEALTH_HEADERS };",
    sandbox,
  );
  return sandbox.__test;
}

test("synthetic check validates contracts without patient fields", () => {
  const { avaliarContratosTesteSintetico_, SYNTHETIC_HEALTH_HEADERS } = load();
  const result = avaliarContratosTesteSintetico_(new Date(), {
    reference: "M26F02S-C01H01-avaliacao-facial",
    platform: "Meta",
    referenceCategory: "meta_coded",
    fallbackReason: "",
  });

  assert.deepEqual(JSON.parse(JSON.stringify(result)), {
    classificationOk: true,
    handoffOk: true,
    attributionOk: true,
  });
  const headers = Array.from(SYNTHETIC_HEALTH_HEADERS).join(" ");
  assert.doesNotMatch(headers, /telefone|nome|mensagem|email/i);
});

test("synthetic attribution check fails when a coded Meta visit falls back", () => {
  const { avaliarContratoAtribuicaoMetaSite_ } = load();

  assert.equal(avaliarContratoAtribuicaoMetaSite_({
    reference: "M26F02S-C01H01-avaliacao-facial",
    platform: "Meta",
    referenceCategory: "meta_coded",
    fallbackReason: "meta_referral_without_mapped_code",
  }), false);
});
