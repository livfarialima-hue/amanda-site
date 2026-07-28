import assert from "node:assert/strict";
import test from "node:test";
import { processHumanResumeJob } from "../human-resume.mjs";
import { HUMAN_RESUME_HOLDING_MESSAGE } from "./human-resume-policy.mjs";

const NOW = Date.parse("2026-07-28T15:30:00.000Z");
const ACTIVE_ENV = {
  WHATSAPP_AUTOMATION_MODE: "active",
  HUMAN_RESUME_TIME_ZONE: "America/Sao_Paulo",
  HUMAN_RESUME_START_HOUR: "8",
  HUMAN_RESUME_END_HOUR: "20",
  OPENAI_API_KEY: "test-key",
};

function job(overrides = {}) {
  return {
    queueKey: "pending/test",
    claimToken: "claim-1",
    generation: "human-1",
    phone: "+5511900000000",
    from: "+5511961957144",
    eventId: "patient-1",
    patientName: "Maria",
    text: "Como funciona a consulta?",
    messageType: "text",
    platform: "WhatsApp direto",
    reference: "WHATSAPP-DIRETO-SEM-CODIGO",
    referenceCategory: "direct",
    procedure: "lifting_facial",
    referralContext: null,
    recentConversation: [
      {
        role: "assistant",
        source: "equipe_humana",
        text: "Claro, Maria. Fique à vontade.",
      },
      {
        role: "patient",
        source: "paciente",
        text: "Como funciona a consulta?",
      },
    ],
    ...overrides,
  };
}

function dependencies() {
  const patientMessages = [];
  const alerts = [];
  const completions = [];
  const memory = [];

  return {
    patientMessages,
    alerts,
    completions,
    memory,
    isHumanResumeClaimCurrentImpl: async () => true,
    sendYCloudPatientTextImpl: async (input) => {
      patientMessages.push(input);
      return { status: "completed" };
    },
    sendYCloudReviewAlertImpl: async (input) => {
      alerts.push(input);
      return { status: "completed" };
    },
    appendConversationTurnImpl: async (input) => {
      memory.push(input);
      return { status: "completed" };
    },
    completeHumanResumeImpl: async (input, options) => {
      completions.push({ input, options });
      return { status: "completed" };
    },
  };
}

test("a safe high-confidence answer resumes Bruna without an alert", async () => {
  const deps = dependencies();
  deps.runOpenAIShadowImpl = async () => ({
    status: "completed",
    decision: {
      route: "standard_reply",
      confidence: "high",
      automaticAllowed: true,
      urgent: false,
      suggestedReply:
        "A consulta é individual e serve para entender seus objetivos.",
      reviewReason: "",
    },
  });

  const result = await processHumanResumeJob(job(), {
    env: ACTIVE_ENV,
    now: NOW,
    ...deps,
  });

  assert.equal(result.status, "bruna_resumed");
  assert.equal(deps.patientMessages.length, 1);
  assert.equal(deps.alerts.length, 0);
  assert.equal(
    deps.completions[0].options.controlStatus,
    "bruna_resumed",
  );
});

test("surgical price stays silent and alerts the reviewer", async () => {
  const deps = dependencies();
  const result = await processHumanResumeJob(
    job({
      text: "Quanto custa o lifting facial?",
      recentConversation: [
        {
          role: "assistant",
          source: "equipe_humana",
          text: "O lifting é avaliado individualmente.",
        },
        {
          role: "patient",
          source: "paciente",
          text: "Quanto custa o lifting facial?",
        },
      ],
    }),
    {
      env: ACTIVE_ENV,
      now: NOW,
      ...deps,
    },
  );

  assert.equal(result.status, "waiting_human");
  assert.equal(result.holdingSent, false);
  assert.equal(deps.patientMessages.length, 0);
  assert.equal(deps.alerts.length, 1);
  assert.match(
    deps.alerts[0].messageText,
    /Nenhuma mensagem automática foi enviada/,
  );
  assert.equal(
    deps.completions[0].options.controlStatus,
    "waiting_human",
  );
});

test("low confidence sends one holding message and one alert", async () => {
  const deps = dependencies();
  deps.runOpenAIShadowImpl = async () => ({
    status: "completed",
    decision: {
      route: "human_review",
      confidence: "medium",
      automaticAllowed: false,
      urgent: false,
      suggestedReply: "",
      reviewReason: "needs_confirmation",
    },
  });

  const result = await processHumanResumeJob(job(), {
    env: ACTIVE_ENV,
    now: NOW,
    ...deps,
  });

  assert.equal(result.status, "waiting_human");
  assert.equal(result.holdingSent, true);
  assert.equal(deps.patientMessages.length, 1);
  assert.equal(
    deps.patientMessages[0].body,
    HUMAN_RESUME_HOLDING_MESSAGE,
  );
  assert.equal(deps.alerts.length, 1);
  assert.equal(
    deps.completions[0].options.controlStatus,
    "waiting_human",
  );
});

test("low confidence without a pending request alerts without an awkward holding message", async () => {
  const deps = dependencies();
  const result = await processHumanResumeJob(
    job({
      text: "Entendi, vou pensar com calma",
      recentConversation: [
        {
          role: "assistant",
          source: "equipe_humana",
          text: "Aqui estão as informações sobre a consulta.",
        },
        {
          role: "patient",
          source: "paciente",
          text: "Entendi, vou pensar com calma",
        },
      ],
    }),
    {
      env: ACTIVE_ENV,
      now: NOW,
      ...deps,
    },
  );

  assert.equal(result.status, "waiting_human");
  assert.equal(result.holdingSent, false);
  assert.equal(deps.patientMessages.length, 0);
  assert.equal(deps.alerts.length, 1);
  assert.match(
    deps.alerts[0].messageText,
    /REVISAR CONVERSA/,
  );
  assert.match(
    deps.alerts[0].messageText,
    /Nenhuma mensagem automática foi enviada/,
  );
});

test("new human activity cancels the automatic send and alert", async () => {
  const deps = dependencies();
  deps.isHumanResumeClaimCurrentImpl = async () => false;
  deps.runOpenAIShadowImpl = async () => ({
    status: "completed",
    decision: {
      route: "standard_reply",
      confidence: "high",
      automaticAllowed: true,
      urgent: false,
      suggestedReply: "Resposta que não deve ser enviada.",
      reviewReason: "",
    },
  });

  const result = await processHumanResumeJob(job(), {
    env: ACTIVE_ENV,
    now: NOW,
    ...deps,
  });

  assert.equal(result.status, "superseded");
  assert.equal(deps.patientMessages.length, 0);
  assert.equal(deps.alerts.length, 0);
  assert.equal(deps.completions.length, 0);
});

test("an acknowledgment after a human booking confirmation stays silent", async () => {
  const deps = dependencies();
  const result = await processHumanResumeJob(
    job({
      text: "Ok obrigada",
      recentConversation: [
        {
          role: "assistant",
          source: "equipe_humana",
          text: "Pode sim! Remanejamos e dá pra te receber às 11h.",
        },
        {
          role: "patient",
          source: "paciente",
          text: "Ok obrigada",
        },
      ],
    }),
    {
      env: ACTIVE_ENV,
      now: NOW,
      ...deps,
    },
  );

  assert.equal(result.status, "no_action");
  assert.equal(deps.patientMessages.length, 0);
  assert.equal(deps.alerts.length, 0);
  assert.equal(
    deps.completions[0].options.controlStatus,
    "human_active",
  );
});
