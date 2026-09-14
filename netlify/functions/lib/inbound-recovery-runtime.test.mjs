import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  dispatchInboundRecovery,
  inboundRecoveryReplayBlockReason,
  processInboundRecoveryJob,
  runInboundRecoveryBatch,
} from "../ycloud-recovery.mjs";
import { handleInboundRecoveryBackground } from "../ycloud-recovery-background.mjs";

const env = { URL: "https://example.test", GOOGLE_SHEETS_WEBHOOK_SECRET: "synthetic-secret",
  WHATSAPP_AUTOMATION_MODE: "active" };
const noLog = () => {};
const now = Date.parse("2026-09-14T12:00:00Z");
const job = { eventId: "synthetic-recovery", phone: "+5511900000000", attempts: 1,
  createdAt: new Date(now - 60_000).toISOString(), rawBody: "{}",
  signature: "synthetic-signature", origin: "https://example.test" };

test("the 30 second scheduler must dispatch recovery rather than reserve and execute slow jobs", async () => {
  const source = await readFile(new URL("../ycloud-recovery.mjs", import.meta.url), "utf8");
  const scheduledHandler = source.slice(source.indexOf("export default"));
  assert.doesNotMatch(scheduledHandler, /await claimDueInboundRecoveries/);
  assert.doesNotMatch(scheduledHandler, /await processInboundRecoveryJob/);
});

test("scheduler hands off with authentication and reports acceptance without claiming completion", async () => {
  let calls = 0;
  const result = await dispatchInboundRecovery({ env, logImpl: noLog, fetchImpl: async (url, options) => {
    calls++;
    assert.equal(url, "https://example.test/.netlify/functions/ycloud-recovery-background");
    assert.equal(options.method, "POST");
    assert.deepEqual(JSON.parse(options.body), { secret: "synthetic-secret" });
    assert.ok(options.signal instanceof AbortSignal);
    return new Response(null, { status: 202 });
  } });
  assert.equal(calls, 1);
  assert.deepEqual(result, { status: "dispatched", httpStatus: 202 });
});

for (const mode of ["off", "shadow", "unknown"]) {
  test(`scheduler and background leave the queue untouched in ${mode}`, async () => {
    let touched = false;
    const inactive = { ...env, WHATSAPP_AUTOMATION_MODE: mode };
    const dispatch = await dispatchInboundRecovery({ env: inactive, logImpl: noLog,
      fetchImpl: async () => { touched = true; } });
    const background = await handleInboundRecoveryBackground(new Request("https://example.test", {
      method: "POST", body: JSON.stringify({ secret: env.GOOGLE_SHEETS_WEBHOOK_SECRET }),
    }), { env: inactive, runBatchImpl: async () => { touched = true; } });
    assert.equal(dispatch.status, "dispatch_skipped");
    assert.equal(background.status, 204);
    assert.equal(touched, false);
  });
}

test("dispatch failure is visible and leaves durable jobs available to the next schedule", async () => {
  const failed = await dispatchInboundRecovery({ env, logImpl: noLog,
    fetchImpl: async () => { throw new Error("timeout"); } });
  assert.equal(failed.status, "dispatch_failed");
  const rejected = await dispatchInboundRecovery({ env, logImpl: noLog,
    fetchImpl: async () => new Response(null, { status: 500 }) });
  assert.equal(rejected.status, "dispatch_failed");
  const missing = await dispatchInboundRecovery({ env: { ...env, GOOGLE_SHEETS_WEBHOOK_SECRET: "" },
    logImpl: noLog, fetchImpl: async () => assert.fail("No credentials") });
  assert.equal(missing.reason, "configuration_missing");
});

test("background rejects missing or incorrect authentication before any queue access", async () => {
  for (const secret of [undefined, "wrong", 1, null]) {
    let touched = false;
    const result = await handleInboundRecoveryBackground(new Request("https://example.test", {
      method: "POST", body: JSON.stringify({ secret }),
    }), { env, runBatchImpl: async () => { touched = true; } });
    assert.equal(result.status, 401);
    assert.equal(touched, false);
  }
});

test("background awaits slow work instead of acknowledging its completion early", async () => {
  let finish, entered;
  const running = new Promise((resolve) => { entered = resolve; });
  const work = new Promise((resolve) => { finish = resolve; });
  let returned = false;
  const response = handleInboundRecoveryBackground(new Request("https://example.test", {
    method: "POST", body: JSON.stringify({ secret: env.GOOGLE_SHEETS_WEBHOOK_SECRET }),
  }), { env, runBatchImpl: async () => { entered(); await work; } }).then((value) => {
    returned = true; return value;
  });
  await running;
  assert.equal(returned, false);
  finish();
  assert.equal((await response).status, 204);
});

test("batch reserves one job at a time across work longer than a scheduler invocation", async () => {
  let clock = now, claims = 0, inFlight = false;
  const result = await runInboundRecoveryBatch({ now: () => clock, logImpl: noLog,
    claimImpl: async ({ limit }) => {
      assert.equal(limit, 1);
      assert.equal(inFlight, false, "Do not reserve a waiting job before the previous one finishes");
      claims++;
      return { status: "completed", jobs: claims <= 2 ? [{ ...job, eventId: `job-${claims}` }] : [] };
    },
    processImpl: async () => {
      inFlight = true;
      await Promise.resolve();
      clock += 35_000;
      inFlight = false;
      return { status: "completed" };
    },
  });
  assert.equal(result.jobs, 2);
  assert.equal(claims, 3);
  assert.equal(clock - now, 70_000);
});

test("batch stops reserving work before the background deadline", async () => {
  let clock = now, claims = 0;
  const result = await runInboundRecoveryBatch({ now: () => clock, logImpl: noLog,
    claimImpl: async () => { claims++; return { status: "completed", jobs: [job] }; },
    processImpl: async () => { clock += 10 * 60_000; return { status: "completed" }; },
  });
  assert.equal(claims, 1);
  assert.equal(result.jobs, 1);
});

test("replay uses the original inbound time even if a legacy registration reset createdAt", () => {
  const old = { ...job, createdAt: new Date(now).toISOString(), rawBody: JSON.stringify({
    whatsappInboundMessage: { sendTime: new Date(now - 25 * 60 * 60_000).toISOString() },
  }) };
  assert.equal(inboundRecoveryReplayBlockReason(old, now), "inbound_expired");
  assert.equal(inboundRecoveryReplayBlockReason({ ...job, createdAt: "" }, now), "inbound_time_unknown");
  assert.equal(inboundRecoveryReplayBlockReason({ ...job, createdAt: new Date(now + 120_000).toISOString() }, now), "inbound_time_in_future");
  assert.equal(inboundRecoveryReplayBlockReason(job, now), "");
});

for (const stale of [{ ...job, attempts: 4 }, { ...job, createdAt: new Date(now - 25 * 60 * 60_000).toISOString() }]) {
  test(`old or exhausted recovery goes to human review without replay (${stale.attempts})`, async () => {
    let completed = false;
    const result = await processInboundRecoveryJob(stale, {
      now,
      getLatestInboundReplyMarkerImpl: async () => ({ status: "completed", found: false }),
      processImpl: async () => assert.fail("Do not reopen an old conversation"),
      sendReviewAlertEmailCopyImpl: async () => ({ status: "completed" }),
      sendYCloudReviewAlertImpl: async () => ({ status: "completed" }),
      completeInboundRecoveryImpl: async () => { completed = true; return { status: "completed" }; },
    });
    assert.equal(result.status, "alerted");
    assert.ok(result.replayBlockReason);
    assert.equal(completed, true);
  });
}

test("failed completion does not become a successful recovery receipt", async () => {
  const result = await processInboundRecoveryJob(job, { now,
    getLatestInboundReplyMarkerImpl: async () => ({ status: "completed", found: true, eventId: "newer-event" }),
    completeInboundRecoveryImpl: async () => ({ status: "failed" }),
    processImpl: async () => assert.fail("Superseded event"),
  });
  assert.equal(result.status, "completion_failed");
});
