import { randomBytes } from "node:crypto";
import { getStore } from "@netlify/blobs";

const STORE_NAME = "liv-attribution-journeys-v1";
const JOURNEY_TTL_MS = 30 * 24 * 60 * 60 * 1_000;
const TRANSPORT_REDEEM_TTL_MS = 10 * 60 * 1_000;
const TRANSPORT_RETENTION_TTL_MS = JOURNEY_TTL_MS;
const TOKEN_PATTERN = /^J1_[A-Za-z0-9_-]{22}$/;
const JOURNEY_ID_PATTERN = /^J2_[A-Za-z0-9_-]{22}$/;
const CLAIMANT_ID_PATTERN = /^C1_[A-Za-z0-9_-]{43}$/;
const SESSION_PATTERN = /^S1_[A-Za-z0-9_-]{22}$/;
const CLICK_ID_PATTERN = /^[A-Za-z0-9._~-]{10,300}$/;
const META_ID_PATTERN = /^\d{5,30}$/;
const CODE_PATTERN = /^[A-Za-z0-9_-]{1,80}$/;
const PATH_PATTERN = /^\/[A-Za-z0-9%/_~.-]{0,180}$/;
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1_000;
const DEFAULT_PURGE_LIMIT = 200;

const CHANNELS = new Set([
  "google_ads",
  "meta_ads",
  "organic_search",
  "ai_referral",
  "social_organic",
  "referral",
  "returning_patient",
  "patient_reported",
  "direct",
  "unknown",
]);
const ORIGINS = new Set([
  "Google Ads",
  "Meta Ads",
  "Google orgânico",
  "Bing orgânico",
  "ChatGPT",
  "Copilot",
  "Perplexity",
  "Gemini",
  "Instagram orgânico",
  "Indicação",
  "Retorno de paciente",
  "Origem informada pelo paciente",
  "Acesso direto",
  "Desconhecida",
]);
const CONVERSION_PATHS = new Set([
  "meta_whatsapp_direct",
  "meta_site_whatsapp",
  "meta_site_return_whatsapp",
  "google_site_whatsapp",
  "organic_site_whatsapp",
  "ai_site_whatsapp",
  "direct_whatsapp",
  "unknown",
]);
const CONFIDENCE_LEVELS = new Set([
  "observed",
  "partial",
  "inferred",
  "patient_reported",
  "unknown",
]);

function journeyStore(getStoreImpl = getStore) {
  return getStoreImpl({ name: STORE_NAME, consistency: "strong" });
}

function boundedString(value, maximumLength) {
  return Array.from(String(value || "").trim()).slice(0, maximumLength).join("");
}

function enumValue(value, allowed, fallback = "") {
  const normalized = boundedString(value, 80);
  return allowed.has(normalized) ? normalized : fallback;
}

function codeValue(value) {
  const normalized = boundedString(value, 80);
  return CODE_PATTERN.test(normalized) ? normalized : "";
}

function metaId(value) {
  const normalized = boundedString(value, 30);
  return META_ID_PATTERN.test(normalized) ? normalized : "";
}

function clickId(value) {
  const normalized = boundedString(value, 300);
  return CLICK_ID_PATTERN.test(normalized) ? normalized : "";
}

function pagePath(value) {
  const normalized = boundedString(value, 181);
  return PATH_PATTERN.test(normalized) ? normalized : "";
}

function timestamp(value) {
  const parsed = new Date(value || 0).getTime();
  return Number.isFinite(parsed) ? parsed : NaN;
}

function isoTimestamp(value, now) {
  const parsed = timestamp(value);
  if (!Number.isFinite(parsed)) return "";
  if (parsed > now + MAX_CLOCK_SKEW_MS) return "";
  if (parsed < now - JOURNEY_TTL_MS - 24 * 60 * 60 * 1_000) return "";
  return new Date(parsed).toISOString();
}

function normalizeTouch(input, now) {
  input = input && typeof input === "object" ? input : {};
  const sessionId = boundedString(input.session_id, 25);
  return {
    occurred_at: isoTimestamp(input.occurred_at, now),
    session_id: SESSION_PATTERN.test(sessionId) ? sessionId : "",
    origin: enumValue(input.origin, ORIGINS, "Desconhecida"),
    channel: enumValue(input.channel, CHANNELS, "unknown"),
    source: codeValue(input.source).toLowerCase(),
    medium: codeValue(input.medium).toLowerCase(),
    campaign_code: codeValue(input.campaign_code).toUpperCase(),
    adgroup_code: codeValue(input.adgroup_code).toUpperCase(),
    creative_code: codeValue(input.creative_code).toUpperCase(),
    meta_campaign_id: metaId(input.meta_campaign_id),
    meta_adset_id: metaId(input.meta_adset_id),
    meta_ad_id: metaId(input.meta_ad_id),
    page_path: pagePath(input.page_path),
    referrer_type: codeValue(input.referrer_type).toLowerCase(),
    ai_source: codeValue(input.ai_source).toLowerCase(),
  };
}

function normalizeClickIds(input) {
  input = input && typeof input === "object" ? input : {};
  const result = {};
  for (const field of ["gclid", "gbraid", "wbraid"]) {
    const value = clickId(input[field]);
    if (value) result[field] = value;
  }
  return result;
}

function normalizeJourneyPayload(input, now) {
  input = input && typeof input === "object" ? input : {};
  const cta = input.cta && typeof input.cta === "object" ? input.cta : {};
  return {
    first_touch: normalizeTouch(input.first_touch, now),
    last_touch: normalizeTouch(input.last_touch, now),
    last_non_direct_touch: normalizeTouch(input.last_non_direct_touch, now),
    conversion_path: enumValue(input.conversion_path, CONVERSION_PATHS, "unknown"),
    cta: {
      page_path: pagePath(cta.page_path),
      location: codeValue(cta.location).toLowerCase(),
    },
    click_ids: normalizeClickIds(input.click_ids),
    confidence: enumValue(input.confidence, CONFIDENCE_LEVELS, "unknown"),
    fallback_reason: codeValue(input.fallback_reason).toLowerCase(),
  };
}

function absoluteExpiry(createdAt, storedExpiry, ttl) {
  const maximum = createdAt + ttl;
  return Number.isFinite(storedExpiry) ? Math.min(storedExpiry, maximum) : maximum;
}

function normalizeStoredJourney(record, journeyId, now) {
  if (!record || record.version !== 1 || !JOURNEY_ID_PATTERN.test(journeyId)) return null;
  const createdAt = timestamp(record.created_at);
  if (!Number.isFinite(createdAt) || createdAt > now + MAX_CLOCK_SKEW_MS) return null;
  const storedExpiresAt = timestamp(record.expires_at);
  if (!Number.isFinite(storedExpiresAt)) return null;
  const expiresAt = absoluteExpiry(createdAt, storedExpiresAt, JOURNEY_TTL_MS);
  return {
    version: 1,
    journey_id: journeyId,
    created_at: new Date(createdAt).toISOString(),
    expires_at: new Date(expiresAt).toISOString(),
    ...normalizeJourneyPayload(record, now),
  };
}

function createJourneyRecord(input, journeyId, now, existing = null) {
  const payload = normalizeJourneyPayload(input, now);
  if (!existing) {
    return {
      version: 1,
      journey_id: journeyId,
      created_at: new Date(now).toISOString(),
      expires_at: new Date(now + JOURNEY_TTL_MS).toISOString(),
      ...payload,
    };
  }

  const stored = normalizeStoredJourney(existing, journeyId, now);
  if (!stored || timestamp(stored.expires_at) <= now) throw new Error("journey_state_expired");
  const storedPayload = normalizeJourneyPayload(stored, now);
  if (JSON.stringify(payload) !== JSON.stringify(storedPayload)) {
    throw new Error("journey_payload_conflict");
  }
  return stored;
}

function createJourneyId() {
  return `J2_${randomBytes(16).toString("base64url")}`;
}

function transportKey(token) {
  return TOKEN_PATTERN.test(String(token || "")) ? `transport/${token}` : "";
}

function journeyKey(journeyId) {
  return JOURNEY_ID_PATTERN.test(String(journeyId || "")) ? `journey/${journeyId}` : "";
}

function createTransportClaim(journeyId, now) {
  return {
    version: 1,
    kind: "transport_claim",
    journey_id: journeyId,
    state: "active",
    created_at: new Date(now).toISOString(),
    redeem_before: new Date(now + TRANSPORT_REDEEM_TTL_MS).toISOString(),
    retention_expires_at: new Date(now + TRANSPORT_RETENTION_TTL_MS).toISOString(),
  };
}

function normalizeTransportClaim(record, now) {
  if (
    !record
    || record.version !== 1
    || record.kind !== "transport_claim"
    || !JOURNEY_ID_PATTERN.test(String(record.journey_id || ""))
  ) return null;
  const createdAt = timestamp(record.created_at);
  if (!Number.isFinite(createdAt) || createdAt > now + MAX_CLOCK_SKEW_MS) return null;
  const storedRedeemBefore = timestamp(record.redeem_before);
  const storedRetentionExpiresAt = timestamp(record.retention_expires_at);
  if (!Number.isFinite(storedRedeemBefore) || !Number.isFinite(storedRetentionExpiresAt)) {
    return null;
  }
  const redeemBefore = absoluteExpiry(
    createdAt,
    storedRedeemBefore,
    TRANSPORT_REDEEM_TTL_MS,
  );
  const retentionExpiresAt = absoluteExpiry(
    createdAt,
    storedRetentionExpiresAt,
    TRANSPORT_RETENTION_TTL_MS,
  );
  const state = ["active", "claimed", "expired"].includes(record.state)
    ? record.state
    : "expired";
  const claimantId = boundedString(record.claimant_id, 46);
  const safeState = state === "claimed" && !CLAIMANT_ID_PATTERN.test(claimantId)
    ? "expired"
    : state;
  return {
    version: 1,
    kind: "transport_claim",
    journey_id: record.journey_id,
    state: safeState,
    created_at: new Date(createdAt).toISOString(),
    redeem_before: new Date(redeemBefore).toISOString(),
    retention_expires_at: new Date(retentionExpiresAt).toISOString(),
    ...(safeState === "claimed" ? { claimant_id: claimantId } : {}),
    ...(record.claimed_at ? { claimed_at: isoTimestamp(record.claimed_at, now) } : {}),
  };
}

async function listKeys(store, prefix, limit, now) {
  // Netlify Blobs automatically retrieves every server page when paginate is
  // omitted. We intentionally rotate a bounded scan window over that complete
  // key list; manual pagination exposes no durable cursor and would repeatedly
  // starve later pages. See the official Store.list pagination contract.
  const result = await store.list({ prefix });
  const blobs = result?.blobs || [];
  const safeLimit = Math.min(limit, blobs.length);
  const day = Math.floor(Number(now || 0) / (24 * 60 * 60 * 1_000));
  const start = blobs.length > safeLimit
    ? (day * safeLimit) % blobs.length
    : 0;
  const keys = [];
  for (let index = 0; index < safeLimit; index += 1) {
    keys.push(blobs[(start + index) % blobs.length].key);
  }
  return { keys, truncated: blobs.length > keys.length };
}

export async function purgeExpiredAttributionJourneys({
  getStoreImpl = getStore,
  now = Date.now(),
  limit = DEFAULT_PURGE_LIMIT,
} = {}) {
  const store = journeyStore(getStoreImpl);
  const safeLimit = Math.max(2, Math.min(Number(limit) || DEFAULT_PURGE_LIMIT, 1_000));
  const transportAllocation = Math.ceil(safeLimit / 2);
  const journeyAllocation = Math.floor(safeLimit / 2);
  const transportListing = await listKeys(
    store,
    "transport/",
    transportAllocation,
    now,
  );
  const journeyListing = await listKeys(
    store,
    "journey/",
    journeyAllocation,
    now,
  );
  const transportKeys = transportListing.keys;
  const journeyKeys = journeyListing.keys;
  const result = {
    scanned: 0,
    deleted: 0,
    transport_deleted: 0,
    journeys_deleted: 0,
    truncated: transportListing.truncated || journeyListing.truncated,
  };

  for (const key of transportKeys) {
    result.scanned += 1;
    const record = await store.get(key, { type: "json", consistency: "strong" });
    const claim = normalizeTransportClaim(record, now);
    if (!claim || timestamp(claim.retention_expires_at) <= now) {
      await store.delete(key);
      result.deleted += 1;
      result.transport_deleted += 1;
    }
  }
  for (const key of journeyKeys) {
    result.scanned += 1;
    const record = await store.get(key, { type: "json", consistency: "strong" });
    const id = key.slice("journey/".length);
    const journey = normalizeStoredJourney(record, id, now);
    if (!journey || timestamp(journey.expires_at) <= now) {
      await store.delete(key);
      result.deleted += 1;
      result.journeys_deleted += 1;
    }
  }
  return result;
}

export function extractAttributionTransportToken(text) {
  const match = String(text || "").match(
    /\bJID\s*:\s*(J1_[A-Za-z0-9_-]{22})(?![A-Za-z0-9_-])/i,
  );
  return match ? match[1] : "";
}

// Compatibility alias for the webhook while J1 is now treated only as transport.
export const extractAttributionJourneyToken = extractAttributionTransportToken;

export async function saveAttributionJourney(
  input,
  {
    getStoreImpl = getStore,
    now = Date.now(),
    createJourneyIdImpl = createJourneyId,
  } = {},
) {
  input = input && typeof input === "object" ? input : {};
  const token = boundedString(input.token, 25);
  const key = transportKey(token);
  if (!key) throw new Error("invalid_transport_token");

  const store = journeyStore(getStoreImpl);
  const candidateJourneyId = String(createJourneyIdImpl() || "");
  if (!JOURNEY_ID_PATTERN.test(candidateJourneyId)) throw new Error("invalid_journey_id");
  const candidateClaim = createTransportClaim(candidateJourneyId, now);
  const claimWrite = await store.setJSON(key, candidateClaim, { onlyIfNew: true });
  const rawClaim = claimWrite.modified
    ? candidateClaim
    : await store.get(key, { type: "json", consistency: "strong" });
  const claim = normalizeTransportClaim(rawClaim, now);
  if (
    !claim
    || claim.state !== "active"
    || timestamp(claim.redeem_before) <= now
    || timestamp(claim.retention_expires_at) <= now
  ) throw new Error("transport_token_unavailable");

  const durableKey = journeyKey(claim.journey_id);
  let existing = await store.get(durableKey, { type: "json", consistency: "strong" });
  let record = createJourneyRecord(input, claim.journey_id, now, existing);
  if (!existing) {
    const created = await store.setJSON(durableKey, record, { onlyIfNew: true });
    if (!created.modified) {
      existing = await store.get(durableKey, { type: "json", consistency: "strong" });
      record = createJourneyRecord(input, claim.journey_id, now, existing);
    }
  }

  return {
    ok: true,
    version: 1,
    expiresAt: claim.redeem_before,
    transportExpiresAt: claim.redeem_before,
    journeyExpiresAt: record.expires_at,
    purge: { deferred: true },
  };
}

export async function resolveAttributionJourney(
  token,
  {
    getStoreImpl = getStore,
    now = Date.now(),
    claimantId = "",
  } = {},
) {
  const key = transportKey(token);
  if (!key) return null;
  const normalizedClaimantId = boundedString(claimantId, 46);
  if (!CLAIMANT_ID_PATTERN.test(normalizedClaimantId)) return null;

  const store = journeyStore(getStoreImpl);
  const entry = await store.getWithMetadata(key, {
    type: "json",
    consistency: "strong",
  });
  if (!entry?.etag) return null;
  const claim = normalizeTransportClaim(entry.data, now);
  if (!claim) {
    await store.delete(key);
    return null;
  }
  if (timestamp(claim.retention_expires_at) <= now) {
    await store.delete(key);
    return null;
  }
  if (claim.state === "claimed") {
    return claim.claimant_id === normalizedClaimantId
      ? readClaimedJourney(store, claim, now)
      : null;
  }
  if (claim.state !== "active") return null;

  const nextState = timestamp(claim.redeem_before) <= now ? "expired" : "claimed";
  const claimed = await store.setJSON(
    key,
    {
      ...claim,
      state: nextState,
      ...(nextState === "claimed"
        ? {
            claimant_id: normalizedClaimantId,
            claimed_at: new Date(now).toISOString(),
          }
        : {}),
    },
    { onlyIfMatch: entry.etag },
  );
  if (nextState !== "claimed") return null;
  if (!claimed.modified) {
    const latest = await store.get(key, { type: "json", consistency: "strong" });
    const latestClaim = normalizeTransportClaim(latest, now);
    return latestClaim?.state === "claimed"
      && latestClaim.claimant_id === normalizedClaimantId
      ? readClaimedJourney(store, latestClaim, now)
      : null;
  }

  return readClaimedJourney(store, {
    ...claim,
    state: "claimed",
    claimant_id: normalizedClaimantId,
    claimed_at: new Date(now).toISOString(),
  }, now);
}

async function readClaimedJourney(store, claim, now) {
  const durableKey = journeyKey(claim.journey_id);
  const record = await store.get(durableKey, { type: "json", consistency: "strong" });
  const journey = normalizeStoredJourney(record, claim.journey_id, now);
  if (!journey || timestamp(journey.expires_at) <= now) {
    if (record) await store.delete(durableKey);
    return null;
  }
  return journey;
}

export const ATTRIBUTION_JOURNEY_TTL_MS = JOURNEY_TTL_MS;
export const ATTRIBUTION_TRANSPORT_TOKEN_TTL_MS = TRANSPORT_REDEEM_TTL_MS;
export const ATTRIBUTION_TRANSPORT_RETENTION_TTL_MS = TRANSPORT_RETENTION_TTL_MS;
export const ATTRIBUTION_JOURNEY_TOKEN_PATTERN = TOKEN_PATTERN;
export const ATTRIBUTION_TRANSPORT_TOKEN_PATTERN = TOKEN_PATTERN;
export const ATTRIBUTION_JOURNEY_ID_PATTERN = JOURNEY_ID_PATTERN;
export const ATTRIBUTION_CLAIMANT_ID_PATTERN = CLAIMANT_ID_PATTERN;
