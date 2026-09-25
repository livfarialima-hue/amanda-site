import assert from "node:assert/strict";
import test from "node:test";
import {
  deliverLead,
  leadDeliveryRetryDelayMs,
  leadDeliveryRetryTimeoutMs,
  sheetsActionTimeoutMs,
  shouldRetryLeadDelivery,
} from "../ycloud-webhook.mjs";

test("lead and appointment writes get enough time for the Apps Script cold path", () => {
  assert.equal(sheetsActionTimeoutMs("append_lead"), 20_000);
  assert.equal(sheetsActionTimeoutMs("append_lead", "22000"), 22_000);
  assert.equal(sheetsActionTimeoutMs("append_lead", "99999"), 25_000);
  assert.equal(sheetsActionTimeoutMs("reserve_appointment_slot"), 20_000);
  assert.equal(sheetsActionTimeoutMs("upsert_appointment", "24000"), 24_000);
});

test("other Sheets actions keep the short timeout", () => {
  assert.equal(sheetsActionTimeoutMs("get_patient_relationship"), 8_000);
  assert.equal(sheetsActionTimeoutMs("record_operational_event"), 8_000);
});

test("lead delivery retries only transient downstream failures", () => {
  for (const errorCode of [
    "busy_retry",
    "empty_response",
    "html_response",
    "invalid_json_response",
    "request_failed",
    "timeout",
  ]) {
    assert.equal(
      shouldRetryLeadDelivery({ ok: false, errorCode }),
      true,
      errorCode,
    );
  }
  assert.equal(
    shouldRetryLeadDelivery({ ok: false, errorCode: "unauthorized" }),
    false,
  );
  assert.equal(
    shouldRetryLeadDelivery({ ok: true, errorCode: "none" }),
    false,
  );
});

test("lead retry delay and timeout stay bounded", () => {
  assert.equal(leadDeliveryRetryDelayMs(), 1_000);
  assert.equal(leadDeliveryRetryDelayMs("0"), 0);
  assert.equal(leadDeliveryRetryDelayMs("99999"), 5_000);
  assert.equal(leadDeliveryRetryTimeoutMs(), 8_000);
  assert.equal(leadDeliveryRetryTimeoutMs("100"), 4_000);
  assert.equal(leadDeliveryRetryTimeoutMs("99999"), 10_000);
});

test("a transient append timeout is reconciled once through the idempotent event", async () => {
  const attempts = [];
  let waited = 0;
  const result = await deliverLead(
    { eventId: "evt-timeout", messageId: "wamid-timeout" },
    {
      waitImpl: async (milliseconds) => {
        waited += milliseconds;
      },
      deliverSheetsActionImpl: async (action, payload, options) => {
        attempts.push({ action, payload, options });
        if (attempts.length === 1) {
          return { ok: false, httpStatus: null, errorCode: "timeout" };
        }
        return {
          ok: true,
          httpStatus: 200,
          errorCode: "none",
          responseData: {
            ok: true,
            duplicate: true,
            duplicateReason: "message_id",
            routed: true,
            opportunityId: "opp-timeout",
            professional: "amanda",
            routeStatus: "resolved",
            humanTakeoverToday: false,
            patientRelationship: {
              relationshipState: "new_lead",
            },
          },
        };
      },
    },
  );

  assert.equal(attempts.length, 2);
  assert.equal(waited, 1_000);
  assert.equal(attempts[1].options.timeoutMs, 8_000);
  assert.equal(result.ok, true);
  assert.equal(result.duplicate, true);
  assert.equal(result.deliveryAttempts, 2);
  assert.equal(result.recoveredAfterTransientFailure, true);
  assert.equal(result.initialDeliveryError, "timeout");
  assert.equal(result.opportunityId, "opp-timeout");
  assert.equal(result.professional, "amanda");
});

test("a non-transient append failure remains fail closed without a retry", async () => {
  let attempts = 0;
  const result = await deliverLead(
    { eventId: "evt-unauthorized" },
    {
      deliverSheetsActionImpl: async () => {
        attempts += 1;
        return {
          ok: false,
          httpStatus: 200,
          errorCode: "unauthorized",
        };
      },
    },
  );

  assert.equal(attempts, 1);
  assert.equal(result.ok, false);
  assert.equal(result.errorCode, "unauthorized");
  assert.equal(result.deliveryAttempts, 1);
  assert.equal(result.recoveredAfterTransientFailure, false);
});

test("background delivery survives the observed 27.65 second Sheets cold path without a duplicate append", async (t) => {
  const keys = ["GOOGLE_SHEETS_WEBHOOK_URL", "GOOGLE_SHEETS_WEBHOOK_SECRET"];
  const previous = keys.map((key) => process.env[key]);
  process.env.GOOGLE_SHEETS_WEBHOOK_URL = "https://sheets.test/webhook";
  process.env.GOOGLE_SHEETS_WEBHOOK_SECRET = "synthetic-secret";
  t.after(() => keys.forEach((key, index) => {
    if (previous[index] === undefined) delete process.env[key]; else process.env[key] = previous[index];
  }));
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let appends = 0, aborted = false, finished = false;
  t.mock.method(globalThis, "fetch", async (_url, options) => {
    assert.equal(JSON.parse(options.body).action, "append_lead");
    appends++;
    return new Promise((resolve, reject) => {
      options.signal.addEventListener("abort", () => {
        aborted = true; reject(new DOMException("timeout", "AbortError"));
      }, { once: true });
      setTimeout(() => resolve(Response.json({ ok: true, routed: true,
        professional: "amanda", routeStatus: "resolved", inserted: true })), 27_650);
    });
  });
  const pending = deliverLead({ eventId: "synthetic-slow-append", messageId: "synthetic-slow-message" },
    { backgroundExecution: true }).then((result) => { finished = true; return result; });
  t.mock.timers.tick(20_001);
  await Promise.resolve();
  assert.equal(aborted, false);
  assert.equal(finished, false, "No success before Sheets confirms the route");
  t.mock.timers.tick(7_650);
  const result = await pending;
  assert.equal(result.ok, true);
  assert.equal(result.inserted, true);
  assert.equal(result.deliveryAttempts, 1);
  assert.equal(appends, 1);
});

test("background retries the identical event once with a bounded confirmation window", async () => {
  const lead = { eventId: "synthetic-background-retry", messageId: "synthetic-message" };
  const attempts = [];
  const result = await deliverLead(lead, {
    backgroundExecution: true, waitImpl: async () => {},
    deliverSheetsActionImpl: async (action, payload, options) => {
      attempts.push({ action, payload, options });
      return attempts.length === 1 ? { ok: false, errorCode: "timeout" }
        : { ok: true, httpStatus: 200, responseData: { ok: true, duplicate: true, humanTakeoverToday: true } };
    },
  });
  assert.equal(attempts.length, 2);
  assert.equal(attempts[0].options.timeoutMs, 45_000);
  assert.equal(attempts[1].options.timeoutMs, 30_000);
  assert.deepEqual(attempts.map((entry) => entry.payload.lead), [lead, lead]);
  assert.equal(result.humanTakeoverToday, true);
  assert.equal(result.duplicate, true);
});
