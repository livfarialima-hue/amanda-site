import assert from "node:assert/strict";
import test from "node:test";
import {
  resolvePatientDisplayName,
  resolveContactIdentity,
  usableKnownPatientName,
  usableProfileFirstName,
  usableProfileName,
} from "./profile-name.mjs";

test("explicit correction has provenance and shared contacts are not patient identity", () => {
  const corrected = resolveContactIdentity({ profileName: "Lulu", currentText: "Meu nome é Helena." });
  assert.equal(corrected.name, "Helena");
  assert.equal(corrected.nameSource, "self_declared");
  assert.equal(corrected.nameSubject, "self");
  const shared = resolveContactIdentity({ profileName: "Rosa", currentText: "Me chamo Helena, quero marcar para minha mãe e para mim." });
  assert.equal(shared.name, "Helena");
  assert.equal(shared.nameSubject, "contact_only");
});

test("a role or praise is never extracted as a name", () => {
  for (const currentText of ["Sou a mãe da criança", "Eu sou interessada na consulta", "Sou de Santos", "Estou perguntando para minha mãe, meu nome é Helena"]) {
    const identity = resolveContactIdentity({ profileName: "", currentText });
    if (currentText.includes("Helena")) assert.equal(identity.nameSubject, "contact_only");
    else assert.equal(identity.name, "");
  }
  for (const profileName of ["Super", "Gratidão", "Abençoada"]) assert.equal(usableProfileName(profileName), "");
});

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

test("consonant initialisms remain invalid after boundary decorations are removed", () => {
  for (const profileName of ["SVS", "SVS :-", "S.V.S.", "SVS 🥰"]) {
    assert.equal(usableProfileName(profileName), "");
    assert.equal(usableProfileFirstName(profileName), "");
    assert.equal(resolvePatientDisplayName({ profileName }), "");
  }
});

test("short real names and valid full names remain usable", () => {
  for (const profileName of ["Cris", "ANA", "Maria S."]) {
    assert.equal(usableProfileName(profileName), profileName);
  }
});

test("a clearly personal name keeps working when the profile has boundary emojis", () => {
  for (const [profileName, expectedName, expectedFirstName] of [
    ["Mariza Alves 🥰", "Mariza Alves", "Mariza"],
    ["💙 Rosana Macedo", "Rosana Macedo", "Rosana"],
    ["Cris🌷", "Cris", "Cris"],
  ]) {
    assert.equal(usableProfileName(profileName), expectedName);
    assert.equal(usableProfileFirstName(profileName), expectedFirstName);
    assert.equal(resolvePatientDisplayName({ profileName }), expectedName);
  }
});

test("boundary decoration removal does not rescue business or malformed profiles", () => {
  for (const profileName of [
    "Monah Semijoias 💎",
    "Clínica Rosana 🥰",
    "Rosana 2026 💙",
    "Ro💙sana",
  ]) {
    assert.equal(usableProfileName(profileName), "");
  }
});

test("a canonical patient name keeps the complete validated value", () => {
  assert.equal(
    usableKnownPatientName("Mariana Alves de Souza Lima"),
    "Mariana Alves de Souza Lima",
  );
  assert.equal(usableKnownPatientName("Não informado"), "");
  assert.equal(usableKnownPatientName("=IMPORTXML(...)"), "");
});
