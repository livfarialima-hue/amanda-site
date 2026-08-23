import assert from "node:assert/strict";
import test from "node:test";
import {
  handleScheduledFollowup,
  isScheduledFollowupWindow,
} from "../scheduled-followup.mjs";

const SECRET = "shared-secret";
const PAYLOAD = {
  planId: "2026-08-03|+5511999999999|out-1|1",
  patientPhone: "+5511999999999",
  body: "Olá! Fiquei à disposição para continuar sua pesquisa.",
  humanApproved: true,
  recentConversation: [
    {
      direction: "IN",
      at: "2026-08-02T10:00:00-03:00",
      text: "Gostaria de entender melhor a avaliação.",
    },
    {
      direction: "OUT",
      at: "2026-08-02T10:02:00-03:00",
      text: "Claro. Posso explicar como funciona.",
    },
  ],
};

function request(body = PAYLOAD, secret = SECRET) {
  return new Request(
    "https://example.test/.netlify/functions/scheduled-followup",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-liv-secret": secret,
      },
      body: JSON.stringify(body),
    },
  );
}

test("scheduled follow-up stays disabled until explicitly enabled", async () => {
  const response = await handleScheduledFollowup(request(), {
    env: {
      GOOGLE_SHEETS_WEBHOOK_SECRET: SECRET,
      YCLOUD_API_KEY: "key",
    },
    now: new Date("2026-08-03T10:30:00-03:00"),
  });

  assert.equal(response.status, 503);
  assert.equal(
    (await response.json()).error,
    "scheduled_followups_disabled",
  );
});

test("scheduled follow-up sends and records the Bruna turn", async () => {
  const sent = [];
  const turns = [];
  const response = await handleScheduledFollowup(request(), {
    env: {
      GOOGLE_SHEETS_WEBHOOK_SECRET: SECRET,
      YCLOUD_API_KEY: "key",
      WHATSAPP_SCHEDULED_FOLLOWUPS_ENABLED: "true",
      WHATSAPP_AUTOMATION_MODE: "active",
    },
    now: new Date("2026-08-03T10:30:00-03:00"),
    getBusinessNumberImpl: async () => "+5511961957144",
    reviewScheduledFollowupContextImpl: async (payload) => {
      assert.equal(payload.body, PAYLOAD.body);
      assert.equal(payload.recentConversation.length, 2);
      return {
        status: "completed",
        allowed: true,
        reasonCode: "context_aligned",
      };
    },
    sendYCloudPatientTextImpl: async (payload) => {
      sent.push(payload);
      return {
        status: "completed",
        httpStatus: 200,
        errorCode: "none",
      };
    },
    appendConversationTurnImpl: async (turn) => {
      turns.push(turn);
      return { status: "completed" };
    },
  });

  assert.equal(response.status, 200);
  assert.equal((await response.json()).sent, true);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].body, PAYLOAD.body);
  assert.equal(turns.length, 1);
  assert.equal(turns[0].role, "assistant");
  assert.equal(turns[0].source, "bruna");
});

test("scheduled follow-up is blocked when semantic review finds changed context", async () => {
  let sends = 0;
  let businessNumberReads = 0;
  const response = await handleScheduledFollowup(request(), {
    env: {
      GOOGLE_SHEETS_WEBHOOK_SECRET: SECRET,
      YCLOUD_API_KEY: "key",
      OPENAI_API_KEY: "openai-key",
      WHATSAPP_SCHEDULED_FOLLOWUPS_ENABLED: "true",
      WHATSAPP_AUTOMATION_MODE: "active",
    },
    now: new Date("2026-08-03T10:30:00-03:00"),
    reviewScheduledFollowupContextImpl: async () => ({
      status: "completed",
      allowed: false,
      reasonCode: "patient_paused",
    }),
    getBusinessNumberImpl: async () => {
      businessNumberReads += 1;
      return "+5511961957144";
    },
    sendYCloudPatientTextImpl: async () => {
      sends += 1;
      return { status: "completed" };
    },
  });

  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), {
    ok: false,
    sent: false,
    error: "semantic_context_review_required",
    semanticReason: "patient_paused",
  });
  assert.equal(businessNumberReads, 0);
  assert.equal(sends, 0);
});

test("scheduled follow-up fails closed when semantic review is unavailable", async () => {
  let sends = 0;
  const response = await handleScheduledFollowup(request(), {
    env: {
      GOOGLE_SHEETS_WEBHOOK_SECRET: SECRET,
      YCLOUD_API_KEY: "key",
      WHATSAPP_SCHEDULED_FOLLOWUPS_ENABLED: "true",
      WHATSAPP_AUTOMATION_MODE: "active",
    },
    now: new Date("2026-08-03T10:30:00-03:00"),
    reviewScheduledFollowupContextImpl: async () => ({
      status: "failed",
      allowed: false,
      errorCode: "timeout",
    }),
    sendYCloudPatientTextImpl: async () => {
      sends += 1;
      return { status: "completed" };
    },
  });

  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    ok: false,
    sent: false,
    error: "semantic_context_review_unavailable",
    semanticReason: "timeout",
  });
  assert.equal(sends, 0);
});

test("scheduled follow-up rejects night sends and invalid secrets", async () => {
  const wrongSecret = await handleScheduledFollowup(
    request(PAYLOAD, "wrong"),
    {
      env: {
        GOOGLE_SHEETS_WEBHOOK_SECRET: SECRET,
        YCLOUD_API_KEY: "key",
        WHATSAPP_SCHEDULED_FOLLOWUPS_ENABLED: "true",
        WHATSAPP_AUTOMATION_MODE: "active",
      },
      now: new Date("2026-08-03T10:30:00-03:00"),
    },
  );
  const night = await handleScheduledFollowup(request(), {
    env: {
      GOOGLE_SHEETS_WEBHOOK_SECRET: SECRET,
      YCLOUD_API_KEY: "key",
      WHATSAPP_SCHEDULED_FOLLOWUPS_ENABLED: "true",
      WHATSAPP_AUTOMATION_MODE: "active",
    },
    now: new Date("2026-08-03T22:00:00-03:00"),
  });

  assert.equal(wrongSecret.status, 401);
  assert.equal(night.status, 409);
  assert.equal(
    isScheduledFollowupWindow(
      new Date("2026-08-03T18:59:00-03:00"),
    ),
    true,
  );
  assert.equal(
    isScheduledFollowupWindow(
      new Date("2026-08-03T19:00:00-03:00"),
    ),
    false,
  );
});

test("the global automation switch blocks a scheduled follow-up", async () => {
  let sends = 0;
  const response = await handleScheduledFollowup(request(), {
    env: {
      GOOGLE_SHEETS_WEBHOOK_SECRET: SECRET,
      YCLOUD_API_KEY: "key",
      WHATSAPP_SCHEDULED_FOLLOWUPS_ENABLED: "true",
      WHATSAPP_AUTOMATION_MODE: "off",
    },
    now: new Date("2026-08-03T10:30:00-03:00"),
    sendYCloudPatientTextImpl: async () => {
      sends += 1;
      return { status: "completed" };
    },
  });

  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    ok: false,
    sent: false,
    error: "automation_inactive",
    automationMode: "off",
  });
  assert.equal(sends, 0);
});
