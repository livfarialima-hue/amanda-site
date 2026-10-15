import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAppointmentSuggestion,
  isAppointmentOfferAcceptance,
  isAppointmentPreferenceReply,
  isAppointmentAlertEnabled,
  selectAppointmentSlots,
} from "./appointment-suggestions.mjs";

test("formats exactly two real appointment options for review", () => {
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
  assert.doesNotMatch(text, /quarta-feira \(29\/07\/2026\) às 13:00/);
  assert.doesNotMatch(text, /14:00/);
  assert.match(text, /duas opções reais na agenda/);
  assert.match(text, /Alguma delas funciona para você/);
});

test("reports a missing schedule with a safe patient suggestion", () => {
  const text = buildAppointmentSuggestion({
    patientName: "Maria Silva",
    professional: "daniel",
    procedure: "",
    slots: [],
  });

  assert.match(text, /revisão necessária/);
  assert.match(text, /Não há horários disponíveis/);
  assert.match(text, /Sugestão para copiar ao paciente/);
  assert.match(text, /Vou conferir os horários disponíveis/);
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

test("prioritizes two slots compatible with weekday and period", () => {
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
    ],
  );
});

test("recognizes acceptance after Bruna offers to check two real slots", () => {
  const history = [{
    role: "assistant",
    source: "bruna",
    text: "Posso verificar duas opções reais de horário para você?",
  }];

  assert.equal(isAppointmentOfferAcceptance("Sim, por favor", history), true);
  assert.equal(isAppointmentOfferAcceptance("Sim, por favor", []), false);
  assert.equal(
    isAppointmentOfferAcceptance("Quero entender os riscos", history),
    false,
  );
});

test("short acceptance requires one offer object and cannot select between coordinated CTAs", () => {
  for (const text of [
    "Posso explicar a consulta ou verificar horários?",
    "Posso verificar horários ou explicar a consulta?",
    "Posso verificar horários e explicar a consulta?",
    "Posso verificar horários? Qual período prefere?",
    "Posso verificar horários? Posso explicar a consulta?",
    "Posso passar a faixa de valores ou verificar horários?",
    "Posso verificar horários ou enviar o endereço?",
    "Posso enviar o endereço ou verificar horários?",
    "Posso verificar duas opções reais de horário e enviar o endereço?",
    "Posso enviar o valor da consulta ou verificar horários?",
    "Posso verificar horários. Você entendeu o valor?",
    "Posso verificar horários, enviar o endereço?",
    "Posso verificar horários; enviar o endereço?",
    "Posso explicar como agendar uma consulta?",
    "Posso enviar o endereço, verificar horários?",
    "Posso enviar o endereço; verificar horários?",
    "Posso enviar o endereço ou, se preferir, verificar horários?",
    "A médica avalia o rosto e o pescoço, posso verificar horários para você?",
  ]) {
    assert.equal(isAppointmentOfferAcceptance("Sim", [{ role: "assistant", source: "equipe_humana", text }]), false, text);
  }
});

test("a declarative consultation explanation does not invalidate a single availability offer", () => {
  for (const text of [
    "Na consulta, a médica avalia o rosto e o pescoço. Posso verificar horários para você?",
    "A consulta custa R$ 500. Você gostaria de verificar os próximos horários disponíveis?",
    "Na consulta, a médica explica as possibilidades e os limites. Posso verificar duas opções reais de horário?",
    "Posso verificar horários ou consultar a disponibilidade?",
    "Posso mostrar duas opções de horário?",
    "Posso mostrar os horários disponíveis?",
    "Posso verificar horários para manhã e tarde?",
    "Posso verificar horários da Dra. Amanda?",
    "Posso verificar horários do Dr. Daniel?",
    "A consulta custa R$ 500. Se quiser, posso verificar opções de horário com a equipe.",
  ]) {
    assert.equal(isAppointmentOfferAcceptance("Sim", [{ role: "assistant", source: "equipe_humana", text }]), true, text);
  }
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
