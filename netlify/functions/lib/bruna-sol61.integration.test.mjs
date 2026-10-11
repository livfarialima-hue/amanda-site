import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { runOpenAIShadow } from "./openai-shadow.mjs";
import { runLeadClassifier } from "./lead-classifier.mjs";
import { reviewScheduledFollowupContext } from "./scheduled-followup-context-review.mjs";
import { handleYCloudWebhook } from "../ycloud-webhook.mjs";

// Synthetic fixtures only. Every network request is intercepted.
const env = {
  OPENAI_API_KEY: "synthetic",
  OPENAI_MODEL: "old-general-model", OPENAI_BRUNA_MODEL: "old-bruna-model",
  OPENAI_CLASSIFIER_MODEL: "old-classifier-model",
  OPENAI_REASONING_EFFORT: "low", OPENAI_BRUNA_REASONING_EFFORT: "high",
  OPENAI_CLASSIFIER_REASONING_EFFORT: "low",
};
const history = [
  { direction: "IN", role: "user", text: "Gostaria de entender a avaliação.", at: "2026-10-11T13:00:00Z" },
  { direction: "OUT", role: "assistant", source: "bruna", text: "A avaliação é individual.", at: "2026-10-11T13:01:00Z" },
];
for (const [name, run] of [
  ["conversation and human-resume", options => runOpenAIShadow({ phone: "+5511900000000", text: "Como funciona?", recentConversation: history }, options)],
  ["lead classification", options => runLeadClassifier({ phone: "+5511900000000", messages: history }, options)],
  ["scheduled follow-up review", options => reviewScheduledFollowupContext({ patientPhone: "+5511900000000", body: "Sobre a avaliação, ficou alguma dúvida?", recentConversation: history, humanApproved: true }, options)],
]) {
  test(`${name} always requests Sol 6.1 medium despite stale environment overrides`, async () => {
    const requests = [];
    await run({ env, fetchImpl: async (url, options) => {
      assert.equal(url, "https://api.openai.com/v1/responses");
      requests.push(JSON.parse(options.body));
      return new Response("{}", { status: 503 });
    } });
    assert.equal(requests.length, 1);
    assert.equal(requests[0].model, "gpt-6.1-sol");
    assert.equal(requests[0].reasoning.effort, "medium");
    assert.equal(requests[0].store, false);
    assert.equal(requests[0].max_output_tokens, 4096);
  });
  test(`${name} fails closed on incomplete output without retrying a different model`, async () => {
    let calls = 0;
    const outcome = await run({ env, fetchImpl: async () => {
      calls++;
      return new Response(JSON.stringify({ status: "incomplete", incomplete_details: { reason: "max_output_tokens" }, output_text: "{}" }));
    } });
    assert.equal(calls, 1);
    assert.equal(outcome.status, "failed");
    assert.equal(outcome.errorCode, "incomplete_response");
    assert.notEqual(outcome.allowed, true);
  });
}

test("webhook keeps contextual consultation wording through the actual outbound gate", async t => {
  const secret = "synthetic-sol61-secret";
  const sheets = "https://sheets.example.test/webhook";
  const settings = { ...env, YCLOUD_WEBHOOK_SECRET: secret, YCLOUD_API_KEY: "synthetic",
    GOOGLE_SHEETS_WEBHOOK_URL: sheets, GOOGLE_SHEETS_WEBHOOK_SECRET: "synthetic",
    WHATSAPP_AUTOMATION_MODE: "active", WHATSAPP_INBOUND_BACKGROUND_ENABLED: "true",
    WHATSAPP_HUMAN_REPLY_GUARD_MS: "0", WHATSAPP_REPLY_DEBOUNCE_DETERMINISTIC_MS: "0",
    WHATSAPP_REPLY_DEBOUNCE_AI_MS: "0", BRUNA_CONVERSION_EXPERIENCE_V1: "enabled" };
  const previous = Object.fromEntries(Object.keys(settings).map(key => [key, process.env[key]]));
  Object.assign(process.env, settings);
  t.after(() => { for (const [key, value] of Object.entries(previous)) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  } });
  const logs = [];
  t.mock.method(console, "log", (...parts) => logs.push(parts));
  const draft = "A consulta presencial com a Dra. Amanda custa R$ 500. É o momento de conversar sobre o que você busca e esclarecer suas dúvidas, sem precisar decidir por uma cirurgia agora.";
  const sent = [];
  let modelCalls = 0;
  t.mock.method(globalThis, "fetch", async (url, options) => {
    const data = JSON.parse(options.body);
    if (url === sheets) return new Response(JSON.stringify(data.action === "get_conversation_context"
      ? { ok: true, turns: history, professional: "amanda", opportunityId: "synthetic-sol61" }
      : { ok: true, sent: true, updated: true, duplicate: false, routed: true, routeStatus: "resolved",
        professional: "amanda", opportunityId: "synthetic-sol61", humanTakeoverToday: false,
        patientRelationship: { found: false } }));
    if (url === "https://api.openai.com/v1/responses") {
      modelCalls++;
      const input = JSON.parse(data.input);
      assert.equal(input.policyHints.deterministicReplyCode, "AMANDA-CONSULTA-INFO-01");
      return new Response(JSON.stringify({ model: "gpt-6.1-sol", output_text: JSON.stringify({
        route: "standard_reply", confidence: "high", automaticAllowed: true, urgent: false,
        professional: "amanda", procedure: input.procedureContext || "unknown", replyCode: "AMANDA-CONSULTA-INFO-01",
        replyWording: "contextual", suggestedReply: draft, reviewReason: "",
        conversationState: { activeTopic: "consulta", patientAct: "question", refersToEventId: "",
          lastClinicQuestion: "", lastClinicOffer: "", unresolvedQuestions: [], factsAlreadyProvided: ["consulta"],
          owner: "bruna", nextExpectedAction: "aguardar", ambiguity: "", contextConfidence: "high" },
      }) }));
    }
    assert.equal(url, "https://api.ycloud.com/v2/whatsapp/messages", "unexpected network destination");
    sent.push(data);
    return new Response('{"status":"accepted"}');
  });
  const payload = { id: "synthetic-sol61-event", type: "whatsapp.inbound_message.received", createTime: "2026-10-11T13:02:00Z",
    whatsappInboundMessage: { id: "synthetic-sol61-message", from: "+5511900000000", to: "+5511900000001",
      sendTime: "2026-10-11T13:02:00Z", type: "text", text: { body: "Qual o valor da consulta com a Dra. Amanda?" } } };
  const body = JSON.stringify(payload), timestamp = String(Math.floor(Date.now() / 1000));
  const signature = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
  const response = await handleYCloudWebhook(new Request("https://example.test/api/ycloud/webhook", {
    method: "POST", headers: { "content-type": "application/json", "ycloud-signature": `t=${timestamp},s=${signature}` }, body,
  }), { livInboundBackground: true }, { registerInboundRecoveryImpl: async () => ({ status: "completed" }) });
  const outcome = await response.json();
  assert.ok(modelCalls > 0, JSON.stringify(outcome));
  const replies = sent.filter(message => message.to === "+5511900000000");
  assert.equal(replies.length, 1, JSON.stringify({ outcome, logs }));
  assert.equal(replies[0].text.body, draft);
});
