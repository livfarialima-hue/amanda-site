import assert from "node:assert/strict";
import test from "node:test";
import {
  completeManualAppointmentDetection,
  completeSelectedAppointment,
} from "../ycloud-webhook.mjs";

const INPUT = {
  from: "+5511961957144",
  eventId: "selection-event",
  messageId: "selection-message",
  patientName: "Maria Silva",
  patientPhone: "+5511900007777",
  opportunityId: "opp-amanda-1",
  selection: {
    option: 2,
    scheduledDate: "2026-08-04",
    scheduledTime: "10:00",
    professional: "Dra. Amanda",
    consultationType: "Consulta presencial",
    location: "Clínica LIV Faria Lima",
    status: "Consulta agendada",
    source:
      "WhatsApp — opção de horário escolhida pela paciente",
  },
};

test("a patient choice is recorded for human confirmation without reserving the agenda", async () => {
  const sheetActions = [];
  const patientMessages = [];
  const memoryTurns = [];
  const alerts = [];
  const baselineControl = {
    status: "human_active",
    generation: "offer-message",
    updatedAt: "2026-07-29T20:50:00.000Z",
  };
  const result = await completeSelectedAppointment(INPUT, {
    getHumanResumeControlImpl: async () => baselineControl,
    deliverSheetsActionImpl: async (action, payload) => {
      sheetActions.push({ action, payload });
      return {
        ok: true,
        responseData: {
          ok: true,
          reserved: true,
        },
      };
    },
    completeReviewAlertImpl: async (alert) => {
      alerts.push(alert);
    },
    guardBookedAppointmentReplyImpl: async ({
      baselineControl: receivedControl,
    }) => {
      assert.deepEqual(receivedControl, baselineControl);
      return { shouldSend: true };
    },
    sendControlledPatientReplyImpl: async (message) => {
      patientMessages.push(message);
      return {
        status: "completed",
        errorCode: "none",
      };
    },
    appendConversationTurnImpl: async (turn) => {
      memoryTurns.push(turn);
      return { status: "completed" };
    },
  });

  assert.deepEqual(result, {
    status: "pending_human_confirmation",
    reserved: false,
    confirmationSent: false,
    pendingRecorded: true,
    errorCode: "none",
  });
  assert.equal(sheetActions.length, 2);
  assert.equal(
    sheetActions[0].action,
    "record_pending_appointment_selection",
  );
  assert.equal(
    sheetActions[0].payload.appointment.scheduledDate,
    "2026-08-04",
  );
  assert.equal(
    sheetActions[0].payload.appointment.scheduledTime,
    "10:00",
  );
  assert.equal(
    sheetActions[0].payload.appointment.opportunityId,
    INPUT.opportunityId,
  );
  assert.equal(
    sheetActions[1].action,
    "send_review_alert_email",
  );
  assert.match(
    sheetActions[1].payload.alert.messageText,
    /AGUARDANDO CONFIRMAÇÃO HUMANA/,
  );
  assert.equal(patientMessages.length, 0);
  assert.equal(memoryTurns.length, 0);
  assert.equal(alerts.length, 1);
});

test("an agreement already closed by the human team is recorded without another patient message", async () => {
  const patientMessages = [];
  const cancellations = [];
  const reservations = [];
  const result = await completeSelectedAppointment(
    {
      ...INPUT,
      selection: {
        ...INPUT.selection,
        source:
          "WhatsApp — confirmação após acordo com a equipe humana",
        silentConfirmation: true,
      },
    },
    {
      getHumanResumeControlImpl: async () => ({
        status: "human_active",
        generation: "human-agreement",
      }),
      deliverSheetsActionImpl: async (action, payload) => {
        reservations.push({ action, payload });
        return {
          ok: true,
          responseData: {
            ok: true,
            reserved: true,
          },
        };
      },
      cancelPendingHumanResumeImpl: async (phone) => {
        cancellations.push(phone);
        return { status: "completed" };
      },
      sendControlledPatientReplyImpl: async (message) => {
        patientMessages.push(message);
        return { status: "completed" };
      },
    },
  );

  assert.deepEqual(result, {
    status: "recorded_silently",
    reserved: true,
    confirmationSent: false,
    errorCode: "none",
  });
  assert.deepEqual(cancellations, [INPUT.patientPhone]);
  assert.equal(
    reservations[0].payload.appointment.opportunityId,
    INPUT.opportunityId,
  );
  assert.equal(patientMessages.length, 0);
});

test("a failed pending record still creates a human review alert", async () => {
  const patientMessages = [];
  const alerts = [];
  const result = await completeSelectedAppointment(INPUT, {
    getHumanResumeControlImpl: async () => null,
    deliverSheetsActionImpl: async () => ({
      ok: false,
      errorCode: "pending_record_failed",
    }),
    completeReviewAlertImpl: async (alert) => {
      alerts.push(alert);
    },
    sendControlledPatientReplyImpl: async (message) => {
      patientMessages.push(message);
      return { status: "completed" };
    },
  });

  assert.equal(result.reserved, false);
  assert.equal(result.status, "pending_human_confirmation");
  assert.equal(patientMessages.length, 0);
  assert.equal(alerts.length, 1);
  assert.match(
    alerts[0].messageText,
    /Após conferir e registrar o horário, envie:/,
  );
  assert.match(
    alerts[0].messageText,
    /Registro pendente:/,
  );
});

test("patient selection never sends an automatic confirmation", async () => {
  const patientMessages = [];
  const result = await completeSelectedAppointment(INPUT, {
    getHumanResumeControlImpl: async () => ({
      status: "human_active",
      generation: "offer-message",
      updatedAt: "2026-07-29T20:50:00.000Z",
    }),
    deliverSheetsActionImpl: async () => ({
      ok: true,
      responseData: {
        ok: true,
        reserved: true,
      },
    }),
    guardBookedAppointmentReplyImpl: async () => ({
      shouldSend: false,
    }),
    sendControlledPatientReplyImpl: async (message) => {
      patientMessages.push(message);
      return { status: "completed" };
    },
  });

  assert.equal(result.reserved, false);
  assert.equal(
    result.status,
    "pending_human_confirmation",
  );
  assert.equal(patientMessages.length, 0);
});

test("a clear manual confirmation reserves the slot without a routine email", async () => {
  const actions = [];
  const result = await completeManualAppointmentDetection(
    {
      eventId: "manual-event",
      messageId: "manual-message",
      patientName: "Lais Valério Ikoma",
      patientPhone: "+5511944411011",
      detection: {
        scheduledDate: "2026-08-03",
        scheduledTime: "08:00",
        professional: "Dra. Amanda",
        consultationType: "Consulta presencial",
        location: "Clínica LIV Faria Lima",
        status: "Consulta agendada",
        source: "WhatsApp — confirmação manual",
        confidence: "confirmed",
      },
    },
    {
      deliverSheetsActionImpl: async (action, payload) => {
        actions.push({ action, payload });
        if (action === "reserve_appointment_slot") {
          return {
            ok: true,
            responseData: { ok: true, reserved: true },
          };
        }
        return { ok: true, responseData: { ok: true, sent: true } };
      },
    },
  );

  assert.equal(result.status, "completed");
  assert.equal(result.reserved, true);
  assert.equal(actions[0].action, "reserve_appointment_slot");
  assert.equal(actions[0].payload.appointment.humanConfirmed, true);
  assert.equal(actions.length, 1);
});

test("a structured receipt uses its patient name in the canonical reservation payload", async () => {
  const actions = [];
  const result = await completeManualAppointmentDetection(
    {
      eventId: "receipt-event",
      messageId: "receipt-message",
      patientName: "Nome incorreto do perfil",
      patientPhone: "+5511900001234",
      detection: {
        patientName: "Paciente Exemplo",
        scheduledDate: "2026-08-18",
        scheduledTime: "14:00",
        professional: "Dr. Daniel",
        consultationType: "Consulta presencial",
        location: "ClÃ­nica LIV Faria Lima",
        status: "Consulta agendada",
        source: "WhatsApp - comprovante estruturado de agendamento",
        confidence: "confirmed",
      },
    },
    {
      deliverSheetsActionImpl: async (action, payload) => {
        actions.push({ action, payload });
        if (action === "reserve_appointment_slot") {
          return {
            ok: true,
            responseData: { ok: true, reserved: true },
          };
        }
        return { ok: true, responseData: { ok: true, sent: true } };
      },
    },
  );

  assert.equal(result.status, "completed");
  assert.equal(
    actions[0].payload.appointment.name,
    "Paciente Exemplo",
  );
  assert.equal(
    actions[0].payload.appointment.professional,
    "Dr. Daniel",
  );
  assert.equal(actions.length, 1);
});

test("a confirmed human slot is still recorded when it is outside the automatic grid", async () => {
  const actions = [];
  const result = await completeManualAppointmentDetection(
    {
      eventId: "outside-grid-event",
      messageId: "outside-grid-message",
      patientName: "Hilda Vieira de Araújo",
      patientPhone: "+5511950638808",
      detection: {
        scheduledDate: "2026-08-04",
        scheduledTime: "20:00",
        professional: "Dra. Amanda",
        consultationType: "Consulta presencial",
        location: "Clínica LIV Faria Lima",
        confidence: "confirmed",
      },
    },
    {
      deliverSheetsActionImpl: async (action, payload) => {
        actions.push({ action, payload });
        if (action === "reserve_appointment_slot") {
          return {
            ok: true,
            responseData: {
              ok: true,
              reserved: true,
              offGrid: true,
              appointmentId: "manual-outside-grid-message",
            },
          };
        }
        return { ok: true, responseData: { ok: true, sent: true } };
      },
    },
  );

  assert.equal(result.status, "completed");
  assert.equal(result.reserved, true);
  assert.equal(result.recorded, true);
  assert.deepEqual(
    actions.map(({ action }) => action),
    ["reserve_appointment_slot"],
  );
  assert.equal(actions[0].payload.appointment.humanConfirmed, true);
});

test("a human appointment is kept and emails only when Sala 1 already has a conflict", async () => {
  const actions = [];
  const result = await completeManualAppointmentDetection(
    {
      eventId: "room-conflict-event",
      messageId: "room-conflict-message",
      patientName: "Paciente Exemplo",
      patientPhone: "+5511900000000",
      detection: {
        scheduledDate: "2026-09-24",
        scheduledTime: "14:00",
        professional: "Dra. Amanda",
        consultationType: "Consulta presencial",
        location: "Clínica LIV Faria Lima",
        confidence: "confirmed",
      },
    },
    {
      deliverSheetsActionImpl: async (action, payload) => {
        actions.push({ action, payload });
        if (action === "reserve_appointment_slot") {
          return {
            ok: true,
            responseData: {
              ok: true,
              reserved: true,
              room: "Sala 1",
              roomConflict: true,
            },
          };
        }
        return { ok: true, responseData: { ok: true, sent: true } };
      },
    },
  );

  assert.equal(result.status, "completed_with_room_conflict");
  assert.equal(result.reserved, true);
  assert.equal(result.roomConflict, true);
  assert.deepEqual(
    actions.map(({ action }) => action),
    ["reserve_appointment_slot", "send_review_alert_email"],
  );
  assert.match(
    actions[1].payload.alert.messageText,
    /CONFLITO NA SALA 1/,
  );
});

test("a timed-out human booking is reconciled by appointment id before alerting", async () => {
  const actions = [];
  const result = await completeManualAppointmentDetection(
    {
      eventId: "timeout-event",
      messageId: "timeout-message",
      patientName: "Paciente Exemplo",
      patientPhone: "+5511900000000",
      detection: {
        scheduledDate: "2026-09-24",
        scheduledTime: "14:00",
        professional: "Dra. Amanda",
        consultationType: "Consulta presencial",
        location: "Clínica LIV Faria Lima",
        confidence: "confirmed",
      },
    },
    {
      deliverSheetsActionImpl: async (action, payload) => {
        actions.push({ action, payload });
        if (action === "reserve_appointment_slot") {
          return { ok: false, errorCode: "timeout" };
        }
        if (action === "get_appointment") {
          return {
            ok: true,
            responseData: {
              ok: true,
              found: true,
              complete: true,
              calendarSynced: true,
              room: "Sala 1",
            },
          };
        }
        throw new Error(`unexpected action: ${action}`);
      },
    },
  );

  assert.equal(result.status, "completed");
  assert.equal(result.recoveredAfterTimeout, true);
  assert.deepEqual(
    actions.map(({ action }) => action),
    ["reserve_appointment_slot", "get_appointment"],
  );
});

test("a confirmed appointment with missing time requires action without a partial consultation row", async () => {
  const actions = [];
  const result = await completeManualAppointmentDetection(
    {
      eventId: "partial-event",
      messageId: "partial-message",
      patientName: "Laís Valério Ikoma",
      patientPhone: "+5511944411011",
      detection: {
        scheduledDate: "2026-08-03",
        scheduledTime: null,
        professional: "Dra. Amanda",
        consultationType: "Consulta presencial",
        location: "Clínica LIV Faria Lima",
        confidence: "confirmed_partial",
        missingFields: ["scheduledTime"],
      },
    },
    {
      deliverSheetsActionImpl: async (action, payload) => {
        actions.push({ action, payload });
        return { ok: true, responseData: { ok: true, sent: true } };
      },
    },
  );

  assert.equal(result.status, "review_required");
  assert.equal(result.recorded, false);
  assert.deepEqual(
    actions.map(({ action }) => action),
    ["send_review_alert_email"],
  );
  assert.match(
    actions[0].payload.alert.messageText,
    /Nenhuma linha foi criada em Consultas/,
  );
});

test("a doubtful manual closing emails a secure approval link without changing the agenda", async () => {
  const actions = [];
  const result = await completeManualAppointmentDetection(
    {
      eventId: "possible-event",
      messageId: "possible-message",
      patientName: "Maria",
      patientPhone: "+5511900001111",
      detection: {
        scheduledDate: "2026-08-10",
        scheduledTime: "10:00",
        professional: "Dra. Amanda",
        consultationType: "Consulta presencial",
        location: "Clínica LIV Faria Lima",
        status: "Consulta agendada",
        source: "WhatsApp — possível confirmação manual",
        confidence: "possible",
      },
    },
    {
      deliverSheetsActionImpl: async (action, payload) => {
        actions.push({ action, payload });
        return { ok: true, responseData: { ok: true, sent: true } };
      },
      createAppointmentReviewImpl: async () => ({
        ok: true,
        id: "review-1",
        expiresAt: 123,
        signature: "signature",
      }),
      buildAppointmentReviewUrlImpl: () =>
        "https://example.com/review?id=review-1",
    },
  );

  assert.equal(result.status, "approval_requested");
  assert.equal(result.reserved, false);
  assert.equal(actions.length, 1);
  assert.equal(actions[0].action, "send_review_alert_email");
  assert.match(
    actions[0].payload.alert.messageText,
    /Confirmar agendamento/,
  );
  assert.match(
    actions[0].payload.alert.messageText,
    /https:\/\/example\.com\/review/,
  );
});

test("a manual confirmation does not send a second email when the same slot is already registered", async () => {
  const actions = [];
  const result = await completeManualAppointmentDetection(
    {
      eventId: "duplicate-event",
      messageId: "duplicate-message",
      patientName: "Lais",
      patientPhone: "+5511944411011",
      detection: {
        scheduledDate: "2026-08-03",
        scheduledTime: "08:00",
        professional: "Dra. Amanda",
        confidence: "confirmed",
      },
    },
    {
      deliverSheetsActionImpl: async (action, payload) => {
        actions.push({ action, payload });
        return {
          ok: true,
          responseData: {
            ok: true,
            reserved: true,
            duplicate: true,
          },
        };
      },
    },
  );

  assert.equal(result.reserved, true);
  assert.equal(result.duplicate, true);
  assert.equal(actions.length, 1);
  assert.equal(actions[0].action, "reserve_appointment_slot");
});
