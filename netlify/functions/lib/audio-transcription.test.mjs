import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { assessTranscript, verifiedAudioDescriptor, transcribeYCloudAudio } from "./audio-transcription.mjs";

const clearText = "Qual o endereço da clínica?";
const transcriptData = (text = clearText, scores = {}) => ({ text,
  segments: [{ text, avg_logprob: -0.1, no_speech_prob: 0.01, compression_ratio: 1.2, ...scores }] });

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
      return Response.json(transcriptData());
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
  assert.equal(o.calls[1].init.body.get("model"), "whisper-1");
  assert.equal(o.calls[1].init.body.get("response_format"), "verbose_json");
  assert.equal(o.calls[1].init.body.get("timestamp_granularities[]"), "segment");
  assert.equal(o.calls[1].init.body.get("include[]"), null);
  assert.equal(o.calls[1].init.body.get("prompt"), null);
  assert.equal(o.calls[0].init.signal, o.calls[1].init.signal);
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

test("transcription requires every segment, numeric confidence and matching complete text", () => {
  const valid = assessTranscript(transcriptData());
  assert.equal(valid.autoReplyEligible, true);
  assert.equal(valid.quality.kind, "segment_confidence");
  assert.equal(valid.quality.lowTokenFraction, undefined);
  for (const data of [
    { text: clearText }, { text: clearText, segments: [] },
    transcriptData(clearText, { avg_logprob: null }), transcriptData(clearText, { avg_logprob: "-0.1" }),
    transcriptData(clearText, { avg_logprob: 0.0001 }), transcriptData(clearText, { avg_logprob: -0.601 }),
    transcriptData(clearText, { no_speech_prob: NaN }), transcriptData(clearText, { no_speech_prob: -0.1 }),
    transcriptData(clearText, { no_speech_prob: 0.101 }), transcriptData(clearText, { no_speech_prob: 1.1 }),
    transcriptData(clearText, { compression_ratio: Infinity }), transcriptData(clearText, { compression_ratio: -1 }),
    transcriptData(clearText, { compression_ratio: 0 }), transcriptData(clearText, { compression_ratio: 2.401 }), transcriptData(clearText, { text: "Outro texto." }),
    transcriptData("[inaudível]"), transcriptData("a".repeat(4001)),
    { text: clearText, segments: [{ ...transcriptData().segments[0], text: "Qual o endereço" },
      { ...transcriptData().segments[0], text: "da clínica?", avg_logprob: -0.9 }] },
  ]) assert.equal(assessTranscript(data).autoReplyEligible, false);
});

test("multiple qualifying segments retain their distinct confidence semantics", () => {
  const result = assessTranscript({ text: clearText, segments: [
    { ...transcriptData().segments[0], text: "Qual o endereço", avg_logprob: -0.2 },
    { ...transcriptData().segments[0], text: "da clínica?", avg_logprob: -0.4 },
  ] });
  assert.equal(result.autoReplyEligible, true);
  assert.equal(result.quality.segmentCount, 2);
  assert.equal(result.quality.lowestSegmentMeanLogprob, -0.4);
});

test("uncertain transcripts are retained once without retrying for a more favorable score", async () => {
  for (const data of [transcriptData("Não quero agendar.", { avg_logprob: -3 }),
    transcriptData("Quinze horas.", { avg_logprob: 0.0001 }), { text: "Consulta", logprobs: [{ logprob: -0.1 }] }]) {
    const o = options(), originalFetch = o.fetchImpl;
    o.fetchImpl = async (url, init) => {
      if (url.startsWith("https://api.ycloud.com/")) return originalFetch(url, init);
      o.calls.push({ url, init }); return Response.json(data);
    };
    const result = await transcribeYCloudAudio(message, identity, o);
    assert.equal(result.status, "uncertain");
    assert.equal(result.autoReplyEligible, false);
    assert.equal(result.text, data.text);
    assert.deepEqual(await transcribeYCloudAudio(message, identity, o), result);
    assert.equal(o.calls.length, 2);
  }
});

test("download and transcription share the original 35 second deadline", async t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let reachedTranscription, sharedSignal;
  const entered = new Promise(resolve => { reachedTranscription = resolve; });
  const o = options({ fetchImpl: async (url, init) => {
    if (url.startsWith("https://api.ycloud.com/")) {
      sharedSignal = init.signal; t.mock.timers.tick(10000);
      return new Response(bytes, { headers: { "content-type": "audio/ogg" } });
    }
    assert.equal(init.signal, sharedSignal);
    return new Promise((_, reject) => {
      init.signal.addEventListener("abort", () => reject(new Error("private-abort")), { once: true });
      reachedTranscription();
    });
  } });
  const pending = transcribeYCloudAudio(message, identity, o);
  await entered;
  t.mock.timers.tick(24999); assert.equal(sharedSignal.aborted, false);
  t.mock.timers.tick(1); assert.equal(sharedSignal.aborted, true);
  const result = await pending;
  assert.equal(result.status, "retry"); assert.equal(result.autoReplyEligible, false);
  assert.doesNotMatch(JSON.stringify(result), /private-abort/);
});

test("cached legacy receipts keep their original model and metrics without reinterpretation", async () => {
  const o = options();
  const legacy = { status: "uncertain", autoReplyEligible: false, text: "Quinze horas.",
    model: "gpt-4o-transcribe", quality: { meanLogprob: null, lowTokenFraction: null, tokenCount: 3 } };
  o.getStoreImpl = () => ({ getWithMetadata: async () => ({ data: { result: legacy }, etag: "old" }) });
  assert.deepEqual(await transcribeYCloudAudio(message, identity, o), legacy);
  assert.equal(o.calls.length, 0);
});
