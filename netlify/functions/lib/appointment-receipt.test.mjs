import test from "node:test";
import assert from "node:assert/strict";
import { buildStructuredAppointmentReceipt, completeAppointmentReceipt } from "./appointment-receipt.mjs";
const now = Date.parse("2026-11-13T17:00:00Z");
const appointment = { appointmentId: "synthetic-booking", opportunityId: "synthetic-opportunity", phone: "+5511999990000", name: "Maria Exemplo", professional: "Dra. Amanda", scheduledDate: "2026-11-16", scheduledTime: "10:00", consultationType: "Primeira consulta" };
function fixture(overrides = {}) {
  const calls = [];
  const receipt = { ...appointment, eligible: true };
  const history = { status: "completed", expired: false, turns: [{ role: "user", text: "Confirmo", at: new Date(now - 1000).toISOString() }] };
  return { calls, receipt, history, deps: {
    env: { APPOINTMENT_STRUCTURED_RECEIPT_ENABLED: "true", WHATSAPP_AUTOMATION_MODE: "active" }, now: () => now,
    deliverSheetsActionImpl: async () => ({ ok: true, responseData: { receipt } }),
    readConversationTurnsImpl: async () => history,
    getHumanResumeControlImpl: async () => null,
    getBusinessNumberImpl: async () => "+5511999990001",
    sendControlledPatientReplyImpl: async (input, options) => { calls.push(input); return { status: await options.beforeSendImpl() ? "completed" : "superseded" }; }, ...overrides,
  } };
}
test("structured receipt uses verified appointment and customary fields", async () => {
  const f = fixture();
  assert.equal((await completeAppointmentReceipt(appointment, f.deps)).status, "completed");
  assert.match(f.calls[0].body, /16\/11\/2026 — segunda-feira/);
  assert.match(f.calls[0].body, /R\$ 500,00/);
  assert.match(f.calls[0].body, /215, conjunto 710/);
});
test("same booking across different routes uses one outbound id", async () => {
  const f = fixture();
  await completeAppointmentReceipt(appointment, f.deps);
  await completeAppointmentReceipt({ ...appointment, appointmentId: "another-route" }, f.deps);
  assert.equal(f.calls[0].eventId, f.calls[1].eventId);
});
test("default off and shadow never send", async () => {
  for (const env of [{}, { APPOINTMENT_STRUCTURED_RECEIPT_ENABLED: "true", WHATSAPP_AUTOMATION_MODE: "shadow" }]) {
    const f = fixture({ env }); await completeAppointmentReceipt(appointment, f.deps); assert.equal(f.calls.length, 0);
  }
});
test("human structured receipt is never resent", async () => {
  const f = fixture();
  assert.equal((await completeAppointmentReceipt({ ...appointment, source: "WhatsApp - comprovante estruturado de agendamento" }, f.deps)).status, "already_sent_by_human");
  f.history.turns.push({ role: "assistant", text: buildStructuredAppointmentReceipt(appointment), at: new Date(now).toISOString() });
  assert.equal((await completeAppointmentReceipt(appointment, f.deps)).status, "already_sent");
  assert.equal(f.calls.length, 0);
});
test("identity, calendar, optout, history and WhatsApp window fail closed", async () => {
  for (const patch of [{ eligible: false }, { phone: "+5511888880000" }, { professional: "Dra. Amanda e Dr. Daniel" }, { opportunityId: "other" }, { scheduledTime: "11:00" }, { name: "" }]) {
    const f = fixture(); Object.assign(f.receipt, patch);
    assert.equal((await completeAppointmentReceipt(appointment, f.deps)).status, "review_required"); assert.equal(f.calls.length, 0);
  }
  for (const patch of [{ status: "failed" }, { expired: true }, { turns: [] }, { turns: [{ role: "user", at: new Date(now - 25 * 3600_000).toISOString() }] }]) {
    const f = fixture(); Object.assign(f.history, patch);
    assert.equal((await completeAppointmentReceipt(appointment, f.deps)).status, "review_required"); assert.equal(f.calls.length, 0);
  }
});
test("cancellation and new human activity immediately before transport supersede send", async () => {
  for (const mutate of [f => { f.receipt.eligible = false; }, f => { f.history.turns.push({ role: "assistant", source: "human", text: "Precisamos remarcar" }); }]) {
    const f = fixture(); let checked = false;
    f.deps.sendControlledPatientReplyImpl = async (_input, options) => { mutate(f); try { checked = await options.beforeSendImpl(); } catch { checked = false; } return { status: "superseded" }; };
    await completeAppointmentReceipt(appointment, f.deps); assert.equal(checked, false);
  }
});
test("uncertain outcome is returned without retry; unknown professional has no receipt", async () => {
  let calls = 0; const f = fixture({ sendControlledPatientReplyImpl: async () => { calls++; return { status: "uncertain" }; } });
  assert.equal((await completeAppointmentReceipt(appointment, f.deps)).status, "uncertain"); assert.equal(calls, 1);
  assert.equal(buildStructuredAppointmentReceipt({ ...appointment, professional: "Equipe" }), "");
  assert.doesNotMatch(buildStructuredAppointmentReceipt({ ...appointment, consultationType: "Retorno", remote: true }), /Endereço|Valor da consulta/);
});
test("structured first-consultation receipts pass the real outbound content guard", async () => {
  const { validateOutboundReply } = await import("./outbound-reply-gate.mjs");
  for (const professional of ["Dra. Amanda", "Dr. Daniel"]) {
    const f = fixture(); f.receipt.professional = professional;
    await completeAppointmentReceipt({ ...appointment, professional }, f.deps);
    assert.equal(validateOutboundReply(f.calls[0]).allowed, true, JSON.stringify(validateOutboundReply(f.calls[0])));
  }
});
test("abbreviated human receipt is recognized; uncertain duplicates remain reviewable", async () => {
  const f = fixture();
  f.history.turns.push({ role: "assistant", text: buildStructuredAppointmentReceipt(appointment).replace("10h00", "10h"), at: new Date(now).toISOString() });
  assert.equal((await completeAppointmentReceipt(appointment, f.deps)).status, "already_sent");
  for (const errorCode of ["delivery_uncertain", "already_processing"]) {
    const pending = fixture({ sendControlledPatientReplyImpl: async () => ({ status: "duplicate", errorCode }) });
    assert.equal((await completeAppointmentReceipt(appointment, pending.deps)).status, "review_required");
  }
  const failed = fixture({ getHumanResumeControlImpl: async () => { throw new Error("unavailable"); } });
  assert.equal((await completeAppointmentReceipt(appointment, failed.deps)).status, "review_required");
  assert.equal(failed.calls.length, 0);
});
test("human-control strict read distinguishes unavailable store from absent control", async () => {
  const { getHumanResumeControl } = await import("./human-resume-queue.mjs");
  const getStoreImpl = () => { throw new Error("unavailable"); };
  assert.equal(await getHumanResumeControl(appointment.phone, { getStoreImpl }), null);
  await assert.rejects(getHumanResumeControl(appointment.phone, { getStoreImpl, throwOnError: true }), /unavailable/);
});
