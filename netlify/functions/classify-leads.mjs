import { runLeadClassifier } from "./lib/lead-classifier.mjs";
import { callClassificationSheets } from "./lib/sheets-classification-client.mjs";

const MAX_JOBS_PER_RUN = 1;
const SHEETS_WRITE_ATTEMPTS = 3;
const SHEETS_WRITE_TIMEOUT_MS = 45_000;
const SHEETS_FAIL_TIMEOUT_MS = 30_000;

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function callSheetsWithRetry(
  action,
  payload,
  {
    callSheets = callClassificationSheets,
    waitImpl = wait,
    attempts = SHEETS_WRITE_ATTEMPTS,
    timeoutMs,
  } = {},
) {
  let lastResult = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    lastResult = await callSheets(action, payload, { timeoutMs });

    if (
      lastResult.status === "completed" &&
      lastResult.data?.status === "ignored"
    ) {
      lastResult = {
        status: "failed",
        errorCode: String(
          lastResult.data.error || "application_ignored",
        ),
      };
    }

    if (lastResult.status === "completed") return lastResult;

    const retryable = [
      "busy_retry",
      "timeout",
      "request_failed",
    ].includes(String(lastResult.errorCode || ""));

    if (!retryable || attempt >= attempts) break;
    await waitImpl(attempt * 250);
  }

  return lastResult;
}

async function classifyJob(
  job,
  { classifier = runLeadClassifier } = {},
) {
  const classificationResult = await classifier({
    phone: job.phone,
    currentStatus: job.currentStatus,
    currentSummary: job.currentSummary,
    currentNextAction: job.currentNextAction,
    currentProfessional: job.professional,
    patientRelationship: job.patientRelationship,
    classificationGuidance: job.classificationGuidance,
    messages: job.messages,
  });

  return { job, classificationResult };
}

async function persistJob(
  outcome,
  {
    callSheets = callClassificationSheets,
    waitImpl = wait,
  } = {},
) {
  const { job, classificationResult } = outcome;

  if (classificationResult.status !== "completed") {
    const release = await callSheetsWithRetry(
      "fail_classification",
      {
        job: {
          phone: job.phone,
          throughMessageId: job.throughMessageId,
          leaseToken: job.leaseToken,
          opportunityId: job.opportunityId,
          professional: job.professional,
          leadSheetName: job.leadSheetName,
          claimedVersion: job.claimedVersion,
          errorCode:
            classificationResult.errorCode ||
            "classification_failed",
        },
      },
      {
        callSheets,
        waitImpl,
        timeoutMs: SHEETS_FAIL_TIMEOUT_MS,
      },
    );

    return {
      phoneLast4: String(job.phone || "").slice(-4),
      status: "failed",
      errorCode:
        classificationResult.errorCode ||
        "classification_failed",
      releaseStatus: release?.status || "failed",
    };
  }

  const completion = await callSheetsWithRetry(
    "complete_classification",
    {
        job: {
          phone: job.phone,
          throughMessageId: job.throughMessageId,
          leaseToken: job.leaseToken,
          opportunityId: job.opportunityId,
          professional: job.professional,
          leadSheetName: job.leadSheetName,
          claimedVersion: job.claimedVersion,
        },
      classification:
        classificationResult.classification,
    },
    {
      callSheets,
      waitImpl,
      timeoutMs: SHEETS_WRITE_TIMEOUT_MS,
    },
  );

  if (completion.status !== "completed") {
    const completionError = String(
      completion.errorCode || "completion_failed",
    );
    const release = await callSheetsWithRetry(
      "fail_classification",
      {
        job: {
          phone: job.phone,
          throughMessageId: job.throughMessageId,
          leaseToken: job.leaseToken,
          opportunityId: job.opportunityId,
          professional: job.professional,
          leadSheetName: job.leadSheetName,
          claimedVersion: job.claimedVersion,
          errorCode: `complete_${completionError}`,
        },
      },
      {
        callSheets,
        waitImpl,
        timeoutMs: SHEETS_FAIL_TIMEOUT_MS,
      },
    );

    return {
      phoneLast4: String(job.phone || "").slice(-4),
      status: "failed",
      errorCode: completionError,
      releaseStatus: release?.status || "failed",
      model: classificationResult.model,
      recommendedStatus:
        classificationResult.classification.recommendedStatus,
      confidence:
        classificationResult.classification.confidence,
      usage: classificationResult.usage,
    };
  }

  return {
    phoneLast4: String(job.phone || "").slice(-4),
    status: "completed",
    errorCode: "none",
    model: classificationResult.model,
    recommendedStatus:
      classificationResult.classification
        .recommendedStatus,
    confidence:
      classificationResult.classification.confidence,
    usage: classificationResult.usage,
  };
}

export async function processClaimedJobs(
  jobs,
  dependencies = {},
) {
  const claimedJobs = Array.isArray(jobs)
    ? jobs.slice(0, MAX_JOBS_PER_RUN)
    : [];
  const outcomes = await Promise.all(
    claimedJobs.map((job) => classifyJob(job, dependencies)),
  );
  const results = [];

  // Apps Script usa um ScriptLock global. Persistir em sequência evita que
  // conclusões corretas disputem o lock e fiquem presas em `running`.
  for (const outcome of outcomes) {
    results.push(await persistJob(outcome, dependencies));
  }

  return results;
}

export async function runLeadClassificationBatch() {
  const claim = await callSheetsWithRetry(
    "claim_due_classifications",
    { limit: MAX_JOBS_PER_RUN },
    // O claim tem efeito colateral. Se o cliente expirar enquanto o Apps
    // Script ainda termina, repetir imediatamente pode alugar outros leads.
    // A lease expira e permite recuperacao segura na proxima execucao.
    { attempts: 1, timeoutMs: 30_000 },
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

  const hydration = await callSheetsWithRetry(
    "hydrate_classification_jobs",
    { jobs },
    { attempts: 2, timeoutMs: 60_000 },
  );

  if (hydration.status !== "completed") {
    const results = [];
    for (const job of jobs) {
      results.push(await persistJob({
        job,
        classificationResult: {
          status: "failed",
          errorCode: `hydrate_${hydration.errorCode || "failed"}`,
        },
      }));
    }
    console.log(JSON.stringify({
      source: "lead_classifier_schedule",
      status: "hydrate_failed",
      jobs: results.length,
      results,
    }));
    return;
  }

  const hydratedJobs = Array.isArray(hydration.data?.jobs)
    ? hydration.data.jobs
    : [];
  const invalidJobs = hydratedJobs.filter((job) => job.errorCode);
  const validJobs = hydratedJobs.filter((job) => !job.errorCode);
  const results = [];
  for (const job of invalidJobs) {
    results.push(await persistJob({
      job,
      classificationResult: {
        status: "failed",
        errorCode: job.errorCode,
      },
    }));
  }

  results.push(...await processClaimedJobs(validJobs));

  console.log(
    JSON.stringify({
      source: "lead_classifier_schedule",
      status: "processed",
      jobs: results.length,
      results,
    }),
  );
}

export default async () => {
  const siteUrl = String(process.env.URL || "").replace(/\/$/, "");
  const secret = process.env.GOOGLE_SHEETS_WEBHOOK_SECRET;
  if (!siteUrl || !secret) {
    console.log(JSON.stringify({
      source: "lead_classifier_schedule",
      status: "dispatch_skipped",
      errorCode: "configuration_missing",
    }));
    return;
  }

  const response = await fetch(
    `${siteUrl}/.netlify/functions/classify-leads-background`,
    {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({ secret }),
    },
  );
  console.log(JSON.stringify({
    source: "lead_classifier_schedule",
    status: response.ok ? "dispatched" : "dispatch_failed",
    httpStatus: response.status,
  }));
};

export const config = {
  schedule: "*/5 * * * *",
};
