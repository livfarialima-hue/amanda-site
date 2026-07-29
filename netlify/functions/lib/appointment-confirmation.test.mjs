import assert from "node:assert/strict";
import test from "node:test";
import {
  detectConfirmedAppointment,
  detectPatientAppointmentReply,
} from "./appointment-confirmation.mjs";

test("detects a confirmed appointment from recent Portuguese context", () => {
  const result = detectConfirmedAppointment({
    currentText: "Confirmado!",
    at: "2026-07-27T16:50:00-03:00",
    recentConversation: [
      { text: "Terça" },
      { text: "Manhã às 09h ou à tarde 16h?" },
      { text: "Umas 11 pode" },
      { text: "Pode sim! Dá pra te receber às 11h" },
    ],
  });

  assert.deepEqual(result, {
    scheduledDate: "2026-07-28",
    scheduledTime: "11:00",
    professional: "Dra. Amanda",
    consultationType: "Consulta presencial",
    location: "Clínica LIV Faria Lima",
    status: "Consulta agendada",
    source: "WhatsApp — confirmação de agendamento detectada",
  });
});

test("requires confirmation plus both date and time", () => {
  assert.equal(
    detectConfirmedAppointment({
      currentText: "Confirmado!",
      at: "2026-07-27T16:50:00-03:00",
      recentConversation: [{ text: "Pode ser às 11h" }],
    }),
    null,
  );
  assert.equal(
    detectConfirmedAppointment({
      currentText: "Obrigada!",
      at: "2026-07-27T16:50:00-03:00",
      recentConversation: [
        { text: "Amanhã às 11h" },
      ],
    }),
    null,
  );
});

test("understands explicit dates and teleconsultation", () => {
  const result = detectConfirmedAppointment({
    currentText:
      "Sua teleconsulta ficou agendada para 30/07 às 14:30.",
    at: "2026-07-27T10:00:00-03:00",
  });

  assert.equal(result.scheduledDate, "2026-07-30");
  assert.equal(result.scheduledTime, "14:30");
  assert.equal(result.consultationType, "Teleconsulta");
  assert.equal(result.location, "Teleconsulta");
});

test("records a clear patient confirmation only in confirmed appointment context", () => {
  const result = detectPatientAppointmentReply({
    currentText: "Ok, obrigada!",
    at: "2026-07-27T16:55:00-03:00",
    recentConversation: [
      {
        role: "assistant",
        text: "Perfeito, sua consulta ficou agendada para amanhã às 11h.",
      },
      { role: "user", text: "Obrigada" },
    ],
  });

  assert.deepEqual(result, {
    scheduledDate: "2026-07-28",
    scheduledTime: "11:00",
    state: "confirmed",
  });
});

test("records a rescheduling request without treating a thank-you as confirmation", () => {
  const context = [
    {
      role: "assistant",
      text: "Sua consulta ficou agendada para 30/07 às 14h.",
    },
  ];

  assert.equal(
    detectPatientAppointmentReply({
      currentText: "Obrigada!",
      at: "2026-07-27T16:55:00-03:00",
      recentConversation: context,
    }),
    null,
  );

  assert.deepEqual(
    detectPatientAppointmentReply({
      currentText: "Não vou conseguir ir, podemos remarcar?",
      at: "2026-07-27T16:55:00-03:00",
      recentConversation: context,
    }),
    {
      scheduledDate: "2026-07-30",
      scheduledTime: "14:00",
      state: "reschedule_requested",
    },
  );
});
