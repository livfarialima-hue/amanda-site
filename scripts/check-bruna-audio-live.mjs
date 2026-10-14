import fs from "node:fs";
import { createHash } from "node:crypto";
import { transcribeYCloudAudio } from "../netlify/functions/lib/audio-transcription.mjs";

// Synthetic speech only. Uses the production adapter and its original limits.
// No WhatsApp access, real patient content, durable writes or message sends.
const fixtures = [
  { name: "address", expected: r => r.autoReplyEligible === true && /endere[çc]o/i.test(r.text) && /cl[ií]nica/i.test(r.text) },
  { name: "context", expected: r => r.autoReplyEligible === true && r.quality.segmentCount >= 2 &&
    /n[aã]o desejo agendar uma consulta agora/i.test(r.text) && /depois das (?:quinze horas|15(?:\s*(?:horas|h)|:00))\b/i.test(r.text) &&
    /\bmeu nome [eé] Elisa\b/iu.test(r.text) && /n[aã]o procure hor[aá]rios/i.test(r.text) &&
    /a equipe j[aá] confirmou que o documento foi enviado[,.]?\s*ent[aã]o essa parte est[aá] resolvida/i.test(r.text) },
  { name: "silence", expected: r => r.status === "uncertain" && r.autoReplyEligible === false },
];

export async function checkBrunaAudioLive({ env = process.env, manifest, fetchImpl = fetch } = {}) {
  if (env.NETLIFY !== "true" || env.CONTEXT !== "production" || manifest?.pendingRelease?.audioTranscriptionCheckRequired !== true) {
    return { status: "skipped", reason: "not_a_marked_hosted_production_release" };
  }
  if (!env.OPENAI_API_KEY || /\*{3,}|•{3,}/u.test(env.OPENAI_API_KEY)) return { status: "failed", reason: "production_key_unavailable" };
  const checks = [], started = Date.now();
  for (const fixture of fixtures) {
    const bytes = fs.readFileSync(new URL("./fixtures/bruna-audio-" + fixture.name + ".wav", import.meta.url));
    const url = "https://api.ycloud.com/v2/whatsapp/media/download/1";
    let entry = null, revision = 0, apiCalls = 0;
    const storage = { getWithMetadata: async () => entry, setJSON: async (_key, data, options) => {
      if (options.onlyIfNew && entry || options.onlyIfMatch && options.onlyIfMatch !== entry?.etag) return { modified: false };
      entry = { data, etag: String(++revision) }; return { modified: true };
    } };
    const fixtureStarted = Date.now();
    const result = await transcribeYCloudAudio({ type: "audio", audio: { id: "1", link: url,
      mime_type: "audio/wav", sha256: createHash("sha256").update(bytes).digest("base64") } },
      { eventId: "synthetic-live-audio-" + fixture.name, phone: "+5511900000000" }, {
        env: { OPENAI_API_KEY: env.OPENAI_API_KEY, YCLOUD_API_KEY: "synthetic-no-provider-call", WHATSAPP_AUDIO_TRANSCRIPTION_ENABLED: "true" },
        getStoreImpl: () => storage,
        fetchImpl: async (target, options) => {
          if (target === url) return new Response(bytes, { headers: { "content-type": "audio/wav" } });
          if (target !== "https://api.openai.com/v1/audio/transcriptions") throw new Error("unexpected_audio_destination");
          apiCalls++; return fetchImpl(target, options);
        },
      });
    const passed = apiCalls === 1 && result.model === "whisper-1" && result.quality?.kind === "segment_confidence" && fixture.expected(result);
    checks.push({ name: fixture.name, passed, apiCalls, model: result.model, elapsedMs: Date.now() - fixtureStarted,
      transcription: result.text, transcriptStatus: result.status, autoReplyEligible: result.autoReplyEligible,
      quality: result.quality, reason: result.reason, fixtureSha256: createHash("sha256").update(bytes).digest("hex") });
  }
  return { status: checks.every(c => c.passed) ? "passed" : "failed", syntheticOnly: true, patientMessagesSent: 0,
    model: "whisper-1", apiCalls: checks.reduce((n, c) => n + c.apiCalls, 0), elapsedMs: Date.now() - started, checks };
}
