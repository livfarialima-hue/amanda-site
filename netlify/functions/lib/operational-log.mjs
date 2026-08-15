import { createHmac } from "node:crypto";

const LOG_CORRELATION_FORMAT_VERSION = "lc1";
const DEFAULT_LOG_KEY_VERSION = "k1";
const BLOCKED_LOG_FIELD = /(?:phone|last4|event.?id|message.?id|provider|procedure|professional|content|body|text|reply|alert|detail|prompt|input|output|name|email|url|referral|click.?id|gclid|gbraid|wbraid)/i;

function normalizeLogCode(value, fallback) {
  const normalized = String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9_.:-]+/g, "_")
    .slice(0, 120);
  return normalized || fallback;
}

export function logCorrelationId(sourceId, env = process.env) {
  const keyVersion = normalizeLogCode(
    env.LOG_CORRELATION_KEY_VERSION,
    DEFAULT_LOG_KEY_VERSION,
  );
  const prefix = `${LOG_CORRELATION_FORMAT_VERSION}-${keyVersion}`;
  const secret = String(
    env.LOG_CORRELATION_SECRET || env.YCLOUD_WEBHOOK_SECRET || "",
  );
  const normalizedSourceId = String(sourceId || "");

  if (!secret || !normalizedSourceId) return `${prefix}-unavailable`;

  const digest = createHmac("sha256", secret)
    .update(`liv-operational-log\u0000${normalizedSourceId}`)
    .digest("hex")
    .slice(0, 24);
  return `${prefix}-${digest}`;
}

export function attributionClaimantId(sourceId, env = process.env) {
  const secret = String(
    env.ATTRIBUTION_CLAIM_SECRET ||
    env.LOG_CORRELATION_SECRET ||
    env.YCLOUD_WEBHOOK_SECRET ||
    "",
  );
  const normalizedSourceId = String(sourceId || "");
  if (!secret || !normalizedSourceId) return "";
  const digest = createHmac("sha256", secret)
    .update(`liv-attribution-claimant\u0000${normalizedSourceId}`)
    .digest("base64url");
  return `C1_${digest}`;
}

function sanitizeLogValue(value, depth = 0) {
  if (depth > 3) return "depth_limited";
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const singleLine = value.replace(/[\r\n]+/g, "_").slice(0, 160);
    return singleLine || null;
  }
  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => sanitizeLogValue(item, depth + 1));
  }
  if (value && typeof value === "object") {
    return sanitizeLogFields(value, depth + 1);
  }
  return null;
}

function sanitizeLogFields(fields, depth = 0) {
  const sanitized = {};
  for (const [key, value] of Object.entries(fields || {})) {
    if (key === "correlationId") {
      sanitized.correlationId = normalizeLogCode(value, "lc1-k1-unavailable");
      continue;
    }
    if (
      BLOCKED_LOG_FIELD.test(key) ||
      key.toLowerCase() === "id" ||
      /_id$/i.test(key) ||
      /Id$/.test(key)
    ) continue;
    sanitized[key] = sanitizeLogValue(value, depth);
  }
  return sanitized;
}

export function buildOperationalLogRecord({
  source,
  category,
  reason,
  sourceId,
  fields = {},
  loggedAt,
  env = process.env,
} = {}) {
  const parsedAt = new Date(loggedAt || Date.now());
  return {
    ...sanitizeLogFields(fields),
    source: normalizeLogCode(source, "operational_event"),
    category: normalizeLogCode(category, "operation"),
    reason: normalizeLogCode(reason, "unspecified"),
    loggedAt: Number.isNaN(parsedAt.getTime())
      ? new Date().toISOString()
      : parsedAt.toISOString(),
    correlationId: logCorrelationId(sourceId, env),
  };
}

export function writeOperationalLog(input, level = "log") {
  const method = level === "error" ? "error" : "log";
  console[method](JSON.stringify(buildOperationalLogRecord(input)));
}
