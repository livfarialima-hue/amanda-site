import { runLeadClassifier } from "./lib/lead-classifier.mjs";
import { callClassificationSheets } from "./lib/sheets-classification-client.mjs";

const MAX_JOBS_PER_RUN = 3;

async function processJob(job) {
  const classificationResult = await runLeadClassifier({
    phone: job.phone,
    currentStatus: job.currentStatus,
    currentSummary: job.currentSummary,
    currentNextAction: job.currentNextAction,
    messages: job.messages,
  });

  if (classificationResult.status !== "completed") {
    await callClassificationSheets(
      "fail_classification",
      {
        job: {
          phone: job.phone,
          throughMessageId: job.throughMessageId,
          errorCode:
            classificationResult.errorCode ||
            "classification_failed",
        },
      },
    );

    return {
      phoneLast4: String(job.phone || "").slice(-4),
      status: "failed",
      errorCode:
        classificationResult.errorCode ||
        "classification_failed",
    };
  }

  const completion = await callClassificationSheets(
    "complete_classification",
    {
      job: {
        phone: job.phone,
        throughMessageId: job.throughMessageId,
      },
      classification:
        classificationResult.classification,
    },
  );

  return {
    phoneLast4: String(job.phone || "").slice(-4),
    status:
      completion.status === "completed"
        ? "completed"
        : "failed",
    errorCode:
      completion.status === "completed"
        ? "none"
        : completion.errorCode,
    model: classificationResult.model,
    recommendedStatus:
      classificationResult.classification
        .recommendedStatus,
    confidence:
      classificationResult.classification.confidence,
    usage: classificationResult.usage,
  };
}

export default async () => {
  const claim = await callClassificationSheets(
    "claim_due_classifications",
    { limit: MAX_JOBS_PER_RUN },
  );

  if (claim.status !== "completed") {
    console.log(
      JSON.stringify({
        source: "lead_classifier_schedule",
        status: "claim_failed",
        errorCode: claim.errorCode,
        httpStatus: claim.httpStatus,
      }),
    );
    return;
  }

  const jobs = Array.isArray(claim.data?.jobs)
    ? claim.data.jobs.slice(0, MAX_JOBS_PER_RUN)
    : [];

  if (!jobs.length) {
    console.log(
      JSON.stringify({
        source: "lead_classifier_schedule",
        status: "idle",
        jobs: 0,
      }),
    );
    return;
  }

  const results = await Promise.all(
    jobs.map((job) => processJob(job)),
  );

  console.log(
    JSON.stringify({
      source: "lead_classifier_schedule",
      status: "processed",
      jobs: results.length,
      results,
    }),
  );
};

export const config = {
  schedule: "0 3 * * *",
};
