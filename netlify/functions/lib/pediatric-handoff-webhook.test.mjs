import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";

import webhook from "../ycloud-webhook.mjs";

const CLINIC_PHONE = "+5511961957144";
const PATIENT_PHONE = "+5511900000091";

function pediatricReviewDecision() {
  return {
    route: "human_review",
    confidence: "high",
    automaticAllowed: false,
    urgent: false,
    professional: "amanda",
    procedure: "lobuloplastia",
    replyCode: "UNKNOWN-REVIEW-01",
    suggestedReply: "",
    reviewReason: "unknown_digest:atendimento_de_menor",
    conversationState: {
      activeTopic: "avaliação de menor",
      patientAct: "question",
      refersToEventId: "",
      lastClinicQuestion: "",
      lastClinicOffer: "",
      unresolvedQuestions: ["orientação da equipe para o atendimento"],
      factsAlreadyProvided: [],
      owner: "human_team",
      nextExpectedAction: "equipe revisar o caso",
      ambiguity: "",
      contextConfidence: "high",
    },
  };
}

function openAIResponse(decision) {
  return {
    id: "resp_pediatric_handoff",
    object: "response",
    status: "completed",
    model: "gpt-5.6-terra",
    output: [
      {
        id: "msg_pediatric_handoff",
        type: "message",
        role: "assistant",
        content: [
          {
            type: "output_text",
            text: JSON.stringify(decision),
          },
        ],
      },
    ],
    usage: {
      input_tokens: 100,
      output_tokens: 100,
      total_tokens: 200,
    },
  };
}

test("a pediatric review sends one bounded acknowledgement only after the internal alert", async () => {
  const environmentKeys = [
    "YCLOUD_WEBHOOK_SECRET",
    "YCLOUD_API_KEY",
    "GOOGLE_SHEETS_WEBHOOK_URL",
    "GOOGLE_SHEETS_WEBHOOK_SECRET",
    "OPENAI_API_KEY",
    "WHATSAPP_AUTOMATION_MODE",
    "WHATSAPP_ALERT_NUMBER",
    "YCLOUD_ALERT_TEMPLATE_NAME",
    "YCLOUD_ALERT_TEMPLATE_LANGUAGE",
  ];
  const savedEnvironment = Object.fromEntries(
    environmentKeys.map((key) => [key, process.env[key]]),
  );
  const originalFetch = globalThis.fetch;
  const originalLog = console.log;
  const requests = [];
  const pending = [];

  Object.assign(process.env, {
    YCLOUD_WEBHOOK_SECRET: "webhook-test-secret",
    YCLOUD_API_KEY: "ycloud-test-key",
    GOOGLE_SHEETS_WEBHOOK_URL: "https://sheets.example.test/webhook",
    GOOGLE_SHEETS_WEBHOOK_SECRET: "sheets-test-secret",
    OPENAI_API_KEY: "openai-test-key",
    WHATSAPP_AUTOMATION_MODE: "active",
    WHATSAPP_ALERT_NUMBER: "+5511900000099",
    YCLOUD_ALERT_TEMPLATE_NAME: "alerta_revisao_liv_v1",
    YCLOUD_ALERT_TEMPLATE_LANGUAGE: "pt_BR",
  });

  console.log = () => {};
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options });

    if (url === process.env.GOOGLE_SHEETS_WEBHOOK_URL) {
      const request = JSON.parse(options.body);
      if (request.action === "get_bot_knowledge_context") {
        return new Response(
          JSON.stringify({ ok: true, candidates: [], pendingQuestion: null }),
          { status: 200 },
        );
      }
      if (request.action === "get_conversation_context") {
        return new Response(
          JSON.stringify({
            ok: true,
            opportunityId: "opp-pediatric-handoff",
            professional: "amanda",
            turns: [],
          }),
          { status: 200 },
        );
      }
      return new Response(
        JSON.stringify({
          ok: true,
          inserted: true,
          updated: false,
          duplicate: false,
          humanTakeoverToday: false,
          opportunityId: "opp-pediatric-handoff",
          professional: "amanda",
          routeStatus: "resolved",
          routed: true,
        }),
        { status: 200 },
      );
    }

    if (url === "https://api.openai.com/v1/responses") {
      return new Response(
        JSON.stringify(openAIResponse(pediatricReviewDecision())),
        { status: 200 },
      );
    }

    if (url === "https://api.ycloud.com/v2/whatsapp/messages") {
      return new Response('{"status":"accepted"}', { status: 200 });
    }

    throw new Error(`unexpected destination: ${url}`);
  };

  try {
    const rawBody = JSON.stringify({
      id: "pediatric-handoff-event",
      type: "whatsapp.inbound_message.received",
      createTime: "2026-08-26T18:50:00.000Z",
      whatsappInboundMessage: {
        id: "pediatric-handoff-message",
        from: PATIENT_PHONE,
        to: CLINIC_PHONE,
        sendTime: "2026-08-26T18:50:00.000Z",
        type: "text",
        customerProfile: { name: "Onde Há Fé, Há Milagres" },
        text: {
          body:
            "Olá! Tenho interesse em lobuloplastia para criança de 2 anos com a Dra. Amanda e gostaria de entender melhor como funciona a avaliação.",
        },
      },
    });
    const timestamp = "1721908800";
    const signature = createHmac(
      "sha256",
      process.env.YCLOUD_WEBHOOK_SECRET,
    )
      .update(`${timestamp}.${rawBody}`)
      .digest("hex");

    const response = await webhook(
      new Request("http://localhost/api/ycloud/webhook", {
        method: "POST",
        headers: {
          "YCloud-Signature": `t=${timestamp},s=${signature}`,
        },
        body: rawBody,
      }),
      { waitUntil: (promise) => pending.push(promise) },
    );
    const body = await response.json();
    await Promise.all(pending);

    assert.equal(body.aiActiveQueued, true);
    assert.equal(body.patientReplyQueued, false);

    const ycloudRequests = requests
      .filter(
        (request) =>
          request.url === "https://api.ycloud.com/v2/whatsapp/messages",
      )
      .map((request) => JSON.parse(request.options.body));
    const patientRequests = ycloudRequests.filter(
      (request) => request.type === "text" && request.to === PATIENT_PHONE,
    );
    const alertRequests = ycloudRequests.filter(
      (request) => request.to === process.env.WHATSAPP_ALERT_NUMBER,
    );

    assert.equal(alertRequests.length, 1);
    assert.equal(patientRequests.length, 1);
    assert.equal(
      patientRequests[0].text.body,
      "Olá! Eu sou a Bruna, concierge da Clínica LIV Faria Lima. Obrigada por explicar. Como se trata de uma criança, vou encaminhar sua mensagem para a equipe responsável confirmar a orientação mais adequada para esse caso. Como posso te chamar?",
    );
    assert.doesNotMatch(
      patientRequests[0].text.body,
      /\b(?:indica[cç][aã]o|t[eé]cnica|pre[cç]o|valor|agenda)\b/i,
    );

    const patientSendIndex = requests.findIndex((request) => {
      if (request.url !== "https://api.ycloud.com/v2/whatsapp/messages") {
        return false;
      }
      const payload = JSON.parse(request.options.body);
      return payload.type === "text" && payload.to === PATIENT_PHONE;
    });
    const alertSendIndex = requests.findIndex((request) => {
      if (request.url !== "https://api.ycloud.com/v2/whatsapp/messages") {
        return false;
      }
      return JSON.parse(request.options.body).to ===
        process.env.WHATSAPP_ALERT_NUMBER;
    });
    assert.ok(alertSendIndex >= 0 && alertSendIndex < patientSendIndex);
  } finally {
    globalThis.fetch = originalFetch;
    console.log = originalLog;

    for (const [key, value] of Object.entries(savedEnvironment)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
