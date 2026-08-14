export async function runSyntheticIntegrationHealth({
  env = process.env,
  fetchImpl = fetch,
} = {}) {
  const url = String(env.GOOGLE_SHEETS_WEBHOOK_URL || "").trim();
  const secret = String(env.GOOGLE_SHEETS_WEBHOOK_SECRET || "").trim();
  if (!url || !secret) {
    return { status: "skipped", errorCode: "configuration_missing" };
  }
  try {
    const response = await fetchImpl(url, {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        secret,
        action: "run_synthetic_health_check",
        attributionProbe: {
          reference: "M26F02S-C01H01-avaliacao-facial",
          platform: "Meta",
          referenceCategory: "meta_coded",
          fallbackReason: "",
        },
      }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || data?.ok !== true) {
      return {
        status: "failed",
        httpStatus: response.status,
        errorCode: String(data?.error || "unconfirmed_response"),
      };
    }
    return {
      status: data.duplicate ? "duplicate" : "completed",
      httpStatus: response.status,
      runId: String(data.runId || ""),
    };
  } catch {
    return { status: "failed", errorCode: "request_failed" };
  }
}

export default async () => {
  const result = await runSyntheticIntegrationHealth();
  console.log(JSON.stringify({
    source: "synthetic_integration_health",
    ...result,
  }));
};

export const config = {
  schedule: "17 12 * * *",
};
