import assert from "node:assert/strict";
import test from "node:test";
import { resolvePatientDisplayName } from "./profile-name.mjs";

test("self-identified patient name overrides an unrelated WhatsApp profile", () => {
  const name = resolvePatientDisplayName({
    profileName: "Carlos Almeida",
    currentText: "Gostaria de saber como faço para passar em consulta e o valor?",
    recentConversation: [
      { role: "user", source: "patient", text: "Olá, bom dia" },
      {
        role: "user",
        source: "patient",
        text: "Sou a Renata, paciente de outro médico",
      },
    ],
  });

  assert.equal(name, "Renata");
});

test("assistant introductions never replace the patient profile name", () => {
  const name = resolvePatientDisplayName({
    profileName: "Marina Souza",
    recentConversation: [
      {
        role: "assistant",
        source: "bruna",
        text: "Eu sou a Bruna, concierge da Clínica LIV Faria Lima.",
      },
    ],
  });

  assert.equal(name, "Marina Souza");
});

test("business and brand profiles are not treated as patient names", () => {
  assert.equal(
    resolvePatientDisplayName({ profileName: "Monah Semijoias" }),
    "",
  );
});
