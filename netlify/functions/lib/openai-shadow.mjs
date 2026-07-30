import { createHash } from "node:crypto";
import { CONVERSATION_GUIDELINES } from "./conversation-guidelines.mjs";
import { getRecommendedSiteResource } from "./site-content.mjs";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = "gpt-5.6-terra";
const DEFAULT_REASONING_EFFORT = "medium";
const OPENAI_TIMEOUT_MS = 8_000;
const MAX_USER_TEXT_LENGTH = 2_000;
const MAX_PROFILE_NAME_LENGTH = 120;
const MAX_RECENT_TURNS = 8;
const MAX_RECENT_TURN_LENGTH = 500;
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
        ...(at ? { at } : {}),
      };
    })
    .filter((turn) => turn.text);
}

function usableProfileFirstName(value) {
  const profileName = limitText(value, MAX_PROFILE_NAME_LENGTH)
    .replace(/\s+/g, " ")
    .trim();
  const normalizedProfileName = profileName.toLocaleLowerCase("pt-BR");
  const suspiciousProfilePattern =
    /\b(?:cl[ií]nica|consult[oó]rio|hospital|empresa|loja|store|shop|studio|est[uú]dio|est[eé]tica|sal[aã]o|oficial|atendimento|recep[cç][aã]o|comercial|vendas|marketing|equipe|grupo|cirurgia|pl[aá]stica|odontologia|ltda|fam[ií]lia|mam[aã]e?|papai|amor|vida|trabalho|n[uú]mero\s+novo|sem\s+nome)\b/i;

  if (
    !profileName ||
    profileName.length > 80 ||
    !/^[\p{L}\p{M}'’.\-\s]+$/u.test(profileName) ||
    suspiciousProfilePattern.test(profileName)
  ) {
    return "";
  }

  const words = profileName.split(/\s+/).filter(Boolean);
  if (words.length > 4) return "";

  const firstName = words[0].replace(/[^\p{L}\p{M}'’-]/gu, "");
  const normalized = firstName.toLocaleLowerCase("pt-BR");

  if (
    firstName.length < 2 ||
    [
      "unknown",
      "desconhecido",
      "cliente",
      "paciente",
      "contato",
      "dra",
      "dr",
      "doutora",
      "doutor",
      "admin",
      "adm",
    ].includes(normalized) ||
    normalizedProfileName.startsWith("@")
  ) {
    return "";
  }

  return firstName;
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
      /^(Ol[aá](?:,\s*[^!?.]+)?[!,.]?\s*)?(?:Eu\s+sou|Aqui\s+[eé])\s+(?:a\s+)?Bruna,\s*(?:da\s+)?Cl[ií]nica\s+LIV\s+Faria\s+Lima[.!]?\s*/iu,
      (_match, greeting) =>
        `${greeting || ""}Que bom falar com você novamente. `,
    )
    .trim();

  return {
    ...decision,
    suggestedReply,
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

  return (
    ROUTES.includes(value.route) &&
    CONFIDENCES.includes(value.confidence) &&
    typeof value.automaticAllowed === "boolean" &&
    typeof value.urgent === "boolean" &&
    PROFESSIONALS.includes(value.professional) &&
    typeof value.procedure === "string" &&
    typeof value.replyCode === "string" &&
    typeof value.suggestedReply === "string" &&
    typeof value.reviewReason === "string"
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
      applyReturningPatientReplyGuard(
        applyKnownProfileNameGuard(
          decision,
          options.patientProfileName,
          options.hasConversationHistory,
        ),
        options.patientRelationship,
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
    referralContext,
    patientRelationship,
    deterministicUrgent = false,
  },
  { env = process.env, fetchImpl = fetch } = {},
) {
  const apiKey = env.OPENAI_API_KEY;

  if (!apiKey) {
    return result("skipped", { errorCode: "configuration_missing" });
  }

  const model = String(env.OPENAI_MODEL || DEFAULT_MODEL);
  const reasoningEffort = String(
    env.OPENAI_REASONING_EFFORT || DEFAULT_REASONING_EFFORT,
  );
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);
  const normalizedConversation = normalizeRecentConversation(
    recentConversation,
  );
  const normalizedPatientRelationship =
    normalizePatientRelationshipContext(
      patientRelationship,
    );
  const explicitResourceRequest =
    /\b(?:site|link|material|casos?|antes\s+e\s+depois|resultados?)\b/i.test(
      String(text || ""),
    );
  const siteResource =
    normalizedPatientRelationship.knownPatient &&
    !explicitResourceRequest
      ? null
      : getRecommendedSiteResource({
          procedure,
          referenceCategory,
          recentConversation: normalizedConversation,
          currentMessage: text,
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
        max_output_tokens: 700,
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
          whatsappProfileName: limitText(
            patientProfileName,
            MAX_PROFILE_NAME_LENGTH,
          ),
          metaAdContext: normalizeReferralContext(referralContext),
          patientRelationship:
            normalizedPatientRelationship,
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
      hasConversationHistory: normalizedConversation.length > 0,
      patientRelationship:
        normalizedPatientRelationship,
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
