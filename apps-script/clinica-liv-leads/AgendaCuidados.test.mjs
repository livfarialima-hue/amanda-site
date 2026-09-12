import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = readFileSync(
  new URL("./AgendaCuidados.gs", import.meta.url),
  "utf8",
);

function load() {
  const sandbox = {
    String,
    normalizarTextoRetomadas_(value) {
      return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase();
    },
  };
  vm.runInNewContext(
    `${source}\nglobalThis.__test = { ` +
      "chaveProfissionalAgendaCuidados_, " +
      "profissionalFundamentalAgendaCuidados_, " +
      "responsavelAgendaCuidados_ };",
    sandbox,
  );
  return sandbox.__test;
}

test("care milestones keep Amanda, Daniel and external doctors separated", () => {
  const api = load();
  assert.equal(api.chaveProfissionalAgendaCuidados_("Dra. Amanda"), "amanda");
  assert.equal(api.chaveProfissionalAgendaCuidados_("Dr. Daniel"), "daniel");
  assert.equal(api.chaveProfissionalAgendaCuidados_("Matheus (ortop)"), "matheus");
  assert.equal(api.profissionalFundamentalAgendaCuidados_("Dra. Amanda"), true);
  assert.equal(api.profissionalFundamentalAgendaCuidados_("Dr. Daniel"), true);
  assert.equal(api.profissionalFundamentalAgendaCuidados_("Dra. Marina"), false);
});

test("missing or external professional never inherits Amanda ownership", () => {
  const api = load();
  assert.equal(
    api.responsavelAgendaCuidados_(""),
    "Equipe Clínica LIV — confirmar profissional",
  );
  assert.equal(
    api.responsavelAgendaCuidados_("Dra. Marina"),
    "Equipe administrativa — Dra. Marina",
  );
  assert.equal(api.responsavelAgendaCuidados_("Dr. Daniel"), "Daniel/equipe");
  assert.doesNotMatch(
    source,
    /const profissional\s*=\s*[\s\S]{0,180}\|\|\s*["']Dra\. Amanda["']/,
  );
});
