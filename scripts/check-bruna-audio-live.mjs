import fs from "node:fs";
import { createHash } from "node:crypto";
import { transcribeYCloudAudio } from "../netlify/functions/lib/audio-transcription.mjs";

// Synthetic speech only. Exercises the production transcriber, including
// hash verification and confidence checks, without reading/sending WhatsApp.
export async function checkBrunaAudioLive({ env = process.env, manifest, fetchImpl = fetch } = {}) {
  if (env.NETLIFY !== "true" || env.CONTEXT !== "production" || manifest?.pendingRelease?.audioTranscriptionCheckRequired !== true) {
    return { status: "skipped", reason: "not_a_marked_hosted_production_release" };
  }
  if (!env.OPENAI_API_KEY || /\*{3,}|•{3,}/u.test(env.OPENAI_API_KEY)) return { status: "failed", reason: "production_key_unavailable" };
  const bytes = fs.readFileSync(new URL("./fixtures/bruna-audio-address.wav", import.meta.url));
  const url = "https://api.ycloud.com/v2/whatsapp/media/download/1";
  let entry = null, revision = 0, apiCalls = 0;
  const storage = { getWithMetadata: async () => entry, setJSON: async (_key, data, options) => {
    if (options.onlyIfNew && entry || options.onlyIfMatch && options.onlyIfMatch !== entry?.etag) return { modified: false };
    entry = { data, etag: String(++revision) }; return { modified: true };
  } };
  const started = Date.now();
  const result = await transcribeYCloudAudio({ type: "audio", audio: { id: "1", link: url,
    mime_type: "audio/wav", sha256: createHash("sha256").update(bytes).digest("base64") } },
    { eventId: "synthetic-live-audio-address", phone: "+5511900000000" }, {
      env: { OPENAI_API_KEY: env.OPENAI_API_KEY, YCLOUD_API_KEY: "synthetic-no-provider-call", WHATSAPP_AUDIO_TRANSCRIPTION_ENABLED: "true" },
      getStoreImpl: () => storage,
      fetchImpl: async (target, options) => {
        if (target === url) return new Response(bytes, { headers: { "content-type": "audio/wav" } });
        if (target !== "https://api.openai.com/v1/audio/transcriptions") throw new Error("unexpected_audio_destination");
        apiCalls++; return fetchImpl(target, options);
      },
    });
  const requestCountValid = apiCalls === 1 || apiCalls === 2 && result.confidenceRecovery?.outcome === "recovered";
  const passed = requestCountValid && result.autoReplyEligible === true && /endere[çc]o/i.test(result.text) && /cl[ií]nica/i.test(result.text);
  return { status: passed ? "passed" : "failed", syntheticOnly: true, patientMessagesSent: 0,
    apiCalls, model: result.model, elapsedMs: Date.now() - started, transcription: result.text,
    quality: result.quality, confidenceRecovery: result.confidenceRecovery, reason: result.reason, fixtureSha256: createHash("sha256").update(bytes).digest("hex") };
}
