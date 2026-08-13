import assert from "node:assert/strict";
import test from "node:test";
import {
  claimOutboundReply,
  sendControlledPatientReply,
  validateOutboundReply,
} from "./outbound-reply-gate.mjs";
import {
  CONVERSATION_ACTIONS,
} from "./conversation-action-controller.mjs";

function fakeBlobs() {
  const values = new Map();
  let version = 0;
  const store = {
    async getWithMetadata(key) {
      const entry = values.get(key);
      return entry
        ? {
            data: structuredClone(entry.data),
            etag: entry.etag,
          }
        : null;
    },
    async setJSON(key, data, options = {}) {
      const existing = values.get(key);
      if (options.onlyIfNew && existing) {
        return { modified: false };
      }
      if (
        options.onlyIfMatch &&
        existing?.etag !== options.onlyIfMatch
      ) {
        return { modified: false };
      }
      version += 1;
      values.set(key, {
        data: structuredClone(data),
        etag: `etag-${version}`,
      });
      return { modified: true, etag: `etag-${version}` };
    },
  };
  return { getStoreImpl: () => store };
}

const respond = {
  action: CONVERSATION_ACTIONS.RESPOND,
  allowHoldingReply: false,
};

test("final validation blocks replies after closing or deferral", () => {
  for (const currentText of [
    "Ok, obrigada",
    "Ainda estou pensando, qualquer coisa volto",
  ]) {
    const result = validateOutboundReply({
      body: "Posso te ajudar com mais alguma coisa?",
      currentText,
      conversationAction: respond,
    });
    assert.equal(result.allowed, false, currentText);
  }
});

test("final validation blocks a substantially repeated answer", () => {
  const result = validateOutboundReply({
    body:
      "Não temos vídeo disponível para envio por aqui. A página reúne casos reais para consulta.",
    currentText: "De alguns pacientes em quem foi feito",
    recentConversation: [
      {
        role: "assistant",
        text:
          "Não temos vídeo disponível para envio por aqui. A página reúne alguns casos reais para consulta.",
      },
    ],
    conversationAction: respond,
  });

  assert.equal(result.allowed, false);
  assert.equal(result.reason, "substantially_repeated_reply");
});

test("final validation keeps the bot out of an answer to the human team", () => {
  const result = validateOutboundReply({
    body:
      "Recebi sua mensagem e vou confirmar essa informação com a equipe para te responder com segurança.",
    currentText: "Bom dia! Pode sim",
    recentConversation: [
      {
        role: "assistant",
        source: "equipe_humana",
        text:
          "Bom dia, tudo bem? Sua consulta está marcada para hoje às 15h. Posso confirmar sua presença?",
      },
    ],
    conversationAction: respond,
  });

  assert.equal(result.allowed, false);
  assert.equal(
    result.reason,
    "patient_answer_belongs_to_human_context",
  );
});

test("a new standalone question can reopen a human exchange", () => {
  const result = validateOutboundReply({
    body: "Claro. A Clínica LIV fica na Rua Pais Leme, 215, em Pinheiros.",
    currentText: "Pode sim. Qual é o endereço?",
    recentConversation: [
      {
        role: "assistant",
        source: "equipe_humana",
        text: "Posso confirmar sua presença?",
      },
    ],
    conversationAction: respond,
  });

  assert.equal(result.allowed, true);
});

test("final validation blocks a planned reply that restarts bot context", () => {
  const result = validateOutboundReply({
    body: "Entendi. Como posso te ajudar?",
    currentText: "Superior",
    recentConversation: [
      {
        role: "assistant",
        source: "bruna",
        text: "A queixa é maior na pálpebra superior ou inferior?",
      },
    ],
    conversationAction: respond,
  });

  assert.equal(result.allowed, false);
  assert.equal(result.reason, "planned_reply_restarts_context");
});

test("final validation permits a planned reply that uses the bot context", () => {
  const result = validateOutboundReply({
    body:
      "Entendi, a sua dúvida é sobre a pálpebra superior. Nessa região, a avaliação observa pele, bolsas e a posição das sobrancelhas.",
    currentText: "Superior",
    recentConversation: [
      {
        role: "assistant",
        source: "bruna",
        text: "A queixa é maior na pálpebra superior ou inferior?",
      },
    ],
    conversationAction: respond,
  });

  assert.equal(result.allowed, true);
});

test("final validation blocks unsafe or unfinished outbound content", () => {
  const cases = [
    ["BEGIN:VCARD\nVERSION:3.0\nTEL:+5511000000000\nEND:VCARD", "contact_card_content"],
    ["Olá, [nome]! Posso ajudar?", "unresolved_placeholder"],
    ["Veja https://draamandaschroeder/lifting-facial/", "malformed_clinic_url"],
    ["Confirmado para 12:00, 12:00.", "duplicated_time"],
    ["x".repeat(1501), "reply_too_long"],
  ];

  for (const [body, reason] of cases) {
    const result = validateOutboundReply({
      body,
      currentText: "Pode me confirmar?",
      conversationAction: respond,
    });
    assert.equal(result.allowed, false, reason);
    assert.equal(result.reason, reason);
  }
});

test("one conversation revision permits only one simultaneous claim", async () => {
  const blobs = fakeBlobs();
  const input = {
    phone: "+5511900000000",
    eventId: "event-1",
  };
  const [first, second] = await Promise.all([
    claimOutboundReply(input, blobs),
    claimOutboundReply(input, blobs),
  ]);

  assert.deepEqual(
    [first.status, second.status].sort(),
    ["completed", "duplicate"],
  );
});

test("controlled send delivers once and suppresses a retry", async () => {
  const blobs = fakeBlobs();
  let sends = 0;
  const input = {
    from: "+5511000000000",
    to: "+5511900000000",
    eventId: "event-2",
    body: "Claro. O endereço é Rua Pais Leme, 215.",
    currentText: "Qual é o endereço?",
    recentConversation: [],
    conversationAction: respond,
  };
  const options = {
    ...blobs,
    sendYCloudPatientTextImpl: async () => {
      sends += 1;
      return { status: "completed", errorCode: "none" };
    },
  };

  const first = await sendControlledPatientReply(input, options);
  const retry = await sendControlledPatientReply(input, options);

  assert.equal(first.status, "completed");
  assert.equal(retry.status, "duplicate");
  assert.equal(sends, 1);
});

test("controlled send uses the validated trimmed body", async () => {
  const blobs = fakeBlobs();
  let deliveredBody = "";
  const result = await sendControlledPatientReply(
    {
      from: "+5511000000000",
      to: "+5511900000000",
      eventId: "event-trimmed",
      body: "  Claro. Posso ajudar com essa informação.  ",
      currentText: "Pode me ajudar?",
      recentConversation: [],
      conversationAction: respond,
    },
    {
      ...blobs,
      sendYCloudPatientTextImpl: async ({ body }) => {
        deliveredBody = body;
        return { status: "completed", errorCode: "none" };
      },
    },
  );

  assert.equal(result.status, "completed");
  assert.equal(deliveredBody, "Claro. Posso ajudar com essa informação.");
});

test("storage failure blocks the send instead of risking a duplicate", async () => {
  let sends = 0;
  const result = await sendControlledPatientReply(
    {
      from: "+5511000000000",
      to: "+5511900000000",
      eventId: "event-storage-failure",
      body: "Claro. Posso ajudar com essa informação.",
      currentText: "Pode me ajudar?",
      recentConversation: [],
      conversationAction: respond,
    },
    {
      getStoreImpl: () => {
        throw new Error("storage unavailable");
      },
      sendYCloudPatientTextImpl: async () => {
        sends += 1;
        return { status: "completed" };
      },
    },
  );

  assert.equal(result.status, "blocked");
  assert.equal(result.errorCode, "reply_claim_unavailable");
  assert.equal(sends, 0);
});

test("a team holding reply requires a real pending request", () => {
  const result = validateOutboundReply({
    body: "Vou confirmar essa informação com a equipe.",
    currentText: "Obrigada, vou pensar",
    conversationAction: {
      action: CONVERSATION_ACTIONS.WAIT_PATIENT,
      allowHoldingReply: false,
    },
  });

  assert.equal(result.allowed, false);
  assert.equal(
    result.reason,
    "conversation_action_blocks_reply",
  );
});
