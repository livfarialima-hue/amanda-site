import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";

import webhook from "../ycloud-webhook.mjs";

function conversationState(overrides = {}) {
  return {
    activeTopic: "queixas faciais após emagrecimento",
    patientAct: "answer",
    refersToEventId: "evt-human-context",
    lastClinicQuestion:
      "O que mais te incomoda hoje no rosto ou pescoço?",
    lastClinicOffer: "",
    unresolvedQuestions: [],
    factsAlreadyProvided: [],
    owner: "bruna",
    nextExpectedAction: "responder às queixas relatadas",
    ambiguity: "",
    contextConfidence: "high",
    ...overrides,
  };
}

function semanticDecision(overrides = {}) {
  return {
    route: "standard_reply",
    confidence: "high",
    automaticAllowed: true,
    urgent: false,
    professional: "amanda",
    procedure: "lifting_facial",
    replyCode: "CONTEXT-REOPEN-01",
    suggestedReply:
      "Entendi. Essas queixas podem aparecer juntas, mas costumam precisar de abordagens diferentes e complementares. A avaliação com a Dra. Amanda ajuda a entender o que faz sentido tratar em conjunto e qual caminho preserva melhor suas características.",
    reviewReason: "context_reopen:queixas_faciais",
    conversationState: conversationState(),
    ...overrides,
  };
}

function openAIResponse(decision) {
  return {
    model: "gpt-5.6-terra",
    output_text: JSON.stringify(decision),
    usage: {
      input_tokens: 100,
      output_tokens: 80,
      total_tokens: 180,
    },
  };
}

function signedRequest(payload, secret) {
  const rawBody = JSON.stringify(payload);
  const timestamp = "1787214097";
  const signature = createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");
  return new Request("http://localhost/api/ycloud/webhook", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "YCloud-Signature": `t=${timestamp},s=${signature}`,
    },
    body: rawBody,
  });
}

function patientPayload({ eventId, phone, text }) {
  return {
    id: eventId,
    type: "whatsapp.inbound_message.received",
    createTime: "2026-08-20T09:21:37.000Z",
    whatsappInboundMessage: {
      id: `message-${eventId}`,
      wamid: `wamid.${eventId}`,
      from: phone,
      to: "+5511961957144",
      sendTime: "2026-08-20T09:21:37.000Z",
      type: "text",
      text: { body: text },
      customerProfile: { name: "Paciente Teste" },
    },
  };
}

async function withWebhookEnvironment(run, { automationMode = "active" } = {}) {
  const keys = [
    "YCLOUD_WEBHOOK_SECRET",
    "YCLOUD_API_KEY",
    "GOOGLE_SHEETS_WEBHOOK_URL",
    "GOOGLE_SHEETS_WEBHOOK_SECRET",
    "WHATSAPP_AUTOMATION_MODE",
    "WHATSAPP_HUMAN_REPLY_GUARD_MS",
    "WHATSAPP_REPLY_DEBOUNCE_AI_MS",
    "WHATSAPP_REPLY_DEBOUNCE_DETERMINISTIC_MS",
    "WHATSAPP_ALERT_NUMBER",
    "OPENAI_API_KEY",
  ];
  const saved = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  const originalFetch = globalThis.fetch;
  const originalLog = console.log;

  process.env.YCLOUD_WEBHOOK_SECRET = "semantic-route-secret";
  process.env.YCLOUD_API_KEY = "ycloud-key";
  process.env.GOOGLE_SHEETS_WEBHOOK_URL =
    "https://sheets.example.test/webhook";
  process.env.GOOGLE_SHEETS_WEBHOOK_SECRET = "sheets-secret";
  process.env.WHATSAPP_AUTOMATION_MODE = automationMode;
  process.env.WHATSAPP_HUMAN_REPLY_GUARD_MS = "0";
  process.env.WHATSAPP_REPLY_DEBOUNCE_AI_MS = "0";
  process.env.WHATSAPP_REPLY_DEBOUNCE_DETERMINISTIC_MS = "0";
  process.env.OPENAI_API_KEY = "openai-key";
  delete process.env.WHATSAPP_ALERT_NUMBER;
  console.log = () => {};

  try {
    await run();
  } finally {
    globalThis.fetch = originalFetch;
    console.log = originalLog;
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test("semantic assessment recovers an Amanda route and answers from the human context", async () => {
  await withWebhookEnvironment(async () => {
    const requests = [];
    const pending = [];
    let appendLeadCalls = 0;
    globalThis.fetch = async (url, options) => {
      requests.push({ url, options });
      if (url === process.env.GOOGLE_SHEETS_WEBHOOK_URL) {
        const body = JSON.parse(options.body);
        if (body.action === "append_lead") {
          appendLeadCalls += 1;
          if (appendLeadCalls === 1) {
            return new Response(JSON.stringify({
              ok: true,
              inserted: false,
              updated: false,
              routed: false,
              routeStatus: "pending",
              professional: "unknown",
              humanTakeoverToday: false,
              patientRelationship: {
                found: false,
                relationshipState: "unknown",
              },
            }), { status: 200 });
          }
          assert.equal(body.lead.professional, "amanda");
          return new Response(JSON.stringify({
            ok: true,
            inserted: true,
            updated: false,
            duplicate: true,
            duplicateReason: "route_pending_recovered",
            routed: true,
            routeStatus: "resolved",
            professional: "amanda",
            opportunityId: "opp-semantic-amanda",
            humanTakeoverToday: false,
            patientRelationship: {
              found: false,
              relationshipState: "new_lead",
            },
          }), { status: 200 });
        }
        if (body.action === "get_conversation_context") {
          return new Response(JSON.stringify({
            ok: true,
            opportunityId: "",
            professional: "",
            turns: [
              {
                role: "assistant",
                source: "human",
                at: "2026-08-19T23:56:51.000Z",
                eventId: "evt-human-context",
                text:
                  "Se quiser, pode me contar o que mais te incomoda hoje no rosto ou pescoço.",
              },
            ],
          }), { status: 200 });
        }
        if (body.action === "get_bot_knowledge_context") {
          return new Response('{"ok":true,"candidates":[],"pendingQuestion":null}', { status: 200 });
        }
        return new Response('{"ok":true}', { status: 200 });
      }
      if (url === "https://api.openai.com/v1/responses") {
        return new Response(
          JSON.stringify(openAIResponse(semanticDecision())),
          { status: 200 },
        );
      }
      if (url === "https://api.ycloud.com/v2/whatsapp/messages") {
        return new Response('{"status":"accepted"}', { status: 200 });
      }
      throw new Error(`unexpected destination: ${url}`);
    };

    const payload = patientPayload({
      eventId: "evt-semantic-route-amanda",
      phone: "+5511900000871",
      text:
        "Cicatrizes de acne, flacidez no rosto e pescoço, Mounjaro face",
    });
    const response = await webhook(
      signedRequest(payload, process.env.YCLOUD_WEBHOOK_SECRET),
      { waitUntil: (promise) => pending.push(promise) },
    );
    const body = await response.json();
    await Promise.all(pending);

    assert.equal(response.status, 200);
    assert.equal(body.semanticRouteAssessmentEligible, true);
    assert.equal(body.semanticRouteRecovered, true);
    assert.equal(body.semanticRouteRecoveryStatus, "completed");
    assert.equal(body.leadRouted, true);
    assert.equal(body.aiActiveQueued, true);
    assert.equal(appendLeadCalls, 2);

    const openAIRequests = requests.filter(
      (request) => request.url === "https://api.openai.com/v1/responses",
    );
    assert.equal(openAIRequests.length, 1);
    const modelInput = JSON.parse(
      JSON.parse(openAIRequests[0].options.body).input,
    );
    assert.match(
      modelInput.recentConversation[0].text,
      /rosto ou pescoço/i,
    );

    const patientRequests = requests
      .filter(
        (request) =>
          request.url === "https://api.ycloud.com/v2/whatsapp/messages",
      )
      .map((request) => JSON.parse(request.options.body))
      .filter((message) => message.to === payload.whatsappInboundMessage.from);
    assert.equal(patientRequests.length, 1);
    assert.match(patientRequests[0].text.body, /^Entendi\./);
    assert.match(patientRequests[0].text.body, /abordagens diferentes/i);
    assert.doesNotMatch(patientRequests[0].text.body, /vou confirmar/i);
  });
});

test("an unresolved safe route asks one contextual clarification instead of staying silent", async () => {
  await withWebhookEnvironment(async () => {
    const requests = [];
    globalThis.fetch = async (url, options) => {
      requests.push({ url, options });
      if (url === process.env.GOOGLE_SHEETS_WEBHOOK_URL) {
        const body = JSON.parse(options.body);
        if (body.action === "append_lead") {
          return new Response(JSON.stringify({
            ok: true,
            inserted: false,
            updated: false,
            routed: false,
            routeStatus: "pending",
            professional: "unknown",
            humanTakeoverToday: false,
            patientRelationship: {
              found: false,
              relationshipState: "unknown",
            },
          }), { status: 200 });
        }
        if (body.action === "get_conversation_context") {
          return new Response('{"ok":true,"opportunityId":"","professional":"","turns":[]}', { status: 200 });
        }
        if (body.action === "get_bot_knowledge_context") {
          return new Response('{"ok":true,"candidates":[],"pendingQuestion":null}', { status: 200 });
        }
        return new Response('{"ok":true}', { status: 200 });
      }
      if (url === "https://api.openai.com/v1/responses") {
        return new Response(JSON.stringify(openAIResponse(semanticDecision({
          professional: "unknown",
          procedure: "",
          replyCode: "CONTEXT-CLARIFY-01",
          suggestedReply:
            "Quero entender direitinho para te orientar. Você pode me explicar um pouco melhor qual atendimento ou dúvida gostaria de tratar conosco?",
          reviewReason: "context_clarification:atendimento",
          conversationState: conversationState({
            activeTopic: "atendimento não identificado",
            patientAct: "unknown",
            refersToEventId: "",
            lastClinicQuestion: "",
            nextExpectedAction: "pedir esclarecimento",
            ambiguity: "profissional e assunto não identificados",
            contextConfidence: "low",
          }),
        }))), { status: 200 });
      }
      if (url === "https://api.ycloud.com/v2/whatsapp/messages") {
        return new Response('{"status":"accepted"}', { status: 200 });
      }
      throw new Error(`unexpected destination: ${url}`);
    };

    const payload = patientPayload({
      eventId: "evt-semantic-route-clarify",
      phone: "+5511900000872",
      text: "Queria saber como funciona isso",
    });
    const response = await webhook(
      signedRequest(payload, process.env.YCLOUD_WEBHOOK_SECRET),
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.leadRouted, false);
    assert.equal(body.semanticRouteRecovered, false);
    assert.equal(body.semanticRouteClarificationQueued, true);
    assert.equal(body.semanticRouteClarificationSent, true);
    assert.equal(body.automaticWorkFinished, true);

    const patientRequests = requests
      .filter(
        (request) =>
          request.url === "https://api.ycloud.com/v2/whatsapp/messages",
      )
      .map((request) => JSON.parse(request.options.body))
      .filter((message) => message.to === payload.whatsappInboundMessage.from);
    assert.equal(patientRequests.length, 1);
    assert.match(patientRequests[0].text.body, /explicar um pouco melhor/i);
    assert.equal((patientRequests[0].text.body.match(/\?/g) || []).length, 1);
  });
});

test("a completed but unapproved route decision stays with human review and is not sent to the patient", async () => {
  await withWebhookEnvironment(async () => {
    const requests = [];
    process.env.WHATSAPP_ALERT_NUMBER = "+5511999999999";
    globalThis.fetch = async (url, options) => {
      requests.push({ url, options });
      if (url === process.env.GOOGLE_SHEETS_WEBHOOK_URL) {
        const body = JSON.parse(options.body);
        if (body.action === "append_lead") {
          return new Response(JSON.stringify({
            ok: true,
            inserted: false,
            updated: false,
            routed: false,
            routeStatus: "pending",
            professional: "unknown",
            humanTakeoverToday: false,
            patientRelationship: {
              found: false,
              relationshipState: "unknown",
            },
          }), { status: 200 });
        }
        if (body.action === "get_conversation_context") {
          return new Response('{"ok":true,"opportunityId":"","professional":"","turns":[]}', { status: 200 });
        }
        if (body.action === "get_bot_knowledge_context") {
          return new Response('{"ok":true,"candidates":[],"pendingQuestion":null}', { status: 200 });
        }
        return new Response('{"ok":true}', { status: 200 });
      }
      if (url === "https://api.openai.com/v1/responses") {
        return new Response(JSON.stringify(openAIResponse(semanticDecision({
          professional: "unknown",
          procedure: "",
          automaticAllowed: false,
          replyCode: "",
          suggestedReply:
            "Posso te explicar melhor, mas quero conferir primeiro qual atendimento você procura.",
          reviewReason: "route_uncertain:human_check",
          conversationState: conversationState({
            activeTopic: "atendimento não identificado",
            patientAct: "unknown",
            refersToEventId: "",
            lastClinicQuestion: "",
            nextExpectedAction: "revisão humana",
            ambiguity: "profissional e assunto não identificados",
            contextConfidence: "low",
          }),
        }))), { status: 200 });
      }
      if (url === "https://api.ycloud.com/v2/whatsapp/messages") {
        return new Response('{"status":"accepted"}', { status: 200 });
      }
      throw new Error(`unexpected destination: ${url}`);
    };

    const payload = patientPayload({
      eventId: "evt-semantic-route-review",
      phone: "+5511900000875",
      text: "Queria falar sobre uma coisa",
    });
    const response = await webhook(
      signedRequest(payload, process.env.YCLOUD_WEBHOOK_SECRET),
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.semanticRouteRecovered, false);
    assert.equal(body.semanticRouteClarificationQueued, false);
    assert.equal(body.reviewAlertQueued, true);

    const ycloudRequests = requests
      .filter(
        (request) =>
          request.url === "https://api.ycloud.com/v2/whatsapp/messages",
      )
      .map((request) => JSON.parse(request.options.body));
    assert.equal(
      ycloudRequests.some(
        (message) => message.to === payload.whatsappInboundMessage.from,
      ),
      false,
    );
    const reviewMessage = ycloudRequests.find(
      (message) => message.to === process.env.WHATSAPP_ALERT_NUMBER,
    );
    assert.ok(reviewMessage);
    const reviewText = reviewMessage.template.components[0].parameters[2].text;
    assert.match(reviewText, /Sugestão para copiar/i);
    assert.match(reviewText, /quero conferir primeiro/i);
  });
});

test("shadow assessment identifies a route candidate without mutating the live route", async () => {
  await withWebhookEnvironment(async () => {
    const requests = [];
    let appendLeadCalls = 0;
    globalThis.fetch = async (url, options) => {
      requests.push({ url, options });
      if (url === process.env.GOOGLE_SHEETS_WEBHOOK_URL) {
        const body = JSON.parse(options.body);
        if (body.action === "append_lead") {
          appendLeadCalls += 1;
          return new Response(JSON.stringify({
            ok: true,
            inserted: false,
            updated: false,
            routed: false,
            routeStatus: "pending",
            professional: "unknown",
            humanTakeoverToday: false,
            patientRelationship: {
              found: false,
              relationshipState: "unknown",
            },
          }), { status: 200 });
        }
        if (body.action === "get_conversation_context") {
          return new Response('{"ok":true,"turns":[]}', { status: 200 });
        }
        if (body.action === "get_bot_knowledge_context") {
          return new Response('{"ok":true,"candidates":[],"pendingQuestion":null}', { status: 200 });
        }
        return new Response('{"ok":true}', { status: 200 });
      }
      if (url === "https://api.openai.com/v1/responses") {
        return new Response(
          JSON.stringify(openAIResponse(semanticDecision())),
          { status: 200 },
        );
      }
      throw new Error(`unexpected destination: ${url}`);
    };

    const payload = patientPayload({
      eventId: "evt-semantic-route-shadow",
      phone: "+5511900000873",
      text: "Quero entender o lifting facial",
    });
    const response = await webhook(
      signedRequest(payload, process.env.YCLOUD_WEBHOOK_SECRET),
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.semanticAssessmentAttempted, true);
    assert.equal(body.semanticRouteRecovered, false);
    assert.equal(body.semanticRouteRecoveryStatus, "shadow_candidate");
    assert.equal(appendLeadCalls, 1);
    assert.equal(
      requests.some(
        (request) =>
          request.url === "https://api.ycloud.com/v2/whatsapp/messages",
      ),
      false,
    );
  }, { automationMode: "shadow" });
});

test("route recovery reevaluates the reply after discovering a former patient", async () => {
  await withWebhookEnvironment(async () => {
    const requests = [];
    let appendLeadCalls = 0;
    let openAiCalls = 0;
    globalThis.fetch = async (url, options) => {
      requests.push({ url, options });
      if (url === process.env.GOOGLE_SHEETS_WEBHOOK_URL) {
        const body = JSON.parse(options.body);
        if (body.action === "append_lead") {
          appendLeadCalls += 1;
          if (appendLeadCalls === 1) {
            return new Response(JSON.stringify({
              ok: true,
              routed: false,
              routeStatus: "pending",
              professional: "unknown",
              humanTakeoverToday: false,
              patientRelationship: {
                found: false,
                relationshipState: "unknown",
              },
            }), { status: 200 });
          }
          return new Response(JSON.stringify({
            ok: true,
            inserted: false,
            updated: true,
            duplicate: true,
            duplicateReason: "route_pending_recovered",
            routed: true,
            routeStatus: "resolved",
            professional: "amanda",
            opportunityId: "opp-former-patient",
            humanTakeoverToday: false,
            patientRelationship: {
              found: true,
              relationshipState: "former_patient",
              patientName: "Paciente Teste",
              professional: "amanda",
            },
          }), { status: 200 });
        }
        if (body.action === "get_conversation_context") {
          return new Response('{"ok":true,"turns":[]}', { status: 200 });
        }
        if (body.action === "get_bot_knowledge_context") {
          return new Response('{"ok":true,"candidates":[],"pendingQuestion":null}', { status: 200 });
        }
        return new Response('{"ok":true}', { status: 200 });
      }
      if (url === "https://api.openai.com/v1/responses") {
        openAiCalls += 1;
        return new Response(
          JSON.stringify(openAIResponse(semanticDecision({
            suggestedReply:
              "Olá! Eu sou a Bruna, concierge da Clínica LIV Faria Lima. Posso te orientar sobre lifting facial.",
          }))),
          { status: 200 },
        );
      }
      if (url === "https://api.ycloud.com/v2/whatsapp/messages") {
        return new Response('{"status":"accepted"}', { status: 200 });
      }
      throw new Error(`unexpected destination: ${url}`);
    };

    const payload = patientPayload({
      eventId: "evt-semantic-route-former-patient",
      phone: "+5511900000874",
      text: "Quero entender melhor o lifting facial",
    });
    const response = await webhook(
      signedRequest(payload, process.env.YCLOUD_WEBHOOK_SECRET),
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.semanticRouteRecovered, true);
    assert.equal(openAiCalls, 2);

    const patientRequests = requests
      .filter(
        (request) =>
          request.url === "https://api.ycloud.com/v2/whatsapp/messages",
      )
      .map((request) => JSON.parse(request.options.body))
      .filter((message) => message.to === payload.whatsappInboundMessage.from);
    assert.equal(patientRequests.length, 1);
    assert.doesNotMatch(patientRequests[0].text.body, /Eu sou a Bruna/i);
    assert.match(patientRequests[0].text.body, /falar com você novamente/i);
  });
});
