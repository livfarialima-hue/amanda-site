import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { assessTranscript, verifiedAudioDescriptor, transcribeYCloudAudio } from "./audio-transcription.mjs";

const bytes = Buffer.from("OggS synthetic audio fixture; no patient content");
const message = { type: "audio", audio: { id: "123", link: "https://api.ycloud.com/v2/whatsapp/media/download/123?sig=synthetic",
  mime_type: "audio/ogg; codecs=opus", sha256: createHash("sha256").update(bytes).digest("base64") } };
const identity = { eventId: "synthetic-audio", phone: "+5511900000000" };
const env = { WHATSAPP_AUDIO_TRANSCRIPTION_ENABLED: "true", OPENAI_API_KEY: "synthetic-openai", YCLOUD_API_KEY: "synthetic-provider" };
function store() {
  const map = new Map(); let revision = 0;
  return { map, getWithMetadata: async key => map.get(key) || null,
    setJSON: async (key, data, options) => {
      const current = map.get(key);
      if (options?.onlyIfNew && current || options?.onlyIfMatch && current?.etag !== options.onlyIfMatch) return { modified: false };
      map.set(key, { data: structuredClone(data), etag: String(++revision) }); return { modified: true };
    } };
}
function options(overrides = {}) {
  const storage = store(), calls = [];
  return { env, getStoreImpl: () => storage, storage, calls,
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      if (url.startsWith("https://api.ycloud.com/")) return new Response(bytes, { headers: { "content-type": "audio/ogg" } });
      return Response.json({ text: "Qual o endereço da clínica?", logprobs: [{ logprob: -0.1 }, { logprob: -0.2 }] });
    }, ...overrides };
}

test("audio is disabled by default and rejects untrusted media before network access", async () => {
  const o = options({ env: {} });
  assert.equal((await transcribeYCloudAudio(message, identity, o)).status, "disabled");
  assert.equal(o.calls.length, 0);
  for (const link of ["http://api.ycloud.com/v2/whatsapp/media/download/123", "https://attacker.test/v2/whatsapp/media/download/123",
    "https://api.ycloud.com.attacker.test/v2/whatsapp/media/download/123", "https://user:password@api.ycloud.com/v2/whatsapp/media/download/123",
    "https://api.ycloud.com/v2/whatsapp/messages", "https://127.0.0.1/v2/whatsapp/media/download/123"]) {
    assert.equal(verifiedAudioDescriptor({ ...message, audio: { ...message.audio, link } }), null);
  }
});

test("authenticated audio is hash-verified, transcribed once and cached without the binary or signed URL", async () => {
  const o = options();
  const first = await transcribeYCloudAudio(message, identity, o);
  assert.equal(first.status, "transcribed"); assert.equal(first.autoReplyEligible, true);
  assert.equal(o.calls[0].init.headers["X-API-Key"], env.YCLOUD_API_KEY);
  assert.equal(o.calls[0].init.redirect, "error");
  assert.deepEqual(o.calls[1].init.headers, { Authorization: `Bearer ${env.OPENAI_API_KEY}` });
  assert.equal(o.calls[1].init.body.get("model"), "gpt-4o-transcribe");
  assert.equal(o.calls[1].init.body.get("include[]"), "logprobs");
  assert.equal(o.calls[1].init.body.get("file").size, bytes.length);
  assert.deepEqual(await transcribeYCloudAudio(message, identity, o), first);
  assert.equal(o.calls.length, 2);
  assert.doesNotMatch(JSON.stringify([...o.storage.map]), /sig=|synthetic-openai|synthetic-provider|OggS/);
});

test("a concurrent invocation cannot spend on or replace an in-progress transcription", async () => {
  let release; const held = new Promise(resolve => { release = resolve; });
  const o = options(), fetch = o.fetchImpl;
  o.fetchImpl = async (...args) => { await held; return fetch(...args); };
  const first = transcribeYCloudAudio(message, identity, o);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal((await transcribeYCloudAudio(message, identity, o)).reason, "transcription_in_progress");
  release(); assert.equal((await first).status, "transcribed"); assert.equal(o.calls.length, 2);
});

for (const [label, response] of [
  ["hash", () => new Response("different", { headers: { "content-type": "audio/ogg" } })],
  ["mime", () => new Response(bytes, { headers: { "content-type": "text/html" } })],
  ["size", () => new Response(bytes, { headers: { "content-type": "audio/ogg", "content-length": "999999999" } })],
  ["expired", () => new Response(null, { status: 410 })],
]) test(`unusable ${label} never reaches transcription or becomes a patient reply`, async () => {
  let calls = 0; const o = options({ fetchImpl: async () => { calls++; return response(); } });
  const result = await transcribeYCloudAudio(message, identity, o);
  assert.equal(result.status, "unavailable"); assert.equal(result.autoReplyEligible, false); assert.equal(calls, 1);
});

test("provider failure preserves a retry and never logs or returns a credential/error body", async () => {
  const o = options({ fetchImpl: async () => new Response("secret detail", { status: 500 }) });
  const result = await transcribeYCloudAudio(message, identity, o);
  assert.equal(result.status, "retry"); assert.doesNotMatch(JSON.stringify(result), /secret detail/);
  assert.equal([...o.storage.map.values()][0].data.leaseUntil, 0);
});

test("uncertain, empty, unscored and overlong transcripts cannot enter automatic replies", () => {
  for (const data of [{ text: "" }, { text: "Consulta" }, { text: "[inaudível]", logprobs: [{ logprob: 0 }] },
    { text: "Qual o valor?", logprobs: [{ logprob: -3 }] }, { text: "a".repeat(4001), logprobs: [{ logprob: 0 }] },
    { text: "Consulta", logprobs: [{ logprob: null }] }]) {
    const result = assessTranscript(data); assert.equal(result.status, "uncertain"); assert.equal(result.autoReplyEligible, false);
  }
});

test("confidence diagnostics distinguish invalid scores without admitting them or disclosing raw values", () => {
  const result = assessTranscript({ text: "Qual o endereço?", logprobs: [
    {}, { logprob: null }, { logprob: "private-provider-detail" }, { logprob: {} },
    { logprob: Infinity }, { logprob: NaN }, { logprob: 1e-7 }, { logprob: 0.2 }, { logprob: -0.1 },
  ] });
  assert.equal(result.autoReplyEligible, false);
  assert.equal(result.quality.meanLogprob, null);
  assert.deepEqual(result.quality.scoreDiagnostics, { missing: 2, nonNumeric: 2, nonFinite: 2, positive: 2, maxPositive: 0.2 });
  assert.doesNotMatch(JSON.stringify(result), /private-provider-detail|Infinity|NaN/);
  const valid = assessTranscript({ text: "Qual o endereço?", logprobs: [{ logprob: 0 }, { logprob: -0.1 }] });
  assert.equal(valid.autoReplyEligible, true);
  assert.deepEqual(valid.quality.scoreDiagnostics, { missing: 0, nonNumeric: 0, nonFinite: 0, positive: 0, maxPositive: null });
});

const clearText = "Qual o endereço da clínica?";
const invalidConfidence = { text: clearText, logprobs: [{ logprob: 0.000118255615234375 }, { logprob: -0.1 }] };
const validConfidence = { text: clearText, logprobs: [{ logprob: -0.1 }] };
function withTranscriptions(responses) {
  const o = options(), baseFetch = o.fetchImpl;
  let index = 0;
  o.fetchImpl = async (url, init) => {
    if (url.startsWith("https://api.ycloud.com/")) return baseFetch(url, init);
    o.calls.push({ url, init });
    const response = responses[index++];
    if (typeof response === "function") return response(init);
    assert.ok(response, "No unbounded transcription retry");
    return Response.json(response);
  };
  return o;
}

test("malformed confidence can recover once only with matching text and strictly valid new scores", async () => {
  const o = withTranscriptions([invalidConfidence, { ...validConfidence, text: "  Qual  o endereço da cli\u0301nica?  " }]);
  const result = await transcribeYCloudAudio(message, identity, o);
  assert.equal(result.autoReplyEligible, true);
  assert.equal(result.confidenceRecovery.outcome, "recovered");
  assert.equal(result.quality.meanLogprob, -0.1);
  assert.equal(result.confidenceRecovery.initialScoreDiagnostics.positive, 1);
  assert.equal(result.confidenceRecovery.confirmationQuality.scoreDiagnostics.positive, 0);
  assert.equal(o.calls.length, 3);
  assert.deepEqual(await transcribeYCloudAudio(message, identity, o), result);
  assert.equal(o.calls.length, 3);
  assert.equal(o.calls[1].init.signal, o.calls[2].init.signal);
  assert.equal(o.calls[1].init.body, o.calls[2].init.body);
});

test("valid low confidence and known weak scores are never retried to obtain a better score", async () => {
  for (const logprobs of [[{ logprob: -3 }], [{ logprob: -3 }, { logprob: 0.0001 }]]) {
    const o = withTranscriptions([{ text: clearText, logprobs }]);
    const result = await transcribeYCloudAudio(message, identity, o);
    assert.equal(result.autoReplyEligible, false);
    assert.equal(result.confidenceRecovery, undefined);
    assert.equal(o.calls.length, 2);
  }
});

test("disagreement, repeated malformed confidence and weak confirmation preserve the uncertain first text", async () => {
  for (const confirmation of [
    { ...validConfidence, text: "Não quero o endereço da clínica." },
    { ...validConfidence, text: "Qual o endereço da clínica!" },
    { ...validConfidence, text: "Qual o endereco da clínica?" },
    { ...validConfidence, text: "Qual o endereço da Clínica?" },
    invalidConfidence,
    { text: clearText, logprobs: [{ logprob: -3 }] },
  ]) {
    const o = withTranscriptions([invalidConfidence, confirmation]);
    const result = await transcribeYCloudAudio(message, identity, o);
    assert.equal(result.status, "uncertain");
    assert.equal(result.autoReplyEligible, false);
    assert.equal(result.text, clearText);
    assert.notEqual(result.confidenceRecovery.outcome, "recovered");
    assert.equal(o.calls.length, 3);
  }
});

test("a failed confirmation keeps the uncertain receipt without leaking provider errors", async () => {
  const o = withTranscriptions([invalidConfidence, () => { throw new Error("private-provider-error"); }]);
  const result = await transcribeYCloudAudio(message, identity, o);
  assert.equal(result.status, "uncertain");
  assert.equal(result.text, clearText);
  assert.equal(result.confidenceRecovery.outcome, "request_failed");
  assert.doesNotMatch(JSON.stringify(result), /private-provider-error|synthetic-openai|synthetic-provider/);
  assert.deepEqual(await transcribeYCloudAudio(message, identity, o), result);
  assert.equal(o.calls.length, 3);
});

test("the confirmation shares the original 35 second deadline", async t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let reachedConfirmation;
  const entered = new Promise(resolve => { reachedConfirmation = resolve; });
  const o = withTranscriptions([
    () => { t.mock.timers.tick(10000); return Response.json(invalidConfidence); },
    init => new Promise((_, reject) => {
      init.signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
      reachedConfirmation();
    }),
  ]);
  const pending = transcribeYCloudAudio(message, identity, o);
  await entered;
  t.mock.timers.tick(24999);
  assert.equal(o.calls[2].init.signal.aborted, false);
  t.mock.timers.tick(1);
  assert.equal(o.calls[2].init.signal.aborted, true);
  const result = await pending;
  assert.equal(result.status, "uncertain");
  assert.equal(result.confidenceRecovery.outcome, "request_failed");
});

test("a concurrent worker cannot duplicate a confidence recovery", async () => {
  let release, reachedConfirmation;
  const held = new Promise(resolve => { release = resolve; });
  const entered = new Promise(resolve => { reachedConfirmation = resolve; });
  const o = withTranscriptions([invalidConfidence, async () => { reachedConfirmation(); await held; return Response.json(validConfidence); }]);
  const first = transcribeYCloudAudio(message, identity, o);
  await entered;
  assert.equal((await transcribeYCloudAudio(message, identity, o)).reason, "transcription_in_progress");
  release();
  const result = await first;
  assert.equal(result.autoReplyEligible, true);
  assert.equal(o.calls.length, 3);
});
