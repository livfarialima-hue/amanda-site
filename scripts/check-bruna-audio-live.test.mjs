import test from "node:test";
import assert from "node:assert/strict";
import { checkBrunaAudioLive } from "./check-bruna-audio-live.mjs";

const env = { NETLIFY: "true", CONTEXT: "production", OPENAI_API_KEY: "synthetic" };
const manifest = { pendingRelease: { audioTranscriptionCheckRequired: true } };
const transcript = (texts, avg_logprob = -0.1) => ({ text: texts.join(" "),
  segments: texts.map(text => ({ text, avg_logprob, no_speech_prob: 0.01, compression_ratio: 1.2 })) });
const good = () => [transcript(["Qual é o endereço da clínica LIV?"]),
  transcript(["Não desejo agendar uma consulta agora. Depois das quinze horas.",
    "Meu nome é Elisa. Não procure horários para mim.",
    "A equipe já confirmou que o documento foi enviado, então essa parte está resolvida."]), { text: "", segments: [] }];

test("audio release check is hosted-production only and requires an available key", async () => {
  const fetchImpl = () => { throw new Error("must not call"); };
  assert.equal((await checkBrunaAudioLive({ env: { ...env, CONTEXT: "deploy-preview" }, manifest, fetchImpl })).status, "skipped");
  assert.equal((await checkBrunaAudioLive({ env: { ...env, OPENAI_API_KEY: "" }, manifest, fetchImpl })).status, "failed");
});

test("audio release check uses one Whisper call for each speech or silence fixture", async () => {
  let count = 0; const replies = good();
  const result = await checkBrunaAudioLive({ env, manifest, fetchImpl: async (url, options) => {
    assert.equal(url, "https://api.openai.com/v1/audio/transcriptions");
    const audio = Buffer.from(await options.body.get("file").arrayBuffer());
    assert.equal(audio.subarray(0, 4).toString(), "RIFF");
    assert.equal(options.body.get("model"), "whisper-1");
    assert.equal(options.body.get("prompt"), null);
    return Response.json(replies[count++]);
  } });
  assert.equal(count, 3); assert.equal(result.status, "passed"); assert.equal(result.patientMessagesSent, 0);
  assert.equal(result.checks.length, 3);
  assert.equal(result.checks[2].autoReplyEligible, false);
});

test("wrong content, lost negation or time, weak segments and silence hallucination block release", async () => {
  const rewriteContext = (r, from, to) => {
    r[1].text = r[1].text.replace(from, to);
    r[1].segments = r[1].segments.map(s => ({ ...s, text: s.text.replace(from, to) }));
  };
  for (const mutate of [
    r => { r[0] = transcript(["A consulta é amanhã"]); },
    r => { r[0].segments[0].avg_logprob = 0.0001; },
    r => { r[1] = transcript(["Desejo agendar uma consulta agora. Depois das quinze horas.", "Elisa. Não procure horários."]); },
    r => { r[1] = transcript(["Não desejo agendar uma consulta agora. Depois das cinco horas.", "Elisa. Não procure horários."]); },
    r => { r[1].segments[1].avg_logprob = -3; },
    r => rewriteContext(r, "quinze horas", "150 horas"),
    r => rewriteContext(r, "quinze horas", "1500 horas"),
    r => rewriteContext(r, "foi enviado", "não foi enviado"),
    r => rewriteContext(r, "está resolvida", "está pendente"),
    r => rewriteContext(r, "Meu nome é Elisa.", "Meu nome não é Elisa."),
    r => rewriteContext(r, "Meu nome é Elisa.", ""),
    r => rewriteContext(r, "A equipe já confirmou que o documento foi enviado, então essa parte está resolvida.", ""),
    r => { r[2] = transcript(["Obrigada."]); },
  ]) {
    const replies = good(); mutate(replies); let count = 0;
    const result = await checkBrunaAudioLive({ env, manifest, fetchImpl: async () => Response.json(replies[count++]) });
    assert.equal(count, 3); assert.equal(result.status, "failed");
  }
});
