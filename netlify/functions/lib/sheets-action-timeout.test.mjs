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
