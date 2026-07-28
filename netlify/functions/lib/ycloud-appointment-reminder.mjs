const YCLOUD_MESSAGES_URL =
  "https://api.ycloud.com/v2/whatsapp/messages";
const DEFAULT_TEMPLATE_NAME = "lembrete_consulta_liv_v1";
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

function externalIdFor(appointmentId, reminderKind) {
  const normalized = `${appointmentId}-${reminderKind}`
    .replace(/[^A-Za-z0-9_-]/g, "-")
    .slice(0, 90);

  return normalized
    ? `liv-appointment-${normalized}`
    : undefined;
}

export function isAppointmentReminderConfigured(
  env = process.env,
  from,
) {
  return Boolean(
    env.YCLOUD_API_KEY &&
      normalizePhone(from || env.WHATSAPP_SENDER_NUMBER) &&
      String(
        env.YCLOUD_APPOINTMENT_REMINDER_TEMPLATE_NAME ||
          DEFAULT_TEMPLATE_NAME,
      ).trim(),
  );
}

export async function sendYCloudAppointmentReminder(
  {
    appointmentId,
    reminderKind,
    patientPhone,
    patientName,
    professional,
    appointmentDate,
    appointmentTime,
    location,
    from: inputFrom,
  },
  { env = process.env, fetchImpl = fetch } = {},
) {
  const apiKey = env.YCLOUD_API_KEY;
  const from = normalizePhone(
    inputFrom || env.WHATSAPP_SENDER_NUMBER,
  );
  const to = normalizePhone(patientPhone);

  if (!apiKey || !from || !to) {
    return {
      status: "skipped",
      httpStatus: null,
      errorCode: "configuration_missing",
    };
  }

  const parameters = [
    limitedText(patientName, 120) || "Olá",
    limitedText(professional, 120) || "nossa equipe",
    limitedText(appointmentDate, 40),
    limitedText(appointmentTime, 20),
    limitedText(location, 180) || "na Clínica LIV Faria Lima",
  ];

  if (!parameters[2] || !parameters[3]) {
    return {
      status: "skipped",
      httpStatus: null,
      errorCode: "invalid_appointment",
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
        externalId: externalIdFor(
          appointmentId,
          reminderKind,
        ),
        template: {
          name: String(
            env.YCLOUD_APPOINTMENT_REMINDER_TEMPLATE_NAME ||
              DEFAULT_TEMPLATE_NAME,
          ),
          language: {
            code: String(
              env.YCLOUD_APPOINTMENT_REMINDER_TEMPLATE_LANGUAGE ||
                DEFAULT_TEMPLATE_LANGUAGE,
            ),
          },
          components: [
            {
              type: "body",
              parameters: parameters.map((text) => ({
                type: "text",
                text,
              })),
            },
          ],
        },
      }),
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
