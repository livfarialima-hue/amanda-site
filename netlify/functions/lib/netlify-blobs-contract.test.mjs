import assert from "node:assert/strict";
import test from "node:test";
import { getStore } from "@netlify/blobs";
import {
  registerInboundRecovery,
  claimDueInboundRecoveries,
  rescheduleInboundRecovery,
  completeInboundRecovery,
} from "./inbound-recovery.mjs";
import { processInboundRecoveryJob } from "../ycloud-recovery.mjs";

// Exercise the installed SDK down to HTTP, rather than mocking setJSON's
// promised semantics. No network, credentials or patient data are used.
function transportStore() {
  const blobs = new Map();
  const requests = [];
  let revision = 0;
  const fetchImpl = async (input, options = {}) => {
    const url = new URL(input);
    assert.equal(url.hostname, "blobs.test");
    const key = decodeURIComponent(url.pathname.split("/").slice(3).join("/"));
    const method = String(options.method || "GET").toUpperCase();
    const headers = new Headers(options.headers);
    requests.push({ key, method, headers });
    const current = blobs.get(key);
    if (method === "GET" && !key) {
      const prefix = url.searchParams.get("prefix") || "";
      return Response.json({ blobs: [...blobs].filter(([k]) => k.startsWith(prefix))
        .map(([k, value]) => ({ key: k, etag: value.etag })) });
    }
    if (method === "GET") {
      return current
        ? new Response(current.body, { headers: { etag: current.etag } })
        : new Response(null, { status: 404 });
    }
    if (method === "PUT") {
      if ((headers.get("if-none-match") === "*" && current) ||
          (headers.has("if-match") && headers.get("if-match") !== current?.etag)) {
        return new Response(null, { status: 412 });
      }
      const etag = `"revision-${++revision}"`;
      blobs.set(key, { body: String(options.body), etag });
      return new Response(null, { headers: { etag } });
    }
    if (method === "DELETE") {
      blobs.delete(key);
      return new Response(null, { status: 204 });
    }
    assert.fail(`Unexpected HTTP method ${method}`);
  };
  const getStoreImpl = ({ name = "test", ...options } = {}) => getStore({
    ...options, name, siteID: "test-site", token: "test-token",
    edgeURL: "https://blobs.test", uncachedEdgeURL: "https://blobs.test",
    consistency: "strong", fetch: fetchImpl,
  });
  return { getStoreImpl, requests };
}

test("installed Blobs SDK preserves onlyIfNew over HTTP", async () => {
  const { getStoreImpl, requests } = transportStore();
  const store = getStoreImpl();
  const first = await store.setJSON("claim", { owner: "first" }, { onlyIfNew: true });
  const duplicate = await store.setJSON("claim", { owner: "duplicate" }, { onlyIfNew: true });
  assert.equal(requests[0].headers.get("if-none-match"), "*");
  assert.equal(first.modified, true);
  assert.equal(duplicate.modified, false);
  assert.deepEqual(await store.get("claim", { type: "json" }), { owner: "first" });
});

test("installed Blobs SDK admits only one concurrent owner of an etag", async () => {
  const { getStoreImpl, requests } = transportStore();
  const store = getStoreImpl();
  const initial = await store.setJSON("claim", { owner: "initial" }, { onlyIfNew: true });
  const results = await Promise.all(["worker-a", "worker-b"].map((owner) =>
    store.setJSON("claim", { owner }, { onlyIfMatch: initial.etag })));
  assert.equal(requests[1].headers.get("if-match"), initial.etag);
  assert.equal(results.filter((result) => result.modified).length, 1);
});

const incoming = {
  eventId: "synthetic-inbound-timeout", phone: "+5511900000000",
  rawBody: "{}", signature: "synthetic-signature", origin: "https://example.test",
};

function recoverableMessage(type, overrides = {}) {
  return JSON.stringify({ id: incoming.eventId, type: "whatsapp.inbound_message.received",
    whatsappInboundMessage: { from: incoming.phone, to: "+5511900000001", wamid: "synthetic-original",
      sendTime: "2026-09-25T20:00:00Z", type,
      ...(type === "text" ? { text: { body: "Quero saber sobre lifting cervical." } } : { errors: [{ code: "131060" }] }),
      ...overrides } });
}

for (const terminal of [false, true]) {
  test(`a recovered signed text survives an unavailable event (${terminal ? "completed" : "pending"})`, async () => {
    const { getStoreImpl } = transportStore();
    const now = Date.parse("2026-09-25T20:00:01Z");
    await registerInboundRecovery({ ...incoming, rawBody: recoverableMessage("unsupported") }, { getStoreImpl, now, recoveryDelayMs: 0 });
    const [oldJob] = (await claimDueInboundRecoveries({ getStoreImpl, now })).jobs;
    if (terminal) await completeInboundRecovery(oldJob, { getStoreImpl, now });
    const rawBody = recoverableMessage("text");
    const upgrade = await registerInboundRecovery({ ...incoming, rawBody, signature: "recovered-signature" }, { getStoreImpl, now, recoveryDelayMs: 0 });
    assert.equal(upgrade.status, "completed");
    // The older worker must not delete the recovered version when it finishes.
    await completeInboundRecovery(oldJob, { getStoreImpl, now });
    const [recovered] = (await claimDueInboundRecoveries({ getStoreImpl, now })).jobs;
    assert.equal(recovered.rawBody, rawBody);
    assert.equal(recovered.signature, "recovered-signature");
    await completeInboundRecovery(recovered, { getStoreImpl, now });
    assert.equal((await claimDueInboundRecoveries({ getStoreImpl, now })).jobs.length, 0);
    for (const type of ["text", "unsupported"]) {
      assert.equal((await registerInboundRecovery({ ...incoming, rawBody: recoverableMessage(type) }, { getStoreImpl, now })).reason, "already_completed");
    }
  });
}

test("recovery cannot change the original message identity or replace known text", async () => {
  for (const initial of ["unsupported", "text"]) {
    const { getStoreImpl } = transportStore();
    const now = Date.parse("2026-09-25T20:00:01Z");
    await registerInboundRecovery({ ...incoming, rawBody: recoverableMessage(initial) }, { getStoreImpl, now, recoveryDelayMs: 0 });
    const [job] = (await claimDueInboundRecoveries({ getStoreImpl, now })).jobs;
    await completeInboundRecovery(job, { getStoreImpl, now });
    const rawBody = recoverableMessage("text", { wamid: "different-message", text: { body: "Texto diferente" } });
    assert.equal((await registerInboundRecovery({ ...incoming, rawBody }, { getStoreImpl, now })).reason, "already_completed");
  }
});

test("recovered text waits for the old worker and a late completion cannot erase it", async () => {
  const { getStoreImpl } = transportStore();
  const now = Date.parse("2026-09-25T20:00:01Z");
  await registerInboundRecovery({ ...incoming, rawBody: recoverableMessage("unsupported") }, { getStoreImpl, now, recoveryDelayMs: 0 });
  const [old] = (await claimDueInboundRecoveries({ getStoreImpl, now })).jobs;
  await registerInboundRecovery({ ...incoming, rawBody: recoverableMessage("text") }, { getStoreImpl, now, recoveryDelayMs: 0 });
  assert.equal((await claimDueInboundRecoveries({ getStoreImpl, now })).jobs.length, 0);
  await completeInboundRecovery(old, { getStoreImpl, now });
  const [recovered] = (await claimDueInboundRecoveries({ getStoreImpl, now })).jobs;
  assert.equal(JSON.parse(recovered.rawBody).whatsappInboundMessage.type, "text");
  await completeInboundRecovery(recovered, { getStoreImpl, now });
  await completeInboundRecovery(old, { getStoreImpl, now });
  assert.equal((await registerInboundRecovery({ ...incoming, rawBody: recoverableMessage("text") }, { getStoreImpl, now })).reason, "already_completed");
});

test("durable intake preserves every signed byte and makes a new job immediately claimable", async () => {
  const { getStoreImpl } = transportStore();
  const rawBody = '  {"text":"Mensagem sintética"}\r\n';
  const now = Date.parse("2026-09-24T23:00:00Z");
  const result = await registerInboundRecovery({ ...incoming, rawBody, primaryIntake: true },
    { getStoreImpl, now, recoveryDelayMs: 0 });
  assert.equal(result.status, "completed");
  const [job] = (await claimDueInboundRecoveries({ getStoreImpl, now })).jobs;
  assert.equal(job.rawBody, rawBody);
  assert.equal(job.primaryIntake, true);
  assert.equal(job.dueAt, now);
});

for (const [field, length] of [["rawBody", 40_001], ["eventId", 301], ["signature", 2_001], ["origin", 1_001]]) {
  test(`durable intake rejects oversized ${field} without silently truncating it`, async () => {
    const { getStoreImpl, requests } = transportStore();
    const result = await registerInboundRecovery({ ...incoming, [field]: "x".repeat(length) }, { getStoreImpl });
    assert.equal(result.status, "skipped");
    assert.equal(result.reason, "invalid_event");
    assert.equal(requests.length, 0);
  });
}

for (const entryPoint of ["claim", "complete"]) {
  test(`a completed event cannot remain in the pending queue after a legacy race (${entryPoint})`, async () => {
    const { getStoreImpl } = transportStore();
    const now = Date.parse("2026-09-14T12:00:00Z");
    await registerInboundRecovery(incoming, { getStoreImpl, now, recoveryDelayMs: 0 });
    const [job] = (await claimDueInboundRecoveries({ getStoreImpl, now })).jobs;
    await completeInboundRecovery(job, { getStoreImpl, now, outcome: "human_takeover" });
    const store = getStoreImpl({ name: "liv-whatsapp-inbound-recovery-v1" });
    // Reproduce an unconditional write racing with the completion tombstone
    // in SDK 10.7.10, without changing the original terminal receipt.
    await store.setJSON(job.queueKey, { ...job, status: "pending", claimToken: "", claimUntil: 0 });
    if (entryPoint === "claim") {
      assert.equal((await claimDueInboundRecoveries({ getStoreImpl, now: now + 20 * 60_000 })).jobs.length, 0);
    } else {
      assert.equal((await completeInboundRecovery(job, { getStoreImpl, now })).duplicate, true);
    }
    assert.equal(await store.get(job.queueKey, { type: "json" }), null);
    assert.deepEqual(await registerInboundRecovery(incoming, { getStoreImpl, now }), {
      status: "duplicate", reason: "already_completed",
    });
  });
}

test("provider retry and recovery self-registration preserve the claimed job after timeout", async () => {
  const { getStoreImpl } = transportStore();
  const now = Date.parse("2026-09-14T12:00:00Z");
  const options = { getStoreImpl, now, recoveryDelayMs: 0 };
  assert.equal((await registerInboundRecovery(incoming, options)).status, "completed");
  const claims = await Promise.all([
    claimDueInboundRecoveries({ getStoreImpl, now }),
    claimDueInboundRecoveries({ getStoreImpl, now }),
  ]);
  const jobs = claims.flatMap((claim) => claim.jobs);
  assert.equal(jobs.length, 1);
  const job = jobs[0];
  assert.ok(job.claimUntil > now + 15 * 60_000,
    "An overlapping schedule cannot steal a lease from a still-running background invocation");
  const duplicate = await registerInboundRecovery(incoming, { ...options, now: now + 1_000 });
  assert.deepEqual(duplicate, { status: "duplicate", reason: "already_pending" });
  const result = await processInboundRecoveryJob(job, {
    now,
    getLatestInboundReplyMarkerImpl: async () => ({ status: "completed", found: false }),
    processImpl: async () => {
      assert.equal((await registerInboundRecovery(incoming, options)).reason, "already_pending");
      return Response.json({ leadRecorded: true, automaticWorkFinished: false, aiActiveStatus: "failed" });
    },
    rescheduleInboundRecoveryImpl: (claimed, retry) => rescheduleInboundRecovery(claimed, {
      ...retry, getStoreImpl, now: now + 2_000,
    }),
    completeInboundRecoveryImpl: async () => assert.fail("Timeout is not completion"),
  });
  assert.equal(result.status, "rescheduled");
  const [next] = (await claimDueInboundRecoveries({ getStoreImpl, now: now + 62_000 })).jobs;
  assert.ok(next, "Timed out work remains eligible for the next cycle");
  assert.equal(next.attempts, 2);
  assert.equal(next.createdAt, job.createdAt);
  assert.notEqual(next.claimToken, job.claimToken);
  assert.equal((await rescheduleInboundRecovery(job, { getStoreImpl, now })).status, "superseded");
  assert.equal((await completeInboundRecovery(next, { getStoreImpl, now: now + 63_000,
    outcome: "human_takeover" })).status, "completed");
  assert.deepEqual(await registerInboundRecovery(incoming, options), {
    status: "duplicate", reason: "already_completed",
  });
  assert.equal((await claimDueInboundRecoveries({ getStoreImpl, now: now + 600_000 })).jobs.length, 0);
});
