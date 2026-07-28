import assert from "node:assert/strict";
import test from "node:test";
import {
  buildConsultationInformationReply,
  buildPatientReply,
  hasPendingReactivationHandoff,
  REACTIVATION_REPLY,
  shouldSendAutomaticPatientReply,
  shouldSendOpenAIPatientReply,
} from "./patient-replies.mjs";

test("builds a natural routing greeting without internal codes", () => {
  const reply = buildPatientReply({
    replyCode: "ORG-DIR-01",
    patientName: "Maria Silva",
  });

  assert.match(reply, /^Olá, Maria!/);
  assert.match(reply, /Dra\. Amanda/);
  assert.match(reply, /Dr\. Daniel/);
  assert.doesNotMatch(reply, /ORG-DIR-01/);
});

test("price fallback is transparent about the consultation and clarifies the requested price", () => {
  const reply = buildPatientReply({
    replyCode: "P-PRECO-01",
    patientName: "Maria",
    procedure: "blefaroplastia",
  });

  assert.match(reply, /preço antes de decidir/);
  assert.match(reply, /consulta presencial/);
  assert.match(reply, /R\$ 500/);
  assert.match(reply, /abatido/);
  assert.match(reply, /faixa atual de blefaroplastia/);
  assert.doesNotMatch(reply, /investimento/);
});

test("explains the consultation directly and uses the specific site material", () => {
  const reply = buildConsultationInformationReply({
    patientName: "Rô de Souza",
    siteResource: {
      url: "https://draamandaschroeder.com.br/conteudos/consulta-cirurgia-plastica/",
    },
  });

  assert.match(reply, /^Olá, Rô! Claro\./);
  assert.match(reply, /Na consulta, a Dra\. Amanda conversa/);
  assert.match(reply, /sem pressupor cirurgia/);
  assert.match(reply, /R\$ 500/);
  assert.match(reply, /abatidos se a cirurgia/);
  assert.match(
    reply,
    /https:\/\/draamandaschroeder\.com\.br\/conteudos\/consulta-cirurgia-plastica\//,
  );
  assert.match(reply, /Posso ver os horários/);
});

test("builds the single fixed notice for a conversation resumed after seven days", () => {
  const reply = buildPatientReply({
    replyCode: "MANUAL-RETURN-7D-01",
    patientName: "Maria",
  });

  assert.equal(reply, REACTIVATION_REPLY);
  assert.match(reply, /direcionar sua mensagem à equipe/);
  assert.match(reply, /continuaremos por aqui/);
});

test("keeps automation silent after the seven-day notice until a human answers", () => {
  assert.equal(
    hasPendingReactivationHandoff([
      {
        role: "assistant",
        source: "bruna",
        text: REACTIVATION_REPLY,
      },
      {
        role: "patient",
        source: "paciente",
        text: "Tudo bem, aguardo",
      },
    ]),
    true,
  );

  assert.equal(
    hasPendingReactivationHandoff([
      {
        role: "assistant",
        source: "bruna",
        text: REACTIVATION_REPLY,
      },
      {
        role: "assistant",
        source: "equipe_humana",
        text: "Olá, vou continuar seu atendimento.",
      },
    ]),
    false,
  );
});

test("blocks automatic sending for schedules, takeover and shadow mode", () => {
  const base = {
    mode: "active",
    plan: {
      route: "standard_reply",
      replyCode: "G-BLEF-01",
      automaticAllowed: true,
    },
    humanTakeoverToday: false,
    exactDuplicate: false,
    schedulingRequest: false,
    reviewAlertConfigured: true,
  };

  assert.equal(shouldSendAutomaticPatientReply(base), true);
  assert.equal(
    shouldSendAutomaticPatientReply({
      ...base,
      schedulingRequest: true,
    }),
    false,
  );
  assert.equal(
    shouldSendAutomaticPatientReply({
      ...base,
      humanTakeoverToday: true,
    }),
    false,
  );
  assert.equal(
    shouldSendAutomaticPatientReply({
      ...base,
      mode: "shadow",
    }),
    false,
  );
});

test("allows the fixed reactivation notice only in active mode", () => {
  const base = {
    mode: "active",
    plan: {
      route: "reactivation_notice",
      replyCode: "MANUAL-RETURN-7D-01",
      automaticAllowed: true,
    },
    humanTakeoverToday: false,
    exactDuplicate: false,
    schedulingRequest: false,
    reviewAlertConfigured: true,
  };

  assert.equal(shouldSendAutomaticPatientReply(base), true);
  assert.equal(
    shouldSendAutomaticPatientReply({
      ...base,
      mode: "shadow",
    }),
    false,
  );
});

test("Daniel greeting requires the internal review alert configuration", () => {
  const plan = {
    route: "daniel_greeting_and_alert",
    replyCode: "DANIEL-ENC-01",
    automaticAllowed: true,
  };

  assert.equal(
    shouldSendAutomaticPatientReply({
      mode: "active",
      plan,
      humanTakeoverToday: false,
      exactDuplicate: false,
      schedulingRequest: false,
      reviewAlertConfigured: false,
    }),
    false,
  );
});

test("active AI reply requires a high-confidence explicit authorization", () => {
  const base = {
    mode: "active",
    plan: {
      route: "standard_reply",
      automaticAllowed: true,
    },
    decision: {
      route: "standard_reply",
      confidence: "high",
      automaticAllowed: true,
      urgent: false,
      suggestedReply: "Olá! Posso te explicar como funciona a avaliação?",
    },
    humanTakeoverToday: false,
    exactDuplicate: false,
    schedulingRequest: false,
  };

  assert.equal(shouldSendOpenAIPatientReply(base), true);
  assert.equal(
    shouldSendOpenAIPatientReply({
      ...base,
      decision: {
        ...base.decision,
        confidence: "medium",
      },
    }),
    false,
  );
  assert.equal(
    shouldSendOpenAIPatientReply({
      ...base,
      decision: {
        ...base.decision,
        automaticAllowed: false,
        route: "human_review",
        suggestedReply: "",
      },
    }),
    false,
  );
});

test("active AI reply remains blocked for schedules and deterministic review", () => {
  const base = {
    mode: "active",
    plan: {
      route: "standard_reply",
      automaticAllowed: true,
    },
    decision: {
      route: "standard_reply",
      confidence: "high",
      automaticAllowed: true,
      urgent: false,
      suggestedReply: "Resposta autorizada.",
    },
    humanTakeoverToday: false,
    exactDuplicate: false,
    schedulingRequest: false,
  };

  assert.equal(
    shouldSendOpenAIPatientReply({
      ...base,
      schedulingRequest: true,
    }),
    false,
  );
  assert.equal(
    shouldSendOpenAIPatientReply({
      ...base,
      plan: {
        route: "human_review",
        automaticAllowed: false,
      },
    }),
    false,
  );
});
