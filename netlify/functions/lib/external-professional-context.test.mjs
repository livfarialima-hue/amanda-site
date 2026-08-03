import assert from "node:assert/strict";
import test from "node:test";
import {
  clearExternalProfessionalContext,
  getExternalProfessionalContext,
  isDrHenriqueOperationalAppointmentRequest,
  isDrHenriqueStaniakAppointmentMessage,
  isExplicitAmandaInquiry,
  markExternalProfessionalContext,
} from "./external-professional-context.mjs";

function fakeStore() {
  const values = new Map();
  return {
    values,
    getStoreImpl() {
      return {
        async setJSON(key, value) {
          values.set(key, value);
        },
        async get(key) {
          return values.get(key) || null;
        },
        async delete(key) {
          values.delete(key);
        },
      };
    },
  };
}

const CONFIRMATION = `
Agendamento confirmado.
Nome: JACQUELINE EMMA RINA MONACELLI ÂNGELO
Data: 05/08/2026 - 4ª Feira
Horário: 16h00
Médico: Dr. Henrique Lane Staniak
`;

test("recognizes only a structured Dr. Henrique Staniak appointment", () => {
  assert.equal(
    isDrHenriqueStaniakAppointmentMessage(CONFIRMATION),
    true,
  );
  assert.equal(
    isDrHenriqueStaniakAppointmentMessage(
      "O Dr. Henrique Staniak indicou a Dra. Amanda.",
    ),
    false,
  );
});

test("recognizes a scheduling request for a Dr. Henrique patient", () => {
  assert.equal(
    isDrHenriqueOperationalAppointmentRequest(
      "Gostaria de marcar uma consulta de uma paciente do Dr Henrique na quarta às 16:00.",
    ),
    true,
  );
  assert.equal(
    isDrHenriqueOperationalAppointmentRequest(
      "O Dr. Henrique indicou a Dra. Amanda.",
    ),
    false,
  );
});

test("external context expires and can be released for an Amanda inquiry", async () => {
  const storage = fakeStore();
  const phone = "+5511999990000";
  const now = Date.parse("2026-08-03T15:00:00.000Z");

  await markExternalProfessionalContext(
    { phone, at: now },
    { getStoreImpl: storage.getStoreImpl, now },
  );
  assert.equal(
    (await getExternalProfessionalContext(phone, {
      getStoreImpl: storage.getStoreImpl,
      now,
    }))?.professional,
    "dr_henrique_staniak",
  );
  assert.equal(
    isExplicitAmandaInquiry(
      "Quero saber sobre lifting facial com a Dra. Amanda",
    ),
    true,
  );

  await clearExternalProfessionalContext(phone, {
    getStoreImpl: storage.getStoreImpl,
  });
  assert.equal(
    await getExternalProfessionalContext(phone, {
      getStoreImpl: storage.getStoreImpl,
      now,
    }),
    null,
  );
});
