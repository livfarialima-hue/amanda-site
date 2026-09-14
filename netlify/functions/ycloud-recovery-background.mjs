import { timingSafeEqual } from "node:crypto";
import { allowsPatientSideEffects } from "./lib/automation-mode.mjs";
import { runInboundRecoveryBatch } from "./ycloud-recovery.mjs";

export async function handleInboundRecoveryBackground(request, {
  env = process.env, runBatchImpl = runInboundRecoveryBatch,
} = {}) {
  if (request.method !== "POST") return new Response("method_not_allowed", { status: 405 });
  let body;
  try { body = await request.json(); }
  catch { return new Response("invalid_request", { status: 400 }); }
  const expected = Buffer.from(String(env.GOOGLE_SHEETS_WEBHOOK_SECRET || ""));
  const received = Buffer.from(typeof body?.secret === "string" ? body.secret : "");
  if (!expected.length || received.length !== expected.length || !timingSafeEqual(received, expected)) {
    return new Response("unauthorized", { status: 401 });
  }
  if (!allowsPatientSideEffects(env.WHATSAPP_AUTOMATION_MODE)) {
    return new Response(null, { status: 204 });
  }
  await runBatchImpl();
  return new Response(null, { status: 204 });
}

export default (request) => handleInboundRecoveryBackground(request);
