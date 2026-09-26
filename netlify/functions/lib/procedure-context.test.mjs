import test from "node:test";
import assert from "node:assert/strict";

import {
  detectNamedProcedure,
  detectProcedure,
  detectRecentClinicProcedure,
  detectRecentPatientProcedure,
} from "./procedure-context.mjs";
import { detectProcedure as legacyDetectProcedure } from "./whatsapp-automation.mjs";

test("a named lipo association keeps cervical context but comparisons and corrections do not", () => {
  for (const text of [
    "Como é feita a lipo de papada com cervicoplastia?",
    "Cervicoplastia associada à lipo de papada",
    "Lipo de papada + lifting cervical",
  ]) assert.equal(detectNamedProcedure(text)?.key, "lifting_cervical", text);
  for (const text of [
    "Lipo de papada ou cervicoplastia?",
    "Qual a diferença entre lipo de papada e cervicoplastia?",
    "Compare lipo de papada com cervicoplastia",
    "Qual é melhor, lipo de papada com cervicoplastia ou só lipo?",
    "Preço da lipo de papada. E da cervicoplastia?",
    "Vi lipo de papada com cervicoplastia, mas quero saber só o custo da lipo",
  ]) assert.equal(detectNamedProcedure(text), null, text);
  assert.equal(detectNamedProcedure("Não quero cervicoplastia, só lipo de papada")?.key, "lipo_papada");
  assert.equal(detectNamedProcedure("Lipo de papada com cervicoplastia, na verdade só lipo de papada")?.key, "lipo_papada");
});

test("an explicit correction excludes the rejected procedure, even with a stale ad", () => {
  for (const text of [
    "Não quero lifting facial, quero lifting cervical",
    "Não é lifting facial. É cervicoplastia",
    "Vi lifting facial, mas na verdade quero cervicoplastia",
  ]) assert.equal(detectProcedure(text, "M26F01W", null)?.key, "lifting_cervical", text);
  assert.equal(detectProcedure("Não quero lifting facial", "M26F01W", null), null);
});

test("comparing procedures does not choose a price topic arbitrarily", () => {
  assert.equal(detectNamedProcedure("Qual a diferença entre lifting facial e lifting cervical?"), null);
  assert.equal(detectProcedure("Qual a diferença entre lifting facial e lifting cervical?", "M26F01W", null), null);
  assert.equal(detectNamedProcedure("Não sei se quero lifting cervical")?.key, "lifting_cervical");
});

test("a patient rejection stops stale recent context and a human alias is not a patient", () => {
  assert.equal(detectRecentPatientProcedure([
    { role: "user", text: "Quero lifting facial" },
    { role: "user", text: "Não quero lifting facial" },
  ]), null);
  assert.equal(detectRecentPatientProcedure([{ role: "user", source: "human", text: "Sobre lifting facial" }]), null);
});

test("the procedure stated by the patient overrides a stale campaign reference", () => {
  assert.deepEqual(
    detectProcedure("Quero saber sobre otoplastia", "G26CERV", null),
    { key: "otoplastia", code: "G-OTO-01" },
  );
});

test("Google and Meta campaign references preserve their procedure mapping", () => {
  const cases = [
    ["", "M26F01W", "lifting_facial", "M-C06-WA-01"],
    ["", "M26C02S", "lifting_cervical", "G-LIFT-CERV-01"],
    ["", "M26O01W", "otoplastia", "G-OTO-01"],
    ["", "G26LIFT", "lifting_facial", "G-LIFT-FAC-01"],
    ["", "G26CERV", "lifting_cervical", "G-LIFT-CERV-01"],
    ["", "G26BLEF", "blefaroplastia", "G-BLEF-01"],
    ["", "G26OTO", "otoplastia", "G-OTO-01"],
    ["", "G26MAMA-mastopexia", "mastopexia", "X-MASTO-01"],
    ["", "G26MAMA-mamoplastia-redutora", "mamoplastia_redutora", "X-REDUTORA-01"],
    ["", "G26MAMA-protese-mama", "protese_mama", "X-PROTESE-01"],
    ["", "G26CORP-abdominoplastia", "abdominoplastia", "X-ABD-01"],
    ["", "G26CORP-lipoaspiracao", "lipoaspiracao", "X-LIPO-01"],
  ];

  for (const [text, reference, key, code] of cases) {
    assert.deepEqual(detectProcedure(text, reference, null), { key, code });
  }
});

test("a campanha secundária sem grupo não inventa um procedimento", () => {
  assert.equal(detectProcedure("", "G26MAMA", null), null);
  assert.equal(detectProcedure("", "G26CORP", null), null);
  assert.equal(detectProcedure("", "G26MAMA-ag_cirurgia_mama_preco", null), null);
  assert.equal(detectProcedure("", "G26CORP-ag_contorno_corporal_preco", null), null);
});

test("os grupos de preço por procedimento preservam a intenção sem depender da mensagem", () => {
  assert.deepEqual(detectProcedure("", "G26MAMA-ag_mastopexia_preco", null), {
    key: "mastopexia",
    code: "X-MASTO-01",
  });
  assert.deepEqual(detectProcedure("", "G26MAMA-ag_protese_mama_preco", null), {
    key: "protese_mama",
    code: "X-PROTESE-01",
  });
  assert.deepEqual(detectProcedure("", "G26CORP-ag_lipoaspiracao_preco", null), {
    key: "lipoaspiracao",
    code: "X-LIPO-01",
  });
});

test("generic lifting keeps the established facial fallback", () => {
  assert.deepEqual(detectProcedure("Tenho interesse em lifting", "", null), {
    key: "lifting_facial",
    code: "M-C06-WA-01",
  });
});

test("recent patient and clinic context remain separated", () => {
  const conversation = [
    { role: "assistant", source: "bruna", text: "Sobre lifting facial" },
    { role: "user", source: "patient", text: "Na verdade quero cervicoplastia" },
  ];

  assert.deepEqual(detectRecentPatientProcedure(conversation), {
    key: "lifting_cervical",
    code: "G-LIFT-CERV-01",
  });
  assert.deepEqual(detectRecentClinicProcedure(conversation), {
    key: "lifting_facial",
    code: "M-C06-WA-01",
  });
});

test("legacy planner export remains behaviorally compatible", () => {
  const args = ["Quero blefaroplastia", "M26F01W", { source: "meta" }];
  assert.deepEqual(legacyDetectProcedure(...args), detectProcedure(...args));
});
