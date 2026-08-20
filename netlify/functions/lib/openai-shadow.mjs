import { createHash } from "node:crypto";
import { CONVERSATION_GUIDELINES } from "./conversation-guidelines.mjs";
import { getRecommendedSiteResource } from "./site-content.mjs";
import { normalizeConversationSemanticState } from "./conversation-memory.mjs";
import {
  applyKnowledgeDecisionGuard,
  normalizeKnowledgeContext,
} from "./knowledge-learning.mjs";
import {
  usableProfileFirstName,
  usableProfileName,
} from "./profile-name.mjs";
import {
  CONTEXT_CLARIFICATION_CODE,
  CONTEXT_CONTINUATION_CODE,
  CONTEXT_REOPEN_CODE,
} from "./semantic-reply-policy.mjs";
import { approvedLiftingFacialFacts } from "./lifting-information.mjs";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = "gpt-5.6-terra";
const DEFAULT_REASONING_EFFORT = "medium";
const OPENAI_TIMEOUT_MS = 8_000;
const MAX_USER_TEXT_LENGTH = 2_000;
const MAX_RECENT_TURNS = 32;
const MAX_RECENT_TURN_LENGTH = 1_200;
const MAX_REFERRAL_FIELD_LENGTH = 300;
const PATIENT_RELATIONSHIP_STATES = new Set([
  "new_lead",
  "engaged_lead",
  "appointment_scheduled",
  "consultation_completed",
  "surgical_planning",
  "active_postop",
  "former_patient",
  "known_patient",
  "unknown",
]);

const ROUTES = [
  "standard_reply",
  "appointment_review",
  "human_review",
  "daniel_greeting_and_alert",
  "ignore",
];
const CONFIDENCES = ["low", "medium", "high"];
const PROFESSIONALS = ["amanda", "daniel", "unknown"];
const PATIENT_ACTS = [
  "question",
  "request",
  "answer",
  "acceptance",
  "acknowledgement",
  "deferral",
  "decline",
  "closing",
  "statement",
  "unknown",
];
const CONVERSATION_OWNERS = ["bruna", "human_team", "patient", "none"];
const CONVERSATION_STATE_REQUIRED = [
  "activeTopic",
  "patientAct",
  "refersToEventId",
  "lastClinicQuestion",
  "lastClinicOffer",
  "unresolvedQuestions",
  "factsAlreadyProvided",
  "owner",
  "nextExpectedAction",
  "ambiguity",
  "contextConfidence",
];

const SHADOW_DECISION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "route",
    "confidence",
    "automaticAllowed",
    "urgent",
    "professional",
    "procedure",
    "replyCode",
    "suggestedReply",
    "reviewReason",
    "conversationState",
  ],
  properties: {
    route: { type: "string", enum: ROUTES },
    confidence: { type: "string", enum: CONFIDENCES },
    automaticAllowed: { type: "boolean" },
    urgent: { type: "boolean" },
    professional: { type: "string", enum: PROFESSIONALS },
    procedure: { type: "string" },
    replyCode: { type: "string" },
    suggestedReply: { type: "string", maxLength: 1_200 },
    reviewReason: { type: "string", maxLength: 500 },
    conversationState: {
      type: "object",
      additionalProperties: false,
      required: CONVERSATION_STATE_REQUIRED,
      properties: {
        activeTopic: { type: "string", maxLength: 160 },
        patientAct: { type: "string", enum: PATIENT_ACTS },
        refersToEventId: { type: "string", maxLength: 200 },
        lastClinicQuestion: { type: "string", maxLength: 300 },
        lastClinicOffer: { type: "string", maxLength: 300 },
        unresolvedQuestions: {
          type: "array",
          maxItems: 8,
          items: { type: "string", maxLength: 160 },
        },
        factsAlreadyProvided: {
          type: "array",
          maxItems: 12,
          items: { type: "string", maxLength: 160 },
        },
        owner: { type: "string", enum: CONVERSATION_OWNERS },
        nextExpectedAction: { type: "string", maxLength: 160 },
        ambiguity: { type: "string", maxLength: 200 },
        contextConfidence: { type: "string", enum: CONFIDENCES },
      },
    },
  },
};

function result(status, details = {}) {
  return { status, ...details };
}

function limitUserText(value) {
  return Array.from(String(value || "")).slice(0, MAX_USER_TEXT_LENGTH).join("");
}

function limitText(value, maximumLength) {
  return Array.from(String(value || "").trim())
    .slice(0, maximumLength)
    .join("");
}

function normalizeRecentConversation(value) {
  if (!Array.isArray(value)) return [];

  return value
    .slice(-MAX_RECENT_TURNS)
    .map((turn) => {
      const at = limitText(turn?.at, 40);

      return {
        role: turn?.role === "assistant" ? "assistant" : "patient",
        source: ["bruna", "equipe_humana", "paciente"].includes(turn?.source)
          ? turn.source
          : turn?.role === "assistant"
            ? "bruna"
            : "paciente",
        text: limitText(turn?.text, MAX_RECENT_TURN_LENGTH),
        ...(limitText(turn?.eventId, 200)
          ? { eventId: limitText(turn.eventId, 200) }
          : {}),
        ...(at ? { at } : {}),
      };
    })
    .filter((turn) => turn.text);
}

function normalizeReplyContract(value) {
  if (!value || typeof value !== "object") return null;
  const allowedKinds = new Set([
    "none",
    "direct_answer",
    "specific_acknowledgement",
  ]);
  const allowedStages = new Set([
    "discovery",
    "research",
    "consideration",
    "scheduling",
    "pause",
    "active_care",
    "closed",
  ]);
  const allowedRisks = new Set(["green", "yellow", "red"]);
  const intents = Array.isArray(value.unresolvedIntents)
    ? value.unresolvedIntents
        .map((intent) => limitText(intent, 50))
        .filter(Boolean)
        .slice(0, 10)
    : [];

  return {
    version: "reply-contract-v1",
    stage: allowedStages.has(value.stage) ? value.stage : "consideration",
    risk: allowedRisks.has(value.risk) ? value.risk : "red",
    owner: limitText(value.owner, 30),
    allowedResponseKind: allowedKinds.has(value.allowedResponseKind)
      ? value.allowedResponseKind
      : "none",
    unresolvedIntents: intents,
    silenceReason: limitText(value.silenceReason, 120),
    maxQuestions: Math.max(0, Math.min(1, Number(value.maxQuestions) || 0)),
    maxLinks: Math.max(0, Math.min(1, Number(value.maxLinks) || 0)),
    allowCta: value.allowCta === true,
    allowAppointmentConfirmation:
      value.allowAppointmentConfirmation === true,
    requirePhotoDistanceLimit:
      value.requirePhotoDistanceLimit === true,
  };
}

export function applyKnownProfileNameGuard(
  decision,
  patientProfileName = "",
  hasConversationHistory = false,
) {
  if (
    (!usableProfileFirstName(patientProfileName) &&
      !hasConversationHistory) ||
    decision?.route !== "standard_reply" ||
    !decision?.suggestedReply
  ) {
    return decision;
  }

  const suggestedReply = String(decision.suggestedReply)
    .replace(
      /\bComo\s+posso\s+(?:te|lhe)\s+chamar\s*\?/giu,
      "Como posso ajudar?",
    )
    .replace(
      /\b(?:Qual|Como)\s+(?:é|e)\s+(?:o\s+)?seu\s+nome\s*\?/giu,
      "Como posso ajudar?",
    );

  return {
    ...decision,
    suggestedReply,
  };
}

export function applyReturningPatientReplyGuard(
  decision,
  patientRelationship,
) {
  if (
    patientRelationship?.knownPatient !== true ||
    decision?.route !== "standard_reply" ||
    !decision?.suggestedReply
  ) {
    return decision;
  }

  const suggestedReply = String(decision.suggestedReply)
    .replace(
      /^(Ol[aá](?:,\s*[^!?.]+)?[!,.]?\s*)?(?:Eu\s+sou|Aqui\s+[eé])\s+(?:a\s+)?Bruna,\s*(?:(?:concierge\s+)?da\s+)?Cl[ií]nica\s+LIV\s+Faria\s+Lima[.!]?\s*/iu,
      (_match, greeting) =>
        `${greeting || ""}Que bom falar com você novamente. `,
    )
    .trim();

  return {
    ...decision,
    suggestedReply,
  };
}

export function applyFirstReplyGreetingGuard(
  decision,
  {
    patientProfileName = "",
    recentConversation = null,
    patientRelationship = null,
    priorInteractionKnown = false,
  } = {},
) {
  if (
    decision?.route !== "standard_reply" ||
    !decision?.suggestedReply ||
    !Array.isArray(recentConversation)
  ) {
    return decision;
  }

  if (priorInteractionKnown === true) return decision;

  const hasPreviousClinicReply = recentConversation.some(
    (turn) =>
      turn?.role === "assistant" ||
      ["bruna", "equipe_humana"].includes(turn?.source),
  );
  if (hasPreviousClinicReply) return decision;

  const firstName = usableProfileFirstName(patientProfileName);
  const greeting = firstName ? `Olá, ${firstName}!` : "Olá!";
  const introduction =
    "Eu sou a Bruna, concierge da Clínica LIV Faria Lima.";
  const knownPatient = patientRelationship?.knownPatient === true;
  let body = String(decision.suggestedReply)
    .trim()
    .replace(
      /^(?:ol[áa]|oi|bom\s+dia|boa\s+tarde|boa\s+noite)(?:,\s*[^!?.\n]+)?[!?.]?\s*/iu,
      "",
    )
    .trim();

  if (
    !knownPatient &&
    !/\b(?:eu\s+sou|aqui\s+[ée])\s+(?:a\s+)?Bruna\b/iu.test(body)
  ) {
    body = `${introduction} ${body}`.trim();
  }

  return {
    ...decision,
    suggestedReply: `${greeting}${body ? ` ${body}` : ""}`,
  };
}

const AUTOMATION_IDENTITY_PATTERN =
  /(?:^|[\s([{"'“])(?:bot|rob[oô]|automa[cç][aã]o|intelig[eê]ncia\s+artificial|IA|assistente\s+virtual|secret[aá]ria\s+virtual)(?=$|[\s)\]}"'”.,;:!?])/iu;

export function applyAutomationIdentityGuard(decision) {
  if (
    decision?.route !== "standard_reply" ||
    !decision?.suggestedReply ||
    !AUTOMATION_IDENTITY_PATTERN.test(String(decision.suggestedReply))
  ) {
    return decision;
  }

  return {
    ...decision,
    route: "human_review",
    automaticAllowed: false,
    suggestedReply: "",
    replyCode: "IDENTITY-REVIEW-01",
    reviewReason: "automation_identity_disclosure_blocked",
  };
}

export function applyContextClarificationGuard(decision) {
  const contextualClarification =
    decision?.replyCode === CONTEXT_CLARIFICATION_CODE ||
    String(decision?.reviewReason || "").startsWith(
      "context_clarification:",
    );
  if (!contextualClarification) return decision;

  // A clarification is a linguistic fallback, never a way to downgrade a
  // clinical urgency. The later urgency guard must still receive the original
  // urgent decision and fail closed for human review.
  if (decision?.urgent === true) return decision;

  const question = limitText(decision?.suggestedReply, 300);
  if (
    decision?.route !== "standard_reply" ||
    !question ||
    !question.includes("?")
  ) {
    return {
      ...decision,
      route: "human_review",
      confidence: "low",
      automaticAllowed: false,
      replyCode: "CONTEXT-REVIEW-01",
      suggestedReply: "",
      reviewReason: "context_clarification:invalid_question",
    };
  }

  return {
    ...decision,
    route: "standard_reply",
    confidence: "high",
    automaticAllowed: true,
    urgent: false,
    replyCode: CONTEXT_CLARIFICATION_CODE,
    suggestedReply: question,
    reviewReason:
      String(decision?.reviewReason || "").startsWith(
        "context_clarification:",
      )
        ? decision.reviewReason
        : "context_clarification:meaning_unclear",
  };
}

export function applyContextReopenGuard(decision) {
  const contextReopen =
    decision?.replyCode === CONTEXT_REOPEN_CODE ||
    String(decision?.reviewReason || "").startsWith("context_reopen:");
  if (!contextReopen) return decision;

  if (decision?.urgent === true) return decision;

  const reply = limitText(decision?.suggestedReply, 1_200);
  if (decision?.route !== "standard_reply" || !reply) {
    return {
      ...decision,
      route: "human_review",
      confidence: "low",
      automaticAllowed: false,
      replyCode: "CONTEXT-REVIEW-01",
      suggestedReply: "",
      reviewReason: "context_reopen:invalid_reply",
    };
  }

  return {
    ...decision,
    route: "standard_reply",
    confidence: "high",
    automaticAllowed: true,
    urgent: false,
    replyCode: String(decision?.replyCode || "").trim() ||
      CONTEXT_REOPEN_CODE,
    suggestedReply: reply,
    reviewReason:
      String(decision?.reviewReason || "").startsWith("context_reopen:")
        ? decision.reviewReason
        : "context_reopen:new_patient_request",
  };
}

export function applyContextContinuationGuard(
  decision,
  { enabled = false } = {},
) {
  const contextContinuation =
    decision?.replyCode === CONTEXT_CONTINUATION_CODE ||
    String(decision?.reviewReason || "").startsWith(
      "context_continue:",
    );
  if (!contextContinuation) return decision;

  // A contextual continuation may only answer a bounded informational offer.
  // Urgency remains untouched so the final urgency guard can fail closed.
  if (decision?.urgent === true) return decision;

  const reply = limitText(decision?.suggestedReply, 1_200);
  if (
    enabled !== true ||
    decision?.route !== "standard_reply" ||
    !reply ||
    reply.includes("?")
  ) {
    return {
      ...decision,
      route: "human_review",
      confidence: "low",
      automaticAllowed: false,
      replyCode: "CONTEXT-REVIEW-01",
      suggestedReply: "",
      reviewReason: "context_continue:invalid_reply",
    };
  }

  return {
    ...decision,
    route: "standard_reply",
    confidence: "high",
    automaticAllowed: true,
    urgent: false,
    replyCode: CONTEXT_CONTINUATION_CODE,
    suggestedReply: reply,
    reviewReason:
      String(decision?.reviewReason || "").startsWith(
        "context_continue:",
      )
        ? decision.reviewReason
        : "context_continue:accepted_information_offer",
  };
}

function normalizeReferralContext(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const normalized = {};

  for (const key of ["sourceType", "mediaType", "headline", "body"]) {
    const text = limitText(value[key], MAX_REFERRAL_FIELD_LENGTH);
    if (text) normalized[key] = text;
  }

  return Object.keys(normalized).length ? normalized : null;
}

function normalizePolicyHints(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const normalized = {};
  for (const key of [
    "route",
    "reason",
    "replyCode",
    "deterministicReplyCode",
    "professional",
    "procedure",
  ]) {
    const text = limitText(value[key], 120);
    if (text) normalized[key] = text;
  }
  for (const key of [
    "deterministicReplyProfessional",
    "deterministicReplyProcedure",
  ]) {
    const text = limitText(value[key], 120);
    if (text) normalized[key] = text;
  }
  const deterministicReplyPreview = limitText(
    value.deterministicReplyPreview,
    1_200,
  );
  if (deterministicReplyPreview) {
    normalized.deterministicReplyPreview = deterministicReplyPreview;
  }
  if (typeof value.automaticAllowed === "boolean") {
    normalized.automaticAllowed = value.automaticAllowed;
  }
  if (typeof value.humanContextContinuationCandidate === "boolean") {
    normalized.humanContextContinuationCandidate =
      value.humanContextContinuationCandidate;
  }
  if (typeof value.semanticRoutePending === "boolean") {
    normalized.semanticRoutePending = value.semanticRoutePending;
  }

  return Object.keys(normalized).length ? normalized : null;
}

function normalizePatientRelationshipContext(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      knownPatient: false,
      state: "unknown",
      label: "histórico não localizado",
      hasPendingHumanTask: false,
    };
  }

  const state = String(value.state || "unknown")
    .trim()
    .toLowerCase();

  return {
    knownPatient: value.knownPatient === true,
    state: PATIENT_RELATIONSHIP_STATES.has(state)
      ? state
      : "unknown",
    label: limitText(value.label, 80),
    hasPendingHumanTask:
      value.hasPendingHumanTask === true,
  };
}

function extractOutputText(response) {
  if (typeof response?.output_text === "string") return response.output_text;

  for (const item of response?.output || []) {
    for (const content of item?.content || []) {
      if (content?.type === "output_text" && typeof content.text === "string") {
        return content.text;
      }
    }
  }

  return null;
}

function isValidDecision(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const keys = Object.keys(value);
  if (keys.length !== SHADOW_DECISION_SCHEMA.required.length) return false;
  if (!SHADOW_DECISION_SCHEMA.required.every((key) => key in value)) {
    return false;
  }

  const state = value.conversationState;
  const validState = Boolean(
    state &&
      typeof state === "object" &&
      !Array.isArray(state) &&
      Object.keys(state).length === CONVERSATION_STATE_REQUIRED.length &&
      CONVERSATION_STATE_REQUIRED.every((key) => key in state) &&
      typeof state.activeTopic === "string" &&
      PATIENT_ACTS.includes(state.patientAct) &&
      typeof state.refersToEventId === "string" &&
      typeof state.lastClinicQuestion === "string" &&
      typeof state.lastClinicOffer === "string" &&
      Array.isArray(state.unresolvedQuestions) &&
      state.unresolvedQuestions.every((item) => typeof item === "string") &&
      Array.isArray(state.factsAlreadyProvided) &&
      state.factsAlreadyProvided.every((item) => typeof item === "string") &&
      CONVERSATION_OWNERS.includes(state.owner) &&
      typeof state.nextExpectedAction === "string" &&
      typeof state.ambiguity === "string" &&
      CONFIDENCES.includes(state.contextConfidence),
  );

  return (
    ROUTES.includes(value.route) &&
    CONFIDENCES.includes(value.confidence) &&
    typeof value.automaticAllowed === "boolean" &&
    typeof value.urgent === "boolean" &&
    PROFESSIONALS.includes(value.professional) &&
    typeof value.procedure === "string" &&
    typeof value.replyCode === "string" &&
    typeof value.suggestedReply === "string" &&
    typeof value.reviewReason === "string" &&
    validState
  );
}

function usageSummary(usage) {
  if (!usage || typeof usage !== "object") return null;

  const summary = {};

  for (const key of ["input_tokens", "output_tokens", "total_tokens"]) {
    if (Number.isFinite(usage[key])) summary[key] = usage[key];
  }

  return Object.keys(summary).length ? summary : null;
}

export function createSafetyIdentifier(phone) {
  return createHash("sha256")
    .update(`liv-openai-shadow-v1:${String(phone || "")}`)
    .digest("hex");
}

export function applyUrgencyGuard(decision, deterministicUrgent = false) {
  if (!deterministicUrgent && !decision.urgent) {
    if (decision.route !== "appointment_review") return decision;

    return {
      ...decision,
      automaticAllowed: false,
      suggestedReply: "",
      reviewReason:
        decision.reviewReason || "appointment_preference_captured",
    };
  }

  return {
    ...decision,
    route: "human_review",
    automaticAllowed: false,
    urgent: true,
    replyCode: "ALERT-URG-01",
    suggestedReply: "",
    reviewReason:
      decision.reviewReason || "possible_urgent_symptoms",
  };
}

export function parseOpenAIShadowResponse(response, fallbackModel, options = {}) {
  const outputText = extractOutputText(response);

  if (!outputText) {
    return result("failed", {
      httpStatus: 200,
      errorCode: "invalid_response",
    });
  }

  let decision;

  try {
    decision = JSON.parse(outputText);
  } catch {
    return result("failed", {
      httpStatus: 200,
      errorCode: "invalid_response",
    });
  }

  if (!isValidDecision(decision)) {
    return result("failed", {
      httpStatus: 200,
      errorCode: "invalid_response",
    });
  }

  return result("completed", {
    model: String(response?.model || fallbackModel),
    decision: applyUrgencyGuard(
      applyAutomationIdentityGuard(
        applyFirstReplyGreetingGuard(
          applyReturningPatientReplyGuard(
            applyKnownProfileNameGuard(
              applyContextContinuationGuard(
                applyContextReopenGuard(
                  applyContextClarificationGuard(
                    applyKnowledgeDecisionGuard(
                      decision,
                      options.learningContext,
                    ),
                  ),
                ),
                {
                  enabled:
                    options.humanContextContinuationCandidate === true,
                },
              ),
              options.patientProfileName,
              options.hasConversationHistory,
            ),
            options.patientRelationship,
          ),
          {
            patientProfileName: options.patientProfileName,
            recentConversation: options.recentConversation,
            patientRelationship: options.patientRelationship,
            priorInteractionKnown:
              options.priorInteractionKnown === true,
          },
        ),
      ),
      options.deterministicUrgent,
    ),
    usage: usageSummary(response?.usage),
  });
}

export async function runOpenAIShadow(
  {
    phone,
    text,
    platform,
    procedure,
    referenceCategory,
    patientProfileName,
    recentConversation,
    previousConversationState,
    referralContext,
    templateId,
    policyHints,
    patientRelationship,
    learningContext,
    replyContract,
    priorInteractionKnown = false,
    deterministicUrgent = false,
  },
  { env = process.env, fetchImpl = fetch } = {},
) {
  const apiKey = env.OPENAI_API_KEY;

  if (!apiKey) {
    return result("skipped", { errorCode: "configuration_missing" });
  }

  const model = String(
    env.OPENAI_BRUNA_MODEL || env.OPENAI_MODEL || DEFAULT_MODEL,
  );
  const reasoningEffort = String(
    env.OPENAI_BRUNA_REASONING_EFFORT ||
      env.OPENAI_REASONING_EFFORT ||
      DEFAULT_REASONING_EFFORT,
  );
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);
  const normalizedConversation = normalizeRecentConversation(
    recentConversation,
  );
  const normalizedConversationState =
    normalizeConversationSemanticState(previousConversationState);
  const normalizedPatientRelationship =
    normalizePatientRelationshipContext(
      patientRelationship,
    );
  const normalizedLearningContext = normalizeKnowledgeContext(
    learningContext,
  );
  const normalizedReplyContract = normalizeReplyContract(replyContract);
  const normalizedPolicyHints = normalizePolicyHints(policyHints);
  const approvedClinicalFacts = approvedLiftingFacialFacts({
    text,
    procedure,
  });
  const explicitResourceRequest =
    /\b(?:site|link|material|casos?|antes\s+e\s+depois|resultados?)\b/i.test(
      String(text || ""),
    );
  const siteResource =
    normalizedPatientRelationship.hasPendingHumanTask
      ? null
      : normalizedPatientRelationship.knownPatient &&
          !explicitResourceRequest
        ? null
        : getRecommendedSiteResource({
            procedure,
            referenceCategory,
            recentConversation: normalizedConversation,
            currentMessage: text,
            currentTemplateId: templateId,
          });

  try {
    const response = await fetchImpl(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        model,
        reasoning: { effort: reasoningEffort },
        store: false,
        max_output_tokens: 1_200,
        safety_identifier: createSafetyIdentifier(phone),
        instructions: CONVERSATION_GUIDELINES,
        input: JSON.stringify({
          source: String(platform || "WhatsApp direto"),
          procedureContext: limitText(procedure, 100),
          cameFromWebsite: siteResource
            ? false
            : [
                "site_cta",
                "site_page",
                "site_uncoded",
              ].includes(String(referenceCategory || "")),
          siteResource,
          whatsappProfileName: usableProfileName(patientProfileName),
          metaAdContext: normalizeReferralContext(referralContext),
          policyHints: normalizedPolicyHints,
          patientRelationship:
            normalizedPatientRelationship,
          priorInteractionKnown:
            priorInteractionKnown === true,
          approvedKnowledge: normalizedLearningContext.candidates,
          approvedClinicalFacts,
          pendingUnknownQuestion:
            normalizedLearningContext.pendingQuestion,
          replyContract: normalizedReplyContract,
          previousConversationState: normalizedConversationState,
          recentConversation: normalizedConversation,
          currentMessage: limitUserText(text),
        }),
        text: {
          verbosity: "low",
          format: {
            type: "json_schema",
            name: "liv_whatsapp_shadow_decision",
            strict: true,
            schema: SHADOW_DECISION_SCHEMA,
          },
        },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return result("failed", {
        httpStatus: response.status,
        errorCode: "http_error",
      });
    }

    let responseData;

    try {
      responseData = await response.json();
    } catch {
      return result("failed", {
        httpStatus: response.status,
        errorCode: "invalid_response",
      });
    }

    return parseOpenAIShadowResponse(responseData, model, {
      deterministicUrgent,
      patientProfileName,
      hasConversationHistory:
        normalizedConversation.length > 0 ||
        priorInteractionKnown === true,
      patientRelationship:
        normalizedPatientRelationship,
      recentConversation: normalizedConversation,
      priorInteractionKnown:
        priorInteractionKnown === true,
      learningContext: normalizedLearningContext,
      humanContextContinuationCandidate:
        normalizedPolicyHints?.humanContextContinuationCandidate === true,
    });
  } catch (error) {
    return result("failed", {
      httpStatus: null,
      errorCode: error?.name === "AbortError" ? "timeout" : "request_failed",
    });
  } finally {
    clearTimeout(timeout);
  }
}
