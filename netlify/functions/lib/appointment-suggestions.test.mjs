import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAppointmentSuggestion,
  isAppointmentAlertEnabled,
} from "./appointment-suggestions.mjs";

test("formats no more than three approved appointment options", () => {
  const text = buildAppointmentSuggestion({
    patientName: "Maria Silva",
    professional: "amanda",
    procedure: "blefaroplastia",
    slots: [
      { day: "Segunda-feira", date: "27/07/2026", time: "08:00" },
      { day: "Segunda-feira", date: "27/07/2026", time: "10:00" },
      { day: "Quarta-feira", date: "29/07/2026", time: "13:00" },
      { day: "Quarta-feira", date: "29/07/2026", time: "14:00" },
    ],
  });

  assert.match(text, /Olá, Maria!/);
  assert.match(text, /1\. segunda-feira \(27\/07\/2026\) às 08:00/);
  assert.match(text, /3\. quarta-feira \(29\/07\/2026\) às 13:00/);
  assert.doesNotMatch(text, /14:00/);
  assert.match(text, /Se nenhum destes horários for possível/);
});

test("reports a missing schedule without creating a patient suggestion", () => {
  const text = buildAppointmentSuggestion({
    patientName: "Maria Silva",
    professional: "daniel",
    procedure: "",
    slots: [],
  });

  assert.match(text, /revisão necessária/);
  assert.match(text, /Não há horários disponíveis/);
  assert.doesNotMatch(text, /Sugestão para copiar ao paciente/);
});

test("appointment alert remains disabled unless explicitly enabled", () => {
  assert.equal(isAppointmentAlertEnabled({}), false);
  assert.equal(
    isAppointmentAlertEnabled({ WHATSAPP_APPOINTMENT_REVIEW_ENABLED: "true" }),
    true,
  );
});
