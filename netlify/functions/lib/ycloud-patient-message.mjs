const YCLOUD_MESSAGES_URL =
  "https://api.ycloud.com/v2/whatsapp/messages";
const MESSAGE_TIMEOUT_MS = 8_000;
const MAX_BODY_LENGTH = 1_500;
const MAX_FOLLOWUP_TEMPLATE_PARAMETER_LENGTH = 900;
const DEFAULT_FOLLOWUP_TEMPLATE_LANGUAGE = "pt_BR";
const FOLLOWUP_TEMPLATE_PREFIX =
  "Retomando nosso contato pela Clínica LIV:\n\n";
const FOLLOWUP_TEMPLATE_SUFFIX =
  "\n\nSe preferir não receber novas mensagens, é só me avisar.";

function normalizePhone(value) {
  const compact = String(value || "").replace(/[\s()-]/g, "");
  return /^\+\d{8,15}$/.test(compact) ? compact : null;
}

function externalIdFor(eventId) {
  const normalized = String(eventId || "")
    .replace(/[^A-Za-z0-9_-]/g, "-")
    .slice(0, 96);

  return normalized ? `liv-reply-${normalized}` : undefined;
}

export function renderYCloudFollowupTemplateText(body) {
  const text = Array.from(String(body || "").trim())
    .slice(0, MAX_FOLLOWUP_TEMPLATE_PARAMETER_LENGTH)
    .join("");
  return text
    ? FOLLOWUP_TEMPLATE_PREFIX + text + FOLLOWUP_TEMPLATE_SUFFIX
    : "";
}

async function sendYCloudMessage(
  payload,
  { env = process.env, fetchImpl = fetch } = {},
) {
  const apiKey = env.YCLOUD_API_KEY;
  if (!apiKey) {
    return {
      status: "skipped",
      httpStatus: null,
      errorCode: "configuration_missing",
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    MESSAGE_TIMEOUT_MS,
  );

  try {
    const response = await fetchImpl(YCLOUD_MESSAGES_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json; charset=utf-8",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    return {
      status: response.ok ? "completed" : "failed",
      httpStatus: response.status,
      errorCode: response.ok ? "none" : "http_error",
    };
  } catch (error) {
    return {
      status: "failed",
      httpStatus: null,
      errorCode:
        error?.name === "AbortError"
          ? "timeout"
          : "request_failed",
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function sendYCloudPatientText(
  { from, to, eventId, body },
  { env = process.env, fetchImpl = fetch } = {},
) {
  const apiKey = env.YCLOUD_API_KEY;
  const sender = normalizePhone(from);
  const recipient = normalizePhone(to);
  const text = Array.from(String(body || "").trim())
    .slice(0, MAX_BODY_LENGTH)
    .join("");

  if (!apiKey || !sender || !recipient || !text) {
    return {
      status: "skipped",
      httpStatus: null,
      errorCode: "configuration_missing",
    };
  }

  return sendYCloudMessage(
    {
      from: sender,
      to: recipient,
      type: "text",
      externalId: externalIdFor(eventId),
      text: {
        body: text,
        preview_url: false,
      },
    },
    { env, fetchImpl },
  );
}

export async function sendYCloudPatientFollowupTemplate(
  { from, to, eventId, body },
  { env = process.env, fetchImpl = fetch } = {},
) {
  const sender = normalizePhone(from);
  const recipient = normalizePhone(to);
  const text = Array.from(String(body || "").trim())
    .slice(0, MAX_FOLLOWUP_TEMPLATE_PARAMETER_LENGTH)
    .join("");
  const templateName = String(
    env.YCLOUD_FOLLOWUP_TEMPLATE_NAME || "",
  ).trim();
  const language = String(
    env.YCLOUD_FOLLOWUP_TEMPLATE_LANGUAGE ||
      DEFAULT_FOLLOWUP_TEMPLATE_LANGUAGE,
  ).trim();

  if (
    !env.YCLOUD_API_KEY ||
    !sender ||
    !recipient ||
    !text ||
    !templateName ||
    !language
  ) {
    return {
      status: "skipped",
      httpStatus: null,
      errorCode: "configuration_missing",
    };
  }

  return sendYCloudMessage(
    {
      from: sender,
      to: recipient,
      type: "template",
      externalId: externalIdFor(eventId),
      template: {
        name: templateName,
        language: { code: language },
        components: [
          {
            type: "body",
            parameters: [{ type: "text", text }],
          },
        ],
      },
    },
    { env, fetchImpl },
  );
}
