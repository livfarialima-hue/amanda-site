import {
  enrichAutomationPlanFromConversation,
  normalizeAutomationMode,
  planAutomation,
} from "./lib/whatsapp-automation.mjs";
import {
  buildOvernightHandoffMessage,
  classifyHumanResume,
  hasConcreteResponseExpectation,
  HUMAN_RESUME_HOLDING_MESSAGE,
  isHumanResumeServiceOpen,
  shouldSendOvernightHandoff,
} from "./lib/human-resume-policy.mjs";
import {
  claimDueHumanResumes,
  completeHumanResume,
  isHumanResumeClaimCurrent,
} from "./lib/human-resume-queue.mjs";
import { runOpenAIShadow } from "./lib/openai-shadow.mjs";
import { shouldSendOpenAIPatientReply } from "./lib/patient-replies.mjs";
import { appendConversationTurn } from "./lib/conversation-memory.mjs";
import { sendYCloudPatientText } from "./lib/ycloud-patient-message.mjs";
import { sendYCloudReviewAlert } from "./lib/ycloud-review-alert.mjs";
import {
  buildSurgicalPriceHoldingReply,
  buildSurgicalPriceSuggestedReply,
} from "./lib/surgical-price-review.mjs";

const MAX_JOBS_PER_RUN = 5;
const PRICE_REVIEW_REASONS = new Set([
  "surgical_price_review",
  "price_without_confirmed_procedure",
]);

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

  return [
    heading,
    "A paciente aguardou mais de 20 minutos após a tomada humana.",
    `Mensagem: ${limitedText(job.text) || "Sem texto."}`,
    `Motivo interno: ${limitedText(reason, 120) || "confirmação humana"}.`,
    holdingSent
      ? "A mensagem de espera foi enviada uma única vez. A automação permanecerá em silêncio até sua resposta."
      : "Nenhuma mensagem automática foi enviada à paciente.",
    suggestedReply
      ? `Sugestão para copiar após conferir: ${limitedText(suggestedReply, 650)}`
      : "",
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
  });
}

async function sendPatientMessage(job, body, suffix, dependencies = {}) {
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
    dependencies.sendYCloudPatientTextImpl ||
    sendYCloudPatientText;
  return sendPatient({
    from: job.from,
    to: job.phone,
    eventId: `${job.eventId}-${suffix}`,
    body,
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
  holdingMessage = HUMAN_RESUME_HOLDING_MESSAGE,
  suggestedReply = "",
) {
  const holdingResult = await sendPatientMessage(
    job,
    holdingMessage,
    "human-resume-holding",
    dependencies,
  );
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
      holdingMessage,
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

  if (policy.action === "no_action") {
    await finish(job, "human_active", dependencies);
    return {
      status: "no_action",
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
        }),
        buildSurgicalPriceSuggestedReply({
          patientName: job.patientName,
          procedure: priceProcedure,
        }),
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
        buildOvernightHandoffMessage(policy.reason),
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
        ? buildOvernightHandoffMessage(policy.reason)
        : HUMAN_RESUME_HOLDING_MESSAGE,
    );
  }

  if (policy.action === "alert_only") {
    return alertOnly(job, policy.reason, dependencies);
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
      return holdAndAlert(job, reason, dependencies);
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
    console.log(
      JSON.stringify({
        source: "human_resume_schedule",
        status:
          claim.status === "completed"
            ? "idle"
            : "claim_failed",
        jobs: 0,
      }),
    );
    return;
  }

  const results = [];
  for (const job of claim.jobs) {
    const result = await processHumanResumeJob(job);
    results.push({
      patientLast4: job.phone.slice(-4),
      eventId: job.eventId,
      ...result,
    });
  }

  console.log(
    JSON.stringify({
      source: "human_resume_schedule",
      status: "processed",
      jobs: results.length,
      results,
    }),
  );
};

export const config = {
  schedule: "*/5 * * * *",
};
