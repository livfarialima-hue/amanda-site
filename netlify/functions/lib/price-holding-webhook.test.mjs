import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import webhook from "../ycloud-webhook.mjs";

const WEBHOOK_SECRET = "price-holding-webhook-secret";
const SHEETS_URL = "https://sheets.example.test/webhook";
const YCLOUD_URL =
  "https://api.ycloud.com/v2/whatsapp/messages";

function requestFor(payload) {
  const rawBody = JSON.stringify(payload);
  const timestamp = "1721908800";
  const signature = createHmac("sha256", WEBHOOK_SECRET)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");

  return new Request("http://localhost/api/ycloud/webhook", {
    method: "POST",
    headers: {
      "YCloud-Signature": `t=${timestamp},s=${signature}`,
    },
    body: rawBody,
  });
}

test("a first lifting price question receives the approved initial information without an alert", async () => {
  const environmentKeys = [
    "YCLOUD_WEBHOOK_SECRET",
    "YCLOUD_API_KEY",
    "GOOGLE_SHEETS_WEBHOOK_URL",
    "GOOGLE_SHEETS_WEBHOOK_SECRET",
    "OPENAI_API_KEY",
    "WHATSAPP_ALERT_NUMBER",
    "YCLOUD_ALERT_TEMPLATE_NAME",
    "YCLOUD_ALERT_TEMPLATE_LANGUAGE",
    "WHATSAPP_AUTOMATION_MODE",
    "HUMAN_RESUME_TIME_ZONE",
    "HUMAN_RESUME_START_HOUR",
    "HUMAN_RESUME_END_HOUR",
  ];
  const savedEnvironment = Object.fromEntries(
    environmentKeys.map((key) => [key, process.env[key]]),
  );
  const originalFetch = globalThis.fetch;
  const originalLog = console.log;
  const requests = [];
  const pending = [];

  Object.assign(process.env, {
    YCLOUD_WEBHOOK_SECRET: WEBHOOK_SECRET,
    YCLOUD_API_KEY: "ycloud-test-key",
    GOOGLE_SHEETS_WEBHOOK_URL: SHEETS_URL,
    GOOGLE_SHEETS_WEBHOOK_SECRET: "sheets-test-secret",
    OPENAI_API_KEY: "openai-test-key",
    WHATSAPP_ALERT_NUMBER: "+5511967743374",
    YCLOUD_ALERT_TEMPLATE_NAME: "alerta_revisao_liv_v1",
    YCLOUD_ALERT_TEMPLATE_LANGUAGE: "pt_BR",
    WHATSAPP_AUTOMATION_MODE: "active",
    HUMAN_RESUME_TIME_ZONE: "America/Sao_Paulo",
    HUMAN_RESUME_START_HOUR: "8",
    HUMAN_RESUME_END_HOUR: "20",
  });
  console.log = () => {};
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options });

    if (url === SHEETS_URL) {
      return new Response(
        JSON.stringify({
          ok: true,
          inserted: true,
          updated: false,
          duplicate: false,
          humanTakeoverToday: false,
          patientRelationship: { found: false },
          opportunityId: "opp-daytime-price",
          professional: "amanda",
          routeStatus: "resolved",
          routed: true,
        }),
        { status: 200 },
      );
    }

    if (url === "https://api.openai.com/v1/responses") {
      return new Response(
        JSON.stringify({
          model: "test-model",
          output: [
            {
              type: "message",
              content: [
                {
                  type: "output_text",
                  text: JSON.stringify({
                    route: "standard_reply",
                    confidence: "high",
                    automaticAllowed: true,
                    urgent: false,
                    professional: "amanda",
                    procedure: "lifting_facial",
                    replyCode: "SURGICAL-PRICE-INITIAL-01",
                    suggestedReply: "A pergunta é sobre o valor da cirurgia.",
                    reviewReason: "price_initial_information",
                    conversationState: {
                      activeTopic: "preço do lifting facial",
                      patientAct: "question",
                      refersToEventId: "",
                      lastClinicQuestion: "",
                      lastClinicOffer: "",
                      unresolvedQuestions: ["valor da cirurgia"],
                      factsAlreadyProvided: [],
                      owner: "bruna",
                      nextExpectedAction: "responder preço inicial",
                      ambiguity: "",
                      contextConfidence: "high",
                    },
                  }),
                },
              ],
            },
          ],
        }),
        { status: 200 },
      );
    }

    if (url === YCLOUD_URL) {
      return new Response('{"status":"accepted"}', {
        status: 200,
      });
    }

    throw new Error(`unexpected destination: ${url}`);
  };

  try {
    const response = await webhook(
      requestFor({
        id: "daytime-price-event",
        type: "whatsapp.inbound_message.received",
        createTime: "2026-07-29T11:10:00.000Z",
        whatsappInboundMessage: {
          id: "daytime-price-message",
          from: "+5511900000000",
          to: "+5511961957144",
          sendTime: "2026-07-29T11:10:00.000Z",
          type: "text",
          customerProfile: { name: "Van" },
          text: {
            body: "Quanto custa o lifting facial?",
          },
        },
      }),
      { waitUntil: (promise) => pending.push(promise) },
    );
    const body = await response.json();
    await Promise.all(pending);

    assert.equal(response.status, 200);
    assert.equal(body.reviewAlertQueued, false);
    assert.equal(body.priceHoldingQueued, false);
    assert.equal(body.priceHoldingSent, false);
    assert.equal(body.approvedPriceReplyKind, "initial_information");
    assert.equal(body.approvedPriceReplyQueued, true);
    assert.equal(body.approvedPriceReplySent, true);
    assert.equal(body.aiActiveQueued, true);
    assert.equal(body.directLiftingPriceQueued, false);
    assert.equal(body.directLiftingPriceSent, false);
    assert.equal(body.overnightHandoffQueued, false);

    const ycloudRequests = requests.filter(
      (request) => request.url === YCLOUD_URL,
    );
    assert.equal(ycloudRequests.length, 1);

    const messages = ycloudRequests.map(
      (request) => JSON.parse(request.options.body),
    );
    const patientRequest = messages.find(
      (request) => request.to === "+5511900000000",
    );
    assert.equal(patientRequest.type, "text");
    assert.doesNotMatch(patientRequest.text.body, /R\$ 18 mil|R\$ 26 mil/);
    assert.equal(
      (patientRequest.text.body.match(/https?:\/\//g) || []).length,
      1,
    );
    assert.match(
      patientRequest.text.body,
      /quanto-custa-cirurgia-plastica-facial-sao-paulo/,
    );
    assert.doesNotMatch(
      patientRequest.text.body,
      /[\u200B-\u200D\u2060\uFEFF]/,
    );
    assert.match(patientRequest.text.body, /é natural querer saber o valor antes de decidir/i);
    assert.match(patientRequest.text.body, /confirma o valor exato após a avaliação/i);
    assert.equal((patientRequest.text.body.match(/\?/g) || []).length, 0);
    assert.doesNotMatch(patientRequest.text.body, /o que mais te incomoda/i);
    assert.doesNotMatch(patientRequest.text.body, /técnica|complexidade|hospital|anestesia|materiais/i);
    assert.match(
      patientRequest.text.body,
      /referência mais concreta.+faixa geral de valores como ponto de partida/is,
    );
    assert.ok(Array.from(patientRequest.text.body).length <= 650);
    assert.doesNotMatch(
      patientRequest.text.body,
      /Se quiser, posso te explicar o que costuma aproximar/,
    );
  } finally {
    globalThis.fetch = originalFetch;
    console.log = originalLog;

    for (const [key, value] of Object.entries(savedEnvironment)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("an accepted otoplasty range offer is delivered once through the full webhook", async () => {
  const environmentKeys = [
    "YCLOUD_WEBHOOK_SECRET",
    "YCLOUD_API_KEY",
    "GOOGLE_SHEETS_WEBHOOK_URL",
    "GOOGLE_SHEETS_WEBHOOK_SECRET",
    "OPENAI_API_KEY",
    "WHATSAPP_ALERT_NUMBER",
    "YCLOUD_ALERT_TEMPLATE_NAME",
    "YCLOUD_ALERT_TEMPLATE_LANGUAGE",
    "WHATSAPP_AUTOMATION_MODE",
    "HUMAN_RESUME_TIME_ZONE",
    "HUMAN_RESUME_START_HOUR",
    "HUMAN_RESUME_END_HOUR",
  ];
  const savedEnvironment = Object.fromEntries(
    environmentKeys.map((key) => [key, process.env[key]]),
  );
  const originalFetch = globalThis.fetch;
  const originalLog = console.log;
  const requests = [];
  const pending = [];

  Object.assign(process.env, {
    YCLOUD_WEBHOOK_SECRET: WEBHOOK_SECRET,
    YCLOUD_API_KEY: "ycloud-test-key",
    GOOGLE_SHEETS_WEBHOOK_URL: SHEETS_URL,
    GOOGLE_SHEETS_WEBHOOK_SECRET: "sheets-test-secret",
    OPENAI_API_KEY: "openai-test-key",
    WHATSAPP_ALERT_NUMBER: "+5511967743374",
    YCLOUD_ALERT_TEMPLATE_NAME: "alerta_revisao_liv_v1",
    YCLOUD_ALERT_TEMPLATE_LANGUAGE: "pt_BR",
    WHATSAPP_AUTOMATION_MODE: "active",
    HUMAN_RESUME_TIME_ZONE: "America/Sao_Paulo",
    HUMAN_RESUME_START_HOUR: "8",
    HUMAN_RESUME_END_HOUR: "20",
  });
  console.log = () => {};
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options });

    if (url === SHEETS_URL) {
      const input = JSON.parse(options.body);
      if (input.action === "get_conversation_context") {
        return new Response(
          JSON.stringify({
            ok: true,
            opportunityId: "opp-otoplasty-price",
            professional: "amanda",
            turns: [
              {
                role: "user",
                source: "patient",
                text: "Tenho interesse em otoplastia em adultos.",
                eventId: "otoplasty-prefill",
                at: "2026-08-19T19:53:00.000Z",
              },
              {
                role: "assistant",
                source: "bruna",
                text: "Entendo — é natural querer saber o valor antes de decidir. Como cada cirurgia é planejada de forma individual, a Dra. Amanda confirma o valor exato após a avaliação. Este conteúdo explica o orçamento: https://draamandaschroeder.com.br/conteudos/quanto-custa-cirurgia-plastica-facial-sao-paulo/ Se você quiser, posso te passar uma faixa geral como referência inicial.",
                eventId: "otoplasty-initial-price",
                at: "2026-08-19T19:59:00.000Z",
              },
            ],
          }),
          { status: 200 },
        );
      }
      if (input.action === "append_lead") {
        return new Response(
          JSON.stringify({
            ok: true,
            inserted: false,
            updated: true,
            duplicate: false,
            humanTakeoverToday: false,
            patientRelationship: {
              found: true,
              state: "engaged_lead",
              procedureTopic: "otoplastia",
            },
            opportunityId: "opp-otoplasty-price",
            professional: "amanda",
            routeStatus: "resolved",
            routed: true,
          }),
          { status: 200 },
        );
      }
      return new Response(
        JSON.stringify({ ok: true, duplicate: false }),
        { status: 200 },
      );
    }

    if (url === "https://api.openai.com/v1/responses") {
      return new Response(
        JSON.stringify({
          model: "test-model",
          output: [
            {
              type: "message",
              content: [
                {
                  type: "output_text",
                  text: JSON.stringify({
                    route: "standard_reply",
                    confidence: "high",
                    automaticAllowed: true,
                    urgent: false,
                    professional: "amanda",
                    procedure: "otoplastia",
                    replyCode: "OTOPLASTY-PRICE-RANGE-01",
                    suggestedReply: "A paciente aceitou a faixa oferecida.",
                    reviewReason: "otoplasty_price_range_direct",
                    conversationState: {
                      activeTopic: "preço da otoplastia",
                      patientAct: "acceptance",
                      refersToEventId: "otoplasty-initial-price",
                      lastClinicQuestion: "",
                      lastClinicOffer: "faixa geral como referência inicial",
                      unresolvedQuestions: ["faixa da otoplastia"],
                      factsAlreadyProvided: ["guia de composição do orçamento"],
                      owner: "bruna",
                      nextExpectedAction: "informar faixa aprovada",
                      ambiguity: "",
                      contextConfidence: "high",
                    },
                  }),
                },
              ],
            },
          ],
        }),
        { status: 200 },
      );
    }

    if (url === YCLOUD_URL) {
      return new Response('{"status":"accepted"}', { status: 200 });
    }

    throw new Error(`unexpected destination: ${url}`);
  };

  try {
    const response = await webhook(
      requestFor({
        id: "otoplasty-range-event",
        type: "whatsapp.inbound_message.received",
        createTime: "2026-08-19T20:00:00.000Z",
        whatsappInboundMessage: {
          id: "otoplasty-range-message",
          from: "+5511900000001",
          to: "+5511961957144",
          sendTime: "2026-08-19T20:00:00.000Z",
          type: "text",
          customerProfile: { name: "Maria" },
          text: { body: "Pode me passar a faixa, sim" },
        },
      }),
      { waitUntil: (promise) => pending.push(promise) },
    );
    const body = await response.json();
    await Promise.all(pending);

    assert.equal(response.status, 200);
    assert.equal(body.approvedPriceReplyKind, "otoplasty_range");
    assert.equal(body.approvedPriceReplyQueued, true);
    assert.equal(body.approvedPriceReplySent, true);
    assert.equal(body.directOtoplastyPriceQueued, true);
    assert.equal(body.directOtoplastyPriceSent, true);
    assert.equal(body.directLiftingPriceSent, false);
    assert.equal(body.reviewAlertQueued, false);

    const patientRequests = requests
      .filter((request) => request.url === YCLOUD_URL)
      .map((request) => JSON.parse(request.options.body))
      .filter((request) => request.to === "+5511900000001");
    assert.equal(patientRequests.length, 1);
    assert.match(
      patientRequests[0].text.body,
      /otoplastia costuma ficar entre R\$ 8 mil e R\$ 14 mil/i,
    );
    assert.match(patientRequests[0].text.body, /pode ficar fora dessa faixa/i);
    assert.match(patientRequests[0].text.body, /não representa honorários isolados/i);
    assert.equal((patientRequests[0].text.body.match(/https?:\/\//g) || []).length, 0);
    assert.equal((patientRequests[0].text.body.match(/\?/g) || []).length, 0);
  } finally {
    globalThis.fetch = originalFetch;
    console.log = originalLog;

    for (const [key, value] of Object.entries(savedEnvironment)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("an acknowledgement of a pending human price return stays silent without AI or a duplicate alert", async () => {
  const environmentKeys = [
    "YCLOUD_WEBHOOK_SECRET",
    "YCLOUD_API_KEY",
    "GOOGLE_SHEETS_WEBHOOK_URL",
    "GOOGLE_SHEETS_WEBHOOK_SECRET",
    "OPENAI_API_KEY",
    "WHATSAPP_ALERT_NUMBER",
    "YCLOUD_ALERT_TEMPLATE_NAME",
    "YCLOUD_ALERT_TEMPLATE_LANGUAGE",
    "WHATSAPP_AUTOMATION_MODE",
  ];
  const savedEnvironment = Object.fromEntries(
    environmentKeys.map((key) => [key, process.env[key]]),
  );
  const originalFetch = globalThis.fetch;
  const originalLog = console.log;
  const requests = [];
  const pending = [];

  Object.assign(process.env, {
    YCLOUD_WEBHOOK_SECRET: WEBHOOK_SECRET,
    YCLOUD_API_KEY: "ycloud-test-key",
    GOOGLE_SHEETS_WEBHOOK_URL: SHEETS_URL,
    GOOGLE_SHEETS_WEBHOOK_SECRET: "sheets-test-secret",
    OPENAI_API_KEY: "openai-test-key",
    WHATSAPP_ALERT_NUMBER: "+5511967743374",
    YCLOUD_ALERT_TEMPLATE_NAME: "alerta_revisao_liv_v1",
    YCLOUD_ALERT_TEMPLATE_LANGUAGE: "pt_BR",
    WHATSAPP_AUTOMATION_MODE: "active",
  });
  console.log = () => {};
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options });

    if (url === SHEETS_URL) {
      const input = JSON.parse(options.body);
      if (input.action === "append_lead") {
        return new Response(JSON.stringify({
          ok: true,
          inserted: false,
          updated: true,
          duplicate: false,
          humanTakeoverToday: false,
          pendingCommitments: [{
            eventId: "original-price-review",
            kind: "procedure_price",
            summary: "Conferir a faixa atual e responder manualmente.",
            owner: "Amanda/equipe",
            dueAt: "2026-08-29T18:00:00.000Z",
            status: "pending",
          }],
          patientRelationship: {
            found: false,
            state: "engaged_lead",
          },
          opportunityId: "opp-pending-price",
          professional: "amanda",
          routeStatus: "resolved",
          routed: true,
        }), { status: 200 });
      }
      if (input.action === "get_conversation_context") {
        return new Response(JSON.stringify({
          ok: true,
          opportunityId: "opp-pending-price",
          professional: "amanda",
          turns: [{
            role: "assistant",
            source: "bruna",
            text: "Vou confirmar a faixa atual com a equipe e te retorno por aqui.",
            eventId: "original-price-holding",
            at: "2026-08-29T13:58:00.000Z",
          }],
          pendingCommitments: [{
            eventId: "original-price-review",
            kind: "procedure_price",
            summary: "Conferir a faixa atual e responder manualmente.",
            status: "pending",
          }],
        }), { status: 200 });
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    if (
      url === "https://api.openai.com/v1/responses" ||
      url === YCLOUD_URL
    ) {
      throw new Error(`unexpected patient-side request: ${url}`);
    }

    throw new Error(`unexpected destination: ${url}`);
  };

  try {
    const response = await webhook(
      requestFor({
        id: "pending-price-ack-event",
        type: "whatsapp.inbound_message.received",
        createTime: "2026-08-29T14:00:00.000Z",
        whatsappInboundMessage: {
          id: "pending-price-ack-message",
          from: "+5511900000099",
          to: "+5511961957144",
          sendTime: "2026-08-29T14:00:00.000Z",
          type: "text",
          customerProfile: { name: "Karina" },
          text: { body: "Tudo bem, aguardo o retorno" },
        },
      }),
      { waitUntil: (promise) => pending.push(promise) },
    );
    const body = await response.json();
    await Promise.all(pending);

    assert.equal(response.status, 200);
    assert.equal(body.conversationAction.action, "wait_team");
    assert.equal(
      body.conversationAction.reason,
      "pending_human_commitment_acknowledged",
    );
    assert.equal(body.conversationAction.unresolvedRequest, false);
    assert.equal(body.reviewAlertQueued, false);
    assert.equal(body.priceHoldingQueued, false);
    assert.equal(body.patientReplyQueued, false);
    assert.equal(body.aiActiveQueued, false);
    assert.equal(body.aiAssessmentOnlyQueued, false);
    assert.equal(body.semanticAssessmentAttempted, false);
    assert.equal(body.commitmentSyncStatus, "skipped");
    assert.equal(
      requests.some((request) => request.url === YCLOUD_URL),
      false,
    );
    assert.equal(
      requests.some(
        (request) => request.url === "https://api.openai.com/v1/responses",
      ),
      false,
    );
  } finally {
    globalThis.fetch = originalFetch;
    console.log = originalLog;

    for (const [key, value] of Object.entries(savedEnvironment)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
