import assert from "node:assert/strict";
import test from "node:test";
import { processHumanResumeJob } from "../human-resume.mjs";
import { HUMAN_RESUME_HOLDING_MESSAGE } from "./human-resume-policy.mjs";

const NOW = Date.parse("2026-07-28T15:30:00.000Z");
const NIGHT_NOW = Date.parse("2026-07-29T00:31:00.000Z");
const EXTREME_NIGHT_NOW = Date.parse("2026-07-29T04:31:00.000Z");
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
  deps.runOpenAIShadowImpl = async () => ({
    status: "completed",
    decision: {
      route: "standard_reply",
      confidence: "high",
      automaticAllowed: true,
      urgent: false,
      replyCode: "COORDINATION-ACK-01",
      suggestedReply:
        "Perfeito, Geraldo. Pode nos enviar os exames quando conseguir.",
      reviewReason: "semantic_coordination_candidate",
    },
  });
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

test("a safe semantic ambiguity asks the patient one specific clarification", async () => {
  const deps = dependencies();
  deps.runOpenAIShadowImpl = async () => ({
    status: "completed",
    decision: {
      route: "standard_reply",
      confidence: "high",
      automaticAllowed: true,
      urgent: false,
      replyCode: "CONTEXT-CLARIFY-01",
      suggestedReply:
        "Quando você diz o outro, está falando do lifting facial ou da cervicoplastia?",
      reviewReason: "context_clarification:procedimento",
    },
  });

  const result = await processHumanResumeJob(
    job({
      text: "E o outro",
      recentConversation: [
        {
          role: "assistant",
          source: "equipe_humana",
          text:
            "A Dra. Amanda realiza lifting facial e cervicoplastia.",
        },
        {
          role: "patient",
          source: "paciente",
          text: "E o outro",
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
    "Quando você diz o outro, está falando do lifting facial ou da cervicoplastia?",
  );
});

test("a semantic reopen answers a new colloquial question after a human turn", async () => {
  const deps = dependencies();
  deps.runOpenAIShadowImpl = async () => ({
    status: "completed",
    decision: {
      route: "standard_reply",
      confidence: "high",
      automaticAllowed: true,
      urgent: false,
      professional: "amanda",
      procedure: "lifting_cervical",
      replyCode: "CONTEXT-REOPEN-01",
      suggestedReply:
        "Sim, a Dra. Amanda realiza cervicoplastia. É uma cirurgia feita em ambiente hospitalar, com anestesista e equipe cirúrgica.",
      reviewReason: "context_reopen:cervicoplastia",
    },
  });

  const result = await processHumanResumeJob(
    job({
      text: "Ai fazem cervicoplastia",
      procedure: "lifting_cervical",
      recentConversation: [
        {
          role: "assistant",
          source: "equipe_humana",
          text: "A Clínica LIV fica em Pinheiros, São Paulo.",
        },
        {
          role: "patient",
          source: "paciente",
          text: "Ai fazem cervicoplastia",
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
  assert.match(deps.patientMessages[0].body, /realiza cervicoplastia/i);
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

test("a due reply between midnight and 6am is deferred to morning", async () => {
  const deps = dependencies();
  const reschedules = [];
  deps.rescheduleHumanResumeImpl = async (input, dueAt) => {
    reschedules.push({ input, dueAt });
    return { status: "rescheduled" };
  };
  deps.runOpenAIShadowImpl = async () => {
    throw new Error("AI must not run in the extreme-night window");
  };

  const result = await processHumanResumeJob(job(), {
    env: ACTIVE_ENV,
    now: EXTREME_NIGHT_NOW,
    ...deps,
  });

  assert.equal(result.status, "deferred_to_morning");
  assert.equal(reschedules.length, 1);
  assert.equal(
    new Date(reschedules[0].dueAt).toISOString(),
    "2026-07-29T11:00:00.000Z",
  );
  assert.equal(deps.patientMessages.length, 0);
  assert.equal(deps.alerts.length, 0);
});

test("a requested next-morning continuation resumes with the actual context", async () => {
  const deps = dependencies();
  deps.runOpenAIShadowImpl = async () => {
    throw new Error("the scheduled morning opening is deterministic");
  };
  const result = await processHumanResumeJob(
    job({
      morningResume: true,
      patientName: "Lia Teste",
      procedure: "lifting_cervical",
      text: "Já está muito tarde. Amanhã a gente conversa, melhor né?",
      recentConversation: [
        { role: "patient", source: "paciente", text: "Papada, valor?" },
        {
          role: "assistant",
          source: "bruna",
          text:
            "Olá, Lia! Anotei sua mensagem sobre valores de lifting cervical. Como já é madrugada, retomaremos por aqui pela manhã.",
        },
        {
          role: "patient",
          source: "paciente",
          text: "Já está muito tarde. Amanhã a gente conversa, melhor né?",
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
  assert.equal(result.reason, "scheduled_morning_resume");
  assert.equal(deps.patientMessages.length, 1);
  assert.match(deps.patientMessages[0].body, /^Bom dia, Lia!/);
  assert.match(deps.patientMessages[0].body, /valor de lifting cervical/i);
  assert.doesNotMatch(deps.patientMessages[0].body, /predomina|menu/i);
  assert.equal(deps.alerts.length, 0);
});

test("the initial price information is sent after the human-resume window without an alert", async () => {
  const deps = dependencies();
  deps.runOpenAIShadowImpl = async () => ({
    status: "completed",
    decision: {
      route: "standard_reply",
      confidence: "high",
      automaticAllowed: true,
      urgent: false,
      replyCode: "SURGICAL-PRICE-INITIAL-01",
      suggestedReply: "Resposta semântica validada.",
      reviewReason: "price_initial_information",
    },
  });
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
  assert.equal((deps.patientMessages[0].body.match(/\?/g) || []).length, 0);
  assert.doesNotMatch(deps.patientMessages[0].body, /o que mais te incomoda/i);
  assert.doesNotMatch(deps.patientMessages[0].body, /técnica|complexidade|materiais|https?:\/\//i);
  assert.equal(deps.alerts.length, 0);
  assert.equal(
    deps.completions[0].options.controlStatus,
    "bruna_resumed",
  );
});

test("a deterministic code with a conflicting procedure fails closed", async () => {
  const deps = dependencies();
  deps.runOpenAIShadowImpl = async () => ({
    status: "completed",
    decision: {
      route: "standard_reply",
      confidence: "high",
      automaticAllowed: true,
      urgent: false,
      professional: "amanda",
      procedure: "blefaroplastia",
      replyCode: "SURGICAL-PRICE-INITIAL-01",
      suggestedReply: "A pergunta é sobre o valor da blefaroplastia.",
      reviewReason: "price_initial_information",
    },
  });

  const result = await processHumanResumeJob(
    job({
      text: "Quanto custa o lifting facial?",
      procedure: "lifting_facial",
    }),
    {
      env: ACTIVE_ENV,
      now: NOW,
      ...deps,
    },
  );

  assert.equal(result.status, "waiting_human");
  assert.equal(result.reason, "deterministic_context_mismatch");
  assert.equal(deps.patientMessages.length, 0);
  assert.equal(deps.alerts.length, 1);
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
  assert.doesNotMatch(deps.alerts[0].messageText, /Prefere manhã ou tarde/);
});

test("direct lifting price resume includes the specific composition guide with the range", async () => {
  const deps = dependencies();
  deps.runOpenAIShadowImpl = async () => ({
    status: "completed",
    decision: {
      route: "standard_reply",
      confidence: "high",
      automaticAllowed: true,
      urgent: false,
      replyCode: "LIFTING-PRICE-RANGE-01",
      suggestedReply: "Resposta semântica validada.",
      reviewReason: "lifting_price_range_direct",
    },
  });
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
  deps.runOpenAIShadowImpl = async () => ({
    status: "completed",
    decision: {
      route: "standard_reply",
      confidence: "high",
      automaticAllowed: true,
      urgent: false,
      replyCode: "LIFTING-PRICE-RANGE-01",
      suggestedReply: "Resposta semântica validada.",
      reviewReason: "lifting_price_range_direct",
    },
  });
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

test("low confidence alerts silently when no contextual holding can be written", async () => {
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
  assert.equal(result.holdingSent, false);
  assert.equal(deps.patientMessages.length, 0);
  assert.equal(HUMAN_RESUME_HOLDING_MESSAGE, "");
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

test("a post-quote farewell never becomes an appointment message", async () => {
  const deps = dependencies();
  deps.runOpenAIShadowImpl = async () => {
    throw new Error("AI must not run for a post-quote farewell");
  };
  const text = "Boa noite! Ok, vamos vê lá. Obg, ótimo descanso";
  const result = await processHumanResumeJob(
    job({
      text,
      recentConversation: [
        {
          role: "assistant",
          source: "equipe_humana",
          text:
            "Boa noite, tudo bem? O orçamento cirúrgico foi enviado por e-mail. Se tiver alguma dúvida, pode nos enviar por aqui. Uma boa noite!",
        },
        {
          role: "patient",
          source: "paciente",
          text,
        },
      ],
    }),
    {
      env: ACTIVE_ENV,
      now: NIGHT_NOW,
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
