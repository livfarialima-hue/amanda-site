import { getHumanResumeControl } from "./human-resume-queue.mjs";
import {
  claimReviewAlertSlot,
  completeReviewAlertSlot,
  releaseReviewAlertSlot,
} from "./review-alert-throttle.mjs";
import { writeOperationalLog } from "./operational-log.mjs";
import {
  buildContextualHumanSuggestion,
} from "./extreme-night-policy.mjs";

const YCLOUD_MESSAGES_URL =
  "https://api.ycloud.com/v2/whatsapp/messages";
const DEFAULT_TEMPLATE_NAME = "alerta_revisao_liv_v1";
const DEFAULT_TEMPLATE_LANGUAGE = "pt_BR";
const ALERT_TIMEOUT_MS = 6_000;
const MAX_ALERT_TEXT_LENGTH = 1_024;
const MAX_EMAIL_TEXT_LENGTH = 10_000;
const EMAIL_COPY_TIMEOUT_MS = 6_000;

function result(status, details = {}) {
  return { status, ...details };
}

function limitText(value, maximumLength) {
  return Array.from(String(value || "").trim())
    .slice(0, maximumLength)
    .join("");
}

function normalizePhone(value) {
  const compact = String(value || "").replace(/[\s()-]/g, "");
  return /^\+\d{8,15}$/.test(compact) ? compact : null;
}

function externalIdFor(eventId) {
  const normalized = String(eventId || "")
    .replace(/[^A-Za-z0-9_-]/g, "-")
    .slice(0, 96);

  return normalized ? `liv-review-${normalized}` : undefined;
}

export function ensureReviewAlertSuggestion({
  messageText,
  patientName,
  urgent = false,
  maximumLength = MAX_ALERT_TEXT_LENGTH,
}) {
  const original =
    String(messageText || "").trim() || "Mensagem sem texto.";

  if (
    (
      /sugest[aã]o\s+(?:(?:contextual|segura)\s+)?(?:para (?:revisar e )?copiar|de resposta)/i.test(original) ||
      /revise e copie manualmente|SEM SUGESTÃO PRONTA/i.test(original)
    )
  ) {
    if (Array.from(original).length <= maximumLength) return original;
    const prepared = original.match(/sugest[aã]o\s+(?:(?:contextual|segura)\s+)?(?:para (?:revisar e )?copiar|de resposta)[^\n]*\n|revise e copie manualmente:[^\n]*\n/i);
    if (prepared && !/SEM SUGESTÃO PRONTA/i.test(original)) {
      // Only shorten context and metadata, never a prepared patient reply.
      const suggestion = original.slice(prepared.index).split("\nContexto para conferência:")[0].trim();
      const notice = "Contexto abreviado: confira a conversa antes de enviar.";
      const budget = maximumLength - Array.from(suggestion).length - notice.length - 4;
      if (budget >= 80) {
        const prefix = original.slice(0, prepared.index).split("\n")
          .filter(line => !/^(?:REVISÃO HUMANA — CONTEXTO OPERACIONAL|Relação:|Risco:|Ação necessária:|Contexto para conferência:)/.test(line))
          .join("\n").trim();
        return [limitText(prefix, budget), notice, suggestion].filter(Boolean).join("\n\n");
      }
    }
    // Never display a clipped draft as something safe to copy.
    const notice = "Resumo abreviado. Abra a conversa e confira o e-mail de revisão, quando disponível, antes de responder. SEM SUGESTÃO PRONTA neste alerta abreviado.";
    const prefix = original.split(/(?:sugest[aã]o\s+(?:(?:contextual|segura)\s+)?(?:para (?:revisar e )?copiar|de resposta)|revise e copie manualmente)/i)[0];
    return limitText(prefix, Math.max(0, maximumLength - notice.length - 2)) + "\n\n" + notice;
  }

  const reply = buildContextualHumanSuggestion({
    patientName,
    messageText: original,
    urgent,
  });
  const suffix = reply
    ? [
        "Sugestão contextual para copiar após conferir:",
        reply,
      ].join("\n")
    : [
        "SEM SUGESTÃO PRONTA: o contexto não permitiu identificar com segurança a informação pendente.",
        "Revise a conversa completa e redija uma resposta específica antes de enviar.",
      ].join("\n");
  const prefixLimit = Math.max(
    0,
    maximumLength - Array.from(suffix).length - 2,
  );
  const prefix = limitText(original, prefixLimit);

  return [prefix, suffix].filter(Boolean).join("\n\n");
}

export async function sendReviewAlertEmailCopy(
  {
    eventId,
    patientName,
    patientPhone,
    messageText,
  },
  { env = process.env, fetchImpl = fetch } = {},
) {
  const url = String(
    env.GOOGLE_SHEETS_WEBHOOK_URL || "",
  ).trim();
  const secret = String(
    env.GOOGLE_SHEETS_WEBHOOK_SECRET || "",
  ).trim();

  if (!url || !secret) {
    return result("skipped", {
      errorCode: "email_configuration_missing",
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    EMAIL_COPY_TIMEOUT_MS,
  );

  try {
    const response = await fetchImpl(url, {
      method: "POST",
      headers: {
        "content-type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        action: "send_review_alert_email",
        secret,
        alert: {
          eventId: limitText(eventId, 200),
          patientName:
            limitText(patientName, 120) || "Não informado",
          patientPhone:
            normalizePhone(patientPhone) || "Não informado",
          messageText:
            limitText(messageText, MAX_EMAIL_TEXT_LENGTH) ||
            "Mensagem sem texto.",
        },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return result("failed", {
        httpStatus: response.status,
        errorCode: "email_http_error",
      });
    }

    const payload = await response.json().catch(() => null);

    if (!payload?.ok) {
      return result("failed", {
        httpStatus: response.status,
        errorCode: "email_rejected",
      });
    }

    return result("completed", {
      httpStatus: response.status,
      duplicate: payload.duplicate === true,
    });
  } catch (error) {
    return result("failed", {
      httpStatus: null,
      errorCode:
        error?.name === "AbortError"
          ? "email_timeout"
          : "email_request_failed",
    });
  } finally {
    clearTimeout(timeout);
  }
}

export function isReviewAlertConfigured(env = process.env) {
  return Boolean(
    (env.YCLOUD_API_KEY && normalizePhone(env.WHATSAPP_ALERT_NUMBER)) ||
    (env.GOOGLE_SHEETS_WEBHOOK_URL && env.GOOGLE_SHEETS_WEBHOOK_SECRET),
  );
}

export async function sendYCloudReviewAlert(
  {
    from,
    eventId,
    patientName,
    patientPhone,
    messageText,
    urgent = false,
    expectedHumanResumeGeneration = "",
  },
  {
    env = process.env,
    fetchImpl = fetch,
    getHumanResumeControlImpl = getHumanResumeControl,
    claimReviewAlertSlotImpl = claimReviewAlertSlot,
    completeReviewAlertSlotImpl = completeReviewAlertSlot,
    releaseReviewAlertSlotImpl = releaseReviewAlertSlot,
    now = Date.now(),
    sendEmailCopy = true,
  } = {},
) {
  const apiKey = env.YCLOUD_API_KEY;
  const sender = normalizePhone(from);
  const recipient = normalizePhone(env.WHATSAPP_ALERT_NUMBER);

  const takeoverControl = await getHumanResumeControlImpl(
    patientPhone,
  ).catch(() => null);

  const resumeGeneration = limitText(
    expectedHumanResumeGeneration,
    120,
  );
  const currentHumanResumeGeneration = Boolean(
    resumeGeneration &&
    takeoverControl?.generation === resumeGeneration
  );

  const suppressWhatsAppForTakeover = Boolean(
    takeoverControl?.status === "human_active" &&
    !currentHumanResumeGeneration
  );

  const alertMessageText = ensureReviewAlertSuggestion({
    messageText,
    patientName,
    urgent,
  });
  const emailMessageText = ensureReviewAlertSuggestion({
    messageText, patientName, urgent, maximumLength: MAX_EMAIL_TEXT_LENGTH,
  });

  // Email is an independent safety channel. A WhatsApp cooldown or a YCloud
  // delivery failure must not hide a new question that needs human review.
  // The Apps Script endpoint deduplicates this copy by eventId.
  const emailCopy = sendEmailCopy
    ? await sendReviewAlertEmailCopy(
        {
          eventId,
          patientName,
          patientPhone,
          messageText: emailMessageText,
        },
        { env, fetchImpl },
      )
    : result("skipped", {
        errorCode: "email_copy_handled_separately",
      });

  writeOperationalLog({
    source: "review_alert_email_copy",
    category: "review_alert_delivery",
    reason: emailCopy.status || "unknown",
    sourceId: eventId,
    env,
    fields: {
      status: emailCopy.status,
      httpStatus: emailCopy.httpStatus || null,
      errorCode: emailCopy.errorCode || null,
      duplicate: emailCopy.duplicate === true,
    },
  });

  const delivered = (status, details = {}) => result(status, {
    ...details,
    ...(sendEmailCopy && env.GOOGLE_SHEETS_WEBHOOK_URL && env.GOOGLE_SHEETS_WEBHOOK_SECRET
      ? { emailStatus: emailCopy.status } : {}),
  });

  if (!apiKey || !sender || !recipient || suppressWhatsAppForTakeover) {
    return delivered("skipped", {
      errorCode: suppressWhatsAppForTakeover ? "human_takeover_active" : "configuration_missing",
      ...(emailCopy.status === "completed" ? { emailStatus: "completed" } : {}),
    });
  }

  let alertSlot = null;
  if (!urgent) {
    const cooldownMinutes = Number(
      env.WHATSAPP_REVIEW_ALERT_COOLDOWN_MINUTES,
    );
    alertSlot = await claimReviewAlertSlotImpl(
      {
        patientPhone,
        eventId,
      },
      {
        now,
        cooldownMs:
          Number.isFinite(cooldownMinutes) &&
          cooldownMinutes > 0
            ? cooldownMinutes * 60 * 1_000
            : undefined,
      },
    );

    if (alertSlot.status === "suppressed") {
      return delivered("skipped", {
        errorCode: alertSlot.reason,
      });
    }
  }

  const templateName = String(
    env.YCLOUD_ALERT_TEMPLATE_NAME || DEFAULT_TEMPLATE_NAME,
  );
  const templateLanguage = String(
    env.YCLOUD_ALERT_TEMPLATE_LANGUAGE ||
      DEFAULT_TEMPLATE_LANGUAGE,
  );
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    ALERT_TIMEOUT_MS,
  );

  try {
    const response = await fetchImpl(YCLOUD_MESSAGES_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json; charset=utf-8",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify({
        from: sender,
        to: recipient,
        type: "template",
        externalId: externalIdFor(eventId),
        template: {
          name: templateName,
          language: {
            code: templateLanguage,
          },
          components: [
            {
              type: "body",
              parameters: [
                {
                  type: "text",
                  text:
                    limitText(patientName, 120) ||
                    "Não informado",
                },
                {
                  type: "text",
                  text:
                    normalizePhone(patientPhone) ||
                    "Não informado",
                },
                {
                  type: "text",
                  text:
                    limitText(
                      alertMessageText,
                      MAX_ALERT_TEXT_LENGTH,
                    ) || "Mensagem sem texto.",
                },
              ],
            },
          ],
        },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      if (alertSlot) {
        await releaseReviewAlertSlotImpl(alertSlot);
      }
      return delivered("failed", {
        httpStatus: response.status,
        errorCode: "http_error",
      });
    }

    if (alertSlot) {
      await completeReviewAlertSlotImpl(alertSlot, { now });
    }

    return delivered("completed", {
      httpStatus: response.status,
    });
  } catch (error) {
    if (alertSlot) {
      await releaseReviewAlertSlotImpl(alertSlot);
    }
    return delivered("failed", {
      httpStatus: null,
      errorCode:
        error?.name === "AbortError"
          ? "timeout"
          : "request_failed",
    });
  } finally {
    clearTimeout(timeout);
  }
}
