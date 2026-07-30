import assert from "node:assert/strict";
import test from "node:test";
import {
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
  assert.equal(sheetActions.length, 1);
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
