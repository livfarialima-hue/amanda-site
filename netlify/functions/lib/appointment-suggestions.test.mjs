import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAppointmentSuggestion,
  isAppointmentPreferenceReply,
  isAppointmentAlertEnabled,
  selectAppointmentSlots,
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

test("recognizes a day and period only when the clinic was discussing scheduling", () => {
  const history = [
    {
      role: "assistant",
      source: "bruna",
      text: "Qual período e quais dias costumam ser melhores para você?",
    },
  ];

  assert.equal(
    isAppointmentPreferenceReply(
      "Consigo de manhã segunda e quinta",
      history,
    ),
    true,
  );
  assert.equal(isAppointmentPreferenceReply("Sim, por favor", history), false);
  assert.equal(
    isAppointmentPreferenceReply(
      "Consigo de manhã segunda e quinta",
      [],
    ),
    false,
  );
});

test("prioritizes three slots compatible with weekday and period", () => {
  const selected = selectAppointmentSlots(
    [
      { day: "segunda-feira", date: "27/07/2026", time: "08:00" },
      { day: "segunda-feira", date: "27/07/2026", time: "10:00" },
      { day: "quarta-feira", date: "29/07/2026", time: "13:00" },
      { day: "quinta-feira", date: "30/07/2026", time: "08:00" },
      { day: "quinta-feira", date: "30/07/2026", time: "10:00" },
      { day: "sexta-feira", date: "31/07/2026", time: "09:00" },
    ],
    "Consigo de manhã segunda e quinta",
  );

  assert.deepEqual(
    selected.map((slot) => `${slot.day}-${slot.time}`),
    [
      "segunda-feira-08:00",
      "segunda-feira-10:00",
      "quinta-feira-08:00",
    ],
  );
});

test("includes the captured preference in the reviewer message", () => {
  const text = buildAppointmentSuggestion({
    patientName: "Clélia",
    professional: "amanda",
    procedure: "blefaroplastia",
    preferenceText: "Consigo de manhã segunda e quinta",
    slots: [
      { day: "segunda-feira", date: "27/07/2026", time: "08:00" },
      { day: "quarta-feira", date: "29/07/2026", time: "13:00" },
      { day: "quinta-feira", date: "30/07/2026", time: "10:00" },
    ],
  });

  assert.match(text, /Preferência: segunda e quinta, período da manhã/);
  assert.match(text, /1\. segunda-feira \(27\/07\/2026\) às 08:00/);
  assert.match(text, /2\. quinta-feira \(30\/07\/2026\) às 10:00/);
});
