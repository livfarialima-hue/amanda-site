import processYCloudWebhook from "./ycloud-webhook.mjs";
import { allowsPatientSideEffects } from "./lib/automation-mode.mjs";
import {
  claimDueInboundRecoveries,
  completeInboundRecovery,
  rescheduleInboundRecovery,
} from "./lib/inbound-recovery.mjs";
import {
  getLatestInboundReplyMarker,
} from "./lib/reply-debounce.mjs";
import {
  sendReviewAlertEmailCopy,
  sendYCloudReviewAlert,
} from "./lib/ycloud-review-alert.mjs";
import {
  logCorrelationId,
  writeOperationalLog,
} from "./lib/operational-log.mjs";
export { buildOperationalLogRecord } from "./lib/operational-log.mjs";

const MAX_JOBS_PER_RUN = 5;
const MAX_RECOVERY_ATTEMPTS = 3;
const MAX_BATCH_START_WINDOW_MS = 10 * 60_000;
const MAX_INBOUND_REPLAY_AGE_MS = 24 * 60 * 60_000;

export function inboundRecoveryReplayBlockReason(job, now = Date.now()) {
  if (Number(job.attempts) > MAX_RECOVERY_ATTEMPTS) return "attempt_limit_exceeded";
  const payload = parsePayload(job.rawBody);
  const sentAt = Date.parse(payload?.whatsappInboundMessage?.sendTime ||
    payload?.createTime || job.createdAt || "");
  if (!Number.isFinite(sentAt)) return "inbound_time_unknown";
  if (sentAt > now + 60_000) return "inbound_time_in_future";
  return now - sentAt >= MAX_INBOUND_REPLAY_AGE_MS ? "inbound_expired" : "";
}

function parsePayload(rawBody) {
  try {
    return JSON.parse(String(rawBody || ""));
  } catch {
    return null;
  }
}

function recoveryAlert(job, reason) {
  const payload = parsePayload(job.rawBody);
  const message = payload?.whatsappInboundMessage || {};
  const patientName = String(message.customerProfile?.name || "").trim();
  const greeting = patientName
    ? `Olá, ${patientName.split(/\s+/)[0]}!`
    : "Olá!";

  return {
    from: String(message.to || ""),
    eventId: `${job.eventId}-recovery-failure`,
    patientName,
    patientPhone: String(message.from || job.phone || ""),
    messageText: [
      "FALHA DE PROCESSAMENTO — mensagem pendente na Bruna/LEADS exige conferência manual.",
      `Motivo interno: ${reason || "processing_failed_after_three_attempts"}.`,
      `Mensagem da paciente: ${String(message.text?.body || "Mensagem sem texto.")}`,
        "Ação interna: conferir o roteamento na planilha LEADS, cadastrar o contato manualmente se ainda faltar e verificar se a paciente recebeu resposta.",
      reason ? "SEM SUGESTÃO PRONTA — conferir o contexto atual antes de responder."
        : "Sugestão para copiar somente se a paciente ainda estiver sem resposta:",
      reason ? "" : `${greeting} Eu sou a Bruna, concierge da Clínica LIV Faria Lima. Obrigada pela mensagem e desculpe a demora. Posso te ajudar por aqui.`,
    ].join("\n"),
  };
}

function retryDelay(attempts) {
  return [60_000, 2 * 60_000, 5 * 60_000][attempts - 1] ||
    5 * 60_000;
}

export async function processInboundRecoveryJob(
  job,
  {
    processImpl = processYCloudWebhook,
    getLatestInboundReplyMarkerImpl = getLatestInboundReplyMarker,
    completeInboundRecoveryImpl = completeInboundRecovery,
    rescheduleInboundRecoveryImpl = rescheduleInboundRecovery,
    sendYCloudReviewAlertImpl = sendYCloudReviewAlert,
    sendReviewAlertEmailCopyImpl = sendReviewAlertEmailCopy,
    now = Date.now(),
  } = {},
) {
  const latest = await getLatestInboundReplyMarkerImpl({
    phone: job.phone,
  });
  if (
    latest.status === "completed" &&
    latest.found &&
    latest.eventId !== String(job.eventId)
  ) {
    const completion = await completeInboundRecoveryImpl(job, {
      outcome: "superseded_by_newer_message",
    });
    return { status: completion?.status === "completed"
      ? "superseded" : `completion_${completion?.status || "failed"}` };
  }

  let response;
  let body = null;
  const replayBlockReason = inboundRecoveryReplayBlockReason(job, now);
  try {
    response = replayBlockReason ? null : await processImpl(
      new Request(`${job.origin}/api/ycloud/webhook-processor`, {
        method: "POST",
        headers: {
          "content-type": job.contentType || "application/json",
          "YCloud-Signature": job.signature,
          "X-LIV-Durable-Retry": "1",
          "X-LIV-Recovery": "1",
        },
        body: job.rawBody,
      }),
      {},
    );
    try {
      body = response ? await response.clone().json() : null;
    } catch {
      body = null;
    }
  } catch {
    response = null;
  }

  const activeStatus = String(body?.aiActiveStatus || "");
  const completed = Boolean(
    response?.ok &&
    body &&
    body?.leadRecorded !== false &&
    body?.automaticWorkFinished === true &&
    !["failed", "deferred"].includes(activeStatus),
  );
  if (completed) {
    const completion = await completeInboundRecoveryImpl(job, {
      outcome: body?.humanTakeoverToday
        ? "human_takeover"
        : "processed",
    });
    return {
      status: completion?.status === "completed"
        ? "completed" : `completion_${completion?.status || "failed"}`,
      aiActiveStatus: activeStatus || "not_applicable",
    };
  }

  if (!replayBlockReason && job.attempts < MAX_RECOVERY_ATTEMPTS) {
    const reschedule = await rescheduleInboundRecoveryImpl(job, {
      delayMs: retryDelay(job.attempts),
    });
    return {
      status: reschedule?.status === "completed"
        ? "rescheduled"
        : `reschedule_${reschedule?.status || "failed"}`,
      httpStatus: response?.status || null,
      aiActiveStatus: activeStatus || "unknown",
      leadRouted: body?.leadRouted === true,
      leadRouteStatus: String(body?.leadRouteStatus || "unknown"),
      automaticWorkFinished:
        body?.automaticWorkFinished === true,
    };
  }

  const alertInput = recoveryAlert(job, replayBlockReason);
  const email = await sendReviewAlertEmailCopyImpl(alertInput);
  const alert = await sendYCloudReviewAlertImpl(alertInput, {
    sendEmailCopy: false,
  });
  if (email?.status === "completed") {
    const completion = await completeInboundRecoveryImpl(job, {
      outcome: "human_alerted_by_email_after_lead_failure",
    });
    return {
      status: completion?.status === "completed"
        ? "alerted" : `completion_${completion?.status || "failed"}`,
      replayBlockReason: replayBlockReason || "none",
      emailStatus: email.status,
      whatsappAlertStatus: alert?.status || "unknown",
    };
  }

  const reschedule = await rescheduleInboundRecoveryImpl(job, {
    delayMs: 5 * 60_000,
  });
  return {
    status: reschedule?.status === "completed"
      ? "alert_failed_rescheduled"
      : `alert_failed_reschedule_${reschedule?.status || "failed"}`,
    emailStatus: email?.status || "failed",
    whatsappAlertStatus: alert?.status || "unknown",
  };
}

export async function runInboundRecoveryBatch({
  claimImpl = claimDueInboundRecoveries,
  processImpl = processInboundRecoveryJob,
  now = Date.now,
  logImpl = writeOperationalLog,
} = {}) {
  const startedAt = now();
  const results = [];
  let status = "idle";
  while (results.length < MAX_JOBS_PER_RUN && now() - startedAt < MAX_BATCH_START_WINDOW_MS) {
    // Reserve only the job about to run: waiting jobs must not lose their lease
    // while an earlier provider/Sheets/model request is still pending.
    const claim = await claimImpl({ limit: 1 });
    if (claim.status !== "completed") { status = "claim_failed"; break; }
    const [job] = claim.jobs;
    if (!job) break;
    const result = await processImpl(job);
    results.push({
      correlationId: logCorrelationId(job.eventId),
      attempts: job.attempts,
      ...result,
    });
    status = "processed";
  }

  const result = { status, jobs: results.length, results };
  logImpl({
    source: "ycloud_recovery_schedule",
    category: "ycloud_recovery_schedule",
    reason: status,
    fields: { ...result, execution: "background" },
  });
  return result;
}

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

export default async () => {
  await dispatchInboundRecovery();
};

export const config = {
  // O webhook principal processa cada mensagem imediatamente e registra uma
  // recuperacao duravel somente como rede de seguranca. Verificar a fila a
  // cada cinco minutos preserva o fallback sem gastar uma invocacao ociosa
  // por minuto durante todo o mes.
  schedule: "*/5 * * * *",
};
