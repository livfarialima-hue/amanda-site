import assert from "node:assert/strict";
import test from "node:test";
import scheduledHandler, { dispatchHumanResume, runHumanResumeBatch } from "../human-resume.mjs";
import { handleHumanResumeBackground } from "../human-resume-background.mjs";

// Synthetic jobs: no patient, provider or production queue is contacted.
const env = { URL: "https://example.test", GOOGLE_SHEETS_WEBHOOK_SECRET: "synthetic-secret", WHATSAPP_AUTOMATION_MODE: "active", WHATSAPP_HUMAN_RESUME_BACKGROUND_ENABLED: "true" };
const noLog = () => {};
const request = (secret = env.GOOGLE_SHEETS_WEBHOOK_SECRET) => new Request("https://example.test", { method: "POST", body: JSON.stringify({ secret }) });

test("Netlify scheduled entrypoint completes with no unsupported object response", async () => {
  const previous = Object.fromEntries(Object.keys(env).map(key => [key, process.env[key]]));
  const originalFetch = globalThis.fetch;
  let dispatches = 0;
  try {
    Object.assign(process.env, env);
    globalThis.fetch = async () => { dispatches++; return new Response(null, { status: 202 }); };
    assert.equal(await scheduledHandler(), undefined);
    assert.equal(dispatches, 1);
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});

test("morning scheduler dispatches authenticated background work without claiming delivery", async () => {
  const result = await dispatchHumanResume({ env, logImpl: noLog, fetchImpl: async (url, options) => {
    assert.equal(url, "https://example.test/.netlify/functions/human-resume-background");
    assert.deepEqual(JSON.parse(options.body), { secret: "synthetic-secret" });
    assert.ok(options.signal instanceof AbortSignal);
    return new Response(null, { status: 202 });
  } });
  assert.deepEqual(result, { status: "dispatched", httpStatus: 202 });
});

test("failed dispatch leaves the durable queue for the next scheduled attempt", async () => {
  const result = await dispatchHumanResume({ env, logImpl: noLog, fetchImpl: async () => { throw new Error("synthetic timeout"); } });
  assert.equal(result.status, "dispatch_failed");
  const rejected = await dispatchHumanResume({ env, logImpl: noLog, fetchImpl: async () => new Response(null, { status: 503 }) });
  assert.equal(rejected.status, "dispatch_failed");
});

test("background authentication and inactive mode prevent queue access", async () => {
  const untouched = async () => assert.fail("queue must remain untouched");
  for (const secret of [undefined, "wrong", null, 123]) {
    const response = await handleHumanResumeBackground(new Request("https://example.test", { method: "POST", body: JSON.stringify({ secret }) }), { env, runBatchImpl: untouched });
    assert.equal(response.status, 401);
  }
  for (const mode of ["off", "shadow", "invalid"]) {
    const inactive = { ...env, WHATSAPP_AUTOMATION_MODE: mode };
    assert.equal((await handleHumanResumeBackground(request(), { env: inactive, runBatchImpl: untouched })).status, 204);
    assert.equal((await dispatchHumanResume({ env: inactive, logImpl: noLog, fetchImpl: untouched })).status, "dispatch_skipped");
  }
});

test("background awaits the entire job instead of dropping work after acknowledgement", async () => {
  let release, started;
  const running = new Promise(resolve => { started = resolve; });
  const waiting = new Promise(resolve => { release = resolve; });
  let returned = false;
  const result = handleHumanResumeBackground(request(), { env, runBatchImpl: async () => { started(); await waiting; } }).then(value => { returned = true; return value; });
  await running;
  assert.equal(returned, false);
  release();
  assert.equal((await result).status, 204);
});

test("slow morning jobs are claimed one at a time and complete beyond the scheduler deadline", async () => {
  let clock = 0, claims = 0, processing = false;
  const result = await runHumanResumeBatch({ now: () => clock, logImpl: noLog,
    claimImpl: async ({ limit }) => {
      assert.equal(limit, 1);
      assert.equal(processing, false);
      return { status: "completed", jobs: ++claims <= 2 ? [{ eventId: `synthetic-${claims}` }] : [] };
    },
    processImpl: async () => { processing = true; await Promise.resolve(); clock += 65_000; processing = false; return { status: "completed" }; },
  });
  assert.equal(result.jobs, 2);
  assert.equal(clock, 130_000);
});

test("batch does not preclaim work near its deadline and isolates unexpected failures", async () => {
  let clock = 0, claims = 0, retries = 0;
  const result = await runHumanResumeBatch({ now: () => clock, logImpl: noLog,
    claimImpl: async () => { claims++; return { status: "completed", jobs: [{ eventId: "synthetic" }] }; },
    processImpl: async () => { clock += 10 * 60_000; throw new Error("synthetic processing failure"); },
    rescheduleImpl: async () => { retries++; return { status: "completed" }; },
  });
  assert.equal(claims, 1);
  assert.equal(retries, 1);
  assert.equal(result.results[0].reason, "processing_failed");
});

test('the new worker remains default off until production activation', async()=>{
 const disabled={...env,WHATSAPP_HUMAN_RESUME_BACKGROUND_ENABLED:undefined};
 assert.equal((await dispatchHumanResume({env:disabled,logImpl:noLog,fetchImpl:async()=>assert.fail('default off')})).status,'dispatch_skipped');
 assert.equal((await handleHumanResumeBackground(request(),{env:disabled,runBatchImpl:async()=>assert.fail('default off')})).status,204);
});
