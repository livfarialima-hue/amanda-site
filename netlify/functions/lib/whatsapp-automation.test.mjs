import assert from "node:assert/strict";
import test from "node:test";
import {
  enrichAutomationPlanFromConversation,
  planAutomation,
} from "./whatsapp-automation.mjs";

test("possible urgency never authorizes a patient response", () => {
  const plan = planAutomation({
    text: "Estou com falta de ar e muita dor no peito",
    messageType: "text",
    reference: "WHATSAPP-DIRETO-SEM-CODIGO",
    platform: "WhatsApp direto",
  });

  assert.deepEqual(plan, {
    route: "human_review",
    reason: "possible_urgent_symptoms",
    replyCode: "ALERT-URG-01",
    professional: null,
    procedure: null,
    automaticAllowed: false,
  });
});

test("known procedure remains eligible for a standard reply", () => {
  const plan = planAutomation({
    text: "Gostaria de saber sobre blefaroplastia",
    messageType: "text",
    reference: "WHATSAPP-DIRETO-SEM-CODIGO",
    platform: "WhatsApp direto",
  });

  assert.equal(plan.route, "standard_reply");
  assert.equal(plan.replyCode, "G-BLEF-01");
  assert.equal(plan.automaticAllowed, true);
});

test("existing patient documents are sent to human review without an automatic reply", () => {
  for (const text of [
    "Segue os documentos assinados",
    "Encaminho os exames para dar seguimento ao trâmite da cirurgia",
    "Documentos assinados para o procedimento",
  ]) {
    const plan = planAutomation({
      text,
      messageType: "text",
      reference: "WHATSAPP-DIRETO-SEM-CODIGO",
      platform: "WhatsApp direto",
    });

    assert.equal(plan.route, "human_review");
    assert.equal(
      plan.reason,
      "existing_patient_administrative_followup",
    );
    assert.equal(plan.automaticAllowed, false);
  }
});

test("a repeated greeting shortly after a clinic reply is silent", () => {
  const plan = planAutomation({
    text: "Olá",
    messageType: "text",
    reference: "WHATSAPP-DIRETO-SEM-CODIGO",
    platform: "WhatsApp direto",
  });
  const now = Date.parse("2026-07-27T16:30:00.000Z");
  const enriched = enrichAutomationPlanFromConversation(
    plan,
    [
      {
        role: "assistant",
        source: "bruna",
        text: "Boa tarde, Rosana! Como posso ajudar?",
        at: "2026-07-27T16:29:00.000Z",
      },
    ],
    now,
  );

  assert.equal(enriched.route, "ignore");
  assert.equal(
    enriched.reason,
    "repeated_greeting_after_recent_reply",
  );
  assert.equal(enriched.automaticAllowed, false);
});

test("a greeting after the short suppression window can restart the conversation", () => {
  const plan = planAutomation({
    text: "Boa tarde",
    messageType: "text",
    reference: "WHATSAPP-DIRETO-SEM-CODIGO",
    platform: "WhatsApp direto",
  });
  const enriched = enrichAutomationPlanFromConversation(
    plan,
    [
      {
        role: "assistant",
        source: "bruna",
        text: "Como posso ajudar?",
        at: "2026-07-27T16:20:00.000Z",
      },
    ],
    Date.parse("2026-07-27T16:30:00.000Z"),
  );

  assert.equal(enriched.route, "standard_reply");
});

test("incomplete C06 campaign reference still identifies lifting facial", () => {
  const plan = planAutomation({
    text: "Olá! Gostaria de saber mais sobre avaliação com a Dra. Amanda. Ref. M26F01W-C06",
    messageType: "text",
    reference: "M26F01W-C06",
    platform: "Meta",
    referralContext: null,
  });

  assert.equal(plan.route, "standard_reply");
  assert.equal(plan.reason, "known_procedure");
  assert.equal(plan.procedure, "lifting_facial");
  assert.equal(plan.replyCode, "M-C06-WA-01");
  assert.equal(plan.automaticAllowed, true);
});

test("frontoplasty is recognized with its own procedure key", () => {
  const plan = planAutomation({
    text: "Gostaria de saber o valor da frontoplastia",
    messageType: "text",
    reference: "WHATSAPP-DIRETO-SEM-CODIGO",
    platform: "WhatsApp direto",
  });

  assert.equal(plan.route, "standard_reply");
  assert.equal(plan.replyCode, "P-PRECO-01");
  assert.equal(plan.procedure, "frontoplastia");
  assert.equal(plan.automaticAllowed, true);
});

test("generic first message from a Meta ad remains eligible for Bruna", () => {
  const plan = planAutomation({
    text: "Olá, posso obter mais informações sobre isso?",
    messageType: "text",
    reference: "META-DIRETO-SEM-CODIGO",
    platform: "Meta",
    referralContext: {
      sourceType: "ad",
      mediaType: "video",
      headline: "Conheça a Clínica LIV Faria Lima",
    },
  });

  assert.equal(plan.route, "standard_reply");
  assert.equal(plan.reason, "meta_referral_initial_inquiry");
  assert.equal(plan.replyCode, "META-DIR-01");
  assert.equal(plan.professional, "amanda");
  assert.equal(plan.automaticAllowed, true);
});

test("Meta ad context identifies facial evaluation without inventing intent", () => {
  const plan = planAutomation({
    text: "Olá, posso obter mais informações sobre isso?",
    messageType: "text",
    reference: "META-DIRETO-SEM-CODIGO",
    platform: "Meta",
    referralContext: {
      sourceType: "ad",
      mediaType: "video",
      headline: "Como funciona a avaliação facial",
      body: "Entenda a consulta com a Dra. Amanda.",
    },
  });

  assert.equal(plan.route, "standard_reply");
  assert.equal(plan.replyCode, "M-C01-WA-01");
  assert.equal(plan.procedure, "avaliacao_facial");
  assert.equal(plan.professional, "amanda");
});

test("commercial solicitations are ignored before spending on AI", () => {
  for (const text of [
    "Olá, somos uma agência de marketing digital e gostaríamos de apresentar nossos serviços",
    "Tenho uma proposta comercial para a clínica",
    "Gostaria de oferecer nossos serviços de gestão de tráfego",
    "Aceitam parceria de divulgação por permuta?",
  ]) {
    const plan = planAutomation({
      text,
      messageType: "text",
      reference: "WHATSAPP-DIRETO-SEM-CODIGO",
      platform: "WhatsApp direto",
    });

    assert.equal(plan.route, "ignore");
    assert.equal(
      plan.reason,
      "commercial_solicitation_or_partnership",
    );
    assert.equal(plan.automaticAllowed, false);
  }
});

test("patient questions about payment or insurance are not mistaken for sales", () => {
  for (const text of [
    "A consulta aceita convênio?",
    "Posso pagar a cirurgia no cartão?",
    "Quero uma avaliação para aumentar as mamas",
  ]) {
    const plan = planAutomation({
      text,
      messageType: "text",
      reference: "WHATSAPP-DIRETO-SEM-CODIGO",
      platform: "WhatsApp direto",
    });

    assert.notEqual(
      plan.reason,
      "commercial_solicitation_or_partnership",
    );
  }
});

test("a later explicit offer of health insurance is ignored", () => {
  for (const text of [
    "Trabalho com seguros e queria apresentar uma proposta",
    "Gostaria de oferecer um plano de saúde para a clínica",
  ]) {
    const plan = planAutomation({
      text,
      messageType: "text",
      reference: "META-DIRETO-SEM-CODIGO",
      platform: "Meta",
      referralContext: {
        sourceType: "ad",
        headline: "Avaliação facial",
      },
    });

    assert.equal(plan.route, "ignore");
    assert.equal(
      plan.reason,
      "commercial_solicitation_or_partnership",
    );
  }
});

test("personal invitations and unrelated small talk are ignored", () => {
  for (const text of [
    "Dra Amanda, vamos almoçar amanhã?",
    "Queria te convidar para jantar",
    "A Dra Amanda está solteira?",
    "Me passa seu Instagram pessoal",
    "Qual o seu signo?",
    "Vai chover hoje?",
  ]) {
    const plan = planAutomation({
      text,
      messageType: "text",
      reference: "WHATSAPP-DIRETO-SEM-CODIGO",
      platform: "WhatsApp direto",
    });

    assert.equal(plan.route, "ignore");
    assert.equal(plan.reason, "irrelevant_or_personal_contact");
    assert.equal(plan.automaticAllowed, false);
  }
});

test("recovery questions containing lunch or leaving remain available for review", () => {
  for (const text of [
    "Posso almoçar normalmente depois da cirurgia?",
    "Quando posso sair de casa no pós-operatório?",
  ]) {
    const plan = planAutomation({
      text,
      messageType: "text",
      reference: "WHATSAPP-DIRETO-SEM-CODIGO",
      platform: "WhatsApp direto",
    });

    assert.notEqual(plan.reason, "irrelevant_or_personal_contact");
  }
});

test("an unrelated short direct message is no longer treated as a clinic inquiry", () => {
  const plan = planAutomation({
    text: "Qual seu time?",
    messageType: "text",
    reference: "WHATSAPP-DIRETO-SEM-CODIGO",
    platform: "WhatsApp direto",
  });

  assert.notEqual(plan.reason, "short_direct_initial_inquiry");
  assert.equal(plan.automaticAllowed, false);
});

test("recent conversation preserves Amanda and the procedure on a continuation", () => {
  const currentPlan = planAutomation({
    text: "Consigo de manhã segunda e quinta",
    messageType: "text",
    reference: "WHATSAPP-DIRETO-SEM-CODIGO",
    platform: "WhatsApp direto",
  });
  const enriched = enrichAutomationPlanFromConversation(currentPlan, [
    {
      role: "patient",
      source: "paciente",
      text: "Quero saber sobre blefaroplastia",
    },
    {
      role: "assistant",
      source: "bruna",
      text: "Quais dias e períodos costumam ser melhores para você?",
    },
  ]);

  assert.equal(enriched.route, "standard_reply");
  assert.equal(enriched.professional, "amanda");
  assert.equal(enriched.procedure, "blefaroplastia");
});
