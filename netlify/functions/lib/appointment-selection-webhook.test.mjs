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

test("a patient choice reserves the offered slot and receives the final confirmation", async () => {
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
    status: "completed",
    reserved: true,
    confirmationSent: true,
    errorCode: "none",
  });
  assert.equal(sheetActions.length, 2);
  assert.equal(
    sheetActions[0].action,
    "reserve_appointment_slot",
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
    sheetActions[1].action,
    "send_review_alert_email",
  );
  assert.match(
    sheetActions[1].payload.alert.messageText,
    /AGENDAMENTO CONFIRMADO E REGISTRADO/,
  );
  assert.equal(patientMessages.length, 1);
  assert.equal(
    patientMessages[0].to,
    INPUT.patientPhone,
  );
  assert.match(
    patientMessages[0].body,
    /terça-feira, 4 de agosto, às 10h/,
  );
  assert.match(
    patientMessages[0].body,
    /Clínica LIV Faria Lima/,
  );
  assert.equal(memoryTurns.length, 1);
  assert.equal(alerts.length, 0);
});

test("an agreement already closed by the human team is recorded without another patient message", async () => {
  const patientMessages = [];
  const cancellations = [];
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
      deliverSheetsActionImpl: async () => ({
        ok: true,
        responseData: {
          ok: true,
          reserved: true,
        },
      }),
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
  assert.equal(patientMessages.length, 0);
});

test("an unavailable slot is not booked and creates a review alert with a suggested answer", async () => {
  const patientMessages = [];
  const alerts = [];
  const result = await completeSelectedAppointment(INPUT, {
    getHumanResumeControlImpl: async () => null,
    deliverSheetsActionImpl: async () => ({
      ok: false,
      errorCode: "slot_not_available",
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
  assert.equal(result.status, "review_required");
  assert.equal(patientMessages.length, 0);
  assert.equal(alerts.length, 1);
  assert.match(
    alerts[0].messageText,
    /Sugestão para copiar após conferir:/,
  );
  assert.match(
    alerts[0].messageText,
    /não está mais disponível/,
  );
});

test("a new human response cancels only the automatic confirmation, not the reservation", async () => {
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

  assert.equal(result.reserved, true);
  assert.equal(
    result.status,
    "confirmation_cancelled_by_human",
  );
  assert.equal(patientMessages.length, 0);
});

test("a clear manual confirmation reserves the slot and emails Daniel", async () => {
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
  assert.equal(actions[1].action, "send_review_alert_email");
  assert.match(
    actions[1].payload.alert.messageText,
    /AGENDAMENTO MANUAL CONFIRMADO E REGISTRADO/,
  );
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
            ok: false,
            errorCode: "slot_not_available",
            responseData: { ok: false },
          };
        }
        if (action === "upsert_appointment") {
          return {
            ok: true,
            responseData: {
              ok: true,
              appointmentId: "manual-outside-grid-message",
            },
          };
        }
        return { ok: true, responseData: { ok: true, sent: true } };
      },
    },
  );

  assert.equal(result.status, "completed_with_schedule_review");
  assert.equal(result.reserved, false);
  assert.equal(result.recorded, true);
  assert.deepEqual(
    actions.map(({ action }) => action),
    [
      "reserve_appointment_slot",
      "upsert_appointment",
      "send_review_alert_email",
    ],
  );
  assert.equal(
    actions[1].payload.appointment.status,
    "Agendada",
  );
  assert.match(
    actions[2].payload.alert.messageText,
    /REGISTRADO — CONFERIR GRADE/,
  );
});

test("a confirmed appointment with missing time creates an incomplete consultation row", async () => {
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
        if (action === "upsert_appointment") {
          return {
            ok: true,
            responseData: {
              ok: true,
              appointmentId: "manual-partial-message",
            },
          };
        }
        return { ok: true, responseData: { ok: true, sent: true } };
      },
    },
  );

  assert.equal(result.status, "recorded_incomplete");
  assert.equal(result.recorded, true);
  assert.deepEqual(
    actions.map(({ action }) => action),
    ["upsert_appointment", "send_review_alert_email"],
  );
  assert.equal(
    actions[0].payload.appointment.status,
    "Aguardando confirmação",
  );
  assert.match(
    actions[1].payload.alert.messageText,
    /COMPLETAR DADOS/,
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
