import assert from "node:assert/strict";
import test from "node:test";
import { sendYCloudPatientText } from "./ycloud-patient-message.mjs";

test("sends a free-form text through YCloud with the expected envelope", async () => {
  let request;
  const result = await sendYCloudPatientText(
    {
      from: "+5511961957144",
      to: "+5511999999999",
      eventId: "evt_test_01",
      body: "Olá! Como posso ajudar?",
    },
    {
      env: { YCLOUD_API_KEY: "test-key" },
      fetchImpl: async (url, options) => {
        request = { url, options };
        return new Response("{}", { status: 200 });
      },
    },
  );

  const payload = JSON.parse(request.options.body);

  assert.equal(result.status, "completed");
  assert.equal(
    request.url,
    "https://api.ycloud.com/v2/whatsapp/messages",
  );
  assert.equal(
    request.options.headers["X-API-Key"],
    "test-key",
  );
  assert.equal(payload.from, "+5511961957144");
  assert.equal(payload.to, "+5511999999999");
  assert.equal(payload.type, "text");
  assert.equal(payload.text.body, "Olá! Como posso ajudar?");
  assert.equal(payload.text.preview_url, false);
});

test("skips sending when configuration is incomplete", async () => {
  const result = await sendYCloudPatientText(
    {
      from: "+5511961957144",
      to: "+5511999999999",
      eventId: "evt_test_02",
      body: "Olá!",
    },
    {
      env: {},
      fetchImpl: async () => {
        throw new Error("fetch should not run");
      },
    },
  );

  assert.equal(result.status, "skipped");
  assert.equal(result.errorCode, "configuration_missing");
});
