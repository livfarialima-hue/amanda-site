import { allowsPatientSideEffects } from "./automation-mode.mjs";
import { writeOperationalLog } from "./operational-log.mjs";

export function isInboundBackgroundEnabled(env = process.env) {
  return allowsPatientSideEffects(env.WHATSAPP_AUTOMATION_MODE) &&
    env.WHATSAPP_INBOUND_BACKGROUND_ENABLED === "true";
}

// Shared by the fast intake and the scheduled fallback. A 202 only means that
// Netlify accepted the worker invocation; the durable job owns completion.
export async function dispatchInboundRecovery({
  env = process.env, fetchImpl = fetch, logImpl = writeOperationalLog,
} = {}) {
  let result;
  const siteUrl = String(env.URL || "").replace(/\/$/, "");
  if (!allowsPatientSideEffects(env.WHATSAPP_AUTOMATION_MODE)) {
    result = { status: "dispatch_skipped", reason: "automation_inactive" };
  } else if (!siteUrl || !env.GOOGLE_SHEETS_WEBHOOK_SECRET) {
    result = { status: "dispatch_skipped", reason: "configuration_missing" };
  } else {
    try {
      const response = await fetchImpl(`${siteUrl}/.netlify/functions/ycloud-recovery-background`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ secret: env.GOOGLE_SHEETS_WEBHOOK_SECRET }),
        signal: AbortSignal.timeout(5_000),
      });
      result = { status: response.status === 202 ? "dispatched" : "dispatch_failed",
        httpStatus: response.status };
    } catch {
      result = { status: "dispatch_failed", reason: "request_failed" };
    }
  }
  logImpl({ source: "ycloud_recovery_dispatch", category: "ycloud_recovery_schedule",
    reason: result.status, fields: result });
  return result;
}
