import assert from "node:assert/strict";
import test from "node:test";
import { createHmac } from "node:crypto";
import {
  ensureReviewAlertSuggestion,
  isReviewAlertConfigured,
  sendYCloudReviewAlert,
} from "./ycloud-review-alert.mjs";
import webhook from "../ycloud-webhook.mjs";

const INPUT = {
  from: "+5511961957144",
  eventId: "evt_test_01",
  patientName: "Maria Silva",
  patientPhone: "+5511900000000",
  messageText: "Preciso de orientação sobre meu atendimento.",
};

test("missing configuration skips the review alert", async () => {
  const result = await sendYCloudReviewAlert(INPUT, { env: {} });

  assert.deepEqual(result, {
    status: "skipped",
    errorCode: "configuration_missing",
  });
  assert.equal(isReviewAlertConfigured({}), false);
});

test("review alert uses the approved template shape", async () => {
  const calls = [];
  const env = {
    YCLOUD_API_KEY: "test-key",
    WHATSAPP_ALERT_NUMBER: "+5511967743374",
    YCLOUD_ALERT_TEMPLATE_NAME: "alerta_revisao_liv_v1",
    YCLOUD_ALERT_TEMPLATE_LANGUAGE: "pt_BR",
  };

  const result = await sendYCloudReviewAlert(INPUT, {
    env,
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return new Response('{"status":"accepted"}', { status: 200 });
    },
  });

  assert.equal(result.status, "completed");
  assert.equal(isReviewAlertConfigured(env), true);
  assert.equal(calls.length, 1);
  assert.equal(
    calls[0].url,
    "https://api.ycloud.com/v2/whatsapp/messages",
  );
  assert.equal(calls[0].options.headers["X-API-Key"], "test-key");

  const body = JSON.parse(calls[0].options.body);
  assert.equal(body.from, INPUT.from);
  assert.equal(body.to, env.WHATSAPP_ALERT_NUMBER);
  assert.equal(body.type, "template");
  assert.equal(body.externalId, "liv-review-evt_test_01");
  assert.equal(body.template.name, "alerta_revisao_liv_v1");
  assert.equal(body.template.language.code, "pt_BR");
  assert.deepEqual(
    body.template.components[0].parameters.map(
      (parameter) => parameter.text,
    ),
    [
      INPUT.patientName,
      INPUT.patientPhone,
      ensureReviewAlertSuggestion(INPUT),
    ],
  );
  assert.equal(calls[0].options.body.includes("test-key"), false);
});

test("review alert stays silent after a human takes over", async () => {
  const calls = [];
  const result = await sendYCloudReviewAlert(INPUT, {
    env: {
      YCLOUD_API_KEY: "test-key",
      WHATSAPP_ALERT_NUMBER: "+5511967743374",
    },
    getHumanResumeControlImpl: async () => ({
      status: "human_active",
    }),
    fetchImpl: async (...args) => {
      calls.push(args);
      return new Response('{"status":"accepted"}', {
        status: 200,
      });
    },
  });

  assert.deepEqual(result, {
    status: "skipped",
    errorCode: "human_takeover_active",
  });
  assert.equal(calls.length, 0);
});

test("review alert suppresses repeated alerts in the same patient window", async () => {
  const calls = [];
  const result = await sendYCloudReviewAlert(INPUT, {
    env: {
      YCLOUD_API_KEY: "test-key",
      WHATSAPP_ALERT_NUMBER: "+5511967743374",
    },
    getHumanResumeControlImpl: async () => null,
    claimReviewAlertSlotImpl: async () => ({
      status: "suppressed",
      reason: "same_patient_cooldown",
    }),
    fetchImpl: async (...args) => {
      calls.push(args);
      return new Response('{"status":"accepted"}', {
        status: 200,
      });
    },
  });

  assert.deepEqual(result, {
    status: "skipped",
    errorCode: "same_patient_cooldown",
  });
  assert.equal(calls.length, 0);
});

test("urgent review alert bypasses the same-patient cooldown", async () => {
  const calls = [];
  const result = await sendYCloudReviewAlert(
    {
      ...INPUT,
      urgent: true,
    },
    {
      env: {
        YCLOUD_API_KEY: "test-key",
        WHATSAPP_ALERT_NUMBER: "+5511967743374",
      },
      getHumanResumeControlImpl: async () => null,
      claimReviewAlertSlotImpl: async () => {
        throw new Error("urgent alert must not claim a cooldown slot");
      },
      fetchImpl: async (...args) => {
        calls.push(args);
        return new Response('{"status":"accepted"}', {
          status: 200,
        });
      },
    },
  );

  assert.equal(result.status, "completed");
  assert.equal(calls.length, 1);
});

test("accepted review alert is copied to Daniel by email", async () => {
  const calls = [];
  const env = {
    YCLOUD_API_KEY: "test-key",
    WHATSAPP_ALERT_NUMBER: "+5511967743374",
    GOOGLE_SHEETS_WEBHOOK_URL:
      "https://sheets.example.test/webhook",
    GOOGLE_SHEETS_WEBHOOK_SECRET: "sheets-secret",
  };

  const result = await sendYCloudReviewAlert(INPUT, {
    env,
    fetchImpl: async (url, options) => {
      calls.push({ url, options });

      if (url === env.GOOGLE_SHEETS_WEBHOOK_URL) {
        return new Response(
          '{"ok":true,"sent":true,"duplicate":false}',
          { status: 200 },
        );
      }

      return new Response('{"status":"accepted"}', {
        status: 200,
      });
    },
  });

  assert.equal(result.status, "completed");
  assert.equal(calls.length, 2);

  const emailRequest = calls.find(
    (call) => call.url === env.GOOGLE_SHEETS_WEBHOOK_URL,
  );
  const body = JSON.parse(emailRequest.options.body);

  assert.equal(body.action, "send_review_alert_email");
  assert.equal(body.secret, "sheets-secret");
  assert.equal(body.alert.eventId, INPUT.eventId);
  assert.equal(body.alert.patientName, INPUT.patientName);
  assert.equal(body.alert.patientPhone, INPUT.patientPhone);
  assert.equal(
    body.alert.messageText,
    ensureReviewAlertSuggestion(INPUT),
  );
});

test("every review alert includes one copyable suggested reply", () => {
  const enriched = ensureReviewAlertSuggestion(INPUT);

  assert.match(enriched, /Sugestão para copiar após conferir:/);
  assert.match(enriched, /Olá, Maria!/);

  const alreadyPrepared = ensureReviewAlertSuggestion({
    ...INPUT,
    messageText:
      "Horários encontrados.\nSugestão para copiar ao paciente:\nOlá, Maria!",
  });

  assert.equal(
    alreadyPrepared.match(/Sugestão para copiar/g)?.length,
    1,
  );
});

test("urgent alerts receive a safety-aware suggested reply", () => {
  const enriched = ensureReviewAlertSuggestion({
    ...INPUT,
    urgent: true,
  });

  assert.match(enriched, /revisada pela equipe/);
  assert.match(enriched, /atendimento médico de urgência/);
});

test("YCloud failure is controlled and does not throw", async () => {
  const result = await sendYCloudReviewAlert(INPUT, {
    env: {
      YCLOUD_API_KEY: "test-key",
      WHATSAPP_ALERT_NUMBER: "+5511967743374",
    },
    fetchImpl: async () => new Response("rejected", { status: 400 }),
  });

  assert.deepEqual(result, {
    status: "failed",
    httpStatus: 400,
    errorCode: "http_error",
  });
});

test("health endpoint reports the final automation switches", async () => {
  const environmentKeys = [
    "YCLOUD_API_KEY",
    "YCLOUD_WEBHOOK_SECRET",
    "GOOGLE_SHEETS_WEBHOOK_URL",
    "GOOGLE_SHEETS_WEBHOOK_SECRET",
    "OPENAI_API_KEY",
    "WHATSAPP_ALERT_NUMBER",
    "WHATSAPP_APPOINTMENT_REVIEW_ENABLED",
    "WHATSAPP_AUTOMATION_MODE",
  ];
  const savedEnvironment = Object.fromEntries(
    environmentKeys.map((key) => [key, process.env[key]]),
  );

  Object.assign(process.env, {
    YCLOUD_API_KEY: "ycloud-key",
    YCLOUD_WEBHOOK_SECRET: "webhook-secret",
    GOOGLE_SHEETS_WEBHOOK_URL:
      "https://sheets.example.test/webhook",
    GOOGLE_SHEETS_WEBHOOK_SECRET: "sheets-secret",
    OPENAI_API_KEY: "openai-key",
    WHATSAPP_ALERT_NUMBER: "+5511967743374",
    WHATSAPP_APPOINTMENT_REVIEW_ENABLED: "true",
    WHATSAPP_AUTOMATION_MODE: "active",
  });

  try {
    const response = await webhook(
      new Request("https://example.test/webhook"),
      {},
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.openAIConfigured, true);
    assert.equal(body.reviewAlertConfigured, true);
    assert.equal(body.appointmentReviewEnabled, true);
    assert.equal(body.automationMode, "active");
  } finally {
    for (const [key, value] of Object.entries(savedEnvironment)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
});

test("urgent webhook alerts Daniel and never sends to the patient", async () => {
  const environmentKeys = [
    "YCLOUD_WEBHOOK_SECRET",
    "YCLOUD_API_KEY",
    "GOOGLE_SHEETS_WEBHOOK_URL",
    "GOOGLE_SHEETS_WEBHOOK_SECRET",
    "WHATSAPP_ALERT_NUMBER",
    "YCLOUD_ALERT_TEMPLATE_NAME",
    "YCLOUD_ALERT_TEMPLATE_LANGUAGE",
    "OPENAI_API_KEY",
    "WHATSAPP_AUTOMATION_MODE",
  ];
  const savedEnvironment = Object.fromEntries(
    environmentKeys.map((key) => [key, process.env[key]]),
  );
  const originalFetch = globalThis.fetch;
  const originalLog = console.log;
  const requests = [];

  process.env.YCLOUD_WEBHOOK_SECRET = "webhook-secret";
  process.env.YCLOUD_API_KEY = "ycloud-key";
  process.env.GOOGLE_SHEETS_WEBHOOK_URL =
    "https://sheets.example.test/webhook";
  process.env.GOOGLE_SHEETS_WEBHOOK_SECRET = "sheets-secret";
  process.env.WHATSAPP_ALERT_NUMBER = "+5511967743374";
  process.env.YCLOUD_ALERT_TEMPLATE_NAME =
    "alerta_revisao_liv_v1";
  process.env.YCLOUD_ALERT_TEMPLATE_LANGUAGE = "pt_BR";
  process.env.WHATSAPP_AUTOMATION_MODE = "shadow";
  delete process.env.OPENAI_API_KEY;
  console.log = () => {};
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options });

    if (url === process.env.GOOGLE_SHEETS_WEBHOOK_URL) {
      return new Response('{"ok":true}', { status: 200 });
    }

    if (url === "https://api.ycloud.com/v2/whatsapp/messages") {
      return new Response('{"status":"accepted"}', { status: 200 });
    }

    throw new Error("unexpected destination");
  };

  try {
    const payload = {
      id: "urgent-event",
      type: "whatsapp.inbound_message.received",
      whatsappInboundMessage: {
        id: "urgent-message",
        from: "+5511900000000",
        to: "+5511961957144",
        type: "text",
        customerProfile: { name: "Maria Silva" },
        text: { body: "Estou com falta de ar e dor no peito" },
      },
    };
    const rawBody = JSON.stringify(payload);
    const timestamp = "1721908800";
    const signature = createHmac(
      "sha256",
      process.env.YCLOUD_WEBHOOK_SECRET,
    )
      .update(`${timestamp}.${rawBody}`)
      .digest("hex");
    const response = await webhook(
      new Request("http://localhost/api/ycloud/webhook", {
        method: "POST",
        headers: {
          "YCloud-Signature": `t=${timestamp},s=${signature}`,
        },
        body: rawBody,
      }),
    );
    const responseBody = await response.json();

    assert.equal(response.status, 200);
    assert.equal(responseBody.automation.route, "human_review");
    assert.equal(responseBody.automation.replyCode, "ALERT-URG-01");
    assert.equal(responseBody.reviewAlertQueued, true);
    assert.equal(requests.length, 3);
    assert.equal(
      requests[0].url,
      process.env.GOOGLE_SHEETS_WEBHOOK_URL,
    );
    assert.equal(
      requests[1].url,
      "https://api.ycloud.com/v2/whatsapp/messages",
    );
    assert.equal(
      requests[2].url,
      process.env.GOOGLE_SHEETS_WEBHOOK_URL,
    );
    assert.equal(
      JSON.parse(requests[2].options.body).action,
      "send_review_alert_email",
    );

    const alertBody = JSON.parse(requests[1].options.body);
    assert.equal(alertBody.from, "+5511961957144");
    assert.equal(alertBody.to, process.env.WHATSAPP_ALERT_NUMBER);
    assert.notEqual(alertBody.to, payload.whatsappInboundMessage.from);
  } finally {
    globalThis.fetch = originalFetch;
    console.log = originalLog;

    for (const [key, value] of Object.entries(savedEnvironment)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
