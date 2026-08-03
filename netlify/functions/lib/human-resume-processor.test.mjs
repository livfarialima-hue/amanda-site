import assert from "node:assert/strict";
import test from "node:test";
import { processHumanResumeJob } from "../human-resume.mjs";
import { HUMAN_RESUME_HOLDING_MESSAGE } from "./human-resume-policy.mjs";

const NOW = Date.parse("2026-07-28T15:30:00.000Z");
const NIGHT_NOW = Date.parse("2026-07-29T00:31:00.000Z");
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
    receivedAt: "2026-07-28T15:00:00.000Z",
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
    readConversationTurnsImpl: async () => ({
      status: "completed",
      turns: [],
    }),
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

test("inactive automation reschedules the job without attempting a reply", async () => {
  const deps = dependencies();
  const reschedules = [];
  deps.rescheduleHumanResumeImpl = async (input, dueAt) => {
    reschedules.push({ input, dueAt });
    return { status: "rescheduled" };
  };

  const result = await processHumanResumeJob(job(), {
    env: {
      ...ACTIVE_ENV,
      WHATSAPP_AUTOMATION_MODE: "shadow",
    },
    now: NOW,
    ...deps,
  });

  assert.equal(result.status, "automation_inactive");
  assert.equal(reschedules.length, 1);
  assert.equal(deps.patientMessages.length, 0);
});

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

test("a known patient coordination receives a short contextual acknowledgment", async () => {
  const deps = dependencies();
  const result = await processHumanResumeJob(
    job({
      patientName: "Geraldo",
      text:
        "Tudo bem? Eu acho que pode emitir sim. Vou tentar acessar os exames, se conseguir te passo, OK?",
      recentConversation: [
        {
          role: "assistant",
          source: "equipe_humana",
          text: "Estou te devendo uma NF também. Posso emitir?",
        },
        {
          role: "patient",
          source: "paciente",
          text:
            "Tudo bem? Eu acho que pode emitir sim. Vou tentar acessar os exames, se conseguir te passo, OK?",
        },
      ],
    }),
    {
      env: ACTIVE_ENV,
      now: NOW,
      ...deps,
    },
  );

  assert.equal(result.status, "bruna_resumed");
  assert.equal(deps.alerts.length, 0);
  assert.equal(deps.patientMessages.length, 1);
  assert.equal(
    deps.patientMessages[0].body,
    "Perfeito, Geraldo. Pode nos enviar os exames quando conseguir.",
  );
  assert.equal(deps.memory.length, 1);
});

test("a safe active conversation continues at night", async () => {
  const deps = dependencies();
  deps.runOpenAIShadowImpl = async () => ({
    status: "completed",
    decision: {
      route: "standard_reply",
      confidence: "high",
      automaticAllowed: true,
      urgent: false,
      suggestedReply:
        "Claro. A consulta serve para entender seus objetivos e esclarecer as possibilidades com calma.",
      reviewReason: "",
    },
  });

  const result = await processHumanResumeJob(job(), {
    env: ACTIVE_ENV,
    now: NIGHT_NOW,
    ...deps,
  });

  assert.equal(result.status, "bruna_resumed");
  assert.equal(deps.patientMessages.length, 1);
  assert.equal(deps.alerts.length, 0);
  assert.match(
    deps.patientMessages[0].body,
    /consulta serve para entender/,
  );
});

test("surgical price acknowledges the patient and alerts the reviewer with a suggestion", async () => {
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
  assert.equal(result.holdingSent, true);
  assert.equal(deps.patientMessages.length, 1);
  assert.match(
    deps.patientMessages[0].body,
    /faixa de referência para o lifting facial/,
  );
  assert.match(
    deps.patientMessages[0].body,
    /possibilidades de pagamento/,
  );
  assert.doesNotMatch(deps.patientMessages[0].body, /R\$/);
  assert.equal(deps.alerts.length, 1);
  assert.match(
    deps.alerts[0].messageText,
    /A mensagem de espera foi enviada uma única vez/,
  );
  assert.match(
    deps.alerts[0].messageText,
    /entre R\$ 33 mil e R\$ 42 mil/,
  );
  assert.match(
    deps.alerts[0].messageText,
    /pagamento antecipado até a cirurgia/,
  );
  assert.match(
    deps.alerts[0].messageText,
    /utm_source=whatsapp/,
  );
  assert.match(
    deps.alerts[0].messageText,
    /verificar um horário para a avaliação/,
  );
  assert.ok(deps.alerts[0].messageText.length <= 1_024);
  assert.equal(
    deps.completions[0].options.controlStatus,
    "waiting_human",
  );
});

test("surgical price resume does not suggest the facial guide twice", async () => {
  const deps = dependencies();
  const result = await processHumanResumeJob(
    job({
      text: "Quanto custa o lifting facial?",
      recentConversation: [
        {
          role: "assistant",
          source: "equipe_humana",
          text:
            "Guia: https://draamandaschroeder.com.br/conteudos/quanto-custa-cirurgia-plastica-facial-sao-paulo/",
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
  assert.match(
    deps.alerts[0].messageText,
    /entre R\$ 33 mil e R\$ 42 mil/,
  );
  assert.doesNotMatch(
    deps.alerts[0].messageText,
    /quanto-custa-cirurgia-plastica-facial-sao-paulo/,
  );
});

test("a surgical price request at night acknowledges receipt and defers the value", async () => {
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
      now: NIGHT_NOW,
      ...deps,
    },
  );

  assert.equal(result.status, "waiting_human");
  assert.equal(result.holdingSent, true);
  assert.equal(deps.patientMessages.length, 1);
  assert.match(
    deps.patientMessages[0].body,
    /faixa de referência para o lifting facial/,
  );
  assert.match(
    deps.patientMessages[0].body,
    /te retorno pela manhã/,
  );
  assert.doesNotMatch(
    deps.patientMessages[0].body,
    /R\$/,
  );
  assert.equal(deps.alerts.length, 1);
  assert.match(
    deps.alerts[0].messageText,
    /entre R\$ 33 mil e R\$ 42 mil/,
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

test("a reply sent after the patient message cancels a stale resume job", async () => {
  const deps = dependencies();
  deps.readConversationTurnsImpl = async () => ({
    status: "completed",
    turns: [
      {
        role: "user",
        source: "patient",
        text: "Pode ser realizado pelo convênio?",
        at: "2026-07-28T15:00:00.000Z",
      },
      {
        role: "assistant",
        source: "human",
        text: "Pode ser avaliado durante a consulta.",
        at: "2026-07-28T15:01:00.000Z",
      },
    ],
  });
  deps.runOpenAIShadowImpl = async () => {
    throw new Error("AI must not run after the question was answered");
  };

  const result = await processHumanResumeJob(job(), {
    env: ACTIVE_ENV,
    now: NOW,
    ...deps,
  });

  assert.equal(result.status, "superseded");
  assert.equal(result.reason, "newer_outbound_reply");
  assert.equal(deps.patientMessages.length, 0);
  assert.equal(deps.alerts.length, 0);
  assert.equal(
    deps.completions[0].options.controlStatus,
    "human_active",
  );
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

test("thinking and promising to return later stays silent even after a clinic question", async () => {
  const deps = dependencies();
  const result = await processHumanResumeJob(
    job({
      text:
        "Legal, obrigada. Ainda estou pensando mas qlqr coisa volto com vc",
      recentConversation: [
        {
          role: "assistant",
          source: "equipe_humana",
          text: "Você gostaria que eu verificasse mais alguma informação?",
        },
        {
          role: "patient",
          source: "paciente",
          text:
            "Legal, obrigada. Ainda estou pensando mas qlqr coisa volto com vc",
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
