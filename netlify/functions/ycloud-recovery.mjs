import processYCloudWebhook from "./ycloud-webhook.mjs";
import {
  claimDueInboundRecoveries,
  completeInboundRecovery,
  rescheduleInboundRecovery,
} from "./lib/inbound-recovery.mjs";
import {
  getLatestInboundReplyMarker,
} from "./lib/reply-debounce.mjs";
import { sendYCloudReviewAlert } from "./lib/ycloud-review-alert.mjs";

const MAX_JOBS_PER_RUN = 5;
const MAX_RECOVERY_ATTEMPTS = 3;

function parsePayload(rawBody) {
  try {
    return JSON.parse(String(rawBody || ""));
  } catch {
    return null;
  }
}

function recoveryAlert(job) {
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
      "FALHA TÉCNICA — mensagem sem desfecho automático.",
      `Mensagem da paciente: ${String(message.text?.body || "Mensagem sem texto.")}`,
      "Sugestão para copiar:",
      `${greeting} Eu sou a Bruna, da Clínica LIV Faria Lima. Obrigada pela mensagem e desculpe a demora. Posso te ajudar por aqui.`,
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
    await completeInboundRecoveryImpl(job, {
      outcome: "superseded_by_newer_message",
    });
    return { status: "superseded" };
  }

  let response;
  let body = null;
  try {
    response = await processImpl(
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
      body = await response.clone().json();
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
    !["failed", "deferred"].includes(activeStatus),
  );
  if (completed) {
    await completeInboundRecoveryImpl(job, {
      outcome: body?.humanTakeoverToday
        ? "human_takeover"
        : "processed",
    });
    return {
      status: "completed",
      aiActiveStatus: activeStatus || "not_applicable",
    };
  }

  if (job.attempts < MAX_RECOVERY_ATTEMPTS) {
    await rescheduleInboundRecoveryImpl(job, {
      delayMs: retryDelay(job.attempts),
    });
    return {
      status: "rescheduled",
      httpStatus: response?.status || null,
      aiActiveStatus: activeStatus || "unknown",
    };
  }

  const alert = await sendYCloudReviewAlertImpl(recoveryAlert(job));
  if (["completed", "duplicate"].includes(alert?.status)) {
    await completeInboundRecoveryImpl(job, {
      outcome: "human_alerted_after_failure",
    });
    return { status: "alerted" };
  }

  await rescheduleInboundRecoveryImpl(job, {
    delayMs: 5 * 60_000,
  });
  return { status: "alert_failed_rescheduled" };
}

export default async () => {
  const claim = await claimDueInboundRecoveries({
    limit: MAX_JOBS_PER_RUN,
  });
  if (claim.status !== "completed" || !claim.jobs.length) {
    console.log(JSON.stringify({
      source: "ycloud_recovery_schedule",
      status: claim.status === "completed" ? "idle" : "claim_failed",
      jobs: 0,
    }));
    return;
  }

  const results = [];
  for (const job of claim.jobs) {
    const result = await processInboundRecoveryJob(job);
    results.push({
      eventId: job.eventId,
      patientLast4: job.phone.slice(-4),
      attempts: job.attempts,
      ...result,
    });
  }

  console.log(JSON.stringify({
    source: "ycloud_recovery_schedule",
    status: "processed",
    jobs: results.length,
    results,
  }));
};

export const config = {
  schedule: "*/1 * * * *",
};
