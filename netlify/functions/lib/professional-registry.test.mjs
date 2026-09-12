import assert from "node:assert/strict";
import test from "node:test";
import {
  findProfessionalMentions,
  isAutomatedAppointmentProfessional,
  professionalByKey,
  resolveAutomatedAppointmentProfessional,
  reviewOwnerForProfessional,
} from "./professional-registry.mjs";

test("registry keeps Amanda primary without treating another doctor as Amanda", () => {
  assert.equal(professionalByKey("amanda")?.acquisitionPriority, true);
  assert.equal(
    resolveAutomatedAppointmentProfessional({
      text: "Consulta com a Dra. Amanda em 18/09 às 10h",
    }),
    "Dra. Amanda",
  );
  assert.equal(
    resolveAutomatedAppointmentProfessional({
      text: "Consulta com Matheus (ortop) em 18/09 às 10h",
      professionalHint: "amanda",
    }),
    null,
  );
});

test("only Amanda and Daniel are eligible for automated appointment mutation", () => {
  assert.equal(isAutomatedAppointmentProfessional("Dra. Amanda"), true);
  assert.equal(isAutomatedAppointmentProfessional("daniel"), true);
  assert.equal(isAutomatedAppointmentProfessional("Dr. Henrique"), false);
  assert.equal(isAutomatedAppointmentProfessional("Matheus (ortop)"), false);
  assert.equal(isAutomatedAppointmentProfessional("profissional desconhecido"), false);
  assert.equal(isAutomatedAppointmentProfessional("Dra Amanda"), true);
});

test("trusted route hint is accepted only when the text has no conflicting doctor", () => {
  assert.equal(
    resolveAutomatedAppointmentProfessional({
      text: "Tenho quinta às 14h",
      professionalHint: "amanda",
    }),
    "Dra. Amanda",
  );
  assert.equal(
    resolveAutomatedAppointmentProfessional({
      text: "Tenho quinta às 14h com a Dra. Marina",
      professionalHint: "amanda",
    }),
    null,
  );
});

test("external professionals have explicit operational owners", () => {
  assert.deepEqual(
    findProfessionalMentions("Agenda do Dr. Laerte e Matheus (ortop)").map(
      (professional) => professional.key,
    ),
    ["dr_laerte", "matheus_ortopedia"],
  );
  assert.equal(
    reviewOwnerForProfessional("Matheus (ortop)"),
    "Equipe administrativa — Matheus (ortop)",
  );
  assert.equal(
    reviewOwnerForProfessional("Dr. Henrique"),
    "Equipe administrativa — Dr. Henrique Lane Staniak",
  );
  assert.equal(
    reviewOwnerForProfessional(""),
    "Equipe Clínica LIV — confirmar profissional",
  );
  assert.equal(
    reviewOwnerForProfessional("external"),
    "Equipe Clínica LIV — confirmar profissional",
  );
  assert.equal(
    reviewOwnerForProfessional("Dra Amanda"),
    "Dra. Amanda/equipe",
  );
});
