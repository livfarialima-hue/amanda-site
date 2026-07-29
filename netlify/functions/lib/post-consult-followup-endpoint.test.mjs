import assert from "node:assert/strict";
import test from "node:test";
import {
  handlePostConsultFollowup,
  isPostConsultWindow,
} from "../post-consult-followup.mjs";

const SECRET = "shared-secret";
const PAYLOAD = {
  appointmentId: "consulta-42",
  patientPhone: "+5511999999999",
  professional: "Dra. Amanda",
};

function request(body = PAYLOAD, secret = SECRET) {
  return new Request(
    "https://example.test/.netlify/functions/post-consult-followup",
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

test("post-consult endpoint stays off until explicitly enabled", async () => {
  const response = await handlePostConsultFollowup(request(), {
    env: {
      GOOGLE_SHEETS_WEBHOOK_SECRET: SECRET,
      YCLOUD_API_KEY: "key",
    },
    now: new Date("2026-07-28T14:00:00-03:00"),
  });

  assert.equal(response.status, 503);
  assert.equal(
    (await response.json()).error,
    "post_consult_disabled",
  );
});

test("post-consult endpoint sends only in the daytime window", async () => {
  const calls = [];
  const response = await handlePostConsultFollowup(request(), {
    env: {
      GOOGLE_SHEETS_WEBHOOK_SECRET: SECRET,
      YCLOUD_API_KEY: "key",
      WHATSAPP_POST_CONSULT_ENABLED: "true",
    },
    now: new Date("2026-07-28T14:00:00-03:00"),
    getBusinessNumberImpl: async () => "+5511961957144",
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return new Response("{}", { status: 200 });
    },
  });

  assert.equal(response.status, 200);
  assert.equal((await response.json()).sent, true);
  assert.equal(calls.length, 1);
});

test("post-consult window excludes night and early morning", () => {
  assert.equal(
    isPostConsultWindow(
      new Date("2026-07-28T10:00:00-03:00"),
    ),
    true,
  );
  assert.equal(
    isPostConsultWindow(
      new Date("2026-07-28T22:00:00-03:00"),
    ),
    false,
  );
});
