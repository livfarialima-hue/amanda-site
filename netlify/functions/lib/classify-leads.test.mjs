import assert from "node:assert/strict";
import test from "node:test";
import { processClaimedJobs } from "../classify-leads.mjs";

test("an unresponsive classifier releases its exact lease instead of waiting for lease expiry", { timeout: 250 }, async () => {
  const writes = [];
  const result = await processClaimedJobs([{ phone: "+551100000099", leaseToken: "lease-deadline", opportunityId: "opp-deadline", professional: "amanda" }], {
    classifier: () => new Promise(() => {}), classificationTimeoutMs: 10,
    callSheets: async (action, payload) => { writes.push({ action, payload }); return { status: "completed" }; },
  });
  assert.equal(result[0].status, "failed");
  assert.equal(result[0].errorCode, "classification_timeout");
  assert.equal(writes.length, 1);
  assert.equal(writes[0].action, "fail_classification");
  assert.equal(writes[0].payload.job.leaseToken, "lease-deadline");
  assert.equal(writes[0].payload.job.opportunityId, "opp-deadline");
});

test("an unexpected classifier rejection releases the lease with a technical reason", async () => {
  const writes = [];
  const result = await processClaimedJobs([{ phone: "+551100000099", leaseToken: "lease-rejection" }], {
    classifier: async () => { throw new Error("private unexpected payload"); },
    callSheets: async (action, payload) => { writes.push({ action, payload }); return { status: "completed" }; },
  });
  assert.equal(result[0].errorCode, "classification_exception");
  assert.equal(writes[0].action, "fail_classification");
  assert.equal(writes[0].payload.job.leaseToken, "lease-rejection");
  assert.doesNotMatch(JSON.stringify(result), /private unexpected payload/);
});

test("a classifier result arriving after its deadline cannot complete the released lease", async () => {
  let finish;
  const writes = [];
  const result = await processClaimedJobs([{ phone: "+551100000099", leaseToken: "lease-late" }], {
    classifier: () => new Promise(resolve => { finish = resolve; }), classificationTimeoutMs: 10,
    callSheets: async (action) => { writes.push(action); return { status: "completed" }; },
  });
  finish(completedClassification());
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(result[0].status, "failed");
  assert.deepEqual(writes, ["fail_classification"]);
});

test("an unresponsive completion is bounded and falls back to the same lease release", async () => {
  const { withClassificationDeadline } = await import("../classify-leads.mjs");
  const writes = [];
  const result = await processClaimedJobs([{ phone: "+551100000099", leaseToken: "lease-write" }], {
    classifier: async () => completedClassification(), waitImpl: async () => {},
    deadline: operation => withClassificationDeadline(operation, 10),
    callSheets: async (action, payload) => { writes.push({ action, payload }); return action === "complete_classification" ? new Promise(() => {}) : { status: "completed" }; },
  });
  assert.equal(result[0].status, "failed");
  assert.equal(writes.length, 4);
  assert.equal(writes.at(-1).action, "fail_classification");
  assert.equal(writes.at(-1).payload.job.leaseToken, "lease-write");
  assert.equal(writes.at(-1).payload.job.errorCode, "complete_timeout");
});

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


test("a timeout retries the same classification reservation instead of claiming another lead", async () => {
  const {claimClassificationBatch}=await import("../classify-leads.mjs");
  const calls=[];
  const result=await claimClassificationBatch({now:()=>1789693200000,uuid:()=>"00000000-0000-4000-8000-000000000001",waitImpl:async()=>{},
    callSheets:async(action,payload,options)=>{calls.push({action,payload,options});return calls.length===1?{status:"failed",errorCode:"timeout"}:{status:"completed",data:{jobs:[]}};}});
  assert.equal(result.status,"completed"); assert.equal(calls.length,2); assert.deepEqual(calls[0],calls[1]);
  assert.equal(calls[0].payload.limit,1); assert.equal(calls[0].options.timeoutMs,60000);
});
