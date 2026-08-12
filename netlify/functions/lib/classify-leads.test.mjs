import assert from "node:assert/strict";
import test from "node:test";
import { processClaimedJobs } from "../classify-leads.mjs";

function completedClassification(status = "Qualificado") {
  return {
    status: "completed",
    model: "test-model",
    classification: {
      recommendedStatus: status,
      confidence: "high",
    },
    usage: null,
  };
}

test("classifies in parallel but persists completions sequentially", async () => {
  let activeClassifiers = 0;
  let peakClassifiers = 0;
  let activeWrites = 0;
  let peakWrites = 0;
  const calls = [];
  const results = await processClaimedJobs(
    [
      { phone: "+551100000001", leaseToken: "lease-1" },
      { phone: "+551100000002", leaseToken: "lease-2" },
      { phone: "+551100000003", leaseToken: "lease-3" },
    ],
    {
      classifier: async () => {
        activeClassifiers += 1;
        peakClassifiers = Math.max(peakClassifiers, activeClassifiers);
        await new Promise((resolve) => setTimeout(resolve, 5));
        activeClassifiers -= 1;
        return completedClassification();
      },
      callSheets: async (action, payload) => {
        activeWrites += 1;
        peakWrites = Math.max(peakWrites, activeWrites);
        await new Promise((resolve) => setTimeout(resolve, 2));
        activeWrites -= 1;
        calls.push({ action, payload });
        return { status: "completed" };
      },
      waitImpl: async () => {},
    },
  );

  assert.equal(peakClassifiers, 1);
  assert.equal(peakWrites, 1);
  assert.equal(results.every((item) => item.status === "completed"), true);
  assert.deepEqual(
    calls.map((call) => call.payload.job.leaseToken),
    ["lease-1"],
  );
});

test("a completion failure releases the same lease for retry", async () => {
  const calls = [];
  const results = await processClaimedJobs(
    [{
      phone: "+551100000004",
      throughMessageId: "message-4",
      leaseToken: "lease-4",
    }],
    {
      classifier: async () => completedClassification(),
      callSheets: async (action, payload) => {
        calls.push({ action, payload });
        if (action === "complete_classification") {
          return { status: "failed", errorCode: "busy_retry" };
        }
        return { status: "completed" };
      },
      waitImpl: async () => {},
    },
  );

  assert.equal(results[0].status, "failed");
  assert.deepEqual(
    calls.map((call) => call.action),
    [
      "complete_classification",
      "complete_classification",
      "complete_classification",
      "fail_classification",
    ],
  );
  assert.equal(calls.at(-1).payload.job.leaseToken, "lease-4");
  assert.equal(
    calls.at(-1).payload.job.errorCode,
    "complete_busy_retry",
  );
});

test("an ignored stale completion is not reported as success", async () => {
  const calls = [];
  const results = await processClaimedJobs(
    [{ phone: "+551100000005", leaseToken: "stale-lease" }],
    {
      classifier: async () => completedClassification(),
      callSheets: async (action, payload) => {
        calls.push({ action, payload });
        if (action === "complete_classification") {
          return {
            status: "completed",
            data: { status: "ignored", error: "stale_lease" },
          };
        }
        return { status: "completed" };
      },
      waitImpl: async () => {},
    },
  );

  assert.equal(results[0].status, "failed");
  assert.equal(results[0].errorCode, "stale_lease");
  assert.deepEqual(
    calls.map((call) => call.action),
    ["complete_classification", "fail_classification"],
  );
});
