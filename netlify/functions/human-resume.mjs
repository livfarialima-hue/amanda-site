import { buildConsultationQuestionBundle } from './lib/consultation-question-bundle.mjs';
import { consultationQuestionTopics } from './lib/patient-turn-context.mjs';
import { coalesceUnansweredPatientBlock } from './lib/inbound-burst-context.mjs';
import { dispatchHumanResume, isHumanResumeBackgroundEnabled } from "./lib/human-resume-dispatch.mjs";
export { dispatchHumanResume } from "./lib/human-resume-dispatch.mjs";
import {
  enrichAutomationPlanFromConversation,
  planAutomation,
} from "./lib/whatsapp-automation.mjs";
import { allowsPatientSideEffects } from "./lib/automation-mode.mjs";
import {
  buildOvernightHandoffMessage,
  buildDelayedHumanReceipt,
  buildDelayedHumanReviewSuggestion,
  classifyHumanResume,
  hasConcreteResponseExpectation,
  isHumanResumeServiceOpen,
  nextHumanResumeServiceTime,
  shouldSendOvernightHandoff,
} from "./lib/human-resume-policy.mjs";
import {
  claimDueHumanResumes,
  completeHumanResume,
  isHumanResumeClaimCurrent,
  rescheduleHumanResume,
  updateHumanResumeDeliveryState,
} from "./lib/human-resume-queue.mjs";
import { runOpenAIShadow } from "./lib/openai-shadow.mjs";
import { shouldSendOpenAIPatientReply } from "./lib/patient-replies.mjs";
import {
  appendConversationTurn,
  readConversationTurns,
} from "./lib/conversation-memory.mjs";
import { sendYCloudPatientText } from "./lib/ycloud-patient-message.mjs";
import { sendYCloudReviewAlert, sendReviewAlertEmailCopy } from "./lib/ycloud-review-alert.mjs";
import { buildHumanReviewEnvelope, formatHumanReviewEnvelope } from "./lib/human-review-envelope.mjs";
import { applyPatientRelationshipPolicy, blocksAutomatedPatientMessages } from "./lib/patient-relationship.mjs";
import { callClassificationSheets } from "./lib/sheets-classification-client.mjs";
import { getDurableConversationContext } from "./lib/conversation-ledger.mjs";
import {
  buildSurgicalInitialPriceReply,
  buildSurgicalPriceHoldingReply,
  buildSurgicalPriceSuggestedReply,
  buildPriceReviewSourceNote,
} from "./lib/surgical-price-review.mjs";
import {
  CONVERSATION_ACTIONS,
  decideConversationAction,
  isExplicitNightPause,
} from "./lib/conversation-action-controller.mjs";
import { isBrunaConversionExperienceEnabled } from "./lib/bruna-conversion-experience.mjs";
import {
  buildMorningProcedureInterestOpening,
  buildMorningResumeOpening,
  isExtremeNight,
  isExtremeNightAcknowledgement,
  isMorningPromiseCourtesy,
} from "./lib/extreme-night-policy.mjs";
import {
  sendControlledPatientReply,
} from "./lib/outbound-reply-gate.mjs";
import {
  buildSemanticReplyConversationAction,
  prepareSemanticContextContinuationAction,
  semanticDecisionConfirmsDeterministicReply,
} from "./lib/semantic-reply-policy.mjs";
import {
  logCorrelationId,
  writeOperationalLog,
} from "./lib/operational-log.mjs";
export { buildOperationalLogRecord } from "./lib/operational-log.mjs";

const MAX_JOBS_PER_RUN = 5;
const PRICE_REVIEW_REASONS = new Set([
  "surgical_price_review",
  "price_without_confirmed_procedure",
  "surgical_price_range_review",
  "price_range_without_confirmed_procedure",
  "surgical_price_terms_review",
]);

function timeMs(value) {
  const parsed = new Date(value || 0).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

export function hasNewerOutboundReply(job, turns) {
  const patientAt = timeMs(job?.receivedAt);
  if (!patientAt) return false;

  return (Array.isArray(turns) ? turns : []).some((turn) => (
    turn?.role === "assistant" &&
    !isExtremeNightAcknowledgement(turn?.text) &&
    timeMs(turn.at) > patientAt
  ));
}

function hasNewerConversationActivity(job, turns) {
  const otherTurns = (Array.isArray(turns) ? turns : []).filter(turn =>
    !(turn.source === "bruna" && String(turn.eventId || "").startsWith(`${job.eventId}-human-resume-`)));
  return hasNewerOutboundReply(job, otherTurns) || otherTurns.some(turn =>
    ["user", "patient"].includes(turn.role) && timeMs(turn.at) > timeMs(job.receivedAt) &&
    !(job.morningResume === true && isMorningPromiseCourtesy(turn.text)));
}

async function readCurrentRelationship(job, dependencies = {}) {
  const lookup = dependencies.callClassificationSheetsImpl || callClassificationSheets;
  const env = dependencies.env || process.env;
  return lookup("get_patient_relationship", { patient: { phone: job.phone, professional: job.professional || "", includeIdentity: false } }, {
    env, timeoutMs: isHumanResumeBackgroundEnabled(env) ? 20_000 : 8_000,
  });
}

function limitedText(value, maximumLength = 260) {
  return Array.from(String(value || "").trim())
    .slice(0, maximumLength)
    .join("");
}

function alertText(
  job,
  {
    kind,
    reason,
    holdingSent = false,
    suggestedReply = "",
  },
) {
  const heading = {
    sensitive: "RETOMADA HUMANA — TEMA RESERVADO",
    observation: "RETOMADA HUMANA — REVISAR CONVERSA",
  }[kind] || "RETOMADA HUMANA — RESPOSTA NECESSÁRIA";

  const history = (job.recentConversation || []).slice(-10).map(turn =>
    `${turn.source || turn.role}: ${limitedText(turn.text, 300)}`).join("\n");
  const envelope = buildHumanReviewEnvelope({
    reason, professional: job.professional, relationship: job.patientRelationship,
    urgent: reason === "possible_urgent_symptoms", suggestedReply,
    actionRequired: "Conferir a pendência e responder no WhatsApp; não repetir informação já enviada pela equipe.",
    contextSummary: [
      heading,
      PRICE_REVIEW_REASONS.has(reason) ? buildPriceReviewSourceNote({procedure: job.procedure, currentText: job.text, recentConversation: job.recentConversation}) : "",
      `Última entrada: ${job.receivedAt || "horário indisponível"}`,
      `Mensagem: ${limitedText(job.text, 1500) || "Material recebido sem texto legível."}`,
      holdingSent ? "A confirmação de recebimento já foi enviada uma única vez." : "Nenhuma mensagem automática foi enviada à paciente nesta tentativa. Após entregar este alerta, poderá sair no máximo uma confirmação curta de recebimento.",
      history,
    ].join("\n"),
  });
  return formatHumanReviewEnvelope(envelope);
}

async function retryJob(job, status, dependencies = {}, dueAt = null) {
  const reschedule = dependencies.rescheduleHumanResumeImpl || rescheduleHumanResume;
  const now = dependencies.now ?? Date.now();
  let delayAlertStatus;
  if (job.morningResume === true && job.attempts >= 3 &&
      ["context_unavailable", "contact_context_unavailable", "pre_send_context_unavailable"].includes(status)) {
    const current = dependencies.isHumanResumeClaimCurrentImpl || isHumanResumeClaimCurrent;
    if (await current(job)) {
      const alert = dependencies.sendReviewAlertEmailCopyImpl || sendReviewAlertEmailCopy;
      const sent = await alert({ eventId: `${job.eventId}-morning-delay-alert`, patientName: job.patientName, patientPhone: job.phone,
        messageText: "RETORNO PROMETIDO PELA MANHÃ — ATRASO TÉCNICO\nNão foi possível concluir a consulta aos dados do atendimento. A retomada permanece pendente e será verificada novamente em cinco minutos. Conferir a conversa e responder se necessário; uma intervenção humana cancela a resposta automática antiga. Nenhum envio ao paciente foi iniciado nesta tentativa." }, { env: dependencies.env || process.env });
      // The existing email adapter deduplicates by event ID. Do not turn this
      // technical warning into a human-ownership change or a patient receipt.
      delayAlertStatus = sent?.status || "failed";
    }
  }
  // A promised morning return stays on the five-minute recovery cadence.
  const delayMinutes = job.morningResume === true ? 5 : Math.min(30, 5 * Math.max(1, job.attempts || 1));
  const retried = await reschedule(job, dueAt ?? now + delayMinutes * 60000);
  return { status: retried.status === "superseded" ? "superseded" : status, reason: status, ...(delayAlertStatus ? { delayAlertStatus } : {}) };
}

async function recordDelivery(job, updates, dependencies) {
  const persist = dependencies.updateHumanResumeDeliveryStateImpl || updateHumanResumeDeliveryState;
  return persist(job, updates, { now: dependencies.now });
}

async function alertReviewer(job, details, dependencies = {}) {
  const currentCheck =
    dependencies.isHumanResumeClaimCurrentImpl ||
    isHumanResumeClaimCurrent;
  const current = await currentCheck(job);
  if (!current) {
    return {
      status: "superseded",
      errorCode: "newer_activity",
    };
  }

  const sendAlert =
    dependencies.sendYCloudReviewAlertImpl ||
    sendYCloudReviewAlert;

  const now = dependencies.now ?? Date.now();
  const alertEventId = `${job.eventId}-human-resume-alert`;
  if (job.alertEventId === alertEventId && job.alertDeliveredAt) return { status: "completed", emailStatus: "completed" };
  if (job.alertDeliveredAt && details.reason !== "possible_urgent_symptoms" &&
      now < timeMs(job.alertDeliveredAt) + 30 * 60000) {
    return { status: "throttled", retryAt: timeMs(job.alertDeliveredAt) + 30 * 60000 };
  }
  const result = await sendAlert({
    from: job.from,
    eventId: alertEventId,
    patientName: job.patientName,
    patientPhone: job.phone,
    messageText: alertText(job, details),
    urgent:
      details.reason === "possible_urgent_symptoms",
    expectedHumanResumeGeneration: job.generation,
  });
  if (result.emailStatus === "completed" || (result.status === "completed" && !result.emailStatus)) {
    const saved = await recordDelivery(job, { alertDelivered: true, alertEventId }, dependencies);
    if (saved.status === "completed") {
      job.alertEventId = alertEventId;
      job.alertDeliveredAt = new Date(now).toISOString();
      return { ...result, status: "completed" };
    }
    return { status: saved.status === "superseded" ? "superseded" : "failed", errorCode: "alert_receipt_not_persisted" };
  }
  return { ...result, status: result.emailStatus === "failed" ? "failed" : result.status };
}

async function sendPatientMessage(
  job,
  body,
  suffix,
  conversationAction,
  dependencies = {},
) {
  const currentCheck =
    dependencies.isHumanResumeClaimCurrentImpl ||
    isHumanResumeClaimCurrent;
  const current = await currentCheck(job);
  if (!current) {
    return {
      status: "superseded",
      httpStatus: null,
      errorCode: "newer_activity",
    };
  }

  const sendPatient =
    dependencies.sendControlledPatientReplyImpl ||
    sendControlledPatientReply;
  let contextError = "";
  const finalCheck = async () => {
    const read = dependencies.readConversationTurnsImpl || readConversationTurns;
    const latest = await read(job.phone);
    if (latest?.status !== "completed") { contextError = "context_unavailable"; return false; }
    if (hasNewerConversationActivity(job, latest.turns)) return false;
    const lookup = await readCurrentRelationship(job, dependencies);
    if (lookup.status !== "completed" || !lookup.data?.relationship) { contextError = "contact_context_unavailable"; return false; }
    if (blocksAutomatedPatientMessages(lookup.data.relationship)) return false;
    if (conversationAction?.action === CONVERSATION_ACTIONS.RESPOND &&
        applyPatientRelationshipPolicy({ route: "standard_reply", automaticAllowed: true }, lookup.data.relationship).automaticAllowed === false) return false;
    return currentCheck(job);
  };
  if (job.patientWindowClosed || blocksAutomatedPatientMessages(job.patientRelationship)) {
    return { status: "blocked", errorCode: "patient_contact_not_allowed" };
  }
  if (!await finalCheck()) return { status: contextError ? "deferred" : "superseded", errorCode: contextError || "newer_activity" };
  const result = await sendPatient({
    from: job.from,
    to: job.phone,
    eventId: `${job.eventId}-${suffix}`,
    body,
    currentText: job.text,
    recentConversation: job.recentConversation,
    conversationAction,
    opportunityId: job.opportunityId,
    professional: job.professional,
  }, {
    beforeSendImpl: finalCheck,
    sendYCloudPatientTextImpl:
      dependencies.sendYCloudPatientTextImpl ||
      sendYCloudPatientText,
  });
  return contextError && result.status === "superseded" ? { ...result, status: "deferred", errorCode: contextError } : result;
}

async function recordBrunaTurn(job, text, suffix, dependencies = {}) {
  const appendTurn =
    dependencies.appendConversationTurnImpl ||
    appendConversationTurn;

  return appendTurn({
    phone: job.phone,
    role: "assistant",
    text,
    eventId: `${job.eventId}-${suffix}`,
    source: "bruna",
  });
}

async function finish(job, controlStatus, dependencies = {}) {
  const complete =
    dependencies.completeHumanResumeImpl ||
    completeHumanResume;
  const retainedStatus = ["bruna_resumed", "human_active"].includes(controlStatus) && job.preserveHumanOwnership
    ? "waiting_human" : controlStatus;
  return complete(job, { controlStatus: retainedStatus });
}

async function finishReply(job, reason, dependencies) {
  const completed = await finish(job, "bruna_resumed", dependencies);
  return {
    status: completed.status !== "completed" ? (completed.status === "superseded" ? "superseded" : "reply_sent_control_pending")
      : job.preserveHumanOwnership ? "waiting_human" : "bruna_resumed",
    reason, replied: true,
  };
}

async function deliverScheduledMorningResume(
  job,
  reply,
  dependencies = {},
) {
  const body = String(reply || "").trim();

  if (!body) {
    const reason = "morning_resume_context_required";
    return alertOnly(job, reason, dependencies);
  }

  const morningAction = {
    action: CONVERSATION_ACTIONS.RESPOND,
    allowHoldingReply: false,
    followupPolicy: "morning_resume",
  };
  const sendResult = await sendPatientMessage(
    job,
    body,
    "morning-resume",
    morningAction,
    dependencies,
  );

  if (sendResult.status !== "completed") {
    if (sendResult.status === "superseded") {
      return { status: "superseded", reason: "newer_activity" };
    }
    const reason =
      sendResult.errorCode || "morning_resume_delivery_failed";
    return deliveryFailure(job, reason, dependencies, body);
  }

  await recordBrunaTurn(
    job,
    body,
    "morning-resume-memory",
    dependencies,
  );
  return finishReply(job, "scheduled_morning_resume", dependencies);
}

async function holdAndAlert(
  job,
  reason,
  dependencies = {},
  holdingMessage = "",
  suggestedReply = "",
  conversationAction = null,
) {
  const alertResult = await alertReviewer(job, {
    kind: "uncertain", reason, holdingSent: job.holdingSent === true,
    suggestedReply: suggestedReply || buildDelayedHumanReviewSuggestion({ ...job, reason }),
  }, dependencies);
  if (alertResult.status === "superseded") return { status: "superseded", reason: "newer_activity" };
  if (alertResult.status !== "completed") {
    return retryJob(job, "alert_retry_pending", dependencies, alertResult.retryAt);
  }
  const holdingAction =
    conversationAction?.action ===
      CONVERSATION_ACTIONS.WAIT_TEAM
      ? conversationAction
      : {
          action: CONVERSATION_ACTIONS.WAIT_TEAM,
          allowHoldingReply: true,
        };
  const contextualHolding = job.receiptAttemptedAt || job.patientWindowClosed || blocksAutomatedPatientMessages(job.patientRelationship)
    ? ""
    : String(holdingMessage || buildDelayedHumanReceipt({ ...job, reason })).trim();
  const receiptReservation = contextualHolding
    ? await recordDelivery(job, { receiptAttempted: true }, dependencies)
    : { status: "skipped" };
  if (receiptReservation.status === "superseded") return { status: "superseded", reason: "newer_activity" };
  const holdingResult = contextualHolding && receiptReservation.status === "completed"
    ? await sendPatientMessage(
        job,
        contextualHolding,
        "human-resume-holding",
        holdingAction,
        dependencies,
      )
    : { status: "skipped", errorCode: "no_contextual_holding_reply" };
  const holdingSent = holdingResult.status === "completed";

  if (holdingResult.status === "superseded") {
    return {
      status: "superseded",
      holdingSent: false,
      reason: "newer_activity",
    };
  }

  if (holdingSent) {
    await recordDelivery(job, { holdingSent: true }, dependencies);
    await recordBrunaTurn(
      job,
      contextualHolding,
      "human-resume-holding-memory",
      dependencies,
    );
  }

  await finish(job, "waiting_human", dependencies);

  return {
    status: "waiting_human",
    holdingSent,
    reason,
  };
}

async function alertOnly(
  job,
  reason,
  dependencies = {},
  suggestedReply = "",
) {
  const alertResult = await alertReviewer(
    job,
    {
      kind: "observation",
      reason,
      holdingSent: false,
      suggestedReply,
    },
    dependencies,
  );
  if (alertResult.status === "superseded") {
    return {
      status: "superseded",
      reason: "newer_activity",
    };
  }

  if (alertResult.status !== "completed") return retryJob(job, "alert_retry_pending", dependencies, alertResult.retryAt);

  await finish(job, "waiting_human", dependencies);
  return {
    status: "waiting_human",
    holdingSent: false,
    reason,
  };
}

async function deliveryFailure(job, reason, dependencies, suggestion = "") {
  if (["context_unavailable", "contact_context_unavailable", "pre_send_context_unavailable"].includes(reason)) return retryJob(job, reason, dependencies);
  const result = await alertOnly(job, reason, dependencies, suggestion);
  return result.status === "waiting_human" ? { status: "delivery_failed", reason } : result;
}

export async function processHumanResumeJob(
  job,
  {
    env = process.env,
    now = Date.now(),
    ...dependencies
  } = {},
) {
  dependencies = { ...dependencies, now, env };
  job = { ...job, patientWindowClosed: now - timeMs(job.receivedAt) >= 24 * 60 * 60000 };
  if (!allowsPatientSideEffects(env.WHATSAPP_AUTOMATION_MODE)) {
    const reschedule =
      dependencies.rescheduleHumanResumeImpl ||
      rescheduleHumanResume;
    await reschedule(
      job,
      now + 15 * 60 * 1_000,
    );
    return { status: "automation_inactive" };
  }

  const urgentInput = planAutomation({ text: job.text, messageType: job.messageType }).reason === "possible_urgent_symptoms";
  if (isExtremeNight(now, env) && !urgentInput) {
    const reschedule =
      dependencies.rescheduleHumanResumeImpl ||
      rescheduleHumanResume;
    const dueAt = nextHumanResumeServiceTime(now, env);
    await reschedule(job, dueAt);
    return {
      status: "deferred_to_morning",
      dueAt: new Date(dueAt).toISOString(),
    };
  }

  const readCurrentConversation =
    dependencies.readConversationTurnsImpl ||
    readConversationTurns;
  const currentConversation =
    await readCurrentConversation(job.phone);
  if (currentConversation?.status !== "completed") return retryJob(job, "context_unavailable", dependencies);
  if (
    currentConversation?.status === "completed" &&
    hasNewerConversationActivity(job, currentConversation.turns)
  ) {
    await finish(job, "human_active", dependencies);
    return {
      status: "superseded",
      reason: "newer_outbound_reply",
    };
  }
  if (
    currentConversation?.status === "completed" &&
    currentConversation.turns?.length
  ) {
    job = {
      ...job,
      recentConversation: currentConversation.turns.slice().sort((a, b) => timeMs(a.at) - timeMs(b.at)).slice(-20),
    };
  }

  const relationshipLookup = await readCurrentRelationship(job, dependencies);
  if (relationshipLookup.status !== "completed" || !relationshipLookup.data?.relationship) return retryJob(job, "contact_context_unavailable", dependencies);
  job.patientRelationship = relationshipLookup.data.relationship;
  if (blocksAutomatedPatientMessages(job.patientRelationship)) return alertOnly(job, "contact_preference_no_bot", dependencies);
  const readDurable = dependencies.getDurableConversationContextImpl || getDurableConversationContext;
  const durable = await readDurable({ phone: job.phone, opportunityId: job.opportunityId, professional: job.professional, limit: 20 }, {
    callSheetsImpl: (action, payload, options) => (dependencies.callClassificationSheetsImpl || callClassificationSheets)(action, payload, {
      ...options, env, ...(isHumanResumeBackgroundEnabled(env) ? { timeoutMs: 20_000 } : {}),
    }),
  });
  if (durable.status !== "completed") return retryJob(job, "context_unavailable", dependencies);
  if (hasNewerConversationActivity(job, durable.turns)) {
    await finish(job, "human_active", dependencies);
    return { status: "superseded", reason: "newer_conversation_activity" };
  }
  // Keep the freshest activity guard in memory and consult the durable ledger
  // for commitments and history that survive a cache reset.
  if (durable.turns?.length > (job.recentConversation?.length || 0)) job.recentConversation = durable.turns;
  const unansweredBlock = coalesceUnansweredPatientBlock({recentConversation:job.recentConversation,
    currentText:job.text, currentEventId:job.eventId, currentAt:job.receivedAt});
  if (unansweredBlock.coalesced && consultationQuestionTopics(unansweredBlock.text).length >= 2) {
    job = {...job, text:unansweredBlock.text, recentConversation:unansweredBlock.recentConversation};
  }
  job.pendingCommitments = durable.pendingCommitments || [];
  if (job.pendingCommitments.length) job.preserveHumanOwnership = true;

  const outsideServiceHours = !isHumanResumeServiceOpen(now, env);

  const currentMessagePlan = planAutomation({
    text: job.text,
    messageType: job.messageType,
    reference: job.reference,
    platform: job.platform,
    referralContext: job.referralContext,
    templateId: job.templateId,
  });
  const preliminaryPlan =
    !currentMessagePlan.procedure && job.procedure
      ? {
          ...currentMessagePlan,
          procedure: job.procedure,
        }
      : currentMessagePlan;
  const enrichedPlan = applyPatientRelationshipPolicy(enrichAutomationPlanFromConversation(
    preliminaryPlan,
    job.recentConversation,
    now,
  ), job.patientRelationship);
  job.professional = job.professional || enrichedPlan.professional || "";
  if (enrichedPlan.patientRelationship?.hasPendingHumanTask || /^known_patient_active/.test(enrichedPlan.reason || "")) job.preserveHumanOwnership = true;
  const policy = classifyHumanResume({
    text: job.text,
    messageType: job.messageType,
    preliminaryPlan,
    enrichedPlan,
    recentConversation: job.recentConversation,
    pendingCommitments: job.pendingCommitments,
  });
  const semanticPlan =
    policy.action === "attempt_reply" &&
    [
      "semantic_coordination_candidate",
      "semantic_context_continuation_candidate",
    ].includes(policy.reason)
      ? {
          ...enrichedPlan,
          route: "standard_reply",
          reason: policy.reason,
          automaticAllowed: true,
          humanContextContinuationCandidate:
            policy.reason ===
            "semantic_context_continuation_candidate",
        }
      : enrichedPlan;
  const conversationAction = decideConversationAction({
    text: job.text,
    messageType: job.messageType,
    plan: semanticPlan,
    recentConversation: job.recentConversation,
    humanTakeoverActive: false,
    pendingCommitments: job.pendingCommitments,
    schedulingRequest:
      policy.reason === "scheduling_or_confirmation",
    conversionExperienceEnabled:
      isBrunaConversionExperienceEnabled(env),
  });
  const openAIConversationAction =
    policy.reason === "semantic_context_continuation_candidate"
      ? prepareSemanticContextContinuationAction(
          conversationAction,
        )
      : conversationAction;

  if (job.morningResume === true && policy.action === "attempt_reply") {
    const procedureInterestReply =
      buildMorningProcedureInterestOpening({
        patientName: job.patientName,
        procedure: enrichedPlan.procedure || job.procedure,
        currentText: job.text,
      });

    if (procedureInterestReply) {
      return deliverScheduledMorningResume(
        job,
        procedureInterestReply,
        dependencies,
      );
    }
  }

  if (
    job.morningResume === true &&
    ["no_action", "alert_only"].includes(policy.action) &&
    isExplicitNightPause(job.text)
  ) {
    const reply = buildMorningResumeOpening({
      patientName: job.patientName,
      procedure: enrichedPlan.procedure || job.procedure,
      currentText: job.text,
      recentConversation: job.recentConversation,
    });
    return deliverScheduledMorningResume(
      job,
      reply,
      dependencies,
    );
  }

  if (policy.action === "no_action") {
    await finish(job, "human_active", dependencies);
    return {
      status: "no_action",
      reason: policy.reason,
    };
  }

  if (job.patientWindowClosed) return alertOnly(job, "patient_window_expired", dependencies);

  if (policy.action === "sensitive") {
    if (PRICE_REVIEW_REASONS.has(policy.reason)) {
      const priceProcedure =
        enrichedPlan.procedure ||
        job.procedure ||
        null;
      return holdAndAlert(
        { ...job, procedure: priceProcedure },
        policy.reason,
        dependencies,
        buildSurgicalPriceHoldingReply({
          patientName: job.patientName,
          procedure: priceProcedure,
          overnight: outsideServiceHours,
          currentText: job.text,
          recentConversation: job.recentConversation,
          introduceBruna: false,
        }),
        buildSurgicalPriceSuggestedReply({
          patientName: job.patientName,
          procedure: priceProcedure,
          recentConversation: job.recentConversation,
          referenceCategory: job.referenceCategory,
          sourceReference: job.reference,
          currentText: job.text,
          introduceBruna: false,
        }),
        conversationAction,
      );
    }

    if (
      outsideServiceHours &&
      shouldSendOvernightHandoff(policy.reason)
    ) {
      return holdAndAlert(
        job,
        policy.reason,
        dependencies,
        buildOvernightHandoffMessage(policy.reason, {
          text: job.text,
          procedure: enrichedPlan.procedure || job.procedure,
        }),
        "",
        conversationAction,
      );
    }

    return holdAndAlert(job, policy.reason, dependencies, "", "", conversationAction);
  }

  if (policy.action === "holding_and_alert") {
    return holdAndAlert(
      job,
      policy.reason,
      dependencies,
      outsideServiceHours
        ? buildOvernightHandoffMessage(policy.reason, {
            text: job.text,
            procedure: enrichedPlan.procedure || job.procedure,
          })
        : "",
      "",
      conversationAction,
    );
  }

  if (policy.action === "alert_only") {
    return alertOnly(job, policy.reason, dependencies);
  }

  const consultationBundle = buildConsultationQuestionBundle({plan:enrichedPlan, text:job.text,
    recentConversation:job.recentConversation, patientName:job.patientName, introduceBruna:false});
  const approvedPriceReplyKind = consultationBundle ? 'consultation_bundle' :
    enrichedPlan.reason === "price_initial_information"
      ? "initial_information"
      : enrichedPlan.reason === "lifting_price_range_direct" &&
          ["lifting_facial", "lifting_cervical"].includes(
            enrichedPlan.procedure,
          )
        ? "lifting_range"
        : enrichedPlan.reason === "otoplasty_price_range_direct" &&
            enrichedPlan.procedure === "otoplastia"
          ? "otoplasty_range"
        : "";
  const approvedPriceReplyCode = consultationBundle?.candidate.decision.replyCode || (
    approvedPriceReplyKind === "lifting_range"
      ? "LIFTING-PRICE-RANGE-01"
      : approvedPriceReplyKind === "otoplasty_range"
        ? "OTOPLASTY-PRICE-RANGE-01"
      : approvedPriceReplyKind === "initial_information"
        ? "SURGICAL-PRICE-INITIAL-01"
        : "");
  const approvedPriceReply = consultationBundle?.body || (
    approvedPriceReplyKind === "initial_information"
      ? buildSurgicalInitialPriceReply({
          patientName: job.patientName,
          procedure: enrichedPlan.procedure || job.procedure,
          recentConversation: job.recentConversation,
          currentText: job.text,
          introduceBruna: false,
        })
      : ["lifting_range", "otoplasty_range"].includes(
          approvedPriceReplyKind,
        )
        ? buildSurgicalPriceSuggestedReply({
            patientName: job.patientName,
            procedure:
              enrichedPlan.procedure || job.procedure || "lifting_facial",
            recentConversation: job.recentConversation,
            referenceCategory: job.referenceCategory,
            sourceReference: job.reference,
            directToPatient: true,
            currentText: job.text,
            introduceBruna: false,
          })
        : "");
  const approvedPriceReplyCandidate = consultationBundle?.candidate || (approvedPriceReply
    ? {
        status: "completed",
        decision: {
          route: "standard_reply",
          confidence: "high",
          automaticAllowed: true,
          urgent: false,
          professional: "amanda",
          procedure:
            approvedPriceReplyKind === "lifting_range"
              ? enrichedPlan.procedure || job.procedure || "lifting_facial"
              : approvedPriceReplyKind === "otoplasty_range"
                ? "otoplastia"
                : enrichedPlan.procedure || job.procedure || "",
          replyCode: approvedPriceReplyCode,
          suggestedReply: approvedPriceReply,
          reviewReason: "",
        },
      }
    : null);
  const runOpenAI =
    dependencies.runOpenAIShadowImpl || runOpenAIShadow;
  const aiResult = await runOpenAI(
    {
      phone: job.phone,
      text: job.text,
      platform: job.platform,
      procedure: enrichedPlan.procedure || job.procedure,
      referenceCategory: job.referenceCategory,
      patientProfileName: job.patientName,
      recentConversation: job.recentConversation,
      referralContext: job.referralContext,
      policyHints: {
        ...semanticPlan,
        deterministicReplyCode: approvedPriceReplyCode,
        deterministicReplyPreview: approvedPriceReply,
        deterministicReplyProfessional:
          approvedPriceReplyCandidate?.decision?.professional || "",
        deterministicReplyProcedure:
          approvedPriceReplyCandidate?.decision?.procedure || "",
      },
      replyContract: openAIConversationAction.replyContract,
      deterministicUrgent:
        enrichedPlan.reason === "possible_urgent_symptoms",
    },
    { env },
  );
  const approvedPriceReplyConfirmed =
    semanticDecisionConfirmsDeterministicReply(
      aiResult,
      approvedPriceReplyCandidate,
    );
  const deterministicReplyContextMismatch = Boolean(
    approvedPriceReplyCandidate &&
      aiResult.status === "completed" &&
      (consultationBundle && aiResult.decision?.route === 'standard_reply' || ["SURGICAL-PRICE-INITIAL-01", "LIFTING-PRICE-RANGE-01", "OTOPLASTY-PRICE-RANGE-01"].includes(
        aiResult.decision?.replyCode,
      )) &&
      !approvedPriceReplyConfirmed,
  );

  if (aiResult.status === "completed" && aiResult.decision?.urgent === true) {
    return alertOnly(job, "possible_urgent_symptoms", dependencies);
  }

  if (deterministicReplyContextMismatch) {
    return alertOnly(job, "deterministic_context_mismatch", dependencies);
  }

  const maySend =
    aiResult.status === "completed" &&
    shouldSendOpenAIPatientReply({
      mode: "active",
      plan: semanticPlan,
      decision: aiResult.decision,
      humanTakeoverToday:
        policy.reason ===
        "semantic_context_continuation_candidate",
      exactDuplicate: false,
      schedulingRequest: false,
      allowHumanContextContinuation:
        policy.reason ===
        "semantic_context_continuation_candidate",
    });

  if (
    aiResult.status === "completed" &&
    aiResult.decision?.route === "ignore"
  ) {
    await finish(job, "human_active", dependencies);
    return {
      status: "no_action",
      reason:
        aiResult.decision.reviewReason ||
        "semantic_no_response_required",
    };
  }

  if (!maySend) {
    const reason =
      aiResult.decision?.reviewReason ||
      aiResult.errorCode ||
      "low_confidence";
    const suggestedReply = String(
      aiResult.decision?.suggestedReply || "",
    ).trim();

    if (
      hasConcreteResponseExpectation(
        job.text,
        job.recentConversation,
      )
    ) {
      return holdAndAlert(
        job,
        reason,
        dependencies,
        "",
        aiResult.decision?.route === "human_review" && aiResult.decision?.confidence === "high" && !aiResult.decision?.urgent
          ? suggestedReply : "",
        {
          action: CONVERSATION_ACTIONS.WAIT_TEAM,
          allowHoldingReply: true,
        },
      );
    }

    return alertOnly(
      job,
      reason,
      dependencies,
      suggestedReply,
    );
  }

  const semanticConversationAction = buildSemanticReplyConversationAction(
    openAIConversationAction,
    aiResult.decision,
    {
      deterministicReplyConfirmed: approvedPriceReplyConfirmed,
      coordinationAcknowledgement:
        policy.reason === "semantic_coordination_candidate",
    },
  );

  if (
    approvedPriceReplyKind &&
    approvedPriceReplyConfirmed
  ) {
    const reply = approvedPriceReply;
    if (consultationBundle?.pendingDetails.length) {
      return holdAndAlert(job, 'consultation_details_review', dependencies, reply,
        `Confirmar: ${consultationBundle.pendingDetails.join('; ')}.\nResposta com fatos já confirmados: ${reply}`,
        {...semanticConversationAction, action:CONVERSATION_ACTIONS.WAIT_TEAM, allowHoldingReply:true});
    }
    const sendResult = await sendPatientMessage(
      job,
      reply,
      "human-resume-lifting-price",
      semanticConversationAction,
      dependencies,
    );

    if (sendResult.status !== "completed") {
      if (sendResult.status === "superseded") {
        return {
          status: "superseded",
          reason: "newer_activity",
        };
      }
      return deliveryFailure(job, sendResult.errorCode || "approved_price_delivery_failed", dependencies, reply);
    }

    await recordBrunaTurn(
      job,
      reply,
      "human-resume-approved-price-memory",
      dependencies,
    );
    return finishReply(job, enrichedPlan.reason, dependencies);
  }

  const reply = String(aiResult.decision.suggestedReply || "").trim();
  const sendResult = await sendPatientMessage(
    job,
    reply,
    "human-resume-reply",
    semanticConversationAction,
    dependencies,
  );

  if (sendResult.status !== "completed") {
    if (sendResult.status === "superseded") {
      return {
        status: "superseded",
        reason: "newer_activity",
      };
    }
    return deliveryFailure(job, sendResult.errorCode || "automatic_reply_delivery_failed", dependencies);
  }

  await recordBrunaTurn(
    job,
    reply,
    "human-resume-reply-memory",
    dependencies,
  );
  return finishReply(job, policy.reason, dependencies);
}

async function runLegacyScheduledHumanResumes() {
  const claim = await claimDueHumanResumes({
    limit: MAX_JOBS_PER_RUN,
  });

  if (claim.status !== "completed" || !claim.jobs.length) {
    const status = claim.status === "completed" ? "idle" : "claim_failed";
    writeOperationalLog({
      source: "human_resume_schedule",
      category: "human_resume_schedule",
      reason: status,
      fields: {
        status,
        jobs: 0,
      },
    });
    return;
  }

  const results = [];
  for (const job of claim.jobs) {
    const result = await processHumanResumeJob(job);
    results.push({
      correlationId: logCorrelationId(job.eventId),
      ...result,
    });
  }

  writeOperationalLog({
    source: "human_resume_schedule",
    category: "human_resume_schedule",
    reason: "processed",
    fields: {
      status: "processed",
      jobs: results.length,
      results,
    },
  });
}

export async function runHumanResumeBatch({
  claimImpl = claimDueHumanResumes, processImpl = processHumanResumeJob,
  rescheduleImpl = rescheduleHumanResume, now = Date.now, logImpl = writeOperationalLog,
} = {}) {
  const startedAt = now();
  const results = [];
  let status = "idle";
  while (results.length < MAX_JOBS_PER_RUN && now() - startedAt < 10 * 60_000) {
    // Waiting jobs keep their lease until the worker is actually ready for them.
    const claim = await claimImpl({ limit: 1 });
    if (claim.status !== "completed") { status = "claim_failed"; break; }
    const [job] = claim.jobs;
    if (!job) break;
    let result;
    try { result = await processImpl(job); }
    catch {
      // A retry still goes through the durable outbound gate; an attempted or
      // uncertain provider send can never be repeated by this recovery path.
      const retry = await rescheduleImpl(job, now() + 5 * 60_000);
      result = { status: retry?.status === "completed" ? "rescheduled" : "reschedule_failed", reason: "processing_failed" };
    }
    results.push({ correlationId: logCorrelationId(job.eventId), attempts: job.attempts, ...result });
    status = "processed";
    logImpl({ source: "human_resume_worker", category: "human_resume_schedule", reason: result.reason || result.status,
      sourceId: job.eventId, fields: { ...result, attempts: job.attempts, morningResume: job.morningResume === true, execution: "background" } });
  }
  const result = { status, jobs: results.length, results };
  logImpl({ source: "human_resume_schedule", category: "human_resume_schedule", reason: status, fields: { ...result, execution: "background" } });
  return result;
}

export default async () => {
  if (isHumanResumeBackgroundEnabled()) return dispatchHumanResume();
  return runLegacyScheduledHumanResumes();
};

export const config = {
  schedule: "*/5 * * * *",
};
