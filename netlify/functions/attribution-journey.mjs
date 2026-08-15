import { timingSafeEqual } from "node:crypto";
import {
  purgeExpiredAttributionJourneys,
  saveAttributionJourney,
} from "./lib/attribution-journey-store.mjs";

const MAX_BODY_BYTES = 8_192;
const DEFAULT_PURGE_LIMIT = 500;
const MAX_PURGE_LIMIT = 1_000;

function json(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

function sameSiteRequest(request) {
  const origin = String(request.headers.get("origin") || "").trim();
  if (!origin) return false;
  try {
    const requestOrigin = new URL(request.url).origin;
    return origin === requestOrigin || origin === "https://draamandaschroeder.com.br";
  } catch {
    return false;
  }
}

function boundedPurgeLimit(value) {
  const parsed = Number.parseInt(String(value || ""), 10);
  return Number.isFinite(parsed)
    ? Math.max(2, Math.min(parsed, MAX_PURGE_LIMIT))
    : DEFAULT_PURGE_LIMIT;
}

function bearerToken(request) {
  const match = String(request.headers.get("authorization") || "")
    .match(/^Bearer\s+([^\s]+)$/i);
  return match ? match[1] : "";
}

function secretMatches(provided, expected) {
  const candidate = Buffer.from(String(provided || ""), "utf8");
  const configured = Buffer.from(String(expected || ""), "utf8");
  return configured.length >= 32
    && candidate.length === configured.length
    && timingSafeEqual(candidate, configured);
}

export async function handleAttributionJourneyPurge(
  request,
  {
    purgeImpl = purgeExpiredAttributionJourneys,
    secret = process.env.ATTRIBUTION_JOURNEY_PURGE_SECRET || "",
    now = Date.now(),
  } = {},
) {
  if (String(secret).length < 32) {
    return json(503, { ok: false, error: "purge_not_configured" });
  }
  if (!secretMatches(bearerToken(request), secret)) {
    return json(401, { ok: false, error: "unauthorized" });
  }

  try {
    const limit = boundedPurgeLimit(new URL(request.url).searchParams.get("limit"));
    const purge = await purgeImpl({ now, limit });
    return json(200, { ok: true, purge });
  } catch {
    return json(503, { ok: false, error: "purge_unavailable" });
  }
}

export default async function handler(request) {
  if (request.method === "DELETE") {
    return handleAttributionJourneyPurge(request);
  }
  if (request.method !== "POST") {
    return json(405, { ok: false, error: "method_not_allowed" });
  }
  if (!sameSiteRequest(request)) {
    return json(403, { ok: false, error: "origin_not_allowed" });
  }

  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > MAX_BODY_BYTES) {
    return json(413, { ok: false, error: "payload_too_large" });
  }

  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > MAX_BODY_BYTES) {
    return json(413, { ok: false, error: "payload_too_large" });
  }

  let body;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return json(400, { ok: false, error: "invalid_json" });
  }

  try {
    const result = await saveAttributionJourney(body);
    return json(202, result);
  } catch (error) {
    const code = String(error?.message || "invalid_attribution_envelope");
    return json(400, { ok: false, error: code });
  }
}

// Netlify applies this before the function executes. The budget is deliberately
// above normal CTA behavior while bounding automated Blob writes per visitor.
export const config = {
  path: "/.netlify/functions/attribution-journey",
  rateLimit: {
    windowLimit: 20,
    windowSize: 60,
    aggregateBy: ["ip", "domain"],
  },
};
