import { UNKNOWN_CLARIFICATION_CODE } from "./knowledge-learning.mjs";

export const CONTEXT_CLARIFICATION_CODE = "CONTEXT-CLARIFY-01";
export const CONTEXT_REOPEN_CODE = "CONTEXT-REOPEN-01";
export const CONTEXT_CONTINUATION_CODE = "CONTEXT-CONTINUE-01";
export const COORDINATION_ACKNOWLEDGEMENT_CODE = "COORDINATION-ACK-01";

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
    maxQuestions: 0,
    maxLinks: 0,
    allowCta: false,
    allowAppointmentConfirmation: false,
  };
}

export function prepareSemanticContextContinuationAction(
  conversationAction,
) {
  const currentContract = conversationAction?.replyContract || {};
  const approvedInitialPricePath = Boolean(
    currentContract.sourceReason === "price_initial_information" &&
      currentContract.allowCta === true &&
      Number(currentContract.maxLinks) >= 1,
  );
  return {
    ...conversationAction,
    replyContract: {
      ...contextContinuationContract(
        currentContract,
      ),
      maxQuestions: approvedInitialPricePath ? 0 : 1,
      maxLinks: approvedInitialPricePath ? 1 : 0,
      allowCta: approvedInitialPricePath,
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

export function buildSemanticReplyConversationAction(
  conversationAction,
  decision,
  {
    deterministicReplyConfirmed = false,
    coordinationAcknowledgement = false,
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
    replyContract: contextContinuation
      ? contextContinuationContract(replyContract)
      : clarification
      ? {
          ...(replyContract || {}),
          maxQuestions: 1,
          maxLinks: 0,
          allowCta: false,
          allowAppointmentConfirmation: false,
        }
      : replyContract,
  };
}
