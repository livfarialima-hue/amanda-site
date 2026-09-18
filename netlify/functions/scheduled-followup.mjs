import { handleScheduledCare } from "./lib/scheduled-care.mjs";
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
const AUTOMATIC_TEMPLATE_MINIMUM_HOURS = 24;
const AUTOMATIC_TEMPLATE_MAXIMUM_HOURS = 48;

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

export function getScheduledFollowupHealth(env = process.env) {
  const automationMode = normalizeAutomationMode(
    env.WHATSAPP_AUTOMATION_MODE,
  );

  return {
    ok: true,
    service: "scheduled-followup",
    scheduledFollowupsEnabled:
      env.WHATSAPP_SCHEDULED_FOLLOWUPS_ENABLED === "true",
    careEnabled: env.WHATSAPP_SCHEDULED_CARE_ENABLED === "true",
    birthdayEnabled: false,
    birthdayDeliveryMode: "manual_daily_reminder",
    birthdayTemplateConfigured: Boolean(String(env.YCLOUD_BIRTHDAY_TEMPLATE_NAME || "").trim()),
    automaticTemplateEnabled:
      env.WHATSAPP_AUTOMATIC_FOLLOWUP_TEMPLATES_ENABLED === "true",
    templateConfigured: Boolean(
      String(env.YCLOUD_FOLLOWUP_TEMPLATE_NAME || "").trim(),
    ),
    patientSideEffectsAllowed:
      allowsPatientSideEffects(automationMode),
    automationMode,
  };
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
    purpose: body.purpose === "patient_care" ? "patient_care" : "marketing",
    statusOnly: body.statusOnly === true,
    planId: String(body.planId || "").trim().slice(0, 160),
    patientPhone: String(body.patientPhone || "").trim(),
    body: Array.from(String(body.body || "").trim())
      .slice(0, 1500)
      .join(""),
    humanApproved: body.humanApproved === true,
    automaticTemplate: body.automaticTemplate === true,
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

function isExactBrunaProcedureQuestion(text, procedure) {
  const normalized = normalizeSimpleFollowupText(text);
  const marker = " eu sou a bruna concierge da clinica liv";
  const markerIndex = normalized.indexOf(marker);

  if (markerIndex <= 0) return false;

  const greeting = normalized.slice(0, markerIndex);
  if (!/^ola(?: [a-z0-9]{1,40}){0,4}$/.test(greeting)) {
    return false;
  }

  let remainder = normalized.slice(markerIndex + marker.length).trim();
  if (remainder.startsWith("faria lima ")) {
    remainder = remainder.slice("faria lima ".length);
  }

  const phrases = SIMPLE_FOLLOWUP_PROCEDURE_PHRASES[procedure] || [];
  return phrases.some((phrase) => {
    const questions = [
      "o que voce gostaria de entender primeiro",
      "como posso te chamar",
      `o que voce gostaria de entender primeiro sobre ${phrase}`,
    ];
    if (procedure === "cervical") {
      questions.push(
        "o que mais chamou sua atencao no pescoco quando decidiu procurar uma avaliacao",
      );
    }

    return questions.some(
      (question) =>
        remainder ===
        `posso te orientar sobre ${phrase} ${question}`,
    );
  });
}

function isExactSimpleProcedureFollowup(text, procedure) {
  const normalized = normalizeSimpleFollowupText(text);
  const phrases = SIMPLE_FOLLOWUP_PROCEDURE_PHRASES[procedure] || [];

  return phrases.some((phrase) => [
    `ola queria retomar nossa conversa sobre ${phrase} ficou alguma duvida que eu possa esclarecer para voce se preferir tambem posso explicar como funciona a avaliacao com a dra amanda para voce entender esse proximo passo com calma`,
    `ola voce comentou que queria saber sobre ${phrase} me conta voce ja tem alguma mudanca em mente ou esta comecando a pesquisar`,
    `ola voce comentou que queria saber sobre ${phrase} podemos comecar por uma duvida pratica voce prefere saber sobre o procedimento ou sobre a recuperacao`,
    `ola sobre ${phrase} posso te ajudar com uma duvida pratica como se organizar para a recuperacao quer que eu te explique`,
  ].includes(normalized));
}

export function isSimpleUnansweredProcedureInterestFollowup(payload) {
  const deliveryModeAllowed =
    payload?.deliveryMode === "text" ||
    (
      payload?.deliveryMode === "template" &&
      payload?.automaticTemplate === true
    );
  if (
    payload?.followupStage !== 1 ||
    payload?.humanApproved === true ||
    !deliveryModeAllowed
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
  const isBrunaQuestion = isExactBrunaProcedureQuestion(
    outbound.text,
    procedure,
  );
  const isExactLowRiskFollowup =
    isExactSimpleProcedureFollowup(payload.body, procedure) &&
    !/https?:\/\//i.test(String(payload.body || ""));

  return (
    isGenericInterest &&
    isBrunaQuestion &&
    isExactLowRiskFollowup
  );
}

export function isAutomaticTemplateFollowupEligible(
  payload,
  env = process.env,
  now = new Date(),
) {
  const conversation = Array.isArray(payload?.recentConversation)
    ? payload.recentConversation
    : [];
  const lastOutboundAt = Date.parse(
    String(conversation[conversation.length - 1]?.at || ""),
  );
  const elapsedHours = Number.isFinite(lastOutboundAt)
    ? (now.getTime() - lastOutboundAt) / 3_600_000
    : Number.NaN;

  return Boolean(
    env.WHATSAPP_AUTOMATIC_FOLLOWUP_TEMPLATES_ENABLED ===
      "true" &&
      payload?.automaticTemplate === true &&
      payload?.humanApproved !== true &&
      payload?.deliveryMode === "template" &&
      Number.isFinite(elapsedHours) &&
      elapsedHours >= AUTOMATIC_TEMPLATE_MINIMUM_HOURS &&
      elapsedHours <= AUTOMATIC_TEMPLATE_MAXIMUM_HOURS &&
      isSimpleUnansweredProcedureInterestFollowup(payload),
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
  if (!["GET", "POST"].includes(request.method)) {
    return json({ ok: false, error: "method_not_allowed" }, 405);
  }

  const expectedSecret = env.GOOGLE_SHEETS_WEBHOOK_SECRET;
  const receivedSecret = request.headers.get("x-liv-secret");

  if (!expectedSecret || !secureEqual(receivedSecret, expectedSecret)) {
    return json({ ok: false, error: "unauthorized" }, 401);
  }

  if (request.method === "GET") {
    return json(getScheduledFollowupHealth(env));
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

  if (payload.purpose === "patient_care") return handleScheduledCare(payload, { env, fetchImpl, now });

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
  const simpleUnansweredInterest =
    isSimpleUnansweredProcedureInterestFollowup(payload);
  const automaticTemplateEligible =
    isAutomaticTemplateFollowupEligible(payload, env, now);

  if (
    payload.deliveryMode === "template" &&
    payload.humanApproved !== true &&
    payload.automaticTemplate !== true
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

  if (
    payload.deliveryMode === "template" &&
    payload.automaticTemplate === true &&
    env.WHATSAPP_AUTOMATIC_FOLLOWUP_TEMPLATES_ENABLED !==
      "true"
  ) {
    return json(
      {
        ok: false,
        sent: false,
        error: "automatic_template_followups_disabled",
      },
      503,
    );
  }

  if (
    payload.deliveryMode === "template" &&
    payload.automaticTemplate === true &&
    !automaticTemplateEligible
  ) {
    return json(
      {
        ok: false,
        sent: false,
        error: "automatic_template_not_eligible",
      },
      409,
    );
  }

  if (
    !customerServiceWindowOpen &&
    (
      (
        payload.humanApproved !== true &&
        !automaticTemplateEligible
      ) ||
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
