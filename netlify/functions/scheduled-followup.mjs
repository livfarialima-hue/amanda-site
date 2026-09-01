import { timingSafeEqual } from "node:crypto";
import { getBusinessNumber } from "./lib/business-number-registry.mjs";
import { appendConversationTurn } from "./lib/conversation-memory.mjs";
import {
  reviewScheduledFollowupContext,
} from "./lib/scheduled-followup-context-review.mjs";
import {
  allowsPatientSideEffects,
  normalizeAutomationMode,
} from "./lib/automation-mode.mjs";
import {
  latestInboundIsCommercialSolicitation,
} from "./lib/commercial-contact.mjs";
import {
  renderYCloudFollowupTemplateText,
  sendYCloudPatientFollowupTemplate,
  sendYCloudPatientText,
} from "./lib/ycloud-patient-message.mjs";

const TIMEZONE = "America/Sao_Paulo";
const FIRST_FOLLOWUP_SEMANTIC_REVIEW_BASELINE = Date.parse(
  "2026-08-23T14:40:44-03:00",
);
const CUSTOMER_SERVICE_WINDOW_MINUTES = 1430;

const SIMPLE_FOLLOWUP_PROCEDURES = Object.freeze([
  ["cervical", /\b(cervicoplastia|lifting cervical|lipo de papada)\b/],
  ["facial", /\b(lifting facial|minilifting|minilift)\b/],
  ["blefaroplastia", /\b(blefaroplastia|cirurgia das palpebras)\b/],
  ["otoplastia", /\b(otoplastia|cirurgia das orelhas)\b/],
  ["rinoplastia", /\b(rinoplastia|cirurgia do nariz)\b/],
]);

const SIMPLE_FOLLOWUP_PROCEDURE_PHRASES = Object.freeze({
  cervical: Object.freeze([
    "cervicoplastia lifting cervical",
    "cervicoplastia",
    "lifting cervical",
    "lipo de papada",
  ]),
  facial: Object.freeze([
    "lifting facial",
    "minilifting",
    "minilift",
  ]),
  blefaroplastia: Object.freeze([
    "blefaroplastia",
    "cirurgia das palpebras",
  ]),
  otoplastia: Object.freeze([
    "otoplastia",
    "cirurgia das orelhas",
  ]),
  rinoplastia: Object.freeze([
    "rinoplastia",
    "cirurgia do nariz",
  ]),
});

const SIMPLE_FOLLOWUP_SENSITIVE_PATTERN =
  /\b(dor|sangr|ferid|infecc|febre|medic|remedio|diagnostic|cancer|gravidez|urgent|emergenc|complic|risco|anestesia|laudo|exame|foto|imagem|pos operator|pre operator|contraindic|doenca|alerg|pressao|diabet|cardiac|hospital|internad|valor|preco|orcamento)\b/;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function secureEqual(left, right) {
  const leftBuffer = Buffer.from(String(left || ""));
  const rightBuffer = Buffer.from(String(right || ""));

  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

function localHour(date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  return Number(parts.find((part) => part.type === "hour")?.value);
}

export function isScheduledFollowupWindow(date = new Date()) {
  const hour = localHour(date);
  return Number.isFinite(hour) && hour >= 9 && hour < 19;
}

function normalizePayload(value) {
  const body =
    value && typeof value === "object" && !Array.isArray(value)
      ? value
      : {};

  return {
    planId: String(body.planId || "").trim().slice(0, 160),
    patientPhone: String(body.patientPhone || "").trim(),
    body: Array.from(String(body.body || "").trim())
      .slice(0, 1500)
      .join(""),
    humanApproved: body.humanApproved === true,
    deliveryMode:
      String(body.deliveryMode || "").trim().toLowerCase() ===
      "template"
        ? "template"
        : "text",
    followupStage: [1, 2].includes(Number(body.followupStage))
      ? Number(body.followupStage)
      : 0,
    contextAnchorMessageId: String(
      body.contextAnchorMessageId || "",
    ).trim().slice(0, 300),
    recentConversation: Array.isArray(body.recentConversation)
      ? body.recentConversation.slice(-20).map((turn) => ({
          direction:
            String(turn?.direction || "").toUpperCase() === "OUT"
              ? "OUT"
              : "IN",
          at: String(turn?.at || "").trim().slice(0, 40),
          messageId: String(turn?.messageId || "")
            .trim()
            .slice(0, 300),
          text: Array.from(String(turn?.text || "").trim())
            .slice(0, 1200)
            .join(""),
        }))
      : [],
    leadContext: {
      status: String(body.leadContext?.status || "")
        .trim()
        .slice(0, 120),
      summary: Array.from(
        String(body.leadContext?.summary || "").trim(),
      ).slice(0, 600).join(""),
      nextAction: Array.from(
        String(body.leadContext?.nextAction || "").trim(),
      ).slice(0, 300).join(""),
    },
  };
}

function hasOpenCustomerServiceWindow(payload, now) {
  const lastInbound = payload.recentConversation
    .slice()
    .reverse()
    .find((turn) => turn.direction === "IN");
  const inboundAt = Date.parse(String(lastInbound?.at || ""));

  if (!Number.isFinite(inboundAt)) return false;

  const elapsedMinutes = Math.floor(
    (now.getTime() - inboundAt) / 60_000,
  );
  return (
    elapsedMinutes >= 0 &&
    elapsedMinutes <= CUSTOMER_SERVICE_WINDOW_MINUTES
  );
}

function normalizeSimpleFollowupText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function identifySimpleFollowupProcedure(text) {
  const normalized = normalizeSimpleFollowupText(text);
  return (
    SIMPLE_FOLLOWUP_PROCEDURES.find(([, pattern]) =>
      pattern.test(normalized),
    )?.[0] || ""
  );
}

function stripSimpleFollowupOperationalSuffix(value) {
  return String(value || "").replace(
    /\b(?:ref(?:er[eê]ncia)?\.?|jid)\s*:?.*$/iu,
    "",
  );
}

function isExactGenericProcedureInterest(text, procedure) {
  const normalized = normalizeSimpleFollowupText(
    stripSimpleFollowupOperationalSuffix(text),
  );
  const withoutGreeting = normalized.replace(/^ola\s+/, "");
  const phrases = SIMPLE_FOLLOWUP_PROCEDURE_PHRASES[procedure] || [];

  return phrases.some((phrase) =>
    [
      `quero saber sobre ${phrase}`,
      `quero saber sobre ${phrase} com a dra amanda`,
      `tenho interesse em ${phrase}`,
      `tenho interesse em ${phrase} com a dra amanda`,
      `tenho interesse em ${phrase} e gostaria de entender melhor como funciona a avaliacao`,
      `tenho interesse em ${phrase} com a dra amanda e gostaria de entender melhor como funciona a avaliacao`,
    ].includes(withoutGreeting),
  );
}

function isExactSimpleProcedureFollowup(text, procedure) {
  const normalized = normalizeSimpleFollowupText(text);
  const phrases = SIMPLE_FOLLOWUP_PROCEDURE_PHRASES[procedure] || [];

  return phrases.some((phrase) =>
    normalized ===
      `ola queria retomar nossa conversa sobre ${phrase} ficou alguma duvida que eu possa esclarecer para voce se preferir tambem posso explicar como funciona a avaliacao com a dra amanda para voce entender esse proximo passo com calma`,
  );
}

export function isSimpleUnansweredProcedureInterestFollowup(payload) {
  if (
    payload?.followupStage !== 1 ||
    payload?.humanApproved === true ||
    payload?.deliveryMode !== "text"
  ) {
    return false;
  }

  const conversation = Array.isArray(payload.recentConversation)
    ? payload.recentConversation
    : [];
  if (conversation.length !== 2) return false;

  const [inbound, outbound] = conversation;
  if (
    inbound?.direction !== "IN" ||
    outbound?.direction !== "OUT" ||
    !payload.contextAnchorMessageId ||
    String(outbound.messageId || "").trim() !==
      String(payload.contextAnchorMessageId || "").trim()
  ) {
    return false;
  }

  const inboundAt = Date.parse(String(inbound.at || ""));
  const outboundAt = Date.parse(String(outbound.at || ""));
  if (
    !Number.isFinite(inboundAt) ||
    !Number.isFinite(outboundAt) ||
    outboundAt < inboundAt
  ) {
    return false;
  }

  const inboundText = normalizeSimpleFollowupText(inbound.text);
  const outboundText = normalizeSimpleFollowupText(outbound.text);
  const proposedText = normalizeSimpleFollowupText(payload.body);
  const allText = [inboundText, outboundText, proposedText].join(" ");
  const procedure = identifySimpleFollowupProcedure(inboundText);

  if (
    !procedure ||
    identifySimpleFollowupProcedure(outboundText) !== procedure ||
    identifySimpleFollowupProcedure(proposedText) !== procedure ||
    SIMPLE_FOLLOWUP_SENSITIVE_PATTERN.test(allText)
  ) {
    return false;
  }

  const isGenericInterest = isExactGenericProcedureInterest(
    inbound.text,
    procedure,
  );
  const isBrunaQuestion =
    /\b(bruna|concierge)\b/.test(outboundText) &&
    String(outbound.text || "").includes("?");
  const isExactLowRiskFollowup =
    isExactSimpleProcedureFollowup(payload.body, procedure) &&
    !/https?:\/\//i.test(String(payload.body || ""));

  return (
    isGenericInterest &&
    isBrunaQuestion &&
    isExactLowRiskFollowup
  );
}

export function canReuseFirstFollowupSemanticReview(payload) {
  if (
    payload?.followupStage !== 2 ||
    payload?.humanApproved !== true
  ) {
    return false;
  }

  const anchor = String(
    payload.contextAnchorMessageId || "",
  ).trim();
  const conversation = Array.isArray(payload.recentConversation)
    ? payload.recentConversation
    : [];
  const lastTurn = conversation[conversation.length - 1];
  const anchorAt = Date.parse(String(lastTurn?.at || ""));
  const hasPriorInbound = conversation
    .slice(0, -1)
    .some((turn) => turn?.direction === "IN");

  return Boolean(
    anchor &&
      anchor.startsWith("scheduled-followup-") &&
      conversation.length >= 2 &&
      hasPriorInbound &&
      lastTurn?.direction === "OUT" &&
      String(lastTurn.messageId || "").trim() === anchor &&
      Number.isFinite(anchorAt) &&
      anchorAt >= FIRST_FOLLOWUP_SEMANTIC_REVIEW_BASELINE,
  );
}

export async function handleScheduledFollowup(
  request,
  {
    env = process.env,
    fetchImpl = fetch,
    now = new Date(),
    getBusinessNumberImpl = getBusinessNumber,
    appendConversationTurnImpl = appendConversationTurn,
    reviewScheduledFollowupContextImpl =
      reviewScheduledFollowupContext,
    sendYCloudPatientTextImpl = sendYCloudPatientText,
    sendYCloudPatientFollowupTemplateImpl =
      sendYCloudPatientFollowupTemplate,
  } = {},
) {
  if (request.method !== "POST") {
    return json({ ok: false, error: "method_not_allowed" }, 405);
  }

  const expectedSecret = env.GOOGLE_SHEETS_WEBHOOK_SECRET;
  const receivedSecret = request.headers.get("x-liv-secret");

  if (!expectedSecret || !secureEqual(receivedSecret, expectedSecret)) {
    return json({ ok: false, error: "unauthorized" }, 401);
  }

  if (env.WHATSAPP_SCHEDULED_FOLLOWUPS_ENABLED !== "true") {
    return json(
      { ok: false, sent: false, error: "scheduled_followups_disabled" },
      503,
    );
  }

  const automationMode = normalizeAutomationMode(
    env.WHATSAPP_AUTOMATION_MODE,
  );
  if (!allowsPatientSideEffects(automationMode)) {
    return json(
      {
        ok: false,
        sent: false,
        error: "automation_inactive",
        automationMode,
      },
      503,
    );
  }

  if (!isScheduledFollowupWindow(now)) {
    return json(
      { ok: false, sent: false, error: "outside_send_window" },
      409,
    );
  }

  let payload;

  try {
    payload = normalizePayload(await request.json());
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }

  if (!payload.planId || !payload.patientPhone || !payload.body) {
    return json({ ok: false, error: "invalid_payload" }, 400);
  }

  if (
    latestInboundIsCommercialSolicitation(
      payload.recentConversation,
    )
  ) {
    return json(
      {
        ok: false,
        sent: false,
        error: "semantic_context_review_required",
        semanticReason: "conversation_changed",
        ignoreReason: "commercial_solicitation_or_partnership",
      },
      409,
    );
  }

  const customerServiceWindowOpen = hasOpenCustomerServiceWindow(
    payload,
    now,
  );
  if (
    !customerServiceWindowOpen &&
    (
      payload.humanApproved !== true ||
      payload.deliveryMode !== "template"
    )
  ) {
    return json(
      {
        ok: false,
        sent: false,
        error: "outside_customer_service_window",
      },
      409,
    );
  }

  if (
    payload.deliveryMode === "template" &&
    payload.humanApproved !== true
  ) {
    return json(
      {
        ok: false,
        sent: false,
        error: "template_requires_human_approval",
      },
      409,
    );
  }

  const simpleUnansweredInterest =
    isSimpleUnansweredProcedureInterestFollowup(payload);
  const reusedFirstFollowupReview =
    canReuseFirstFollowupSemanticReview(payload);
  const contextReview = simpleUnansweredInterest
    ? {
        status: "completed",
        allowed: true,
        reasonCode: "simple_unanswered_procedure_interest",
      }
    : reusedFirstFollowupReview
    ? {
        status: "completed",
        allowed: true,
        reasonCode: "unchanged_since_first_followup",
      }
    : await reviewScheduledFollowupContextImpl(
        payload,
        { env, fetchImpl },
      );

  if (contextReview?.status !== "completed") {
    return json(
      {
        ok: false,
        sent: false,
        error: "semantic_context_review_unavailable",
        semanticReason:
          contextReview?.errorCode || "review_failed",
      },
      503,
    );
  }

  if (contextReview.allowed !== true) {
    return json(
      {
        ok: false,
        sent: false,
        error: "semantic_context_review_required",
        semanticReason:
          contextReview.reasonCode || "context_not_aligned",
      },
      409,
    );
  }

  const from = await getBusinessNumberImpl({ env });

  if (!from || !env.YCLOUD_API_KEY) {
    return json(
      { ok: false, sent: false, error: "configuration_missing" },
      503,
    );
  }

  if (
    payload.deliveryMode === "template" &&
    !String(env.YCLOUD_FOLLOWUP_TEMPLATE_NAME || "").trim()
  ) {
    return json(
      {
        ok: false,
        sent: false,
        error: "followup_template_missing",
      },
      503,
    );
  }

  const eventId = `scheduled-followup-${payload.planId}`;
  const sendImpl =
    payload.deliveryMode === "template"
      ? sendYCloudPatientFollowupTemplateImpl
      : sendYCloudPatientTextImpl;
  const result = await sendImpl(
    {
      from,
      to: payload.patientPhone,
      eventId,
      body: payload.body,
    },
    { env, fetchImpl },
  );

  if (result.status !== "completed") {
    return json(
      {
        ok: false,
        sent: false,
        error: result.errorCode,
        downstreamStatus: result.httpStatus,
      },
      502,
    );
  }

  await appendConversationTurnImpl({
    phone: payload.patientPhone,
    role: "assistant",
    text:
      payload.deliveryMode === "template"
        ? renderYCloudFollowupTemplateText(payload.body)
        : payload.body,
    eventId,
    source: "bruna",
    at: now.toISOString(),
  });

  return json({
    ok: true,
    sent: true,
    semanticReview: simpleUnansweredInterest
      ? "deterministic_simple_unanswered_interest"
      : reusedFirstFollowupReview
        ? "reused_after_no_intervening_turn"
        : "completed",
  });
}

export default (request) => handleScheduledFollowup(request);
