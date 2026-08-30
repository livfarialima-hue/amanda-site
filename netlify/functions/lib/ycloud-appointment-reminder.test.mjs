import assert from "node:assert/strict";
import test from "node:test";
import {
  appointmentReminderPatientName,
  appointmentReminderLocation,
  isAppointmentReminderConfigured,
  sendYCloudAppointmentReminder,
} from "./ycloud-appointment-reminder.mjs";

const INPUT = {
  appointmentId: "consulta-42",
  reminderKind: "48h",
  patientPhone: "+5511999999999",
  patientName: "Maria",
  professional: "Dra. Amanda",
  appointmentDate: "30/07/2026",
  appointmentTime: "14:30",
  location: "na Clínica LIV Faria Lima",
};

const FULL_CLINIC_LOCATION =
  "na Clínica LIV Faria Lima, R. Pais Leme, 215, cj. 710 — Pinheiros, São Paulo, CEP 05424-150\n" +
  "Google Maps: https://maps.app.goo.gl/yDFBmbcn5oDpHSM46";

test("clinic reminders include the full address and Google Maps link", () => {
  assert.equal(
    appointmentReminderLocation("na Clínica LIV Faria Lima"),
    FULL_CLINIC_LOCATION,
  );
  assert.equal(
    appointmentReminderLocation(""),
    FULL_CLINIC_LOCATION,
  );
});

test("a custom appointment location is preserved", () => {
  assert.equal(
    appointmentReminderLocation("Teleconsulta"),
    "Teleconsulta",
  );
});

test("appointment reminder requires API key and sender number", () => {
  assert.equal(isAppointmentReminderConfigured({}), false);
  assert.equal(
    isAppointmentReminderConfigured({
      YCLOUD_API_KEY: "test-key",
      WHATSAPP_SENDER_NUMBER: "+5511961957144",
    }),
    true,
  );
  assert.equal(
    isAppointmentReminderConfigured(
      { YCLOUD_API_KEY: "test-key" },
      "+5511961957144",
    ),
    true,
  );
});

test("appointment reminder uses the approved utility template", async () => {
  const calls = [];
  const env = {
    YCLOUD_API_KEY: "test-key",
    WHATSAPP_SENDER_NUMBER: "+5511961957144",
    YCLOUD_APPOINTMENT_REMINDER_TEMPLATE_NAME:
      "lembrete_consulta_liv_v1",
    YCLOUD_APPOINTMENT_REMINDER_TEMPLATE_LANGUAGE: "pt_BR",
  };

  const result = await sendYCloudAppointmentReminder(INPUT, {
    env,
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return new Response('{"status":"accepted"}', {
        status: 200,
      });
    },
  });

  assert.equal(result.status, "completed");
  assert.equal(calls.length, 1);

  const body = JSON.parse(calls[0].options.body);
  assert.equal(body.from, env.WHATSAPP_SENDER_NUMBER);
  assert.equal(body.to, INPUT.patientPhone);
  assert.equal(body.type, "template");
  assert.equal(
    body.externalId,
    "liv-appointment-consulta-42-48h",
  );
  assert.equal(
    body.template.name,
    "lembrete_consulta_liv_v1",
  );
  assert.deepEqual(
    body.template.components[0].parameters.map(
      (parameter) => parameter.text,
    ),
    [
      "Maria",
      "Dra. Amanda",
      "30/07/2026",
      "14:30",
      FULL_CLINIC_LOCATION,
    ],
  );
});

test("appointment reminder does not throw on provider failure", async () => {
  const result = await sendYCloudAppointmentReminder(INPUT, {
    env: {
      YCLOUD_API_KEY: "test-key",
      WHATSAPP_SENDER_NUMBER: "+5511961957144",
    },
    fetchImpl: async () =>
      new Response("rejected", { status: 400 }),
  });

  assert.deepEqual(result, {
    status: "failed",
    httpStatus: 400,
    errorCode: "http_error",
  });
});

test("appointment reminder never sends a template with an invented name", async () => {
  let calls = 0;
  const result = await sendYCloudAppointmentReminder(
    { ...INPUT, patientName: "Não informado" },
    {
      env: {
        YCLOUD_API_KEY: "test-key",
        WHATSAPP_SENDER_NUMBER: "+5511961957144",
      },
      fetchImpl: async () => {
        calls += 1;
        return new Response("{}", { status: 200 });
      },
    },
  );

  assert.deepEqual(result, {
    status: "skipped",
    httpStatus: null,
    errorCode: "invalid_patient_name",
  });
  assert.equal(calls, 0);
  assert.equal(appointmentReminderPatientName("Maria Silva"), "Maria");
  assert.equal(appointmentReminderPatientName("Paciente"), "");
});
