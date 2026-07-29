const YCLOUD_MESSAGES_URL =
  "https://api.ycloud.com/v2/whatsapp/messages";
const DEFAULT_TEMPLATE_NAME = "alerta_revisao_liv_v1";
const DEFAULT_TEMPLATE_LANGUAGE = "pt_BR";
const ALERT_TIMEOUT_MS = 6_000;
const MAX_ALERT_TEXT_LENGTH = 700;
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
  },
  { env = process.env, fetchImpl = fetch } = {},
) {
  const apiKey = env.YCLOUD_API_KEY;
  const sender = normalizePhone(from);
  const recipient = normalizePhone(env.WHATSAPP_ALERT_NUMBER);

  if (!apiKey || !sender || !recipient) {
    return result("skipped", {
      errorCode: "configuration_missing",
    });
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
                      messageText,
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
        messageText,
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

    return result("completed", {
      httpStatus: response.status,
    });
  } catch (error) {
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
