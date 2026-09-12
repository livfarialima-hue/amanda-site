import { createHash } from "node:crypto";

const MESSAGE_STATUSES = new Set([
  "failed",
  "sent",
  "delivered",
  "read",
]);
const TEMPLATE_EVENT_TYPES = new Set([
  "whatsapp.template.category_updated",
  "whatsapp.template.quality_updated",
  "whatsapp.template.reviewed",
]);
const TEMPLATE_CATEGORIES = new Set([
  "authentication",
  "authentication_international",
  "marketing",
  "otp",
  "transactional",
  "utility",
  "service",
  "unknown",
]);
const TEMPLATE_STATUSES = new Set([
  "approved",
  "archived",
  "deleted",
  "disabled",
  "in_appeal",
  "paused",
  "pending",
  "rejected",
  "unknown",
]);
const PRICING_MODELS = new Set(["cbp", "pmp", "unknown"]);
const PRICING_TYPES = new Set([
  "free_customer_service",
  "free_entry_point",
  "regular",
  "unknown",
]);
const TEMPLATE_ACTION_EVENTS = new Set([
  "archived",
  "disabled",
  "flagged",
  "paused",
  "pending_deletion",
  "rejected",
]);
const QUALITY_RATINGS = new Set([
  "green",
  "high",
  "low",
  "medium",
  "red",
  "unknown",
  "yellow",
]);

function cleanTechnicalValue(value, maximumLength = 160) {
  const normalized = String(value || "").trim();
  if (!normalized || !/^[A-Za-z0-9_.:@/-]+$/.test(normalized)) {
    return "";
  }
  return normalized.slice(0, maximumLength);
}

function enumValue(value, allowed, fallback = "unknown") {
  const normalized = String(value || "").trim().toLowerCase();
  return allowed.has(normalized) ? normalized : fallback;
}

function dateValue(value) {
  if (value === null || value === undefined || value === "") return "";
  const numeric = Number(value);
  const candidate = Number.isFinite(numeric)
    ? new Date(numeric < 10_000_000_000 ? numeric * 1000 : numeric)
    : new Date(value);
  return Number.isNaN(candidate.getTime())
    ? ""
    : candidate.toISOString();
}

function priceValue(value) {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0 || numeric > 1_000_000) {
    return null;
  }
  return numeric;
}

function templateNameOf(message) {
  return cleanTechnicalValue(
    message?.template?.name ||
      message?.templateName ||
      message?.template?.templateName,
    160,
  );
}

function purposeOf(externalId, templateName) {
  const external = String(externalId || "").toLowerCase();
  const template = String(templateName || "").toLowerCase();
  if (external.startsWith("liv-appointment-")) return "appointment_reminder";
  if (external.startsWith("liv-post-consult-")) return "post_consult_care";
  if (external.includes("scheduled-followup") || template.includes("retomada")) {
    return "scheduled_followup";
  }
  if (external.startsWith("liv-reply-")) return "patient_reply";
  if (template.includes("alerta_revisao")) return "internal_review_alert";
  return "other_outbound";
}

export function hashYCloudIdentifier(value, namespace = "message") {
  const normalized = String(value || "").trim();
  if (!normalized) return "";
  return `sha256:${createHash("sha256")
    .update(`${namespace}:${normalized}`, "utf8")
    .digest("hex")}`;
}

export async function readYCloudAcceptance(
  response,
  { externalId = "" } = {},
) {
  const accepted = {
    deliveryState: "accepted_not_delivered",
    externalId: cleanTechnicalValue(externalId, 128),
    providerMessageKey: "",
    providerStatus: "accepted",
  };

  if (!response?.ok || typeof response.text !== "function") return accepted;

  let responseText = "";
  try {
    responseText = await response.text();
  } catch {
    return accepted;
  }
  if (!responseText || responseText.length > 100_000) return accepted;

  try {
    const parsed = JSON.parse(responseText);
    const message = parsed?.whatsappMessage || parsed?.data || parsed || {};
    const providerIdentity = message.wamid || message.id || parsed?.id;
    accepted.providerMessageKey = hashYCloudIdentifier(
      providerIdentity,
      "ycloud-message",
    );
    accepted.providerStatus = cleanTechnicalValue(
      message.status || parsed?.status || "accepted",
      40,
    ).toLowerCase() || "accepted";
    accepted.externalId = cleanTechnicalValue(
      message.externalId || parsed?.externalId || accepted.externalId,
      128,
    );
  } catch {
    // A resposta 2xx continua aceita. A entrega final chega pelo webhook.
  }

  return accepted;
}

export function normalizeYCloudMessageUpdated(payload) {
  if (payload?.type !== "whatsapp.message.updated") {
    return { ok: false, error: "unsupported_event_type" };
  }

  const message = payload.whatsappMessage;
  if (!message || typeof message !== "object") {
    return { ok: false, error: "missing_message" };
  }

  const status = enumValue(message.status, MESSAGE_STATUSES, "");
  const providerIdentity = message.wamid || message.id;
  const providerMessageKey = hashYCloudIdentifier(
    providerIdentity,
    "ycloud-message",
  );
  if (!providerMessageKey || !status) {
    return { ok: false, error: "invalid_message_status" };
  }

  const externalId = cleanTechnicalValue(message.externalId, 128);
  const templateName = templateNameOf(message);
  const totalPrice = priceValue(
    message.totalPrice ?? message.pricing?.totalPrice,
  );
  const pricingCategory = enumValue(
    message.pricingCategory ?? message.pricing?.category,
    TEMPLATE_CATEGORIES,
  );
  const pricingModel = enumValue(
    message.pricingModel ?? message.pricing?.pricingModel,
    PRICING_MODELS,
  );
  const pricingType = enumValue(
    message.pricingType ?? message.pricing?.type,
    PRICING_TYPES,
  );
  const currencyRaw = String(
    message.currency ?? message.pricing?.currency ?? "",
  ).trim().toUpperCase();
  const currency = /^[A-Z]{3}$/.test(currencyRaw) ? currencyRaw : "";
  const regionCode = cleanTechnicalValue(
    message.regionCode ?? message.pricing?.regionCode,
    20,
  ).toUpperCase();

  return {
    ok: true,
    messageStatus: {
      providerMessageKey,
      externalId,
      status,
      messageType: cleanTechnicalValue(message.type, 40).toLowerCase(),
      templateName,
      pricingCategory,
      pricingModel,
      pricingType,
      totalPrice,
      currency,
      regionCode,
      businessNumberKey: hashYCloudIdentifier(
        message.from,
        "ycloud-business-number",
      ),
      conversationOrigin: cleanTechnicalValue(
        message.conversation?.originType ||
          message.conversation?.origin?.type ||
          message.conversation?.origin ||
          message.origin,
        80,
      ).toLowerCase(),
      finalPrice:
        ["delivered", "read"].includes(status) && totalPrice !== null,
      sentAt: dateValue(message.sendTime || message.sentAt),
      deliveredAt: dateValue(
        message.deliverTime || message.deliveryTime || message.deliveredAt,
      ),
      readAt: dateValue(message.readTime || message.readAt),
      updatedAt: dateValue(
        message.updateTime ||
          message.statusUpdateTime ||
          payload.createTime ||
          payload.timestamp,
      ),
      purpose: purposeOf(externalId, templateName),
      source: "ycloud_message_updated",
    },
  };
}

export function normalizeYCloudTemplateEvent(payload) {
  const type = String(payload?.type || "").trim();
  if (!TEMPLATE_EVENT_TYPES.has(type)) {
    return { ok: false, error: "unsupported_event_type" };
  }

  const template = payload.whatsappTemplate;
  if (!template || typeof template !== "object") {
    return { ok: false, error: "missing_template" };
  }
  const name = cleanTechnicalValue(template.name, 160);
  const language = cleanTechnicalValue(
    template.language || template.languageCode,
    24,
  );
  if (!name) return { ok: false, error: "invalid_template" };

  const occurredAt = dateValue(
    payload.createTime || payload.timestamp || template.updateTime,
  );
  const eventIdentity =
    payload.id || `${type}:${name}:${language}:${occurredAt || "undated"}`;
  const status = enumValue(template.status, TEMPLATE_STATUSES);
  const statusUpdateEvent = cleanTechnicalValue(
    template.statusUpdateEvent,
    80,
  ).toLowerCase();
  const qualityRating = enumValue(
    template.qualityRating,
    QUALITY_RATINGS,
  );

  return {
    ok: true,
    templateEvent: {
      eventKey: hashYCloudIdentifier(
        eventIdentity,
        "ycloud-template-event",
      ),
      type,
      templateName: name,
      language,
      category: enumValue(template.category, TEMPLATE_CATEGORIES),
      previousCategory: enumValue(
        template.previousCategory,
        TEMPLATE_CATEGORIES,
        "",
      ),
      status,
      qualityRating,
      statusUpdateEvent,
      actionRequired:
        ["archived", "disabled", "paused", "rejected"].includes(status) ||
        ["low", "red"].includes(qualityRating) ||
        TEMPLATE_ACTION_EVENTS.has(statusUpdateEvent),
      occurredAt,
      source: "ycloud_template_event",
    },
  };
}
