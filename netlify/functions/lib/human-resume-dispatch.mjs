import { allowsPatientSideEffects } from "./automation-mode.mjs";
import { writeOperationalLog } from "./operational-log.mjs";

export function isHumanResumeBackgroundEnabled(env = process.env) {
  return env.WHATSAPP_HUMAN_RESUME_BACKGROUND_ENABLED === "true";
}

export async function dispatchHumanResume({ env = process.env, fetchImpl = fetch, logImpl = writeOperationalLog } = {}) {
  let result;
  const siteUrl = String(env.URL || "").replace(/\/$/, "");
  if (!allowsPatientSideEffects(env.WHATSAPP_AUTOMATION_MODE) || !isHumanResumeBackgroundEnabled(env)) {
    result = { status: "dispatch_skipped", reason: "automation_inactive" };
  } else if (!siteUrl || !env.GOOGLE_SHEETS_WEBHOOK_SECRET) {
    result = { status: "dispatch_skipped", reason: "configuration_missing" };
  } else {
    try {
      const response = await fetchImpl(`${siteUrl}/.netlify/functions/human-resume-background`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ secret: env.GOOGLE_SHEETS_WEBHOOK_SECRET }),
        signal: AbortSignal.timeout(5_000),
      });
      result = { status: response.status === 202 ? "dispatched" : "dispatch_failed", httpStatus: response.status };
    } catch { result = { status: "dispatch_failed", reason: "request_failed" }; }
  }
  logImpl({ source: "human_resume_dispatch", category: "human_resume_schedule", reason: result.status, fields: result });
  return result;
}
