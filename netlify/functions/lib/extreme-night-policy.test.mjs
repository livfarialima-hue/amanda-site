import assert from "node:assert/strict";
import test from "node:test";
import {
  buildContextualHumanSuggestion,
  buildExtremeNightAcknowledgement,
  buildExtremeNightEmailAlert,
  buildMorningResumeOpening,
  buildMorningProcedureInterestOpening,
  hasExtremeNightAcknowledgement,
  isExtremeNight,
  isExtremeNightAcknowledgement,
} from "./extreme-night-policy.mjs";

const ENV = {
  HUMAN_RESUME_TIME_ZONE: "America/Sao_Paulo",
};

test("the extreme-night window is exactly midnight through 5:59 in São Paulo", () => {
  assert.equal(
    isExtremeNight("2026-08-18T03:00:00.000Z", ENV),
    true,
  );
  assert.equal(
    isExtremeNight("2026-08-18T08:59:00.000Z", ENV),
    true,
  );
  assert.equal(
    isExtremeNight("2026-08-18T09:00:00.000Z", ENV),
    false,
  );
  assert.equal(
    isExtremeNight("2026-08-18T02:59:00.000Z", ENV),
    false,
  );
  assert.equal(isExtremeNight("", ENV), false);
});

test("a cervical price inquiry receives one short contextual night receipt", () => {
  const reply = buildExtremeNightAcknowledgement({
    patientName: "Lia Teste",
    procedure: "lifting_cervical",
    currentText: "Papada, valor?",
  });

  assert.match(reply, /^Olá, Lia!/);
  assert.match(reply, /valores de lifting cervical/i);
  assert.match(reply, /já é madrugada/i);
  assert.match(reply, /pela manhã/i);
  assert.equal(Array.from(reply).length < 260, true);
  assert.equal(isExtremeNightAcknowledgement(reply), true);
  assert.equal(
    hasExtremeNightAcknowledgement([
      { role: "assistant", source: "bruna", text: reply },
    ]),
    true,
  );
});

test("a nighttime photo receives a short and human acknowledgement", () => {
  const reply = buildExtremeNightAcknowledgement({
    patientName: "Mariana",
    messageType: "image",
  });

  assert.match(reply, /Obrigada por compartilhar sua foto e confiar na equipe/i);
  assert.match(reply, /mensagem sinalizada/i);
  assert.match(reply, /pela manhã/i);
  assert.doesNotMatch(reply, /momento pessoal|sem concluir diagnóstico/i);
});

test("the morning opening uses the actual papada and value context", () => {
  const reply = buildMorningResumeOpening({
    patientName: "Lia Teste",
    procedure: "lifting_cervical",
    currentText: "Amanhã conversamos, melhor né?",
    recentConversation: [
      { role: "patient", text: "Papada, valor?" },
      { role: "patient", text: "Qual valor da consulta?" },
    ],
  });

  assert.match(reply, /^Bom dia, Lia!/);
  assert.match(reply, /consulta presencial com a Dra\. Amanda custa R\$ 500/i);
  assert.doesNotMatch(reply, /procedimento para papada|predomina|\?/i);
});

test("a generic procedure lead receives a useful contextual morning continuation", () => {
  const reply = buildMorningProcedureInterestOpening({
    patientName: "Marisa Barbosa MOTORISTA",
    procedure: "lifting_facial",
    currentText:
      "Olá! Quero saber sobre lifting facial com a Dra. Amanda. Ref. M26F01W-C06H01",
  });

  assert.match(reply, /^Bom dia, Marisa!/);
  assert.match(reply, /retomando sua mensagem sobre lifting facial/i);
  assert.match(reply, /avaliação com a Dra\. Amanda/i);
  assert.match(reply, /Quer que eu te explique como ela funciona\?/i);
  assert.doesNotMatch(reply, /Ref\.|M26F01W|o que você gostaria de entender/i);
});

test("an evaluation request about ninfoplastia stays reserved and answers the request", () => {
  const reply = buildMorningProcedureInterestOpening({
    patientName: "Gessica",
    procedure: "ninfoplastia",
    currentText:
      "Tenho interesse em ninfoplastia e gostaria de entender melhor como funciona a avaliação.",
  });

  assert.match(reply, /^Bom dia, Gessica!/);
  assert.match(reply, /individual e reservada/i);
  assert.match(reply, /possibilidades, os limites e a recuperação/i);
  assert.doesNotMatch(reply, /foto|detalhes íntimos|como ela funciona\?/i);
});

test("a specific procedure question is not replaced by the generic morning opening", () => {
  const reply = buildMorningProcedureInterestOpening({
    patientName: "Marisa",
    procedure: "lifting_facial",
    currentText: "Quero saber qual é o valor do lifting facial.",
  });

  assert.equal(reply, "");
});

test("email fallback is actionable and never repeats the old generic placeholder", () => {
  const suggestion = buildContextualHumanSuggestion({
    patientName: "Lia Teste",
    messageText: "Papada, valor?",
    procedure: "lifting_cervical",
  });
  const alert = buildExtremeNightEmailAlert({
    patientName: "Lia Teste",
    messageText: "Papada, valor?",
    procedure: "lifting_cervical",
    acknowledgementSent: true,
  });

  assert.match(suggestion, /valor de lifting cervical/i);
  assert.doesNotMatch(suggestion, /predomina|consulta ou da cirurgia/i);
  assert.doesNotMatch(suggestion, /conferir essa informação/i);
  assert.match(alert, /RETOMAR PELA MANHÃ/);
  assert.match(alert, /Não enviar outra mensagem durante a madrugada/);
  assert.match(alert, /Sugestão contextual para copiar após revisar/);
});

test("an explicit request to continue tomorrow produces a contextual morning draft", () => {
  const alert = buildExtremeNightEmailAlert({
    patientName: "Lia Teste",
    messageText: "Já está muito tarde. Amanhã a gente conversa, melhor né?",
    procedure: "lifting_cervical",
    recentConversation: [
      { role: "patient", text: "Papada, valor?" },
      { role: "patient", text: "Qual valor da consulta?" },
    ],
    acknowledgementSent: false,
  });

  assert.match(alert, /Nenhuma mensagem foi enviada/);
  assert.match(alert, /Bom dia, Lia!/);
  assert.match(alert, /consulta presencial com a Dra\. Amanda custa R\$ 500/i);
  assert.doesNotMatch(alert, /procedimento para papada|predomina/i);
  assert.doesNotMatch(alert, /conferir essa informação/i);
});

test("an explicit night pause preserves a prior generic procedure interest for morning", () => {
  const reply = buildMorningResumeOpening({
    patientName: "Marisa",
    procedure: "lifting_facial",
    currentText: "Amanhã a gente conversa, melhor né?",
    recentConversation: [
      {
        role: "patient",
        text: "Quero saber sobre lifting facial com a Dra. Amanda.",
      },
    ],
  });

  assert.match(reply, /^Bom dia, Marisa!/);
  assert.match(reply, /retomando sua mensagem sobre lifting facial/i);
  assert.match(reply, /Quer que eu te explique como ela funciona\?/i);
});

test("a receipt from another night does not suppress the current night", () => {
  const reply = buildExtremeNightAcknowledgement({
    patientName: "Lia Teste",
    procedure: "lifting_cervical",
    currentText: "Papada, valor?",
  });

  assert.equal(
    hasExtremeNightAcknowledgement(
      [
        {
          role: "assistant",
          text: reply,
          at: "2026-08-17T04:31:00.000Z",
        },
      ],
      "2026-08-18T04:31:00.000Z",
      ENV,
    ),
    false,
  );
});
