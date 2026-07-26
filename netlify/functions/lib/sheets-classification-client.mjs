const SHEETS_TIMEOUT_MS = 8_000;
const MAX_RESPONSE_LENGTH = 200_000;

function result(status, details = {}) {
  return { status, ...details };
}

export async function callClassificationSheets(
  action,
  payload = {},
  { env = process.env, fetchImpl = fetch } = {},
) {
  const url = env.GOOGLE_SHEETS_WEBHOOK_URL;
  const secret = env.GOOGLE_SHEETS_WEBHOOK_SECRET;

  if (!url || !secret) {
    return result("failed", {
      httpStatus: null,
      errorCode: "configuration_missing",
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    SHEETS_TIMEOUT_MS,
  );

  try {
    const response = await fetchImpl(url, {
      method: "POST",
      headers: {
        "content-type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        secret,
        action,
        ...payload,
      }),
      redirect: "follow",
      signal: controller.signal,
    });
    const responseText = await response.text();

    if (responseText.length > MAX_RESPONSE_LENGTH) {
      return result("failed", {
        httpStatus: response.status,
        errorCode: "response_too_large",
      });
    }

    let responseData;

    try {
      responseData = JSON.parse(responseText);
    } catch {
      return result("failed", {
        httpStatus: response.status,
        errorCode: "invalid_response",
      });
    }

    if (!response.ok || responseData?.ok !== true) {
      return result("failed", {
        httpStatus: response.status,
        errorCode: String(
          responseData?.error || "unconfirmed_response",
        ),
      });
    }

    return result("completed", {
      httpStatus: response.status,
      data: responseData,
    });
  } catch (error) {
    return result("failed", {
      httpStatus: null,
      errorCode:
        error?.name === "AbortError"
          ? "timeout"
          : "request_failed",
    });
  } finally {
    clearTimeout(timeout);
  }
}
