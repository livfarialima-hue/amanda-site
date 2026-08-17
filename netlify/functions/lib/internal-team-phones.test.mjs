import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import webhook from "../ycloud-webhook.mjs";
import {
  configuredInternalTeamPhones,
  hasConfiguredInternalTeamPhones,
  isInternalTeamPhone,
} from "./internal-team-phones.mjs";

const WEBHOOK_SECRET = "internal-phone-test-secret";
const BUSINESS_PHONE = "+5511900000199";
const INTERNAL_PHONE_A = "+5511900000101";
const INTERNAL_PHONE_B = "+5511900000102";

function signedRequest(payload) {
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

test("normalizes the configured internal team list without exposing it", () => {
  const env = {
    WHATSAPP_INTERNAL_NUMBERS:
      "+55 (11) 90000-0101; 5511900000102",
  };

  assert.deepEqual(
    [...configuredInternalTeamPhones(env)],
    [INTERNAL_PHONE_A, INTERNAL_PHONE_B],
  );
  assert.equal(isInternalTeamPhone(INTERNAL_PHONE_A, env), true);
  assert.equal(isInternalTeamPhone("+5511900000999", env), false);
  assert.equal(hasConfiguredInternalTeamPhones(env), true);
});

test("ignores an inbound internal number before every downstream write", async () => {
  const keys = [
    "YCLOUD_WEBHOOK_SECRET",
    "WHATSAPP_INTERNAL_NUMBERS",
  ];
  const saved = Object.fromEntries(
    keys.map((key) => [key, process.env[key]]),
  );
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;

  process.env.YCLOUD_WEBHOOK_SECRET = WEBHOOK_SECRET;
  process.env.WHATSAPP_INTERNAL_NUMBERS = [
    INTERNAL_PHONE_A,
    INTERNAL_PHONE_B,
  ].join(",");
  globalThis.fetch = async () => {
    fetchCalls += 1;
    throw new Error("internal numbers must not reach downstream services");
  };

  try {
    const response = await webhook(
      signedRequest({
        id: "internal-inbound-event",
        type: "whatsapp.inbound_message.received",
        whatsappInboundMessage: {
          id: "internal-inbound-message",
          wamid: "wamid.internal-inbound-message",
          from: INTERNAL_PHONE_A,
          to: BUSINESS_PHONE,
          type: "text",
          text: { body: "Mensagem interna" },
        },
      }),
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.received, true);
    assert.equal(body.ignored, true);
    assert.equal(body.ignoreReason, "internal_team_phone");
    assert.equal(body.leadRecorded, false);
    assert.equal(body.appointmentReserved, false);
    assert.equal(fetchCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("ignores an echo sent to an internal number before takeover or scheduling", async () => {
  const keys = [
    "YCLOUD_WEBHOOK_SECRET",
    "WHATSAPP_INTERNAL_NUMBERS",
  ];
  const saved = Object.fromEntries(
    keys.map((key) => [key, process.env[key]]),
  );
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;

  process.env.YCLOUD_WEBHOOK_SECRET = WEBHOOK_SECRET;
  process.env.WHATSAPP_INTERNAL_NUMBERS = [
    INTERNAL_PHONE_A,
    INTERNAL_PHONE_B,
  ].join(",");
  globalThis.fetch = async () => {
    fetchCalls += 1;
    throw new Error("internal echoes must not reach downstream services");
  };

  try {
    const response = await webhook(
      signedRequest({
        id: "internal-echo-event",
        type: "whatsapp.smb.message.echoes",
        whatsappMessage: {
          id: "internal-echo-message",
          wamid: "wamid.internal-echo-message",
          from: BUSINESS_PHONE,
          to: INTERNAL_PHONE_B,
          type: "text",
          text: { body: "Mensagem da equipe" },
        },
      }),
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.received, true);
    assert.equal(body.ignored, true);
    assert.equal(body.ignoreReason, "internal_team_phone");
    assert.equal(body.leadRecorded, false);
    assert.equal(body.appointmentReserved, false);
    assert.equal(fetchCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
