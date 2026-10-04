import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { planAutomation } from "./whatsapp-automation.mjs";
import { classifyHumanResume, buildDelayedHumanReceipt } from "./human-resume-policy.mjs";
import { scheduleHumanResume } from "./human-resume-queue.mjs";
import { processHumanResumeJob } from "../human-resume.mjs";
import { handleYCloudWebhook } from "../ycloud-webhook.mjs";

const unsupported = { route: "human_review", reason: "unsupported_or_empty_message", automaticAllowed: false };

test("reaction is not a request for review, even after a human scheduling exchange", () => {
  const input = { text: "", messageType: " ReAcTiOn ", recentConversation: [
    { role: "user", text: "Semana que vem pretendo marcar consulta, obrigado!" },
    { role: "assistant", source: "equipe_humana", text: "Combinado! Quando quiser ver horários, nos avise." },
  ] };
  assert.equal(planAutomation(input).route, "ignore");
  assert.deepEqual(classifyHumanResume({ ...input, preliminaryPlan: unsupported, enrichedPlan: unsupported }),
    { action: "no_action", reason: "reaction_event" });
});

test("reactions never produce a delayed receipt, including stale scheduling classification", () => {
  for (const reason of ["unsupported_or_empty_message", "scheduling_or_confirmation"]) {
    assert.equal(buildDelayedHumanReceipt({ text: "", messageType: "reaction", reason }), "");
  }
});

test("material receipt requires an actual media type; unsupported events remain neutral", () => {
  for (const messageType of ["image", "video", "document", "audio"]) {
    assert.match(buildDelayedHumanReceipt({ messageType }), /material que você enviou/);
    assert.equal(planAutomation({ messageType }).route, "human_review");
  }
  for (const messageType of ["unsupported", "unknown", "sticker", "contacts", "location"]) {
    assert.doesNotMatch(buildDelayedHumanReceipt({ messageType }), /material|foto|documento|áudio/);
    assert.equal(planAutomation({ messageType }).route, "human_review");
  }
});

test("a typed reaction cannot create or replace a resume job and never opens storage", async () => {
  let opened = 0;
  const result = await scheduleHumanResume({ phone: "+5511900000000", from: "+5511900000001",
    eventId: "synthetic-reaction", messageType: "reaction", text: "" },
    { getStoreImpl: () => { opened++; throw new Error("must not access storage"); } });
  assert.equal(result.status, "skipped");
  assert.equal(result.reason, "reaction_event");
  assert.equal(opened, 0);
});

for (const mode of ["active", "off"]) {
  test(`legacy reaction job finishes silently while preserving ownership, mode ${mode}`, async () => {
    const completed = [];
    const fail = async () => { assert.fail("reaction must not trigger external work"); };
    const result = await processHumanResumeJob({ eventId: "legacy-reaction", messageType: "reaction", text: "",
      receivedAt: "2026-10-04T02:00:00Z", preserveHumanOwnership: true }, {
      now: Date.parse("2026-10-04T05:00:00Z"), env: { WHATSAPP_AUTOMATION_MODE: mode },
      completeHumanResumeImpl: async (job, options) => { completed.push(options); return { status: "completed" }; },
      readConversationTurnsImpl: fail, callClassificationSheetsImpl: fail, getDurableConversationContextImpl: fail,
      sendYCloudReviewAlertImpl: fail, sendYCloudPatientTextImpl: fail, runOpenAIShadowImpl: fail,
      rescheduleHumanResumeImpl: fail,
    });
    assert.deepEqual(result, { status: "no_action", reason: "reaction_event" });
    assert.deepEqual(completed, [{ controlStatus: "preserve" }]);
  });
}

test("legacy reaction completion failure is visible and does not claim successful cleanup", async () => {
  const result = await processHumanResumeJob({ messageType: "reaction" }, {
    completeHumanResumeImpl: async () => ({ status: "failed" }),
  });
  assert.deepEqual(result, { status: "failed", reason: "reaction_event" });
});

for (const [label, emoji, background] of [["thumb", "👍", false], ["heart", "❤️", true], ["removal", "", false]]) {
  test(`signed ${label} reaction is acknowledged without CRM, message, alert, memory or recovery effects`, async t => {
    const secret = "synthetic-reaction-secret", prior = process.env.YCLOUD_WEBHOOK_SECRET;
    process.env.YCLOUD_WEBHOOK_SECRET = secret;
    t.after(() => { if (prior === undefined) delete process.env.YCLOUD_WEBHOOK_SECRET; else process.env.YCLOUD_WEBHOOK_SECRET = prior; });
    t.mock.method(console, "log", () => {});
    let fetches = 0, recoveries = 0;
    t.mock.method(globalThis, "fetch", async () => { fetches++; throw new Error("no network effects allowed"); });
    const body = JSON.stringify({ id: "synthetic-" + label, type: "whatsapp.inbound_message.received", createTime: "2026-10-04T15:00:00Z",
      whatsappInboundMessage: { id: "synthetic-message", from: "+5511900000000", to: "+5511900000001", type: "reaction",
        reaction: { message_id: "synthetic-clinic-closure", emoji } } });
    const timestamp = "1721908800", signature = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
    const request = () => new Request("http://localhost/api/ycloud/webhook", { method: "POST", body,
      headers: { "YCloud-Signature": `t=${timestamp},s=${signature}` } });
    for (let delivery = 0; delivery < 2; delivery++) {
      const response = await handleYCloudWebhook(request(), { livInboundBackground: background }, {
        registerInboundRecoveryImpl: async () => { recoveries++; return { status: "completed" }; },
      });
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { received: true, ignored: true, reason: "reaction_event" });
    }
    assert.equal(fetches, 0); assert.equal(recoveries, 0);
  });
}

test("reaction bypass is after signature authentication", async t => {
  const prior = process.env.YCLOUD_WEBHOOK_SECRET;
  process.env.YCLOUD_WEBHOOK_SECRET = "synthetic-reaction-secret";
  t.after(() => { if (prior === undefined) delete process.env.YCLOUD_WEBHOOK_SECRET; else process.env.YCLOUD_WEBHOOK_SECRET = prior; });
  t.mock.method(console, "log", () => {});
  const response = await handleYCloudWebhook(new Request("http://localhost/api/ycloud/webhook", { method: "POST",
    body: JSON.stringify({ type: "whatsapp.inbound_message.received", whatsappInboundMessage: { type: "reaction" } }) }));
  assert.equal(response.status, 401);
});

test("a text mentioning a reaction still follows its clinical question", () => {
  assert.equal(planAutomation({ text: "Reagi com 👍, mas estou com falta de ar após a cirurgia", messageType: "text" }).reason,
    "possible_urgent_symptoms");
});
