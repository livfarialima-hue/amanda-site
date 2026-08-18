import {
  enrichAutomationPlanFromConversation,
  normalizeAutomationMode,
  planAutomation,
} from "./lib/whatsapp-automation.mjs";
import {
  buildOvernightHandoffMessage,
  buildSimpleCoordinationReply,
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
} from "./lib/human-resume-queue.mjs";
import { runOpenAIShadow } from "./lib/openai-shadow.mjs";
import { shouldSendOpenAIPatientReply } from "./lib/patient-replies.mjs";
import {
  appendConversationTurn,
  readConversationTurns,
} from "./lib/conversation-memory.mjs";
import { sendYCloudPatientText } from "./lib/ycloud-patient-message.mjs";
import { sendYCloudReviewAlert } from "./lib/ycloud-review-alert.mjs";
import {
  buildSurgicalInitialPriceReply,
  buildSurgicalPriceHoldingReply,
  buildSurgicalPriceSuggestedReply,
} from "./lib/surgical-price-review.mjs";
import {
  CONVERSATION_ACTIONS,
  decideConversationAction,
  isExplicitNightPause,
} from "./lib/conversation-action-controller.mjs";
import {
  buildMorningResumeOpening,
  isExtremeNight,
  isExtremeNightAcknowledgement,
} from "./lib/extreme-night-policy.mjs";
import {
  sendControlledPatientReply,
} from "./lib/outbound-reply-gate.mjs";
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

  if (suggestedReply) {
    return [
      heading,
      `Mensagem: ${limitedText(job.text, 100) || "Sem texto."}`,
      holdingSent
        ? "A mensagem de espera foi enviada uma única vez. A automação permanecerá em silêncio até sua resposta."
        : "Nenhuma mensagem automática foi enviada à paciente.",
      `Sugestão para copiar após conferir: ${limitedText(suggestedReply, 820)}`,
    ].join("\n");
  }

  return [
    heading,
    "A paciente aguardou mais de 20 minutos após a tomada humana.",
    `Mensagem: ${limitedText(job.text) || "Sem texto."}`,
    `Motivo interno: ${limitedText(reason, 120) || "confirmação humana"}.`,
    holdingSent
      ? "A mensagem de espera foi enviada uma única vez. A automação permanecerá em silêncio até sua resposta."
      : "Nenhuma mensagem automática foi enviada à paciente.",
  ].filter(Boolean).join("\n");
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

  return sendAlert({
    from: job.from,
    eventId: `${job.eventId}-human-resume-alert`,
    patientName: job.patientName,
    patientPhone: job.phone,
    messageText: alertText(job, details),
    urgent:
      details.reason === "possible_urgent_symptoms",
  });
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
  return sendPatient({
    from: job.from,
    to: job.phone,
    eventId: `${job.eventId}-${suffix}`,
    body,
    currentText: job.text,
    recentConversation: job.recentConversation,
    conversationAction,
  }, {
    sendYCloudPatientTextImpl:
      dependencies.sendYCloudPatientTextImpl ||
      sendYCloudPatientText,
  });
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
  return complete(job, { controlStatus });
}

async function holdAndAlert(
  job,
  reason,
  dependencies = {},
  holdingMessage = "",
  suggestedReply = "",
  conversationAction = null,
) {
  const holdingAction =
    conversationAction?.action ===
      CONVERSATION_ACTIONS.WAIT_TEAM
      ? conversationAction
      : {
          action: CONVERSATION_ACTIONS.WAIT_TEAM,
          allowHoldingReply: true,
        };
  const contextualHolding = String(holdingMessage || "").trim();
  const holdingResult = contextualHolding
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
    await recordBrunaTurn(
      job,
      contextualHolding,
      "human-resume-holding-memory",
      dependencies,
    );
  }

  await alertReviewer(
    job,
    {
      kind: "uncertain",
      reason,
      holdingSent,
      suggestedReply,
    },
    dependencies,
  );
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

  await finish(job, "waiting_human", dependencies);
  return {
    status: "waiting_human",
    holdingSent: false,
    reason,
  };
}

export async function processHumanResumeJob(
  job,
  {
    env = process.env,
    now = Date.now(),
    ...dependencies
  } = {},
) {
  if (normalizeAutomationMode(env.WHATSAPP_AUTOMATION_MODE) !== "active") {
    const reschedule =
      dependencies.rescheduleHumanResumeImpl ||
      rescheduleHumanResume;
    await reschedule(
      job,
      now + 15 * 60 * 1_000,
    );
    return { status: "automation_inactive" };
  }

  if (isExtremeNight(now, env)) {
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
  if (
    currentConversation?.status === "completed" &&
    hasNewerOutboundReply(job, currentConversation.turns)
  ) {
    await finish(job, "human_active", dependencies);
    return {
      status: "superseded",
      reason: "newer_outbound_reply",
    };
  }

  const outsideServiceHours = !isHumanResumeServiceOpen(now, env);

  const preliminaryPlan = planAutomation({
    text: job.text,
    messageType: job.messageType,
    reference: job.reference,
    platform: job.platform,
    referralContext: job.referralContext,
  });
  const enrichedPlan = enrichAutomationPlanFromConversation(
    preliminaryPlan,
    job.recentConversation,
    now,
  );
  const policy = classifyHumanResume({
    text: job.text,
    messageType: job.messageType,
    preliminaryPlan,
    enrichedPlan,
    recentConversation: job.recentConversation,
  });
  const conversationAction = decideConversationAction({
    text: job.text,
    messageType: job.messageType,
    plan: enrichedPlan,
    recentConversation: job.recentConversation,
    humanTakeoverActive: false,
    schedulingRequest:
      policy.reason === "scheduling_or_confirmation",
  });

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
    const morningAction = {
      action: CONVERSATION_ACTIONS.RESPOND,
      allowHoldingReply: false,
      followupPolicy: "morning_resume",
    };
    const sendResult = await sendPatientMessage(
      job,
      reply,
      "morning-resume",
      morningAction,
      dependencies,
    );

    if (sendResult.status !== "completed") {
      if (sendResult.status === "superseded") {
        return { status: "superseded", reason: "newer_activity" };
      }
      await finish(job, "waiting_human", dependencies);
      return {
        status: "delivery_failed",
        reason: sendResult.errorCode,
      };
    }

    await recordBrunaTurn(
      job,
      reply,
      "morning-resume-memory",
      dependencies,
    );
    await finish(job, "bruna_resumed", dependencies);
    return {
      status: "bruna_resumed",
      reason: "scheduled_morning_resume",
    };
  }

  if (policy.action === "no_action") {
    await finish(job, "human_active", dependencies);
    return {
      status: "no_action",
      reason: policy.reason,
    };
  }

  if (policy.action === "acknowledge") {
    const reply = buildSimpleCoordinationReply({
      kind: policy.replyKind,
      patientName: job.patientName,
    });
    const sendResult = await sendPatientMessage(
      job,
      reply,
      "human-resume-coordination",
      conversationAction,
      dependencies,
    );

    if (sendResult.status !== "completed") {
      if (sendResult.status === "superseded") {
        return {
          status: "superseded",
          reason: "newer_activity",
        };
      }
      await finish(job, "waiting_human", dependencies);
      return {
        status: "delivery_failed",
        reason: sendResult.errorCode,
      };
    }

    await recordBrunaTurn(
      job,
      reply,
      "human-resume-coordination-memory",
      dependencies,
    );
    await finish(job, "bruna_resumed", dependencies);

    return {
      status: "bruna_resumed",
      reason: policy.reason,
    };
  }

  if (policy.action === "sensitive") {
    if (PRICE_REVIEW_REASONS.has(policy.reason)) {
      const priceProcedure =
        enrichedPlan.procedure ||
        job.procedure ||
        null;
      return holdAndAlert(
        job,
        policy.reason,
        dependencies,
        buildSurgicalPriceHoldingReply({
          patientName: job.patientName,
          procedure: priceProcedure,
          overnight: outsideServiceHours,
          currentText: job.text,
        }),
        buildSurgicalPriceSuggestedReply({
          patientName: job.patientName,
          procedure: priceProcedure,
          recentConversation: job.recentConversation,
          referenceCategory: job.referenceCategory,
          sourceReference: job.reference,
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

    const alertResult = await alertReviewer(
      job,
      {
        kind: "sensitive",
        reason: policy.reason,
        holdingSent: false,
      },
      dependencies,
    );
    if (alertResult.status === "superseded") {
      return {
        status: "superseded",
        reason: "newer_activity",
      };
    }
    await finish(job, "waiting_human", dependencies);
    return {
      status: "waiting_human",
      holdingSent: false,
      reason: policy.reason,
    };
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

  const approvedPriceReplyKind =
    enrichedPlan.reason === "price_initial_information"
      ? "initial_information"
      : enrichedPlan.reason === "lifting_price_range_direct" &&
          enrichedPlan.procedure === "lifting_facial"
        ? "lifting_range"
        : "";
  if (policy.action === "attempt_reply" && approvedPriceReplyKind) {
    const reply = approvedPriceReplyKind === "initial_information"
      ? buildSurgicalInitialPriceReply({
          patientName: job.patientName,
          procedure: enrichedPlan.procedure || job.procedure,
          recentConversation: job.recentConversation,
          currentText: job.text,
        })
      : buildSurgicalPriceSuggestedReply({
          patientName: job.patientName,
          procedure: "lifting_facial",
          recentConversation: job.recentConversation,
          referenceCategory: job.referenceCategory,
          sourceReference: job.reference,
          directToPatient: true,
          currentText: job.text,
        });
    const sendResult = await sendPatientMessage(
      job,
      reply,
      "human-resume-lifting-price",
      conversationAction,
      dependencies,
    );

    if (sendResult.status !== "completed") {
      if (sendResult.status === "superseded") {
        return {
          status: "superseded",
          reason: "newer_activity",
        };
      }
      await alertReviewer(
        job,
        {
          kind: "uncertain",
          reason:
            sendResult.errorCode ||
            "approved_price_delivery_failed",
          holdingSent: false,
          suggestedReply: reply,
        },
        dependencies,
      );
      await finish(job, "waiting_human", dependencies);
      return {
        status: "delivery_failed",
        reason: sendResult.errorCode,
      };
    }

    await recordBrunaTurn(
      job,
      reply,
      "human-resume-approved-price-memory",
      dependencies,
    );
    await finish(job, "bruna_resumed", dependencies);
    return {
      status: "bruna_resumed",
      reason: enrichedPlan.reason,
    };
  }

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
      replyContract: conversationAction.replyContract,
      deterministicUrgent:
        enrichedPlan.reason === "possible_urgent_symptoms",
    },
    { env },
  );

  const maySend =
    aiResult.status === "completed" &&
    shouldSendOpenAIPatientReply({
      mode: "active",
      plan: enrichedPlan,
      decision: aiResult.decision,
      humanTakeoverToday: false,
      exactDuplicate: false,
      schedulingRequest: false,
    });

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
        "",
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

  const reply = String(aiResult.decision.suggestedReply || "").trim();
  const sendResult = await sendPatientMessage(
    job,
    reply,
    "human-resume-reply",
    conversationAction,
    dependencies,
  );

  if (sendResult.status !== "completed") {
    if (sendResult.status === "superseded") {
      return {
        status: "superseded",
        reason: "newer_activity",
      };
    }
    await alertReviewer(
      job,
      {
        kind: "uncertain",
        reason:
          sendResult.errorCode ||
          "automatic_reply_delivery_failed",
        holdingSent: false,
      },
      dependencies,
    );
    await finish(job, "waiting_human", dependencies);
    return {
      status: "delivery_failed",
      reason: sendResult.errorCode,
    };
  }

  await recordBrunaTurn(
    job,
    reply,
    "human-resume-reply-memory",
    dependencies,
  );
  await finish(job, "bruna_resumed", dependencies);

  return {
    status: "bruna_resumed",
    reason: policy.reason,
  };
}

export default async () => {
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
};

export const config = {
  schedule: "*/5 * * * *",
};
