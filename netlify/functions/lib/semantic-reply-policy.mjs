import { UNKNOWN_CLARIFICATION_CODE } from "./knowledge-learning.mjs";
import { hasApprovedSurgicalPriceDisclosure, hasApprovedGlobalSurgicalPriceDisclosure } from "./surgical-price-policy.mjs";
import { preservesProtectedFacts } from "./protected-facts.mjs";

export const CONTEXT_CLARIFICATION_CODE = "CONTEXT-CLARIFY-01";
export const CONTEXT_REOPEN_CODE = "CONTEXT-REOPEN-01";
export const CONTEXT_CONTINUATION_CODE = "CONTEXT-CONTINUE-01";
export const COORDINATION_ACKNOWLEDGEMENT_CODE = "COORDINATION-ACK-01";

// This selects wording only. The confirmed route and the final outbound gate
// remain authoritative. Exact wording is explicit; codes do not impose style.
export function selectConfirmedReplyText(semanticResult, approvedResult) {
  const approved = String(approvedResult?.decision?.suggestedReply || "");
  const draft = String(semanticResult?.decision?.suggestedReply || "").trim();
  if (!semanticDecisionConfirmsDeterministicReply(semanticResult, approvedResult) ||
      semanticResult.decision.replyWording !== "contextual" ||
      approvedResult.decision.replyWording === "approved_exact" ||
      !draft || draft.length > 1200 || !preservesProtectedFacts(draft, approved)) {
    return approved;
  }
  // Wording is flexible, not the approved commercial facts. The outbound
  // gate still checks procedure-specific amounts, clinical claims and effects.
  if ((hasApprovedSurgicalPriceDisclosure(approved) ||
      ["LIFTING-PRICE-RANGE-01", "OTOPLASTY-PRICE-RANGE-01", "LIPO-PAPADA-PRICE-RANGE-01"].includes(approvedResult.decision.replyCode)) &&
      !hasApprovedSurgicalPriceDisclosure(draft)) return approved;
  if (hasApprovedGlobalSurgicalPriceDisclosure(approved) &&
      !hasApprovedGlobalSurgicalPriceDisclosure(draft)) return approved;
  return draft;
}

function normalizedDimension(value) {
  const normalized = String(value || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return [
    "",
    "unknown",
    "desconhecido",
    "nao_informado",
    "none",
    "null",
  ].includes(normalized)
    ? ""
    : normalized;
}

function normalizedProfessional(value) {
  const normalized = normalizedDimension(value);
  if (
    ["dra_amanda", "dra_amanda_schroeder", "amanda_schroeder"]
      .includes(normalized)
  ) {
    return "amanda";
  }
  if (
    ["dr_daniel", "dr_daniel_added", "daniel_added"]
      .includes(normalized)
  ) {
    return "daniel";
  }
  return normalized;
}

function normalizedProcedure(value) {
  const normalized = normalizedDimension(value);
  const aliases = {
    cervicoplastia: "lifting_cervical",
    lifting_de_pescoco: "lifting_cervical",
    lifting_do_pescoco: "lifting_cervical",
    lifting_pescoco: "lifting_cervical",
    ritidoplastia: "lifting_facial",
    lifting_da_face: "lifting_facial",
    lifting_de_face: "lifting_facial",
    mini_lifting: "minilifting",
    lipo_de_papada: "lipo_papada",
    lipoaspiracao_de_papada: "lipo_papada",
    cirurgia_da_palpebra: "blefaroplastia",
    cirurgia_das_palpebras: "blefaroplastia",
    cirurgia_de_palpebras: "blefaroplastia",
  };
  return aliases[normalized] || normalized;
}

function compatibleWhenKnown(left, right, normalizer) {
  const normalizedLeft = normalizer(left);
  const normalizedRight = normalizer(right);
  return !normalizedLeft || !normalizedRight || normalizedLeft === normalizedRight;
}

function validatedAutomaticDecision(decision) {
  return Boolean(
    decision?.route === "standard_reply" &&
      decision?.confidence === "high" &&
      decision?.automaticAllowed === true &&
      decision?.urgent !== true &&
      String(decision?.suggestedReply || "").trim(),
  );
}

function contextContinuationContract(replyContract) {
  return {
    ...(replyContract || {}),
    owner: "bruna",
    allowedResponseKind: "direct_answer",
    silenceReason: "",
    maxQuestions: 1,
    maxLinks: 0,
    allowCta: false,
    allowAppointmentConfirmation: false,
  };
}

export function prepareSemanticContextContinuationAction(
  conversationAction,
) {
  const currentContract = conversationAction?.replyContract || {};
  const approvedPricePath = Boolean(
    ["price_initial_information", "lifting_price_range_direct", "otoplasty_price_range_direct", "lipo_papada_price_range_direct"].includes(
      currentContract.sourceReason,
    ),
  );
  return {
    ...conversationAction,
    replyContract: {
      ...contextContinuationContract(
        currentContract,
      ),
      maxQuestions: approvedPricePath ? 0 : 1,
      maxLinks: approvedPricePath ? Number(currentContract.maxLinks) || 0 : 0,
      allowCta: approvedPricePath && currentContract.allowCta === true,
    },
  };
}

export function semanticDecisionConfirmsDeterministicReply(
  semanticResult,
  deterministicReplyResult,
) {
  const semanticDecision = semanticResult?.decision;
  const deterministicDecision = deterministicReplyResult?.decision;
  return Boolean(
    deterministicReplyResult &&
      semanticResult?.status === "completed" &&
      validatedAutomaticDecision(semanticDecision) &&
      semanticDecision.replyCode === deterministicDecision?.replyCode &&
      compatibleWhenKnown(
        semanticDecision.professional,
        deterministicDecision?.professional,
        normalizedProfessional,
      ) &&
      compatibleWhenKnown(
        semanticDecision.procedure,
        deterministicDecision?.procedure,
        normalizedProcedure,
      ),
  );
}

// Semantic agreement with a price code does not mean a price-only template
// covers the whole turn. Keep the model's contextual answer for other topics;
// the existing outbound gate still checks its amounts, ownership and safety.
export function deterministicReplyCoversPatientQuestions(candidate, conversationAction) {
  const code = candidate?.decision?.replyCode;
  if (!["SURGICAL-PRICE-INITIAL-01", "LIFTING-PRICE-RANGE-01", "OTOPLASTY-PRICE-RANGE-01", "LIPO-PAPADA-PRICE-RANGE-01"].includes(code)) return true;
  return (conversationAction?.replyContract?.unresolvedIntents || []).every(
    intent => ["price_surgery", "price_consultation"].includes(intent) || candidate?.coveredIntents?.includes(intent),
  );
}

export function buildSemanticReplyConversationAction(
  conversationAction,
  decision,
  {
    deterministicReplyConfirmed = false,
    coordinationAcknowledgement = false,
    hasPendingHumanObligation = false,
  } = {},
) {
  const replyCode = String(decision?.replyCode || "").trim();
  const reviewReason = String(decision?.reviewReason || "").trim();
  const decisionValidated = validatedAutomaticDecision(decision);
  const contextClarification = decisionValidated && (
    replyCode === CONTEXT_CLARIFICATION_CODE ||
    reviewReason.startsWith("context_clarification:")
  );
  const unknownClarification = decisionValidated &&
    replyCode === UNKNOWN_CLARIFICATION_CODE;
  const contextReopen = decisionValidated && (
    replyCode === CONTEXT_REOPEN_CODE ||
    reviewReason.startsWith("context_reopen:")
  );
  const contextContinuation = decisionValidated && (
    replyCode === CONTEXT_CONTINUATION_CODE ||
    reviewReason.startsWith("context_continue:")
  );
  const coordinationConfirmed = decisionValidated &&
    coordinationAcknowledgement === true &&
    replyCode === COORDINATION_ACKNOWLEDGEMENT_CODE;
  const deterministicConfirmed = decisionValidated &&
    deterministicReplyConfirmed === true;
  const clarification = contextClarification || unknownClarification;
  const replyContract = conversationAction?.replyContract || null;
  // This only permits an informational continuation inside the original
  // response envelope; semantic continuation cannot acquire human ownership.
  const informationalContinuationAllowed = Boolean(
    decisionValidated &&
    (decision?.replyWording === "contextual" || contextClarification || contextContinuation) &&
    conversationAction?.action === "respond" &&
    (!conversationAction.owner || conversationAction.owner === "bruna") &&
    replyContract?.owner === "bruna" &&
    replyContract.allowedResponseKind === "direct_answer" &&
    ["green", "yellow"].includes(replyContract.risk) &&
    conversationAction.pendingHumanCommitmentAcknowledged !== true &&
    hasPendingHumanObligation !== true,
  );
  const effectiveContract = contextContinuation
    ? contextContinuationContract(replyContract)
    : clarification
    ? {
        ...(replyContract || {}),
        maxQuestions: 1,
        maxLinks: 0,
        allowCta: false,
        allowAppointmentConfirmation: false,
      }
    : replyContract;

  return {
    ...conversationAction,
    semanticReplyAuthorized: decisionValidated,
    semanticReplyCode: replyCode,
    semanticHumanContextReplyAuthorized:
      contextClarification ||
      unknownClarification ||
      contextReopen ||
      contextContinuation ||
      coordinationConfirmed ||
      deterministicConfirmed,
    replyContract: effectiveContract
      ? { ...effectiveContract, informationalContinuationAllowed }
      : effectiveContract,
  };
}
