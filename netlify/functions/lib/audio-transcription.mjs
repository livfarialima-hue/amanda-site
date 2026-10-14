import { createHash } from "node:crypto";
import { getStore } from "@netlify/blobs";

const STORE = "liv-whatsapp-audio-transcripts-v1";
const MAX_BYTES = 8 * 1024 * 1024;
const MODEL = "gpt-4o-transcribe";
const TYPES = new Map([["audio/ogg", "ogg"], ["audio/mpeg", "mp3"], ["audio/mp4", "m4a"], ["audio/wav", "wav"], ["audio/x-wav", "wav"], ["audio/webm", "webm"], ["audio/flac", "flac"]]);

export function audioTranscriptionEnabled(env = process.env) {
  return env.WHATSAPP_AUDIO_TRANSCRIPTION_ENABLED === "true";
}

export function verifiedAudioDescriptor(message) {
  if (String(message?.type).toLowerCase() !== "audio") return null;
  const audio = message.audio;
  try {
    const url = new URL(audio?.link);
    const mime = String(audio?.mime_type || "").split(";")[0].trim().toLowerCase();
    const id = String(audio?.id || "");
    const hash = String(audio?.sha256 || "");
    if (url.origin !== "https://api.ycloud.com" || url.username || url.password || url.hash ||
        !/^\d{1,30}$/.test(id) || url.pathname !== `/v2/whatsapp/media/download/${id}` ||
        !TYPES.has(mime) || !/^[A-Za-z0-9+/]{43}=$/.test(hash)) return null;
    return { url: url.href, mime, extension: TYPES.get(mime), sha256: hash };
  } catch { return null; }
}

export function assessTranscript(data) {
  const text = typeof data?.text === "string" ? data.text.trim() : "";
  const probabilities = Array.isArray(data?.logprobs) ? data.logprobs : [];
  const scores = probabilities.map(item => item?.logprob);
  const valid = scores.length > 0 && scores.every(score => typeof score === "number" && Number.isFinite(score) && score <= 0);
  // Counts diagnose malformed provider confidence without retaining tokens,
  // arbitrary values or response bodies, and never change eligibility.
  const scoreDiagnostics = { missing: 0, nonNumeric: 0, nonFinite: 0, positive: 0, maxPositive: null };
  for (const score of scores) {
    if (score == null) scoreDiagnostics.missing++;
    else if (typeof score !== "number") scoreDiagnostics.nonNumeric++;
    else if (!Number.isFinite(score)) scoreDiagnostics.nonFinite++;
    else if (score > 0) {
      scoreDiagnostics.positive++;
      scoreDiagnostics.maxPositive = Math.max(scoreDiagnostics.maxPositive || 0, score);
    }
  }
  // These are conservative quality heuristics, not a calibrated probability
  // that the patient's meaning is correct. Clinical gates still apply.
  const mean = valid ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
  const lowFraction = valid ? scores.filter(score => score < -2).length / scores.length : null;
  const usable = text.length > 1 && text.length <= 4000 && /[\p{L}\p{N}]/u.test(text) && valid &&
    mean >= -0.6 && lowFraction <= 0.1 && !/\[(?:inaud[ií]vel|incompreens[ií]vel|sil[eê]ncio)\]/i.test(text);
  return { status: usable ? "transcribed" : "uncertain", text: text.slice(0, 12000),
    truncated: text.length > 12000, autoReplyEligible: usable, model: MODEL,
    quality: { meanLogprob: mean, lowTokenFraction: lowFraction, tokenCount: scores.length, scoreDiagnostics } };
}

async function boundedBytes(response, maximum, controller) {
  if (Number(response.headers.get("content-length")) > maximum) throw new Error("audio_too_large");
  const reader = response.body?.getReader();
  if (!reader) throw new Error("empty_audio");
  const chunks = []; let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maximum) { controller.abort(); throw new Error("audio_too_large"); }
      chunks.push(Buffer.from(value));
    }
  } finally { reader.releaseLock(); }
  if (!length) throw new Error("empty_audio");
  return Buffer.concat(chunks, length);
}

export async function transcribeYCloudAudio(message, { eventId, phone }, {
  env = process.env, fetchImpl = fetch, getStoreImpl = getStore, now = Date.now(),
} = {}) {
  if (!audioTranscriptionEnabled(env)) return { status: "disabled", autoReplyEligible: false, text: "" };
  const descriptor = verifiedAudioDescriptor(message);
  if (!descriptor || !eventId || !/^\+\d{8,15}$/.test(phone || "")) {
    return { status: "unavailable", reason: "invalid_audio_descriptor", autoReplyEligible: false, text: "" };
  }
  const key = createHash("sha256").update(JSON.stringify([phone, eventId, descriptor.sha256])).digest("hex");
  let storage, claim;
  try {
    storage = getStoreImpl({ name: STORE, consistency: "strong" });
    const previous = await storage.getWithMetadata(key, { type: "json", consistency: "strong" });
    if (previous?.data?.result) return previous.data.result;
    if (previous?.data?.leaseUntil > now) return { status: "retry", reason: "transcription_in_progress", text: "" };
    if (!env.OPENAI_API_KEY || !env.YCLOUD_API_KEY) return { status: "retry", reason: "configuration_missing", text: "" };
    const written = await storage.setJSON(key, { leaseUntil: now + 120000 }, previous?.etag ? { onlyIfMatch: previous.etag } : { onlyIfNew: true });
    if (!written.modified) return { status: "retry", reason: "transcription_in_progress", text: "" };
    claim = await storage.getWithMetadata(key, { type: "json", consistency: "strong" });
  } catch { return { status: "retry", reason: "transcription_storage_unavailable", text: "" }; }
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 35000);
  let result;
  try {
    // No redirect can forward a provider credential to an unrelated host.
    const audio = await fetchImpl(descriptor.url, { headers: { "X-API-Key": env.YCLOUD_API_KEY }, redirect: "error", signal: controller.signal });
    if (!audio.ok) throw new Error(audio.status === 404 || audio.status === 410 ? "audio_expired" : "audio_fetch_failed");
    const mime = String(audio.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    if (mime !== descriptor.mime && mime !== "application/octet-stream") throw new Error("audio_mime_mismatch");
    const bytes = await boundedBytes(audio, MAX_BYTES, controller);
    if (createHash("sha256").update(bytes).digest("base64") !== descriptor.sha256) throw new Error("audio_hash_mismatch");
    const form = new FormData();
    form.set("model", MODEL); form.set("response_format", "json"); form.append("include[]", "logprobs");
    form.set("file", new Blob([bytes], { type: descriptor.mime }), `voice.${descriptor.extension}`);
    const response = await fetchImpl("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST", headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` }, body: form,
      redirect: "error", signal: controller.signal,
    });
    if (!response.ok) throw new Error("transcription_provider_failed");
    const body = await boundedBytes(response, 200000, controller);
    result = assessTranscript(JSON.parse(body.toString("utf8")));
  } catch (error) {
    const permanent = ["audio_too_large", "empty_audio", "audio_expired", "audio_hash_mismatch", "audio_mime_mismatch"];
    const reason = permanent.includes(error?.message) ? error.message : "transcription_request_failed";
    result = { status: permanent.includes(reason) ? "unavailable" : "retry", reason, text: "", autoReplyEligible: false };
  } finally { clearTimeout(timer); }
  try {
    const value = result.status === "retry" ? { leaseUntil: 0 } : { result, transcribedAt: new Date(now).toISOString() };
    const written = await storage.setJSON(key, value, { onlyIfMatch: claim.etag });
    if (!written.modified) return { status: "retry", reason: "transcription_receipt_conflict", text: "" };
  } catch { return { status: "retry", reason: "transcription_receipt_unavailable", text: "" }; }
  return result;
}
