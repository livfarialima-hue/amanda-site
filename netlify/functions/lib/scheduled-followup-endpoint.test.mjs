import assert from "node:assert/strict";
import test from "node:test";
import {
  canReuseFirstFollowupSemanticReview,
  handleScheduledFollowup,
  isScheduledFollowupWindow,
} from "../scheduled-followup.mjs";

const SECRET = "shared-secret";
const PAYLOAD = {
  planId: "2026-08-03|+5511999999999|out-1|1",
  patientPhone: "+5511999999999",
  body: "Olá! Fiquei à disposição para continuar sua pesquisa.",
  humanApproved: true,
  followupStage: 1,
  contextAnchorMessageId: "out-1",
  recentConversation: [
    {
      direction: "IN",
      at: "2026-08-02T11:00:00-03:00",
      messageId: "in-1",
      text: "Gostaria de entender melhor a avaliação.",
    },
    {
      direction: "OUT",
      at: "2026-08-02T11:02:00-03:00",
      messageId: "out-1",
      text: "Claro. Posso explicar como funciona.",
    },
  ],
};

function request(body = PAYLOAD, secret = SECRET) {
  return new Request(
    "https://example.test/.netlify/functions/scheduled-followup",
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

test("scheduled follow-up stays disabled until explicitly enabled", async () => {
  const response = await handleScheduledFollowup(request(), {
    env: {
      GOOGLE_SHEETS_WEBHOOK_SECRET: SECRET,
      YCLOUD_API_KEY: "key",
    },
    now: new Date("2026-08-03T10:30:00-03:00"),
  });

  assert.equal(response.status, 503);
  assert.equal(
    (await response.json()).error,
    "scheduled_followups_disabled",
  );
});

test("scheduled follow-up sends and records the Bruna turn", async () => {
  const sent = [];
  const turns = [];
  const response = await handleScheduledFollowup(request(), {
    env: {
      GOOGLE_SHEETS_WEBHOOK_SECRET: SECRET,
      YCLOUD_API_KEY: "key",
      WHATSAPP_SCHEDULED_FOLLOWUPS_ENABLED: "true",
      WHATSAPP_AUTOMATION_MODE: "active",
    },
    now: new Date("2026-08-03T10:30:00-03:00"),
    getBusinessNumberImpl: async () => "+5511961957144",
    reviewScheduledFollowupContextImpl: async (payload) => {
      assert.equal(payload.body, PAYLOAD.body);
      assert.equal(payload.recentConversation.length, 2);
      return {
        status: "completed",
        allowed: true,
        reasonCode: "context_aligned",
      };
    },
    sendYCloudPatientTextImpl: async (payload) => {
      sent.push(payload);
      return {
        status: "completed",
        httpStatus: 200,
        errorCode: "none",
      };
    },
    appendConversationTurnImpl: async (turn) => {
      turns.push(turn);
      return { status: "completed" };
    },
  });

  assert.equal(response.status, 200);
  assert.equal((await response.json()).sent, true);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].body, PAYLOAD.body);
  assert.equal(turns.length, 1);
  assert.equal(turns[0].role, "assistant");
  assert.equal(turns[0].source, "bruna");
});

test("scheduled follow-up cancels before semantic review when the latest inbound is a sales pitch", async () => {
  let semanticReviews = 0;
  let businessNumberReads = 0;
  let sends = 0;
  const response = await handleScheduledFollowup(
    request({
      ...PAYLOAD,
      planId: "commercial-context-plan",
      recentConversation: [
        ...PAYLOAD.recentConversation,
        {
          direction: "IN",
          at: "2026-08-03T10:00:00-03:00",
          messageId: "commercial-inbound",
          text: [
            "Sou a Daniela, da The Baysse.",
            "Ajudamos clínicas a venderem mais usando os contatos do WhatsApp.",
            "Você teria 10 minutos para uma reunião com nosso analista?",
          ].join(" "),
        },
      ],
    }),
    {
      env: {
        GOOGLE_SHEETS_WEBHOOK_SECRET: SECRET,
        YCLOUD_API_KEY: "key",
        WHATSAPP_SCHEDULED_FOLLOWUPS_ENABLED: "true",
        WHATSAPP_AUTOMATION_MODE: "active",
      },
      now: new Date("2026-08-03T10:30:00-03:00"),
      reviewScheduledFollowupContextImpl: async () => {
        semanticReviews += 1;
        return {
          status: "completed",
          allowed: true,
          reasonCode: "context_aligned",
        };
      },
      getBusinessNumberImpl: async () => {
        businessNumberReads += 1;
        return "+5511961957144";
      },
      sendYCloudPatientTextImpl: async () => {
        sends += 1;
        return { status: "completed" };
      },
    },
  );

  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), {
    ok: false,
    sent: false,
    error: "semantic_context_review_required",
    semanticReason: "conversation_changed",
    ignoreReason: "commercial_solicitation_or_partnership",
  });
  assert.equal(semanticReviews, 0);
  assert.equal(businessNumberReads, 0);
  assert.equal(sends, 0);
});

test("an old conversation approved by the team uses the configured WhatsApp template", async () => {
  const templateSends = [];
  const turns = [];
  const payload = {
    ...PAYLOAD,
    planId: "old-approved-plan",
    deliveryMode: "template",
    recentConversation: PAYLOAD.recentConversation.map((turn) => ({
      ...turn,
      at: turn.direction === "IN"
        ? "2026-07-30T11:00:00-03:00"
        : "2026-07-30T11:02:00-03:00",
    })),
  };
  const response = await handleScheduledFollowup(request(payload), {
    env: {
      GOOGLE_SHEETS_WEBHOOK_SECRET: SECRET,
      YCLOUD_API_KEY: "key",
      YCLOUD_FOLLOWUP_TEMPLATE_NAME: "retomada_manual_bruna_v1",
      YCLOUD_FOLLOWUP_TEMPLATE_LANGUAGE: "pt_BR",
      WHATSAPP_SCHEDULED_FOLLOWUPS_ENABLED: "true",
      WHATSAPP_AUTOMATION_MODE: "active",
    },
    now: new Date("2026-08-03T10:30:00-03:00"),
    getBusinessNumberImpl: async () => "+5511961957144",
    reviewScheduledFollowupContextImpl: async () => ({
      status: "completed",
      allowed: true,
      reasonCode: "context_aligned",
    }),
    sendYCloudPatientTextImpl: async () => {
      assert.fail("old conversations must not use free-form text");
    },
    sendYCloudPatientFollowupTemplateImpl: async (message) => {
      templateSends.push(message);
      return {
        status: "completed",
        httpStatus: 200,
        errorCode: "none",
      };
    },
    appendConversationTurnImpl: async (turn) => {
      turns.push(turn);
      return { status: "completed" };
    },
  });

  assert.equal(response.status, 200);
  assert.equal(templateSends.length, 1);
  assert.equal(templateSends[0].body, PAYLOAD.body);
  assert.match(
    turns[0].text,
    /^Retomando nosso contato pela Clínica LIV:/,
  );
  assert.match(turns[0].text, /não receber novas mensagens/);
});

test("an old approval fails closed until the follow-up template is configured", async () => {
  const payload = {
    ...PAYLOAD,
    planId: "old-plan-without-template",
    deliveryMode: "template",
    recentConversation: PAYLOAD.recentConversation.map((turn) => ({
      ...turn,
      at: "2026-07-30T11:00:00-03:00",
    })),
  };
  const response = await handleScheduledFollowup(request(payload), {
    env: {
      GOOGLE_SHEETS_WEBHOOK_SECRET: SECRET,
      YCLOUD_API_KEY: "key",
      WHATSAPP_SCHEDULED_FOLLOWUPS_ENABLED: "true",
      WHATSAPP_AUTOMATION_MODE: "active",
    },
    now: new Date("2026-08-03T10:30:00-03:00"),
    getBusinessNumberImpl: async () => "+5511961957144",
    reviewScheduledFollowupContextImpl: async () => ({
      status: "completed",
      allowed: true,
      reasonCode: "context_aligned",
    }),
  });

  assert.equal(response.status, 503);
  assert.equal(
    (await response.json()).error,
    "followup_template_missing",
  );
});

test("approved second follow-up reuses the first review when nobody spoke later", async () => {
  const firstFollowupId = "scheduled-followup-first-plan";
  let semanticReviews = 0;
  let sends = 0;
  const payload = {
    ...PAYLOAD,
    planId: "second-plan",
    deliveryMode: "template",
    followupStage: 2,
    contextAnchorMessageId: firstFollowupId,
    recentConversation: [
      PAYLOAD.recentConversation[0],
      {
        direction: "OUT",
        at: "2026-08-24T10:00:00-03:00",
        messageId: firstFollowupId,
        text: "Oi! Queria retomar nossa conversa sobre a avaliação.",
      },
    ],
  };

  assert.equal(
    canReuseFirstFollowupSemanticReview(payload),
    true,
  );
  assert.equal(
    canReuseFirstFollowupSemanticReview({
      ...payload,
      recentConversation: payload.recentConversation.map(
        (turn, index) => index === 1
          ? { ...turn, at: "2026-08-23T14:00:00-03:00" }
          : turn,
      ),
    }),
    false,
  );

  const response = await handleScheduledFollowup(request(payload), {
    env: {
      GOOGLE_SHEETS_WEBHOOK_SECRET: SECRET,
      YCLOUD_API_KEY: "key",
      YCLOUD_FOLLOWUP_TEMPLATE_NAME: "retomada_manual_bruna_v1",
      WHATSAPP_SCHEDULED_FOLLOWUPS_ENABLED: "true",
      WHATSAPP_AUTOMATION_MODE: "active",
    },
    now: new Date("2026-08-27T10:30:00-03:00"),
    reviewScheduledFollowupContextImpl: async () => {
      semanticReviews += 1;
      return {
        status: "completed",
        allowed: false,
        reasonCode: "conversation_changed",
      };
    },
    getBusinessNumberImpl: async () => "+5511961957144",
    sendYCloudPatientFollowupTemplateImpl: async () => {
      sends += 1;
      return {
        status: "completed",
        httpStatus: 200,
        errorCode: "none",
      };
    },
    appendConversationTurnImpl: async () => ({
      status: "completed",
    }),
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    ok: true,
    sent: true,
    semanticReview: "reused_after_no_intervening_turn",
  });
  assert.equal(semanticReviews, 0);
  assert.equal(sends, 1);
});

test("patient or human activity after the first follow-up requires a fresh review", async () => {
  const firstFollowupId = "scheduled-followup-first-plan";
  const laterTurns = [
    {
      direction: "IN",
      at: "2026-08-03T11:00:00-03:00",
      messageId: "patient-reply",
      text: "Vou pensar e depois retorno.",
    },
    {
      direction: "OUT",
      at: "2026-08-03T11:00:00-03:00",
      messageId: "human-reply",
      text: "Vou confirmar uma informação com a equipe.",
    },
  ];

  for (const laterTurn of laterTurns) {
    let semanticReviews = 0;
    let sends = 0;
    const payload = {
      ...PAYLOAD,
      planId: `second-plan-${laterTurn.direction}`,
      deliveryMode: "template",
      followupStage: 2,
      contextAnchorMessageId: firstFollowupId,
      recentConversation: [
        PAYLOAD.recentConversation[0],
        {
          direction: "OUT",
          at: "2026-08-24T10:00:00-03:00",
          messageId: firstFollowupId,
          text: "Oi! Queria retomar nossa conversa sobre a avaliação.",
        },
        laterTurn,
      ],
    };

    assert.equal(
      canReuseFirstFollowupSemanticReview(payload),
      false,
    );

    const response = await handleScheduledFollowup(request(payload), {
      env: {
        GOOGLE_SHEETS_WEBHOOK_SECRET: SECRET,
        YCLOUD_API_KEY: "key",
        YCLOUD_FOLLOWUP_TEMPLATE_NAME: "retomada_manual_bruna_v1",
        WHATSAPP_SCHEDULED_FOLLOWUPS_ENABLED: "true",
        WHATSAPP_AUTOMATION_MODE: "active",
      },
      now: new Date("2026-08-27T10:30:00-03:00"),
      reviewScheduledFollowupContextImpl: async () => {
        semanticReviews += 1;
        return {
          status: "completed",
          allowed: false,
          reasonCode: "conversation_changed",
        };
      },
      sendYCloudPatientTextImpl: async () => {
        sends += 1;
        return { status: "completed" };
      },
    });

    assert.equal(response.status, 409);
    assert.equal(semanticReviews, 1);
    assert.equal(sends, 0);
  }
});

test("scheduled follow-up is blocked when semantic review finds changed context", async () => {
  let sends = 0;
  let businessNumberReads = 0;
  const response = await handleScheduledFollowup(request(), {
    env: {
      GOOGLE_SHEETS_WEBHOOK_SECRET: SECRET,
      YCLOUD_API_KEY: "key",
      OPENAI_API_KEY: "openai-key",
      WHATSAPP_SCHEDULED_FOLLOWUPS_ENABLED: "true",
      WHATSAPP_AUTOMATION_MODE: "active",
    },
    now: new Date("2026-08-03T10:30:00-03:00"),
    reviewScheduledFollowupContextImpl: async () => ({
      status: "completed",
      allowed: false,
      reasonCode: "patient_paused",
    }),
    getBusinessNumberImpl: async () => {
      businessNumberReads += 1;
      return "+5511961957144";
    },
    sendYCloudPatientTextImpl: async () => {
      sends += 1;
      return { status: "completed" };
    },
  });

  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), {
    ok: false,
    sent: false,
    error: "semantic_context_review_required",
    semanticReason: "patient_paused",
  });
  assert.equal(businessNumberReads, 0);
  assert.equal(sends, 0);
});

test("scheduled follow-up fails closed when semantic review is unavailable", async () => {
  let sends = 0;
  const response = await handleScheduledFollowup(request(), {
    env: {
      GOOGLE_SHEETS_WEBHOOK_SECRET: SECRET,
      YCLOUD_API_KEY: "key",
      WHATSAPP_SCHEDULED_FOLLOWUPS_ENABLED: "true",
      WHATSAPP_AUTOMATION_MODE: "active",
    },
    now: new Date("2026-08-03T10:30:00-03:00"),
    reviewScheduledFollowupContextImpl: async () => ({
      status: "failed",
      allowed: false,
      errorCode: "timeout",
    }),
    sendYCloudPatientTextImpl: async () => {
      sends += 1;
      return { status: "completed" };
    },
  });

  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    ok: false,
    sent: false,
    error: "semantic_context_review_unavailable",
    semanticReason: "timeout",
  });
  assert.equal(sends, 0);
});

test("scheduled follow-up rejects night sends and invalid secrets", async () => {
  const wrongSecret = await handleScheduledFollowup(
    request(PAYLOAD, "wrong"),
    {
      env: {
        GOOGLE_SHEETS_WEBHOOK_SECRET: SECRET,
        YCLOUD_API_KEY: "key",
        WHATSAPP_SCHEDULED_FOLLOWUPS_ENABLED: "true",
        WHATSAPP_AUTOMATION_MODE: "active",
      },
      now: new Date("2026-08-03T10:30:00-03:00"),
    },
  );
  const night = await handleScheduledFollowup(request(), {
    env: {
      GOOGLE_SHEETS_WEBHOOK_SECRET: SECRET,
      YCLOUD_API_KEY: "key",
      WHATSAPP_SCHEDULED_FOLLOWUPS_ENABLED: "true",
      WHATSAPP_AUTOMATION_MODE: "active",
    },
    now: new Date("2026-08-03T22:00:00-03:00"),
  });

  assert.equal(wrongSecret.status, 401);
  assert.equal(night.status, 409);
  assert.equal(
    isScheduledFollowupWindow(
      new Date("2026-08-03T18:59:00-03:00"),
    ),
    true,
  );
  assert.equal(
    isScheduledFollowupWindow(
      new Date("2026-08-03T19:00:00-03:00"),
    ),
    false,
  );
});

test("the global automation switch blocks a scheduled follow-up", async () => {
  let sends = 0;
  const response = await handleScheduledFollowup(request(), {
    env: {
      GOOGLE_SHEETS_WEBHOOK_SECRET: SECRET,
      YCLOUD_API_KEY: "key",
      WHATSAPP_SCHEDULED_FOLLOWUPS_ENABLED: "true",
      WHATSAPP_AUTOMATION_MODE: "off",
    },
    now: new Date("2026-08-03T10:30:00-03:00"),
    sendYCloudPatientTextImpl: async () => {
      sends += 1;
      return { status: "completed" };
    },
  });

  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    ok: false,
    sent: false,
    error: "automation_inactive",
    automationMode: "off",
  });
  assert.equal(sends, 0);
});
