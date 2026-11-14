import { detectManualAppointment } from "./appointment-confirmation.mjs";
import { createHash } from "node:crypto";
import { allowsPatientSideEffects } from "./automation-mode.mjs";
import { getHumanResumeControl } from "./human-resume-queue.mjs";
import { getBusinessNumber } from "./business-number-registry.mjs";
import { readConversationTurns } from "./conversation-memory.mjs";
import { sendControlledPatientReply } from "./outbound-reply-gate.mjs";
import { professionalByKey } from "./professional-registry.mjs";
import { usableKnownPatientName } from "./profile-name.mjs";

export function appointmentReceiptsEnabled(env = process.env) {
  return env.APPOINTMENT_STRUCTURED_RECEIPT_ENABLED === "true";
}
const phoneKey = value => String(value || "").replace(/\D/g, "");
const digest = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const professionalKey = value => { const key = professionalByKey(value)?.key; return ["amanda", "daniel"].includes(key) ? key : ""; };

export function buildStructuredAppointmentReceipt(a) {
  const name = usableKnownPatientName(a.name);
  const key = professionalKey(a.professional);
  if (!name || !key || !/^\d{4}-\d{2}-\d{2}$/.test(a.scheduledDate) || !/^\d{2}:\d{2}$/.test(a.scheduledTime)) return "";
  const date = new Date(`${a.scheduledDate}T12:00:00-03:00`);
  if (!Number.isFinite(date.getTime())) return "";
  const weekday = new Intl.DateTimeFormat("pt-BR", { weekday: "long", timeZone: "America/Sao_Paulo" }).format(date);
  const first = a.consultationType === "Primeira consulta";
  const price = key === "amanda" ? "500,00" : a.remote ? "350,00" : "700,00";
  return [
    "*Comprovante de Agendamento:*", "",
    `*Nome:* ${name}`, "",
    `*Data:* ${a.scheduledDate.split("-").reverse().join("/")} — ${weekday}`,
    `*Horário:* ${a.scheduledTime.replace(":", "h")}`,
    `*Médico:* ${key === "amanda" ? "Dra. Amanda Schroeder" : "Dr. Daniel Added"}`,
    a.remote ? "*Modalidade:* Teleconsulta" : "*Endereço:* Rua Pais Leme, 215, conjunto 710 — Pinheiros, São Paulo/SP",
    ...(first ? ["*Retorno:* Em até 30 dias", "", `*Valor da consulta:* R$ ${price}`, `*Formas de pagamento:* ${key === "amanda" ? "PIX, débito ou parcelamento" : "Dinheiro ou PIX"}`] : []),
    "", "Atenciosamente,", "Bruna — Clínica LIV",
  ].join("\n");
}

// One owner for all confirmed-booking routes. No transport retries after an
// uncertain send: the existing outbound claim owns that outcome durably.
export async function completeAppointmentReceipt(appointment, {
  env = process.env,
  deliverSheetsActionImpl,
  readConversationTurnsImpl = readConversationTurns,
  getBusinessNumberImpl = getBusinessNumber,
  getHumanResumeControlImpl = getHumanResumeControl,
  sendControlledPatientReplyImpl = sendControlledPatientReply,
  now = () => Date.now(),
} = {}) {
  if (!appointmentReceiptsEnabled(env)) return { status: "disabled" };
  if (/comprovante estruturado/i.test(appointment.source || "")) return { status: "already_sent_by_human" };
  if (!allowsPatientSideEffects(env.WHATSAPP_AUTOMATION_MODE)) return { status: "review_required", errorCode: "automation_inactive" };
  try {
    const read = async () => {
      const result = await deliverSheetsActionImpl("get_appointment", { appointment: { appointmentId: appointment.appointmentId, receiptContext: true } });
      const a = result.responseData?.receipt;
      if (!result.ok || !a?.eligible || !a.opportunityId || !a.name || phoneKey(a.phone) !== phoneKey(appointment.phone) || professionalKey(a.professional) !== professionalKey(appointment.professional) || a.scheduledDate !== appointment.scheduledDate || a.scheduledTime !== appointment.scheduledTime || (appointment.opportunityId && appointment.opportunityId !== a.opportunityId)) throw new Error("booking_readback_failed");
      const history = await readConversationTurnsImpl(a.phone);
      if (history.status !== "completed" || history.expired) throw new Error("history_unavailable");
      const patientTimes = history.turns.filter(t => t.role === "user" || t.role === "patient").map(t => new Date(t.at).getTime()).filter(Number.isFinite);
      const last = Math.max(...patientTimes);
      if (!(last <= now() && now() - last < 24 * 3600_000)) throw new Error("whatsapp_window_closed");
      const control = await getHumanResumeControlImpl(a.phone, { throwOnError: true });
      return { a, history, fingerprint: digest([a, history.turns, control]) };
    };
    const baseline = await read();
    const { a, history } = baseline;
    if (history.turns.some(t => {
      if (t.role !== "assistant" || !/comprovante de agendamento/i.test(t.text || "")) return false;
      const parsed = detectManualAppointment({ currentText: t.text, at: t.at || now() });
      return parsed?.source === "WhatsApp - comprovante estruturado de agendamento" &&
        parsed.scheduledDate === a.scheduledDate && parsed.scheduledTime === a.scheduledTime &&
        professionalKey(parsed.professional) === professionalKey(a.professional);
    })) return { status: "already_sent" };
    if (history.turns.some(t => t.role === "assistant" && /comprovante de agendamento/i.test(t.text || "") &&
      !detectManualAppointment({ currentText: t.text, at: t.at || now() }))) {
      return { status: "review_required", errorCode: "ambiguous_previous_receipt" };
    }
    const body = buildStructuredAppointmentReceipt(a);
    const from = await getBusinessNumberImpl({ env });
    if (!body || !from) return { status: "review_required", errorCode: "receipt_context_missing" };
    const eventId = `appointment-receipt-${digest([a.opportunityId, professionalKey(a.professional), a.scheduledDate, a.scheduledTime])}`;
    const result = await sendControlledPatientReplyImpl({
      from, to: a.phone, eventId, body, opportunityId: a.opportunityId,
      professional: a.professional, currentText: "Agendamento confirmado pela equipe", recentConversation: history.turns,
      conversationAction: { action: "respond", allowHoldingReply: false, replyContract: { version: "reply-contract-v1", allowedResponseKind: "direct_answer", maxQuestions: 0, maxLinks: 0, allowCta: false, allowAppointmentConfirmation: true } },
    }, { beforeSendImpl: async () => {
      if (!appointmentReceiptsEnabled(env) || !allowsPatientSideEffects(env.WHATSAPP_AUTOMATION_MODE)) return false;
      const latest = await read();
      return latest.fingerprint === baseline.fingerprint;
    } });
    if (result.status === "duplicate" && result.errorCode !== "already_sent") {
      return { ...result, status: "review_required" };
    }
    return result;
  } catch {
    return { status: "review_required", errorCode: "receipt_verification_failed" };
  }
}
