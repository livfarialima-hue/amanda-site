import assert from "node:assert/strict";
import test from "node:test";
import {
  runSyntheticIntegrationHealth,
} from "../synthetic-integration-health.mjs";

test("synthetic health probe contains no patient or WhatsApp payload", async () => {
  const calls = [];
  const result = await runSyntheticIntegrationHealth({
    env: {
      GOOGLE_SHEETS_WEBHOOK_URL: "https://sheets.example.test/webhook",
      GOOGLE_SHEETS_WEBHOOK_SECRET: "test-secret",
    },
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return new Response(JSON.stringify({
        ok: true,
        runId: "synthetic_20260814",
      }), { status: 200 });
    },
  });

  assert.equal(result.status, "completed");
  const payload = JSON.parse(calls[0].options.body);
  assert.deepEqual(payload, {
    secret: "test-secret",
    action: "run_synthetic_health_check",
    attributionProbe: {
      reference: "M26F02S-C01H01-avaliacao-facial",
      platform: "Meta",
      referenceCategory: "meta_coded",
      fallbackReason: "",
    },
  });
  assert.equal(JSON.stringify(payload).includes("phone"), false);
  assert.equal(JSON.stringify(payload).includes("message"), false);
});

test("synthetic health probe fails closed without configuration", async () => {
  const result = await runSyntheticIntegrationHealth({ env: {} });

  assert.deepEqual(result, {
    status: "skipped",
    errorCode: "configuration_missing",
  });
});
