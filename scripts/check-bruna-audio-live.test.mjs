import test from "node:test";
import assert from "node:assert/strict";
import { checkBrunaAudioLive } from "./check-bruna-audio-live.mjs";

const env = { NETLIFY: "true", CONTEXT: "production", OPENAI_API_KEY: "synthetic" };
const manifest = { pendingRelease: { audioTranscriptionCheckRequired: true } };
test("audio release check is hosted-production only and requires an available key", async () => {
  const fetchImpl = () => { throw new Error("must not call"); };
  assert.equal((await checkBrunaAudioLive({ env: { ...env, CONTEXT: "deploy-preview" }, manifest, fetchImpl })).status, "skipped");
  assert.equal((await checkBrunaAudioLive({ env: { ...env, OPENAI_API_KEY: "" }, manifest, fetchImpl })).status, "failed");
});
test("audio release check exercises the real transcriber with a valid synthetic WAV", async () => {
  let count = 0;
  const result = await checkBrunaAudioLive({ env, manifest, fetchImpl: async (url, options) => {
    count++; assert.equal(url, "https://api.openai.com/v1/audio/transcriptions");
    const audio = Buffer.from(await options.body.get("file").arrayBuffer());
    assert.equal(audio.subarray(0, 4).toString(), "RIFF");
    return Response.json({ text: "Qual é o endereço da clínica LIV?", logprobs: [{ logprob: -0.1 }] });
  } });
  assert.equal(count, 1); assert.equal(result.status, "passed"); assert.equal(result.patientMessagesSent, 0);
});
test("a wrong or uncertain transcription blocks the release", async () => {
  for (const data of [{ text: "A consulta é amanhã", logprobs: [{ logprob: -0.1 }] },
    { text: "Qual é o endereço da clínica?", logprobs: [{ logprob: -3 }] }]) {
    assert.equal((await checkBrunaAudioLive({ env, manifest, fetchImpl: async () => Response.json(data) })).status, "failed");
  }
});
