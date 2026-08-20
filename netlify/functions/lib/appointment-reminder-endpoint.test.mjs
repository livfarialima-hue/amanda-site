import assert from "node:assert/strict";
import test from "node:test";
import {
  handleAppointmentReminder,
  isAppointmentReminderWindow,
} from "../appointment-reminder.mjs";

const ENV = {
  GOOGLE_SHEETS_WEBHOOK_SECRET: "shared-secret",
  WHATSAPP_APPOINTMENT_REMINDERS_ENABLED: "true",
  WHATSAPP_AUTOMATION_MODE: "active",
  YCLOUD_API_KEY: "ycloud-key",
  WHATSAPP_SENDER_NUMBER: "+5511961957144",
};

const BODY = {
  appointmentId: "consulta-42",
  reminderKind: "same_day",
  patientPhone: "+5511999999999",
  patientName: "Maria",
  professional: "Dra. Amanda",
  appointmentDate: "30/07/2026",
  appointmentTime: "14:30",
  location: "na Clínica LIV Faria Lima",
};

function request(body = BODY, secret = "shared-secret") {
  return new Request(
    "https://example.test/.netlify/functions/appointment-reminder",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-liv-secret": secret,
      },
      body: JSON.stringify(body),
    },
  );
}

test("endpoint rejects calls without the shared secret", async () => {
  const response = await handleAppointmentReminder(
    request(BODY, "wrong"),
    {
      env: ENV,
      now: new Date("2026-07-28T13:00:00.000Z"),
    },
  );

  assert.equal(response.status, 401);
  assert.equal((await response.json()).error, "unauthorized");
});

test("endpoint never sends reminders overnight", async () => {
  assert.equal(
    isAppointmentReminderWindow(
      new Date("2026-07-28T11:59:59.000Z"),
    ),
    false,
  );
  assert.equal(
    isAppointmentReminderWindow(
      new Date("2026-07-28T12:00:00.000Z"),
    ),
    true,
  );
  assert.equal(
    isAppointmentReminderWindow(
      new Date("2026-07-28T22:00:00.000Z"),
    ),
    false,
  );
});

test("endpoint sends a valid reminder once enabled", async () => {
  const calls = [];
  const response = await handleAppointmentReminder(request(), {
    env: ENV,
    now: new Date("2026-07-28T13:00:00.000Z"),
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return new Response('{"status":"accepted"}', {
        status: 200,
      });
    },
    getBusinessNumberImpl: async () =>
      "+5511961957144",
  });

  assert.equal(response.status, 200);
  assert.equal((await response.json()).sent, true);
  assert.equal(calls.length, 1);
});

test("endpoint remains closed until explicitly enabled", async () => {
  const response = await handleAppointmentReminder(request(), {
    env: {
      ...ENV,
      WHATSAPP_APPOINTMENT_REMINDERS_ENABLED: "false",
    },
    now: new Date("2026-07-28T13:00:00.000Z"),
  });

  assert.equal(response.status, 503);
  assert.equal(
    (await response.json()).error,
    "reminders_disabled",
  );
});

test("the global automation switch blocks appointment reminders", async () => {
  let calls = 0;
  const response = await handleAppointmentReminder(request(), {
    env: {
      ...ENV,
      WHATSAPP_AUTOMATION_MODE: "off",
    },
    now: new Date("2026-07-28T13:00:00.000Z"),
    fetchImpl: async () => {
      calls += 1;
      return new Response("{}", { status: 200 });
    },
  });

  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    ok: false,
    sent: false,
    error: "automation_inactive",
    automationMode: "off",
  });
  assert.equal(calls, 0);
});
