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
const INITIAL_PRICE_REPLY =
  "Os valores cirúrgicos são definidos individualmente após a avaliação e o planejamento. Veja o que compõe o valor: https://draamandaschroeder.com.br/conteudos/quanto-custa-lifting-facial-sao-paulo/";

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

test("the initial price information is sent after the human-resume window without an alert", async () => {
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

  assert.equal(result.status, "bruna_resumed");
  assert.equal(result.reason, "price_initial_information");
  assert.equal(deps.patientMessages.length, 1);
  assert.doesNotMatch(
    deps.patientMessages[0].body,
    /R\$ 18 mil|R\$ 26 mil/,
  );
  assert.match(deps.patientMessages[0].body, /é natural querer saber o valor antes de decidir/i);
  assert.match(deps.patientMessages[0].body, /confirma o valor exato após a avaliação/i);
  assert.match(deps.patientMessages[0].body, /o que mais te incomoda hoje no rosto ou no pescoço/i);
  assert.doesNotMatch(deps.patientMessages[0].body, /técnica|complexidade|materiais|https?:\/\//i);
  assert.equal(deps.alerts.length, 0);
  assert.equal(
    deps.completions[0].options.controlStatus,
    "bruna_resumed",
  );
});

test("another surgical price still waits for human review with a complete suggestion", async () => {
  const deps = dependencies();
  deps.sendControlledPatientReplyImpl = async (input) => {
    deps.patientMessages.push(input);
    return { status: "completed" };
  };
  const result = await processHumanResumeJob(
    job({
      eventId: "patient-price-blefaroplasty",
      procedure: "blefaroplastia",
      text: "Quanto custa a blefaroplastia?",
      recentConversation: [
        {
          role: "assistant",
          source: "bruna",
          text: INITIAL_PRICE_REPLY,
        },
        {
          role: "patient",
          source: "paciente",
          text: "Quanto custa a blefaroplastia?",
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
  assert.doesNotMatch(deps.patientMessages[0].body, /R\$/);
  assert.equal(deps.alerts.length, 1);
  assert.match(deps.alerts[0].messageText, /entre R\$ 18 mil e R\$ 23 mil/);
  assert.match(deps.alerts[0].messageText, /segurança, naturalidade/);
  assert.match(deps.alerts[0].messageText, /Prefere manhã ou tarde/);
});

test("direct lifting price resume includes the specific composition guide with the range", async () => {
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

  assert.equal(result.status, "bruna_resumed");
  assert.match(
    deps.patientMessages[0].body,
    /entre R\$ 26 mil e R\$ 42 mil/,
  );
  assert.doesNotMatch(
    deps.patientMessages[0].body,
    /quanto-custa-cirurgia-plastica-facial-sao-paulo/,
  );
  assert.match(
    deps.patientMessages[0].body,
    /quanto-custa-lifting-facial-sao-paulo/,
  );
  assert.match(deps.patientMessages[0].body, /não é orçamento, proposta nem garantia/i);
  assert.match(deps.patientMessages[0].body, /pode ficar fora dessa faixa/i);
  assert.equal(deps.alerts.length, 0);
});

test("the approved lifting price may continue directly at night", async () => {
  const deps = dependencies();
  const result = await processHumanResumeJob(
    job({
      text: "Quanto custa o lifting facial?",
      recentConversation: [
        {
          role: "assistant",
          source: "equipe_humana",
          text: INITIAL_PRICE_REPLY,
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

  assert.equal(result.status, "bruna_resumed");
  assert.equal(deps.patientMessages.length, 1);
  assert.match(
    deps.patientMessages[0].body,
    /Lifting facial: entre R\$ 26 mil e R\$ 42 mil/,
  );
  assert.match(
    deps.patientMessages[0].body,
    /quanto-custa-lifting-facial-sao-paulo/,
  );
  assert.match(deps.patientMessages[0].body, /pode ficar fora dessa faixa/i);
  assert.doesNotMatch(deps.patientMessages[0].body, /retorno pela manhã/);
  assert.equal(deps.alerts.length, 0);
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

test("an attendance confirmation after a human reminder stays silent", async () => {
  const deps = dependencies();
  const result = await processHumanResumeJob(
    job({
      text: "Bom dia! Pode sim",
      recentConversation: [
        {
          role: "assistant",
          source: "equipe_humana",
          text:
            "Você tem um horário agendado com a Dra. Amanda hoje às 15:00. Posso confirmar sua presença?",
        },
        {
          role: "patient",
          source: "paciente",
          text: "Bom dia! Pode sim",
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
  assert.equal(result.reason, "appointment_attendance_confirmed");
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
