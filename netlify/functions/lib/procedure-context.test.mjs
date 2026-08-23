import test from "node:test";
import assert from "node:assert/strict";

import {
  detectProcedure,
  detectRecentClinicProcedure,
  detectRecentPatientProcedure,
} from "./procedure-context.mjs";
import { detectProcedure as legacyDetectProcedure } from "./whatsapp-automation.mjs";

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
  ];

  for (const [text, reference, key, code] of cases) {
    assert.deepEqual(detectProcedure(text, reference, null), { key, code });
  }
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
