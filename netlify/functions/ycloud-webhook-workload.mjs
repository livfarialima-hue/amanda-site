import processYCloudWebhook from "./ycloud-webhook.mjs";
import { getLatestInboundReplyMarker } from "./lib/reply-debounce.mjs";
import { sendYCloudReviewAlert } from "./lib/ycloud-review-alert.mjs";

const MAX_RETRIES = 4;

function parseQueuedPayload(rawBody) {
  try {
    return JSON.parse(String(rawBody || ""));
  } catch {
    return null;
  }
}

function failureAlertInput(data) {
  const payload = parseQueuedPayload(data.rawBody);
  const message = payload?.whatsappInboundMessage || {};
  const name = String(message.customerProfile?.name || "").trim();
  const greeting = name
    ? `Olá, ${name.split(/\s+/)[0]}!`
    : "Olá!";

  return {
    from: String(message.to || ""),
    eventId: `${String(data.eventId || payload?.id || "queue")}-durable-failure`,
    patientName: name,
    patientPhone: String(message.from || data.phone || ""),
    messageText: [
      "FALHA TÉCNICA — atendimento automático não concluído após as tentativas.",
      `Mensagem da paciente: ${String(message.text?.body || "Mensagem sem texto.")}`,
      "Sugestão para copiar:",
      `${greeting} Eu sou a Bruna, concierge da Clínica LIV Faria Lima. Obrigada pela mensagem e desculpe a demora. Estou acompanhando por aqui. Como posso te ajudar?`,
    ].join("\n"),
  };
}

function retryableProcessingFailure(message, error) {
  return new Error(message, error ? { cause: error } : undefined);
}

export async function processDurableYCloudEvent(
  event,
  {
    processImpl = processYCloudWebhook,
    getLatestInboundReplyMarkerImpl = getLatestInboundReplyMarker,
    sendYCloudReviewAlertImpl = sendYCloudReviewAlert,
  } = {},
) {
  const data = event?.eventData;
  if (!data || !data.rawBody || !data.signature || !data.origin) {
    throw new Error("invalid_durable_ycloud_event");
  }

  if (data.isTextInbound && data.phone && data.eventId) {
    const latest = await getLatestInboundReplyMarkerImpl({
      phone: data.phone,
    });
    if (
      latest.status === "completed" &&
      latest.found &&
      latest.eventId !== String(data.eventId)
    ) {
      console.log(JSON.stringify({
        source: "ycloud_durable_superseded",
        eventId: String(data.eventId),
        patientLast4: String(data.phone).slice(-4),
      }));
      return;
    }
  }

  let response;
  let body = null;
  try {
    response = await processImpl(
      new Request(`${data.origin}/api/ycloud/webhook-processor`, {
        method: "POST",
        headers: {
          "content-type": data.contentType || "application/json",
          "YCloud-Signature": data.signature,
          "X-LIV-Durable-Retry": event.attempt > 0 ? "1" : "0",
        },
        body: data.rawBody,
      }),
      {},
    );

    try {
      body = await response.clone().json();
    } catch {
      body = null;
    }
  } catch (error) {
    if (event.attempt >= MAX_RETRIES) {
      await sendYCloudReviewAlertImpl(failureAlertInput(data));
    }
    throw retryableProcessingFailure("ycloud_processor_request_failed", error);
  }

  const activeFailed = body?.aiActiveStatus === "failed";
  if (!response.ok || activeFailed) {
    if (event.attempt >= MAX_RETRIES) {
      await sendYCloudReviewAlertImpl(failureAlertInput(data));
    }
    throw retryableProcessingFailure(
      activeFailed
        ? "ycloud_active_reply_failed"
        : `ycloud_processor_http_${response.status}`,
    );
  }
}

// Mantém a lógica legada importável para testes e auditoria, mas deixa de
// registrá-la como Async Workload. O webhook público já usa o caminho direto
// com fila própria de recuperação e travas contra duplicidade.
export default async () =>
  new Response(
    JSON.stringify({
      ok: false,
      error: "legacy_async_workload_disabled",
      replacement: "direct_webhook_with_recovery_queue",
    }),
    {
      status: 410,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
    },
  );

export const config = {
  path: "/api/ycloud/webhook-queued-disabled",
};
