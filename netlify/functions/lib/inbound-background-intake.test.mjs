import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { handleYCloudWebhook } from "../ycloud-webhook.mjs";
import { processInboundRecoveryJob } from "../ycloud-recovery.mjs";

const secret = "synthetic-intake-secret";
const payload = {
  id: "synthetic-new-inbound",
  type: "whatsapp.inbound_message.received",
  createTime: "2026-09-24T23:00:00Z",
  whatsappInboundMessage: {
    id: "synthetic-message", from: "+5511900000000", to: "+5511900000001",
    type: "text", sendTime: "2026-09-24T23:00:00Z",
    text: { body: "Quero saber sobre lifting cervical com a Dra. Amanda." },
  },
};

function request(value = payload, headers = {}) {
  const body = JSON.stringify(value);
  const timestamp = "1790290800";
  const signature = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
  return new Request("https://example.test/api/ycloud/webhook", {
    method: "POST", body,
    headers: { "content-type": "application/json", "YCloud-Signature": `t=${timestamp},s=${signature}`, ...headers },
  });
}

function setup(t, overrides = {}) {
  const values = {
    YCLOUD_WEBHOOK_SECRET: secret, WHATSAPP_AUTOMATION_MODE: "active",
    WHATSAPP_INBOUND_BACKGROUND_ENABLED: "true",
    GOOGLE_SHEETS_WEBHOOK_URL: "https://sheets.test/webhook", GOOGLE_SHEETS_WEBHOOK_SECRET: "synthetic-sheets",
    GOOGLE_SHEETS_APPEND_RETRY_DELAY_MS: "0", OPENAI_API_KEY: "", YCLOUD_API_KEY: "",
    WHATSAPP_INTERNAL_NUMBERS: "", WHATSAPP_INTERNAL_NUMBERS_EXTRA: "",
    ...overrides,
  };
  const previous = Object.fromEntries(Object.keys(values).map((key) => [key, process.env[key]]));
  Object.assign(process.env, values);
  t.after(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  });
  t.mock.method(console, "log", () => {});
  let remoteCalls = 0;
  t.mock.method(globalThis, "fetch", async () => {
    remoteCalls++;
    throw new Error("Intake must not contact Sheets, the model or the message provider");
  });
  return () => remoteCalls;
}

function dependencies(overrides = {}) {
  return {
    registerInboundRecoveryImpl: async () => ({ status: "completed", queueKey: "synthetic-key" }),
    markLatestInboundForReplyImpl: async () => ({ status: "completed" }),
    dispatchInboundRecoveryImpl: async () => ({ status: "dispatched", httpStatus: 202 }),
    ...overrides,
  };
}

test("signed inbound is persisted and acknowledged before slow downstream work starts", async (t) => {
  const remoteCalls = setup(t);
  const order = [];
  let stored;
  const response = await handleYCloudWebhook(request(), {}, dependencies({
    registerInboundRecoveryImpl: async (input, options) => {
      order.push("persist"); stored = input;
      assert.equal(options.recoveryDelayMs, 0);
      return { status: "completed", queueKey: "synthetic-key" };
    },
    markLatestInboundForReplyImpl: async () => { order.push("marker"); return { status: "completed" }; },
    dispatchInboundRecoveryImpl: async () => { order.push("dispatch"); return { status: "dispatched" }; },
  }));
  assert.equal(response.status, 202);
  const body = await response.json();
  assert.equal(body.automaticWorkFinished, false);
  assert.equal(body.aiActiveStatus, "deferred");
  assert.equal(body.leadRecorded, false);
  assert.equal(remoteCalls(), 0);
  assert.deepEqual(order, ["persist", "marker", "dispatch"]);
  assert.equal(stored.rawBody, JSON.stringify(payload));
  assert.equal(stored.eventId, payload.id);
  assert.equal(stored.primaryIntake, true);
});

for (const registration of [
  { status: "failed", reason: "storage_failed" },
  { status: "skipped", reason: "invalid_event" },
]) {
  test(`intake fails closed without durable persistence (${registration.status})`, async (t) => {
    const remoteCalls = setup(t);
    let dispatched = false;
    const response = await handleYCloudWebhook(request(), {}, dependencies({
      registerInboundRecoveryImpl: async () => registration,
      dispatchInboundRecoveryImpl: async () => { dispatched = true; },
    }));
    assert.equal(response.status, 503);
    assert.equal((await response.json()).received, false);
    assert.equal(dispatched, false);
    assert.equal(remoteCalls(), 0);
  });
}

test("dispatch failure remains retryable and never claims completion", async (t) => {
  setup(t);
  const response = await handleYCloudWebhook(request(), {}, dependencies({
    dispatchInboundRecoveryImpl: async () => ({ status: "dispatch_failed" }),
  }));
  assert.equal(response.status, 503);
  const body = await response.json();
  assert.equal(body.automaticWorkFinished, false);
  assert.equal(body.recoveryStatus, "pending");
});

test("a completed event is acknowledged without changing its marker or dispatching again", async (t) => {
  setup(t);
  let touched = false;
  const response = await handleYCloudWebhook(request(), {}, dependencies({
    registerInboundRecoveryImpl: async () => ({ status: "duplicate", reason: "already_completed" }),
    markLatestInboundForReplyImpl: async () => { touched = true; },
    dispatchInboundRecoveryImpl: async () => { touched = true; },
  }));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).ignoreReason, "already_completed");
  assert.equal(touched, false);
});

test("pending provider retry wakes the existing queue without claiming a patient reply", async (t) => {
  setup(t);
  const response = await handleYCloudWebhook(request(), {}, dependencies({
    registerInboundRecoveryImpl: async () => ({ status: "duplicate", reason: "already_pending" }),
  }));
  assert.equal(response.status, 202);
  assert.equal((await response.json()).automaticWorkFinished, false);
});

test("untrusted retry headers do not opt into the background execution budget", async (t) => {
  setup(t);
  const response = await handleYCloudWebhook(request(payload, {
    "X-LIV-Durable-Retry": "1", "X-LIV-Recovery": "1",
  }), {}, dependencies());
  assert.equal(response.status, 202);
});

test("bad signature, internal phone and missing event never enter the background queue", async (t) => {
  setup(t, { WHATSAPP_INTERNAL_NUMBERS: "+5511900000002" });
  let registered = false;
  const deps = dependencies({ registerInboundRecoveryImpl: async () => { registered = true; } });
  const invalid = await handleYCloudWebhook(request(payload, { "YCloud-Signature": "invalid" }), {}, deps);
  assert.equal(invalid.status, 401);
  const internal = await handleYCloudWebhook(request({ ...payload,
    whatsappInboundMessage: { ...payload.whatsappInboundMessage, from: "+5511900000002" },
  }), {}, deps);
  assert.equal((await internal.json()).ignoreReason, "internal_team_phone");
  const missing = await handleYCloudWebhook(request({ ...payload, id: "",
    whatsappInboundMessage: { ...payload.whatsappInboundMessage, id: "" },
  }), {}, deps);
  assert.equal(missing.status, 400);
  assert.equal(registered, false);
});

for (const [mode, flag] of [["active", ""], ["active", "false"], ["off", "true"], ["shadow", "true"]]) {
  test(`health reports direct processing for mode=${mode}, flag=${flag || "unset"}`, async (t) => {
    setup(t, { WHATSAPP_AUTOMATION_MODE: mode, WHATSAPP_INBOUND_BACKGROUND_ENABLED: flag });
    const response = await handleYCloudWebhook(new Request("https://example.test"), {});
    assert.equal((await response.json()).processingMode, "direct_with_background_completion");
  });
  test(`inbound keeps direct execution for mode=${mode}, flag=${flag || "unset"}`, async (t) => {
    setup(t, { WHATSAPP_AUTOMATION_MODE: mode, WHATSAPP_INBOUND_BACKGROUND_ENABLED: flag });
    let registered = false;
    const response = await handleYCloudWebhook(request(), {}, dependencies({
      registerInboundRecoveryImpl: async (input, options) => {
        registered = true;
        assert.equal(input.primaryIntake, false);
        assert.equal(options, undefined);
        return { status: "failed", reason: "storage_failed" };
      },
      dispatchInboundRecoveryImpl: async () => assert.fail("Default-off intake must not dispatch"),
    }));
    assert.equal(registered, true);
    assert.notEqual(response.status, 202);
  });
}

test("empty and nontext messages keep their existing guarded path", async (t) => {
  setup(t);
  for (const type of ["text", "image", "unsupported"]) {
    const response = await handleYCloudWebhook(request({ ...payload,
      whatsappInboundMessage: { ...payload.whatsappInboundMessage, type, text: { body: "" } },
    }), {}, dependencies({
      registerInboundRecoveryImpl: async () => assert.fail("No text job to persist"),
      dispatchInboundRecoveryImpl: async () => assert.fail("No background dispatch"),
    }));
    assert.notEqual(response.status, 202);
  }
});

test("worker crosses the real controller, awaits slow canonical confirmation and preserves human takeover", async (t) => {
  setup(t);
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const signed = request();
  const job = { eventId: payload.id, phone: payload.whatsappInboundMessage.from, primaryIntake: true,
    rawBody: await signed.text(), signature: signed.headers.get("YCloud-Signature"),
    origin: "https://example.test", attempts: 1, createdAt: payload.createTime };
  let appendEntered;
  const entered = new Promise((resolve) => { appendEntered = resolve; });
  const actions = [];
  let aborted = false, completed = false, handlerResult;
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(String(url), "https://sheets.test/webhook", "No model or patient send after takeover");
    const body = JSON.parse(options.body);
    actions.push(body.action);
    const confirmation = () => Response.json({ ok: true, inserted: true, routed: true,
      professional: "amanda", routeStatus: "resolved", opportunityId: "synthetic-opportunity",
      humanTakeoverToday: true, patientRelationship: { found: false } });
    if (body.action !== "append_lead") return confirmation();
    return new Promise((resolve, reject) => {
      options.signal.addEventListener("abort", () => {
        aborted = true; reject(new DOMException("timeout", "AbortError"));
      }, { once: true });
      setTimeout(() => resolve(confirmation()), 27_650);
      appendEntered();
    });
  });
  const pending = processInboundRecoveryJob(job, {
    now: Date.parse(payload.createTime),
    getLatestInboundReplyMarkerImpl: async () => ({ status: "completed", found: false }),
    processImpl: async (request, context) => {
      const response = await handleYCloudWebhook(request, context, dependencies({
        registerInboundRecoveryImpl: async () => ({ status: "duplicate", reason: "already_pending" }),
        dispatchInboundRecoveryImpl: async () => assert.fail("Worker must not re-enqueue itself"),
      }));
      handlerResult = await response.clone().json();
      return response;
    },
    completeInboundRecoveryImpl: async (_job, options) => {
      assert.equal(options.outcome, "human_takeover"); completed = true; return { status: "completed" };
    },
    rescheduleInboundRecoveryImpl: async () => assert.fail("Confirmed takeover needs no retry"),
  });
  await entered;
  t.mock.timers.tick(20_001);
  await Promise.resolve();
  assert.equal(aborted, false);
  assert.equal(completed, false);
  t.mock.timers.tick(7_650);
  const result = await pending;
  assert.equal(result.status, "completed");
  assert.equal(handlerResult.humanTakeoverToday, true);
  assert.equal(handlerResult.aiActiveQueued, false);
  assert.equal(actions.filter((action) => action === "append_lead").length, 1);
});
