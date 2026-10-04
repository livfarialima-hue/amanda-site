import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { handleYCloudWebhook } from "../ycloud-webhook.mjs";
import { extractInboundText } from "./extract-inbound-text.mjs";
import { planAutomation } from "./whatsapp-automation.mjs";

// Signed synthetic inbound -> real webhook/policy/send boundary; no network or patient data.
async function exercise(t, { mode = "active", delivery = {}, message = {} } = {}) {
  const env = {
    YCLOUD_WEBHOOK_SECRET: "synthetic-welcome-secret", YCLOUD_API_KEY: "synthetic-key",
    GOOGLE_SHEETS_WEBHOOK_URL: "https://sheets.example.test/webhook", GOOGLE_SHEETS_WEBHOOK_SECRET: "synthetic-secret",
    WHATSAPP_AUTOMATION_MODE: mode, WHATSAPP_HUMAN_REPLY_GUARD_MS: "0",
    WHATSAPP_REPLY_DEBOUNCE_DETERMINISTIC_MS: "0", WHATSAPP_INBOUND_BACKGROUND_ENABLED: "false",
    WHATSAPP_ALERT_NUMBER: undefined, OPENAI_API_KEY: undefined,
  };
  const previous = Object.fromEntries(Object.keys(env).map(key => [key, process.env[key]]));
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
  t.after(() => { for (const [key, value] of Object.entries(previous)) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  } });
  t.mock.method(console, "log", () => {});
  const patientMessages = [], leads = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    const body = JSON.parse(options.body);
    if (url === env.GOOGLE_SHEETS_WEBHOOK_URL) {
      if (body.action === "append_lead") {
        leads.push(body);
        return Response.json({ ok: true, inserted: false, updated: false, routed: false, routeStatus: "pending",
          professional: "unknown", patientRelationship: { found: false, relationshipState: "unknown" }, ...delivery });
      }
      return Response.json({ ok: true });
    }
    assert.equal(url, "https://api.ycloud.com/v2/whatsapp/messages");
    assert.equal(body.to, "+5511900000097");
    patientMessages.push(body.text.body);
    return Response.json({ status: "accepted" });
  });
  const rawBody = JSON.stringify({ id: "synthetic-welcome", type: "whatsapp.inbound_message.received",
    createTime: "2026-10-04T16:05:00Z", whatsappInboundMessage: {
      id: "synthetic-welcome-message", wamid: "synthetic-welcome-wamid", from: "+5511900000097", to: "+5511900000001",
      sendTime: "2026-10-04T16:05:00Z", type: "unsupported", customerProfile: { name: "Rosana" },
      errors: [{ code: 131060, message: "Synthetic provider detail" }], ...message,
    } });
  const timestamp = "1721908800";
  const signature = createHmac("sha256", env.YCLOUD_WEBHOOK_SECRET).update(`${timestamp}.${rawBody}`).digest("hex");
  const response = await handleYCloudWebhook(new Request("http://localhost/api/ycloud/webhook", {
    method: "POST", body: rawBody, headers: { "YCloud-Signature": `t=${timestamp},s=${signature}` },
  }));
  assert.equal(response.status, 200);
  return { result: await response.json(), patientMessages, leads };
}

test("unavailable first contact welcomes once without inventing interest or routing", async t => {
  const { result, patientMessages, leads } = await exercise(t);
  assert.equal(patientMessages.length, 1);
  assert.match(patientMessages[0], /^Olá, Rosana! Eu sou a Bruna/);
  assert.match(patientMessages[0], /A Dra\. Amanda Schroeder é cirurgiã plástica/);
  assert.match(patientMessages[0], /o que você gostaria de avaliar ou melhorar\?/);
  assert.equal((patientMessages[0].match(/\?/g) || []).length, 1);
  assert.doesNotMatch(patientMessages[0], /incomplet|reenvi|falha|131060|lifting|material|equipe foi avisada|garant/i);
  assert.equal(result.leadRouted, false);
  assert.equal(leads[0].lead.professional, null);
});

test("unavailable first contact never uses a commercial profile as a personal name", async t => {
  const { patientMessages } = await exercise(t, { message: { customerProfile: { name: "Imoveis" } } });
  assert.match(patientMessages[0], /^Olá! Eu sou a Bruna/);
  assert.doesNotMatch(patientMessages[0], /Imoveis/i);
});

for (const [label, delivery] of [
  ["prior clinic interaction", { updated: true }],
  ["known former patient", { patientRelationship: { found: true, relationshipState: "former_patient" } }],
]) test(`unavailable content preserves ${label} instead of restarting acquisition`, async t => {
  const { patientMessages } = await exercise(t, { delivery });
  assert.deepEqual(patientMessages, ["Como posso ajudar você agora?"]);
});

test("a known Daniel contact is not presented as an Amanda acquisition", async t => {
  const { patientMessages } = await exercise(t, { delivery: { professional: "daniel", routed: true } });
  assert.equal(patientMessages.length, 1);
  assert.doesNotMatch(patientMessages[0], /Amanda|cirurgiã/);
});

for (const [label, options] of [
  ["off", { mode: "off" }],
  ["shadow", { mode: "shadow" }],
  ["human takeover", { delivery: { humanTakeoverToday: true } }],
  ["opt out", { delivery: { patientRelationship: { neverBotReply: true } } }],
  ["active care", { delivery: { patientRelationship: { found: true, relationshipState: "active_postop" } } }],
]) test(`missing-content welcome respects ${label}`, async t => {
  const { patientMessages } = await exercise(t, options);
  assert.deepEqual(patientMessages, []);
});

test("available nested text follows its actual cervical interest, never the missing-content welcome", async t => {
  const body = "Olá! Quero saber sobre lifting cervical com a Dra. Amanda. Ref. M26C01W-C07H01";
  const message = { type: "text", text: {}, content: { text: { body } } };
  assert.equal(extractInboundText(message), body);
  assert.equal(planAutomation({ messageType: "text", text: extractInboundText(message) }).procedure, "lifting_cervical");
  const { result, patientMessages, leads } = await exercise(t, { message, delivery: { professional: "amanda", routed: true } });
  assert.equal(result.missingInboundText, false);
  assert.equal(result.missingTextClarificationQueued, false);
  assert.equal(leads[0].lead.text, body);
  assert.notEqual(result.automation.reason, "unsupported_or_empty_message");
  assert.doesNotMatch(patientMessages.join(" "), /incomplet|reenvi|o que você gostaria de avaliar ou melhorar/i);
});

test("provider errors, referral copy and quoted context cannot become patient text", () => {
  assert.equal(extractInboundText({ type: "unsupported", errors: [{ message: "Quero lifting" }],
    referral: { headline: "Lifting facial", body: "Quero saber valores" }, context: { text: { body: "Preço" } } }), "");
  assert.equal(extractInboundText({ text: { body: "Pergunta atual" }, content: { text: { body: "Outro conteúdo" } } }), "Pergunta atual");
});
