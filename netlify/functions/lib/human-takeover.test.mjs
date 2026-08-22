import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import webhook, {
  isSemanticHumanContextContinuationCandidate,
} from "../ycloud-webhook.mjs";

const WEBHOOK_SECRET = "webhook-test-secret";
const SHEETS_URL = "https://sheets.example.test/webhook";
const PATIENT_PHONE = "+5511967743374";

function signedRequest(payload) {
  const rawBody = JSON.stringify(payload);
  const timestamp = "1721908800";
  const signature = createHmac("sha256", WEBHOOK_SECRET)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");

  return new Request("http://localhost/api/ycloud/webhook", {
    method: "POST",
    headers: {
      "YCloud-Signature": `t=${timestamp},s=${signature}`,
    },
    body: rawBody,
  });
}

test("a short answer to a human information offer is an immediate AI candidate", () => {
  const context = [
    {
      role: "assistant",
      source: "equipe_humana",
      text: "Quer que eu te explique como funciona a consulta com ela?",
    },
  ];
  const base = {
    patientAutomationReady: true,
    humanTakeoverActive: true,
    professional: "amanda",
    messageType: "text",
    text: "Sim",
    recentConversation: context,
    exactDuplicate: false,
    protectedAppointmentContinuation: false,
    professionalFactReview: null,
    patientRelationship: {},
  };

  assert.equal(
    isSemanticHumanContextContinuationCandidate(base),
    true,
  );
  assert.equal(
    isSemanticHumanContextContinuationCandidate({
      ...base,
      text: "Pode sim",
    }),
    true,
  );
  assert.equal(
    isSemanticHumanContextContinuationCandidate({
      ...base,
      text: "Como funciona?",
    }),
    true,
  );
  assert.equal(
    isSemanticHumanContextContinuationCandidate({
      ...base,
      text: "Como funciona?",
      recentConversation: [
        {
          role: "assistant",
          source: "equipe_humana",
          text: "Recebi sua mensagem e a equipe continuará por aqui.",
        },
      ],
    }),
    false,
  );
  assert.equal(
    isSemanticHumanContextContinuationCandidate({
      ...base,
      protectedAppointmentContinuation: true,
    }),
    false,
  );
  assert.equal(
    isSemanticHumanContextContinuationCandidate({
      ...base,
      text: "Obrigada!",
    }),
    false,
  );
});

test("manual SMB echo keeps semantic assessment but suppresses patient replies for the day", async () => {
  const environmentKeys = [
    "YCLOUD_WEBHOOK_SECRET",
    "GOOGLE_SHEETS_WEBHOOK_URL",
    "GOOGLE_SHEETS_WEBHOOK_SECRET",
    "OPENAI_API_KEY",
    "WHATSAPP_AUTOMATION_MODE",
    "WHATSAPP_ALERT_NUMBER",
  ];
  const savedEnvironment = Object.fromEntries(
    environmentKeys.map((key) => [key, process.env[key]]),
  );
  const originalFetch = globalThis.fetch;
  const originalLog = console.log;
  const sheetActions = [];
  let openAiCalls = 0;

  process.env.YCLOUD_WEBHOOK_SECRET = WEBHOOK_SECRET;
  process.env.GOOGLE_SHEETS_WEBHOOK_URL = SHEETS_URL;
  process.env.GOOGLE_SHEETS_WEBHOOK_SECRET = "sheets-test-secret";
  process.env.OPENAI_API_KEY = "openai-test-key";
  process.env.WHATSAPP_AUTOMATION_MODE = "shadow";
  delete process.env.WHATSAPP_ALERT_NUMBER;
  console.log = () => {};

  globalThis.fetch = async (url, options) => {
    if (url === SHEETS_URL) {
      const body = JSON.parse(options.body);
      sheetActions.push(body);

      if (body.action === "mark_human_takeover") {
        return new Response(
          JSON.stringify({
            ok: true,
            marked: true,
            created: true,
          }),
          { status: 200 },
        );
      }

      if (body.action === "append_lead") {
        return new Response(
          JSON.stringify({
            ok: true,
            inserted: false,
            updated: true,
            duplicate: false,
            duplicateReason: null,
            humanTakeoverToday: true,
          }),
          { status: 200 },
        );
      }
    }

    if (url === "https://api.openai.com/v1/responses") {
      openAiCalls += 1;
      return new Response(
        JSON.stringify({
          model: "test-model",
          output_text: JSON.stringify({
            route: "ignore",
            confidence: "high",
            automaticAllowed: false,
            urgent: false,
            professional: "amanda",
            procedure: "",
            replyCode: "",
            suggestedReply: "",
            reviewReason: "conversation_closed:thanks",
            conversationState: {
              activeTopic: "agradecimento",
              patientAct: "thanks",
              refersToEventId: "",
              lastClinicQuestion: "",
              lastClinicOffer: "",
              unresolvedQuestions: [],
              factsAlreadyProvided: [],
              owner: "equipe_humana",
              nextExpectedAction: "aguardar nova mensagem",
              ambiguity: "",
              contextConfidence: "high",
            },
          }),
          usage: {
            input_tokens: 10,
            output_tokens: 10,
            total_tokens: 20,
          },
        }),
        { status: 200 },
      );
    }

    throw new Error(`unexpected destination: ${url}`);
  };

  try {
    const echoResponse = await webhook(
      signedRequest({
        id: "echo-event",
        type: "whatsapp.smb.message.echoes",
        createTime: "2026-07-26T15:04:09.483Z",
        whatsappMessage: {
          id: "echo-message",
          wamid: "wamid.echo-message",
          status: "sent",
          from: "+5511961957144",
          to: PATIENT_PHONE,
          type: "text",
          text: { body: "Assumi a conversa" },
          sendTime: "2026-07-26T15:04:08.000Z",
        },
      }),
    );
    const echoBody = await echoResponse.json();

    assert.equal(echoResponse.status, 200);
    assert.equal(echoBody.humanTakeoverRecorded, true);
    assert.equal(echoBody.takeoverCreated, true);
    assert.equal(sheetActions[0].action, "mark_human_takeover");
    assert.equal(sheetActions[0].takeover.phone, PATIENT_PHONE);
    assert.equal(
      sheetActions[0].takeover.text,
      "Assumi a conversa",
    );

    const inboundResponse = await webhook(
      signedRequest({
        id: "inbound-event",
        type: "whatsapp.inbound_message.received",
        createTime: "2026-07-26T15:10:00.000Z",
        whatsappInboundMessage: {
          id: "inbound-message",
          wamid: "wamid.inbound-message",
          from: PATIENT_PHONE,
          to: "+5511961957144",
          type: "text",
          text: { body: "Obrigada" },
          sendTime: "2026-07-26T15:10:00.000Z",
        },
      }),
    );
    const inboundBody = await inboundResponse.json();

    assert.equal(inboundResponse.status, 200);
    assert.equal(inboundBody.humanTakeoverToday, true);
    assert.equal(inboundBody.automation.route, "human_takeover_active");
    assert.equal(inboundBody.automation.replyCode, "HUMAN-DAY-01");
    assert.equal(inboundBody.aiShadowQueued, true);
    assert.equal(openAiCalls, 1);
  } finally {
    globalThis.fetch = originalFetch;
    console.log = originalLog;

    for (const [key, value] of Object.entries(savedEnvironment)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("a structured Amanda receipt is booked before a failing takeover write", async () => {
  const patientPhone = "+5511900004567";
  const environmentKeys = [
    "YCLOUD_WEBHOOK_SECRET",
    "GOOGLE_SHEETS_WEBHOOK_URL",
    "GOOGLE_SHEETS_WEBHOOK_SECRET",
    "WHATSAPP_ALERT_NUMBER",
  ];
  const savedEnvironment = Object.fromEntries(
    environmentKeys.map((key) => [key, process.env[key]]),
  );
  const originalFetch = globalThis.fetch;
  const originalLog = console.log;
  const sheetActions = [];

  process.env.YCLOUD_WEBHOOK_SECRET = WEBHOOK_SECRET;
  process.env.GOOGLE_SHEETS_WEBHOOK_URL = SHEETS_URL;
  process.env.GOOGLE_SHEETS_WEBHOOK_SECRET = "sheets-test-secret";
  delete process.env.WHATSAPP_ALERT_NUMBER;
  console.log = () => {};

  globalThis.fetch = async (url, options) => {
    if (url !== SHEETS_URL) {
      throw new Error(`unexpected destination: ${url}`);
    }

    const body = JSON.parse(options.body);
    sheetActions.push(body);

    if (body.action === "reserve_appointment_slot") {
      return new Response(
        JSON.stringify({
          ok: true,
          reserved: true,
          appointmentId: body.appointment.appointmentId,
          room: "Sala 1",
          calendarSynced: true,
        }),
        { status: 200 },
      );
    }

    if (body.action === "send_review_alert_email") {
      return new Response(
        JSON.stringify({ ok: true, sent: true }),
        { status: 200 },
      );
    }

    if (body.action === "mark_human_takeover") {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "internal_error_unknown",
        }),
        { status: 504 },
      );
    }

    throw new Error(`unexpected sheet action: ${body.action}`);
  };

  try {
    const response = await webhook(
      signedRequest({
        id: "procedure-receipt-event",
        type: "whatsapp.smb.message.echoes",
        createTime: "2026-08-17T15:42:00.000Z",
        whatsappMessage: {
          id: "procedure-receipt-message",
          wamid: "wamid.procedure-receipt-message",
          status: "sent",
          from: "+5511961957144",
          to: patientPhone,
          type: "text",
          text: {
            body: `Comprovante de Agendamento:
Nome: Paciente Procedimento
Data: 20/08/2026 - 5ª Feira
Horário: 10h00
Médico: Dra. Amanda Schroeder
Endereço: Rua Pais Leme, 215, Conjunto 710, Pinheiros, São Paulo - SP
Retorno: não se aplica

Valor da consulta: R$ 0,00
Formas de pagamento: não se aplica

Atenciosamente, Bruna`,
          },
          sendTime: "2026-08-17T15:42:00.000Z",
        },
      }),
    );
    const body = await response.json();

    assert.equal(response.status, 502);
    assert.equal(body.error, "takeover_delivery_failed");
    assert.equal(body.appointmentSyncStatus, "completed");
    assert.equal(
      body.appointmentId,
      "manual-wamid.procedure-receipt-message",
    );
    assert.deepEqual(
      sheetActions.map(({ action }) => action),
      [
        "reserve_appointment_slot",
        "mark_human_takeover",
      ],
    );
    assert.equal(
      sheetActions[0].appointment.consultationType,
      "Procedimento",
    );
    assert.equal(
      sheetActions[0].appointment.professional,
      "Dra. Amanda",
    );
  } finally {
    globalThis.fetch = originalFetch;
    console.log = originalLog;

    for (const [key, value] of Object.entries(savedEnvironment)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("attendance confirmation after a human reminder updates the appointment and stays silent", async () => {
  const patientPhone = "+5511900004321";
  const environmentKeys = [
    "YCLOUD_WEBHOOK_SECRET",
    "GOOGLE_SHEETS_WEBHOOK_URL",
    "GOOGLE_SHEETS_WEBHOOK_SECRET",
    "OPENAI_API_KEY",
    "WHATSAPP_AUTOMATION_MODE",
    "WHATSAPP_ALERT_NUMBER",
  ];
  const savedEnvironment = Object.fromEntries(
    environmentKeys.map((key) => [key, process.env[key]]),
  );
  const originalFetch = globalThis.fetch;
  const originalLog = console.log;
  const sheetActions = [];
  let patientFacingCalls = 0;

  process.env.YCLOUD_WEBHOOK_SECRET = WEBHOOK_SECRET;
  process.env.GOOGLE_SHEETS_WEBHOOK_URL = SHEETS_URL;
  process.env.GOOGLE_SHEETS_WEBHOOK_SECRET = "sheets-test-secret";
  process.env.OPENAI_API_KEY = "openai-test-key";
  process.env.WHATSAPP_AUTOMATION_MODE = "active";
  delete process.env.WHATSAPP_ALERT_NUMBER;
  console.log = () => {};

  globalThis.fetch = async (url, options) => {
    if (url === SHEETS_URL) {
      const body = JSON.parse(options.body);
      sheetActions.push(body);

      if (body.action === "append_lead") {
        return new Response(
          JSON.stringify({
            ok: true,
            inserted: false,
            updated: true,
            duplicate: false,
            humanTakeoverToday: true,
            patientRelationship: {
              found: true,
              state: "appointment_scheduled",
            },
          }),
          { status: 200 },
        );
      }

      return new Response(
        JSON.stringify({
          ok: true,
          marked: true,
          created: true,
          updated: true,
          reserved: true,
          sent: true,
        }),
        { status: 200 },
      );
    }

    if (
      url === "https://api.openai.com/v1/responses" ||
      url === "https://api.ycloud.com/v2/whatsapp/messages"
    ) {
      patientFacingCalls += 1;
      throw new Error("attendance confirmation must stay silent");
    }

    throw new Error(`unexpected destination: ${url}`);
  };

  try {
    await webhook(
      signedRequest({
        id: "attendance-reminder-echo",
        type: "whatsapp.smb.message.echoes",
        createTime: "2026-08-13T12:41:00.000Z",
        whatsappMessage: {
          id: "attendance-reminder-message",
          wamid: "wamid.attendance-reminder-message",
          status: "sent",
          from: "+5511961957144",
          to: patientPhone,
          type: "text",
          text: {
            body:
              "Bom dia, tudo bem? Você tem um horário agendado com a Dra. Amanda hoje às 15:00. Posso confirmar sua presença?",
          },
          sendTime: "2026-08-13T12:41:00.000Z",
        },
      }),
    );

    const inboundResponse = await webhook(
      signedRequest({
        id: "attendance-confirmation-inbound",
        type: "whatsapp.inbound_message.received",
        createTime: "2026-08-13T12:59:00.000Z",
        whatsappInboundMessage: {
          id: "attendance-confirmation-message",
          wamid: "wamid.attendance-confirmation-message",
          from: patientPhone,
          to: "+5511961957144",
          type: "text",
          text: { body: "Bom dia! Pode sim" },
          sendTime: "2026-08-13T12:59:00.000Z",
        },
      }),
    );
    const inboundBody = await inboundResponse.json();

    assert.equal(inboundResponse.status, 200);
    assert.equal(inboundBody.appointmentReplyDetected, true);
    assert.equal(inboundBody.appointmentReplyState, "confirmed");
    assert.equal(inboundBody.appointmentReplySyncStatus, "completed");
    assert.equal(inboundBody.aiShadowQueued, false);
    assert.equal(inboundBody.aiActiveQueued, false);
    assert.equal(patientFacingCalls, 0);
    assert.equal(
      sheetActions.some(
        (action) => action.action === "update_appointment_status",
      ),
      true,
    );
  } finally {
    globalThis.fetch = originalFetch;
    console.log = originalLog;

    for (const [key, value] of Object.entries(savedEnvironment)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("WhatsApp Business automatic greeting does not mark human takeover", async () => {
  const savedSecret = process.env.YCLOUD_WEBHOOK_SECRET;
  const originalFetch = globalThis.fetch;
  const originalLog = console.log;
  let downstreamCalls = 0;

  process.env.YCLOUD_WEBHOOK_SECRET = WEBHOOK_SECRET;
  console.log = () => {};
  globalThis.fetch = async () => {
    downstreamCalls += 1;
    throw new Error("automatic greeting must not reach downstream services");
  };

  try {
    const response = await webhook(
      signedRequest({
        id: "automatic-greeting-event",
        type: "whatsapp.smb.message.echoes",
        createTime: "2026-07-27T21:30:00.000Z",
        whatsappMessage: {
          id: "automatic-greeting-message",
          wamid: "wamid.automatic-greeting-message",
          status: "sent",
          from: "+5511961957144",
          to: PATIENT_PHONE,
          type: "text",
          text: { body: "Oi! Como podemos ajudar?" },
          sendTime: "2026-07-27T21:29:59.000Z",
        },
      }),
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.received, true);
    assert.equal(body.ignored, true);
    assert.equal(
      body.ignoreReason,
      "whatsapp_business_automatic_greeting",
    );
    assert.equal(downstreamCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
    console.log = originalLog;

    if (savedSecret === undefined) {
      delete process.env.YCLOUD_WEBHOOK_SECRET;
    } else {
      process.env.YCLOUD_WEBHOOK_SECRET = savedSecret;
    }
  }
});

test("Dr. Henrique appointment echo preserves history and never takes over Amanda scheduling", async () => {
  const environmentKeys = [
    "YCLOUD_WEBHOOK_SECRET",
    "GOOGLE_SHEETS_WEBHOOK_URL",
    "GOOGLE_SHEETS_WEBHOOK_SECRET",
  ];
  const savedEnvironment = Object.fromEntries(
    environmentKeys.map((key) => [key, process.env[key]]),
  );
  const originalFetch = globalThis.fetch;
  const originalLog = console.log;
  const sheetActions = [];

  process.env.YCLOUD_WEBHOOK_SECRET = WEBHOOK_SECRET;
  process.env.GOOGLE_SHEETS_WEBHOOK_URL = SHEETS_URL;
  process.env.GOOGLE_SHEETS_WEBHOOK_SECRET = "sheets-test-secret";
  console.log = () => {};
  globalThis.fetch = async (url, options) => {
    if (url !== SHEETS_URL) {
      throw new Error(`unexpected destination: ${url}`);
    }
    const body = JSON.parse(options.body);
    sheetActions.push(body);
    return new Response(
      JSON.stringify({ ok: true, preserved: true }),
      { status: 200 },
    );
  };

  try {
    const response = await webhook(
      signedRequest({
        id: "henrique-appointment-echo",
        type: "whatsapp.smb.message.echoes",
        createTime: "2026-08-03T14:41:00.000Z",
        whatsappMessage: {
          id: "henrique-appointment-message",
          wamid: "wamid.henrique-appointment-message",
          status: "sent",
          from: "+5511961957144",
          to: PATIENT_PHONE,
          type: "text",
          text: {
            body:
              "Agendamento confirmado. Nome: Jacqueline. Data: 05/08/2026. Horário: 16h00. Médico: Dr. Henrique Lane Staniak.",
          },
          sendTime: "2026-08-03T14:41:00.000Z",
        },
      }),
    );
    const body = await response.json();

    assert.equal(body.ignored, true);
    assert.equal(
      body.ignoreReason,
      "external_professional_appointment",
    );
    const cleanupActions = sheetActions.filter(
      (action) =>
        action.action ===
        "record_external_professional_contact",
    );
    assert.equal(cleanupActions.length, 1);
    assert.equal(
      sheetActions.some(
        (action) => action.action === "mark_human_takeover",
      ),
      false,
    );
    assert.equal(
      cleanupActions[0].action,
      "record_external_professional_contact",
    );
    assert.equal(cleanupActions[0].contact.phone, PATIENT_PHONE);
  } finally {
    globalThis.fetch = originalFetch;
    console.log = originalLog;
    for (const [key, value] of Object.entries(savedEnvironment)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
