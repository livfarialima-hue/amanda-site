import { getHumanResumeControl } from "./human-resume-queue.mjs";
import {
  claimReviewAlertSlot,
  completeReviewAlertSlot,
  releaseReviewAlertSlot,
} from "./review-alert-throttle.mjs";

const YCLOUD_MESSAGES_URL =
  "https://api.ycloud.com/v2/whatsapp/messages";
const DEFAULT_TEMPLATE_NAME = "alerta_revisao_liv_v1";
const DEFAULT_TEMPLATE_LANGUAGE = "pt_BR";
const ALERT_TIMEOUT_MS = 6_000;
const MAX_ALERT_TEXT_LENGTH = 1_024;
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
}) {
  const original =
    String(messageText || "").trim() || "Mensagem sem texto.";

  if (
    (
      /sugest[aã]o\s+(?:para copiar|de resposta)/i.test(original) ||
      /revise e copie manualmente/i.test(original)
    )
  ) {
    return limitText(original, MAX_ALERT_TEXT_LENGTH);
  }

  const firstName =
    String(patientName || "").trim().split(/\s+/)[0] || "";
  const greeting = firstName ? `Olá, ${firstName}!` : "Olá!";
  const reply = urgent
    ? `${greeting} Recebemos sua mensagem e ela será revisada pela equipe. Se você estiver com sintomas intensos, piora rápida ou se sentir em risco, procure atendimento médico de urgência.`
    : `${greeting} Recebi sua mensagem. Vou conferir essa informação com a equipe e retorno por aqui assim que possível.`;
  const suffix = [
    "Sugestão para copiar após conferir:",
    reply,
  ].join("\n");
  const prefixLimit = Math.max(
    0,
    MAX_ALERT_TEXT_LENGTH - Array.from(suffix).length - 2,
  );
  const prefix = limitText(original, prefixLimit);

  return [prefix, suffix].filter(Boolean).join("\n\n");
}

async function sendReviewAlertEmailCopy(
  {
    eventId,
    patientName,
    patientPhone,
    messageText,
  },
  { env, fetchImpl },
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
            limitText(messageText, MAX_ALERT_TEXT_LENGTH) ||
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
    env.YCLOUD_API_KEY &&
      normalizePhone(env.WHATSAPP_ALERT_NUMBER),
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
  },
  {
    env = process.env,
    fetchImpl = fetch,
    getHumanResumeControlImpl = getHumanResumeControl,
    claimReviewAlertSlotImpl = claimReviewAlertSlot,
    completeReviewAlertSlotImpl = completeReviewAlertSlot,
    releaseReviewAlertSlotImpl = releaseReviewAlertSlot,
    now = Date.now(),
  } = {},
) {
  const apiKey = env.YCLOUD_API_KEY;
  const sender = normalizePhone(from);
  const recipient = normalizePhone(env.WHATSAPP_ALERT_NUMBER);

  if (!apiKey || !sender || !recipient) {
    return result("skipped", {
      errorCode: "configuration_missing",
    });
  }

  const takeoverControl = await getHumanResumeControlImpl(
    patientPhone,
  ).catch(() => null);

  if (takeoverControl?.status === "human_active") {
    return result("skipped", {
      errorCode: "human_takeover_active",
    });
  }

  const alertMessageText = ensureReviewAlertSuggestion({
    messageText,
    patientName,
    urgent,
  });

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
      return result("skipped", {
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
      return result("failed", {
        httpStatus: response.status,
        errorCode: "http_error",
      });
    }

    const emailCopy = await sendReviewAlertEmailCopy(
      {
        eventId,
        patientName,
        patientPhone,
        messageText: alertMessageText,
      },
      { env, fetchImpl },
    );

    console.log(JSON.stringify({
      event: "review_alert_email_copy",
      eventId: limitText(eventId, 200) || null,
      status: emailCopy.status,
      httpStatus: emailCopy.httpStatus || null,
      errorCode: emailCopy.errorCode || null,
      duplicate: emailCopy.duplicate === true,
    }));

    if (alertSlot) {
      await completeReviewAlertSlotImpl(alertSlot, { now });
    }

    return result("completed", {
      httpStatus: response.status,
    });
  } catch (error) {
    if (alertSlot) {
      await releaseReviewAlertSlotImpl(alertSlot);
    }
    return result("failed", {
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
