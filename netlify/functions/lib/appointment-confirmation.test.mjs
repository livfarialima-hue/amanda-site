import assert from "node:assert/strict";
import test from "node:test";
import {
  buildBookedAppointmentReply,
  detectConfirmedAppointment,
  detectPatientAppointmentSelection,
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

test("recognizes an exact numbered option from the proposed slots", () => {
  const result = detectPatientAppointmentSelection({
    currentText: "Pode ser a segunda opção, por favor",
    recentConversation: [
      {
        role: "assistant",
        source: "human",
        text: [
          "Para a avaliação com a Dra. Amanda, temos estas opções:",
          "1. segunda-feira (03/08/2026) às 08:00",
          "2. terça-feira (04/08/2026) às 10:00",
          "3. quinta-feira (06/08/2026) às 14:00",
        ].join("\n"),
      },
      {
        role: "user",
        text: "Pode ser a segunda opção, por favor",
      },
    ],
  });

  assert.deepEqual(result, {
    option: 2,
    scheduledDate: "2026-08-04",
    scheduledTime: "10:00",
    professional: "Dra. Amanda",
    consultationType: "Consulta presencial",
    location: "Clínica LIV Faria Lima",
    status: "Consulta agendada",
    source:
      "WhatsApp — opção de horário escolhida pela paciente",
  });
});

test("recognizes a unique weekday and time from the proposed slots", () => {
  const result = detectPatientAppointmentSelection({
    currentText: "Terça às 10h funciona para mim",
    recentConversation: [
      {
        role: "assistant",
        text: [
          "1. segunda-feira (03/08/2026) às 08:00",
          "2. terça-feira (04/08/2026) às 10:00",
          "3. quinta-feira (06/08/2026) às 10:00",
        ].join("\n"),
      },
    ],
  });

  assert.equal(result?.scheduledDate, "2026-08-04");
  assert.equal(result?.scheduledTime, "10:00");
});

test("does not choose an ambiguous or unoffered slot", () => {
  const context = [
    {
      role: "assistant",
      text: [
        "1. segunda-feira (03/08/2026) às 08:00",
        "2. terça-feira (04/08/2026) às 10:00",
        "3. quinta-feira (06/08/2026) às 10:00",
      ].join("\n"),
    },
  ];

  assert.equal(
    detectPatientAppointmentSelection({
      currentText: "Pode ser às 10h",
      recentConversation: context,
    }),
    null,
  );
  assert.equal(
    detectPatientAppointmentSelection({
      currentText: "Prefiro sexta às 11h",
      recentConversation: context,
    }),
    null,
  );
});

test("builds a complete deterministic booking confirmation", () => {
  const reply = buildBookedAppointmentReply({
    patientName: "Maria Silva",
    scheduledDate: "2026-08-04",
    scheduledTime: "10:00",
    professional: "Dra. Amanda",
    location: "Clínica LIV Faria Lima",
  });

  assert.match(reply, /^Perfeito, Maria!/);
  assert.match(reply, /terça-feira, 4 de agosto/);
  assert.match(reply, /às 10h/);
  assert.match(reply, /Clínica LIV Faria Lima/);
  assert.match(reply, /enviaremos um lembrete/);
});
