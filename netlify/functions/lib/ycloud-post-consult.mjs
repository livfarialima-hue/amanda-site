const YCLOUD_MESSAGES_URL =
  "https://api.ycloud.com/v2/whatsapp/messages";
const DEFAULT_TEMPLATE_NAME = "pos_consulta_cuidado_liv_v1";
const DEFAULT_TEMPLATE_LANGUAGE = "pt_BR";
const REQUEST_TIMEOUT_MS = 8_000;

function normalizePhone(value) {
  const compact = String(value || "").replace(/[\s()-]/g, "");

  if (/^\+\d{8,15}$/.test(compact)) return compact;
  if (/^55\d{10,11}$/.test(compact)) return `+${compact}`;

  return null;
}

function limitedText(value, maximumLength) {
  return Array.from(String(value || "").trim())
    .slice(0, maximumLength)
    .join("");
}

function externalIdFor(appointmentId) {
  const normalized = String(appointmentId || "")
    .replace(/[^A-Za-z0-9_-]/g, "-")
    .slice(0, 90);

  return normalized
    ? `liv-post-consult-${normalized}`
    : undefined;
}

export function isPostConsultConfigured(
  env = process.env,
  from,
) {
  return Boolean(
    env.YCLOUD_API_KEY &&
      normalizePhone(from || env.WHATSAPP_SENDER_NUMBER) &&
      String(
        env.YCLOUD_POST_CONSULT_TEMPLATE_NAME ||
          DEFAULT_TEMPLATE_NAME,
      ).trim(),
  );
}

export async function sendYCloudPostConsult(
  {
    appointmentId,
    patientPhone,
    professional,
    from: inputFrom,
  },
  { env = process.env, fetchImpl = fetch } = {},
) {
  const apiKey = env.YCLOUD_API_KEY;
  const from = normalizePhone(
    inputFrom || env.WHATSAPP_SENDER_NUMBER,
  );
  const to = normalizePhone(patientPhone);
  const professionalName =
    limitedText(professional, 120) || "nossa equipe";

  if (!apiKey || !from || !to || !appointmentId) {
    return {
      status: "skipped",
      httpStatus: null,
      errorCode: "configuration_missing",
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT_MS,
  );

  try {
    const response = await fetchImpl(YCLOUD_MESSAGES_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json; charset=utf-8",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify({
        from,
        to,
        type: "template",
        externalId: externalIdFor(appointmentId),
        template: {
          name: String(
            env.YCLOUD_POST_CONSULT_TEMPLATE_NAME ||
              DEFAULT_TEMPLATE_NAME,
          ),
          language: {
            code: String(
              env.YCLOUD_POST_CONSULT_TEMPLATE_LANGUAGE ||
                DEFAULT_TEMPLATE_LANGUAGE,
            ),
          },
          components: [
            {
              type: "body",
              parameters: [
                {
                  type: "text",
                  text: professionalName,
                },
              ],
            },
          ],
        },
      }),
      signal: controller.signal,
    });

    return {
      status: response.ok ? "completed" : "failed",
      httpStatus: response.status,
      errorCode: response.ok
        ? "none"
        : `http_${response.status}`,
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
