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
  const duplicate = await registerInboundRecovery(incoming, { ...options, now: now + 1_000 });
  assert.deepEqual(duplicate, { status: "duplicate", reason: "already_pending" });
  const result = await processInboundRecoveryJob(job, {
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
