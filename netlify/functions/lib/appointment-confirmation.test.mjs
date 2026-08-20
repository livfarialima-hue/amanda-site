import assert from "node:assert/strict";
import test from "node:test";
import {
  buildBookedAppointmentReply,
  detectConfirmedAppointment,
  detectManualAppointment,
  detectPatientAppointmentSelection,
  detectPatientAppointmentReply,
  isManualAppointmentSyncCommand,
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

test("recognizes attendance confirmation with a greeting and does not book the slot again", () => {
  const context = [
    {
      role: "assistant",
      source: "equipe_humana",
      text:
        "Bom dia, tudo bem? Você tem um horário agendado com a Dra. Amanda hoje às 15:00. Posso confirmar sua presença?",
    },
    {
      role: "user",
      text: "Bom dia! Pode sim",
    },
  ];

  assert.equal(
    detectPatientAppointmentSelection({
      currentText: "Bom dia! Pode sim",
      recentConversation: context,
      at: "2026-08-13T09:59:00-03:00",
    }),
    null,
  );
  assert.deepEqual(
    detectPatientAppointmentReply({
      currentText: "Bom dia! Pode sim",
      recentConversation: context,
      at: "2026-08-13T09:59:00-03:00",
    }),
    {
      scheduledDate: "2026-08-13",
      scheduledTime: "15:00",
      state: "confirmed",
    },
  );
});

test("uses an existing scheduled relationship when the reminder is absent from memory", () => {
  assert.deepEqual(
    detectPatientAppointmentReply({
      currentText: "Bom dia! Pode sim",
      recentConversation: [],
      at: "2026-08-13T09:59:00-03:00",
      appointmentScheduled: true,
    }),
    { state: "confirmed" },
  );
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
    at: "2026-08-02T10:00:00-03:00",
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

test("resolves weekday plus day-of-month against the offered slot instead of the next weekday", () => {
  const result = detectPatientAppointmentSelection({
    currentText: "Quinta 24 às 14",
    at: "2026-08-20T09:21:00-03:00",
    recentConversation: [
      {
        role: "assistant",
        at: "2026-08-20T08:26:00-03:00",
        text: [
          "Na última semana de setembro temos horários:",
          "Segunda 21/09 às 10:00",
          "Terça 22/09 às 15:00",
          "Quinta 24/09 às 14:00",
        ].join("\n"),
      },
    ],
  });

  assert.equal(result?.scheduledDate, "2026-09-24");
  assert.equal(result?.scheduledTime, "14:00");
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

test("captures a manually negotiated slot from natural conversation", () => {
  const recentConversation = [
    {
      role: "assistant",
      at: "2026-08-01T15:40:04-03:00",
      text: [
        "Temos segunda 03/08 às 10h",
        "segunda 10/08 às 10h",
        "sexta 28/08 às 14h.",
      ].join("\n"),
    },
    {
      role: "assistant",
      at: "2026-08-01T17:45:27-03:00",
      text: "Consegui segunda às 08h, te atenderia?",
    },
    {
      role: "assistant",
      at: "2026-08-01T17:47:18-03:00",
      text: "Caso sábado fique melhor, dia 22/08 às 08h também é possível.",
    },
    { role: "user", text: "essa segunda agora?" },
    { role: "user", text: "pode sim" },
  ];

  const result = detectPatientAppointmentSelection({
    currentText: "pode sim",
    recentConversation,
    at: "2026-08-01T18:08:04-03:00",
  });

  assert.equal(result?.scheduledDate, "2026-08-03");
  assert.equal(result?.scheduledTime, "08:00");
});

test("assembles a day and time negotiated across messages and confirms silently", () => {
  const recentConversation = [
    {
      role: "assistant",
      source: "equipe_humana",
      text: "Temos horário nos dias 12 ou 13.",
    },
    {
      role: "user",
      text: "Pode ser no dia 12, poderia ser às 11h?",
    },
    {
      role: "assistant",
      source: "equipe_humana",
      text: "Este horário está perfeito. Podemos combinar?",
    },
    {
      role: "user",
      text: "Podemos! Combinado",
    },
  ];

  const result = detectPatientAppointmentSelection({
    currentText: "Podemos! Combinado",
    recentConversation,
    at: "2026-08-03T20:56:00-03:00",
  });

  assert.equal(result?.scheduledDate, "2026-08-12");
  assert.equal(result?.scheduledTime, "11:00");
  assert.equal(result?.professional, "Dra. Amanda");
  assert.equal(result?.silentConfirmation, true);
});

test("recognizes the manual closing used after the patient accepted", () => {
  const result = detectManualAppointment({
    currentText: "Combinado então! Agradecemos e até lá",
    at: "2026-08-01T18:08:22-03:00",
    recentConversation: [
      {
        role: "assistant",
        at: "2026-08-01T17:45:27-03:00",
        text: "Consegui segunda às 08h, te atenderia?",
      },
      { role: "user", text: "essa segunda agora?" },
      { role: "user", text: "pode sim" },
    ],
  });

  assert.equal(result?.confidence, "confirmed");
  assert.equal(result?.scheduledDate, "2026-08-03");
  assert.equal(result?.scheduledTime, "08:00");
});

test("treats a complete structured booking receipt as a confirmed Daniel appointment", () => {
  const result = detectManualAppointment({
    currentText: `*Comprovante de Agendamento:*

*Nome:* Paciente Exemplo

*Data:* 18/08/2026 - 3\u00aa Feira
*Hor\u00e1rio:* 14h00
*M\u00e9dico:* Dr. Daniel Added
*Endere\u00e7o:* Rua Pais Leme, 215, Conjunto 710, Pinheiros, S\u00e3o Paulo - SP
*Retorno*: Em at\u00e9 30 dias

*Valor da consulta:* R$ 700,00
*Formas de pagamento:* Dinheiro ou PIX

Atenciosamente, Bruna`,
    at: "2026-08-15T10:00:00-03:00",
  });

  assert.deepEqual(result, {
    patientName: "Paciente Exemplo",
    scheduledDate: "2026-08-18",
    scheduledTime: "14:00",
    professional: "Dr. Daniel",
    consultationType: "Consulta presencial",
    location: "Clínica LIV Faria Lima",
    status: "Consulta agendada",
    source: "WhatsApp - comprovante estruturado de agendamento",
    confidence: "confirmed",
  });
});

test("accepts the same structured receipt for Dra. Amanda", () => {
  const result = detectManualAppointment({
    currentText: `Comprovante de Agendamento:
Nome: Ana Maria
Data: 19/08/2026 - 4\u00aa Feira
Hor\u00e1rio: 09:30
M\u00e9dico: Dra. Amanda Schroeder`,
    at: "2026-08-15T10:00:00-03:00",
  });

  assert.equal(result?.patientName, "Ana Maria");
  assert.equal(result?.professional, "Dra. Amanda");
  assert.equal(result?.scheduledDate, "2026-08-19");
  assert.equal(result?.scheduledTime, "09:30");
  assert.equal(result?.confidence, "confirmed");
});

test("classifies the zero-value Amanda receipt pattern as a procedure", () => {
  const result = detectManualAppointment({
    currentText: `Comprovante de Agendamento:
Nome: Paciente Procedimento
Data: 20/08/2026 - 5ª Feira
Horário: 10h00
Médico: Dra. Amanda Schroeder
Endereço: Rua Pais Leme, 215, Conjunto 710, Pinheiros, São Paulo - SP
Retorno: não se aplica

Valor da consulta: R$ 0,00
Formas de pagamento: não se aplica

Atenciosamente, Bruna`,
    at: "2026-08-17T12:42:00-03:00",
  });

  assert.equal(result?.professional, "Dra. Amanda");
  assert.equal(result?.consultationType, "Procedimento");
  assert.equal(result?.scheduledDate, "2026-08-20");
  assert.equal(result?.scheduledTime, "10:00");
  assert.equal(result?.confidence, "confirmed");
});

test("does not schedule an incomplete or internally inconsistent structured receipt", () => {
  const missingDoctor = detectManualAppointment({
    currentText: `Comprovante de Agendamento:
Nome: Ana Maria
Data: 19/08/2026
Hor\u00e1rio: 09:30`,
    at: "2026-08-15T10:00:00-03:00",
  });
  const wrongWeekday = detectManualAppointment({
    currentText: `Comprovante de Agendamento:
Nome: Ana Maria
Data: 19/08/2026 - 3\u00aa Feira
Hor\u00e1rio: 09:30
M\u00e9dico: Dra. Amanda`,
    at: "2026-08-15T10:00:00-03:00",
  });
  const invalidDate = detectManualAppointment({
    currentText: `Comprovante de Agendamento:
Nome: Ana Maria
Data: 31/02/2026
Hor\u00e1rio: 09:30
M\u00e9dico: Dra. Amanda`,
    at: "2026-01-15T10:00:00-03:00",
  });

  assert.equal(missingDoctor, null);
  assert.equal(wrongWeekday, null);
  assert.equal(invalidDate, null);
});

test("does not schedule a structured receipt for an unsupported professional", () => {
  const result = detectManualAppointment({
    currentText: `Comprovante de Agendamento:
Nome: Ana Maria
Data: 19/08/2026
Hor\u00e1rio: 09:30
M\u00e9dico: Dr. Henrique Lane Staniak`,
    at: "2026-08-15T10:00:00-03:00",
  });

  assert.equal(result, null);
});

test("preserves a confirmed manual appointment when the closing omits the time", () => {
  const result = detectManualAppointment({
    currentText: "Combinado então! Agradecemos e até lá",
    at: "2026-08-01T18:08:22-03:00",
    recentConversation: [
      {
        role: "assistant",
        at: "2026-08-01T17:45:27-03:00",
        text: "Consegui segunda 03/08, te atender?",
      },
      { role: "user", text: "essa segunda agora?" },
      { role: "user", text: "pode sim" },
    ],
  });

  assert.equal(result?.confidence, "confirmed_partial");
  assert.equal(result?.scheduledDate, "2026-08-03");
  assert.equal(result?.scheduledTime, null);
  assert.deepEqual(result?.missingFields, ["scheduledTime"]);
});

test("recognizes the natural negotiation used for a Tuesday evening slot", () => {
  const result = detectManualAppointment({
    currentText: "Combinado!",
    at: "2026-08-01T19:39:20-03:00",
    recentConversation: [
      {
        role: "assistant",
        at: "2026-08-01T19:38:00-03:00",
        text: "Terça às 16h ou 20h funcionaria para você?",
      },
      { role: "user", text: "Às 20 seria ótimo" },
    ],
  });

  assert.equal(result?.confidence, "confirmed");
  assert.equal(result?.scheduledDate, "2026-08-04");
  assert.equal(result?.scheduledTime, "20:00");
});

test("recognizes a sent reminder as an explicit complete appointment record", () => {
  const result = detectManualAppointment({
    currentText:
      "Este é um lembrete da sua consulta com Dra. Amanda, marcada para 03/08/2026, amanhã, às 08:00.",
    at: "2026-08-02T15:08:00-03:00",
    recentConversation: [],
  });

  assert.equal(result?.confidence, "confirmed");
  assert.equal(result?.scheduledDate, "2026-08-03");
  assert.equal(result?.scheduledTime, "08:00");
});

test("never records or blocks a slot for Dr. Henrique Staniak", () => {
  const result = detectManualAppointment({
    currentText:
      "Agendamento confirmado. Nome: José Carlos. Data: 05/08/2026. Horário: 15h00. Médico: Dr. Henrique Lane Staniak.",
    at: "2026-08-03T09:10:00-03:00",
    recentConversation: [],
  });

  assert.equal(result, null);
});

test("the exact manual sync command records an Amanda appointment from context", () => {
  const result = detectManualAppointment({
    currentText: "Confirmado seu agendamento",
    at: "2026-08-04T10:00:00-03:00",
    recentConversation: [
      {
        role: "assistant",
        text: "Tenho 12/08/2026 às 11h com a Dra. Amanda.",
      },
      { role: "user", text: "Pode ser" },
    ],
  });

  assert.equal(
    isManualAppointmentSyncCommand("Confirmado seu agendamento"),
    true,
  );
  assert.equal(result?.confidence, "confirmed");
  assert.equal(result?.professional, "Dra. Amanda");
  assert.equal(result?.scheduledDate, "2026-08-12");
  assert.equal(result?.scheduledTime, "11:00");
});

test("the exact manual sync command records a Daniel appointment from context", () => {
  const result = detectManualAppointment({
    currentText: "Confirmado seu agendamento!",
    at: "2026-08-04T10:00:00-03:00",
    recentConversation: [
      {
        role: "assistant",
        text: "Consulta de cardiologia com o Dr. Daniel em 13/08/2026 às 14h.",
      },
      { role: "user", text: "Perfeito" },
    ],
  });

  assert.equal(result?.confidence, "confirmed");
  assert.equal(result?.professional, "Dr. Daniel");
  assert.equal(result?.scheduledDate, "2026-08-13");
  assert.equal(result?.scheduledTime, "14:00");
});

test("the generic site service picker does not turn an Amanda appointment into Daniel", () => {
  const result = detectManualAppointment({
    currentText: "Confirmado seu agendamento",
    at: "2026-08-04T10:00:00-03:00",
    recentConversation: [
      {
        role: "user",
        text: "Olá, vim pelo site da Clínica LIV. Meu interesse é: cirurgia plástica/estética, cardiologia ou dúvida sobre procedimento. Origem do contato: site LIV Faria Lima",
      },
      {
        role: "assistant",
        text: "Agendamos sua avaliação com a Dra. Amanda em 14/08/2026 às 10h.",
      },
      { role: "user", text: "Combinado" },
    ],
  });

  assert.equal(result?.confidence, "confirmed");
  assert.equal(result?.professional, "Dra. Amanda");
  assert.equal(result?.scheduledDate, "2026-08-14");
  assert.equal(result?.scheduledTime, "10:00");
});

test("the manual sync command never schedules other professionals", () => {
  const result = detectManualAppointment({
    currentText: "Confirmado seu agendamento",
    at: "2026-08-04T10:00:00-03:00",
    recentConversation: [
      {
        role: "assistant",
        text: "Consulta com a Dra. Marina em 13/08/2026 às 14h.",
      },
      { role: "user", text: "Perfeito" },
    ],
  });

  assert.equal(result, null);
});

test("flags a plausible manual closing for email review when acceptance is unclear", () => {
  const result = detectManualAppointment({
    currentText: "Combinado então",
    at: "2026-08-01T18:08:22-03:00",
    recentConversation: [
      {
        role: "assistant",
        at: "2026-08-01T17:45:27-03:00",
        text: "Para a consulta, consegui segunda às 08h. Te atenderia?",
      },
      { role: "user", text: "Vou verificar e aviso" },
    ],
  });

  assert.equal(result?.confidence, "possible");
  assert.equal(result?.scheduledDate, "2026-08-03");
  assert.equal(result?.scheduledTime, "08:00");
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
