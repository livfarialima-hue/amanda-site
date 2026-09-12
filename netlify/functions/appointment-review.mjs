import {
  getAppointmentReview,
  updateAppointmentReview,
  verifyAppointmentReviewToken,
} from "./lib/appointment-review-store.mjs";
import { usableKnownPatientName } from "./lib/profile-name.mjs";

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function htmlPage(title, body, status = 200) {
  return new Response(
    `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(title)} — Clínica LIV</title>
  <style>
    :root{color-scheme:light;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#f5f2ec;color:#231f1c}
    body{margin:0;padding:24px}.card{max-width:560px;margin:6vh auto;background:#fff;border-radius:18px;padding:28px;box-shadow:0 12px 36px rgba(35,31,28,.1)}
    h1{font-size:24px;margin:0 0 16px}.details{background:#f7f5f1;border-radius:12px;padding:16px;line-height:1.6}.actions{display:flex;gap:12px;flex-wrap:wrap;margin-top:22px}
    button{border:0;border-radius:10px;padding:13px 18px;font-size:16px;font-weight:650;cursor:pointer}.confirm{background:#175b46;color:#fff}.dismiss{background:#e9e4dc;color:#3d3732}
    .note{font-size:14px;color:#665f58;margin-top:18px}
  </style>
</head>
<body><main class="card">${body}</main></body>
</html>`,
    {
      status,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store, max-age=0",
        "x-robots-tag": "noindex, nofollow",
      },
    },
  );
}

function tokenFromUrl(url) {
  return {
    id: url.searchParams.get("id") || "",
    expiresAt: url.searchParams.get("exp") || "",
    signature: url.searchParams.get("sig") || "",
  };
}

async function tokenFromRequest(request) {
  if (request.method === "GET") {
    return tokenFromUrl(new URL(request.url));
  }
  const form = await request.formData();
  return {
    id: String(form.get("id") || ""),
    expiresAt: String(form.get("exp") || ""),
    signature: String(form.get("sig") || ""),
    action: String(form.get("action") || "confirm"),
  };
}

async function deliverSheetsAction(
  action,
  payload,
  { env = process.env, fetchImpl = fetch } = {},
) {
  const url = env.GOOGLE_SHEETS_WEBHOOK_URL;
  const secret = env.GOOGLE_SHEETS_WEBHOOK_SECRET;
  if (!url || !secret) {
    return { ok: false, errorCode: "configuration_missing" };
  }

  try {
    const response = await fetchImpl(url, {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({ secret, action, ...payload }),
      redirect: "follow",
    });
    const body = await response.json().catch(() => ({}));
    return {
      ok: response.ok && body?.ok === true,
      responseData: body,
      errorCode: body?.error || `http_${response.status}`,
    };
  } catch {
    return { ok: false, errorCode: "request_failed" };
  }
}

function appointmentDetails(appointment) {
  const patientName =
    usableKnownPatientName(appointment.name) || "Não informado";
  return [
    `<strong>Paciente:</strong> ${escapeHtml(patientName)}`,
    `<strong>Telefone:</strong> ${escapeHtml(appointment.phone)}`,
    `<strong>Data:</strong> ${escapeHtml(appointment.scheduledDate)}`,
    `<strong>Horário:</strong> ${escapeHtml(appointment.scheduledTime)}`,
    `<strong>Profissional:</strong> ${escapeHtml(appointment.professional)}`,
  ].join("<br>");
}

function appointmentProfessionalKey(value) {
  const professional = String(value || "");
  if (/\bdaniel\b/i.test(professional)) return "daniel";
  if (/\bamanda\b/i.test(professional)) return "amanda";
  return "";
}

async function hydrateKnownAppointmentName({
  review,
  appointment,
  env,
  fetchImpl,
  updateAppointmentReviewImpl,
}) {
  const currentName = usableKnownPatientName(appointment.name);
  if (currentName || !appointment.phone) {
    return currentName
      ? { ...appointment, name: currentName }
      : appointment;
  }

  const lookup = await deliverSheetsAction(
    "get_patient_relationship",
    {
      patient: {
        phone: appointment.phone,
        professional: appointmentProfessionalKey(
          appointment.professional,
        ),
        includeIdentity: true,
      },
    },
    { env, fetchImpl },
  );
  const knownName = usableKnownPatientName(
    lookup.responseData?.relationship?.patientName,
  );
  if (!knownName) return appointment;

  const hydratedAppointment = { ...appointment, name: knownName };
  try {
    await updateAppointmentReviewImpl(review.id, {
      appointment: hydratedAppointment,
    });
  } catch {
    // The secure review can still display and submit the resolved name even
    // when the optional cache update is unavailable.
  }
  return hydratedAppointment;
}

export async function handleAppointmentReview(
  request,
  {
    env = process.env,
    fetchImpl = fetch,
    getAppointmentReviewImpl = getAppointmentReview,
    updateAppointmentReviewImpl = updateAppointmentReview,
    verifyTokenImpl = verifyAppointmentReviewToken,
  } = {},
) {
  if (!new Set(["GET", "POST"]).has(request.method)) {
    return htmlPage("Método não permitido", "<h1>Método não permitido</h1>", 405);
  }

  let token;
  try {
    token = await tokenFromRequest(request);
  } catch {
    return htmlPage("Link inválido", "<h1>Este link é inválido.</h1>", 400);
  }
  const verification = verifyTokenImpl(token, { env });
  if (!verification.ok) {
    const expired = verification.errorCode === "expired_token";
    return htmlPage(
      expired ? "Link expirado" : "Link inválido",
      `<h1>${expired ? "Este link expirou." : "Este link é inválido."}</h1><p>Confira o e-mail mais recente ou ajuste o agendamento diretamente na planilha.</p>`,
      expired ? 410 : 403,
    );
  }

  const review = await getAppointmentReviewImpl(verification.id);
  if (!review) {
    return htmlPage("Revisão não encontrada", "<h1>Revisão não encontrada.</h1>", 404);
  }
  const appointment = await hydrateKnownAppointmentName({
    review,
    appointment: review.appointment || {},
    env,
    fetchImpl,
    updateAppointmentReviewImpl,
  });

  if (request.method === "GET") {
    if (review.status === "approved") {
      return htmlPage(
        "Agendamento confirmado",
        `<h1>Agendamento já confirmado</h1><div class="details">${appointmentDetails(appointment)}</div>`,
      );
    }
    if (review.status === "dismissed") {
      return htmlPage(
        "Revisão encerrada",
        "<h1>Este caso já foi marcado como não sendo um agendamento.</h1>",
      );
    }
    const fields = [
      ["id", token.id],
      ["exp", token.expiresAt],
      ["sig", token.signature],
    ]
      .map(([name, value]) => `<input type="hidden" name="${name}" value="${escapeHtml(value)}">`)
      .join("");
    return htmlPage(
      "Revisar agendamento",
      `<h1>Este é um agendamento?</h1>
       <div class="details">${appointmentDetails(appointment)}</div>
       <form method="post"><div class="actions">${fields}
         <button class="confirm" name="action" value="confirm">Confirmar e atualizar agenda</button>
         <button class="dismiss" name="action" value="dismiss">Não era agendamento</button>
       </div></form>
       <p class="note">A agenda só será alterada após a confirmação acima.</p>`,
    );
  }

  if (token.action === "dismiss") {
    await updateAppointmentReviewImpl(review.id, { status: "dismissed" });
    return htmlPage(
      "Revisão encerrada",
      "<h1>Pronto.</h1><p>Nenhum horário foi bloqueado e nenhuma consulta foi criada.</p>",
    );
  }

  if (review.status === "approved") {
    return htmlPage(
      "Agendamento confirmado",
      `<h1>Agendamento já confirmado</h1><div class="details">${appointmentDetails(appointment)}</div>`,
    );
  }

  const reservation = await deliverSheetsAction(
    "reserve_appointment_slot",
    { appointment },
    { env, fetchImpl },
  );
  if (!reservation.ok || reservation.responseData?.reserved !== true) {
    return htmlPage(
      "Não foi possível confirmar",
      `<h1>Não foi possível atualizar a agenda.</h1><div class="details">${appointmentDetails(appointment)}</div><p>Motivo: ${escapeHtml(reservation.errorCode)}. Confira se o horário ainda está disponível.</p>`,
      409,
    );
  }

  await updateAppointmentReviewImpl(review.id, {
    status: "approved",
    approvedAt: new Date().toISOString(),
  });
  await deliverSheetsAction(
    "send_review_alert_email",
    {
      alert: {
        eventId: `${review.id}:approved`,
        patientName: appointment.name,
        patientPhone: appointment.phone,
        messageText: [
          "AGENDAMENTO CONFIRMADO PELO LINK DO E-MAIL",
          `Data: ${appointment.scheduledDate}`,
          `Horário: ${appointment.scheduledTime}`,
          "A consulta foi registrada e o horário foi retirado dos disponíveis.",
        ].join("\n"),
      },
    },
    { env, fetchImpl },
  );

  return htmlPage(
    "Agendamento confirmado",
    `<h1>Agendamento confirmado</h1><div class="details">${appointmentDetails(appointment)}</div><p>A consulta foi registrada e o horário foi retirado dos disponíveis.</p>`,
  );
}

export default (request) => handleAppointmentReview(request);
