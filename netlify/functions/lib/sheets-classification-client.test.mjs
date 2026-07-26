import assert from "node:assert/strict";
import test from "node:test";
import { callClassificationSheets } from "./sheets-classification-client.mjs";

test("classification action includes shared secret and payload", async () => {
  let sentBody;

  const result = await callClassificationSheets(
    "claim_due_classifications",
    { limit: 3 },
    {
      env: {
        GOOGLE_SHEETS_WEBHOOK_URL:
          "https://sheets.example.test/webhook",
        GOOGLE_SHEETS_WEBHOOK_SECRET: "test-secret",
      },
      fetchImpl: async (_url, options) => {
        sentBody = JSON.parse(options.body);
        return new Response(
          JSON.stringify({
            ok: true,
            jobs: [],
          }),
          { status: 200 },
        );
      },
    },
  );

  assert.equal(result.status, "completed");
  assert.deepEqual(sentBody, {
    secret: "test-secret",
    action: "claim_due_classifications",
    limit: 3,
  });
});

test("Apps Script controlled error is returned without throwing", async () => {
  const result = await callClassificationSheets(
    "complete_classification",
    {},
    {
      env: {
        GOOGLE_SHEETS_WEBHOOK_URL:
          "https://sheets.example.test/webhook",
        GOOGLE_SHEETS_WEBHOOK_SECRET: "test-secret",
      },
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            ok: false,
            error: "busy_retry",
          }),
          { status: 200 },
        ),
    },
  );

  assert.deepEqual(result, {
    status: "failed",
    httpStatus: 200,
    errorCode: "busy_retry",
  });
});
