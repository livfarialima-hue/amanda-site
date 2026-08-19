import assert from "node:assert/strict";
import test from "node:test";
import {
  ATTRIBUTION_JOURNEY_TTL_MS,
  ATTRIBUTION_TRANSPORT_TOKEN_TTL_MS,
  extractAttributionJourneyToken,
  purgeExpiredAttributionJourneys,
  resolveAttributionJourney,
  saveAttributionJourney,
} from "./attribution-journey-store.mjs";
import attributionJourneyHandler, {
  config as attributionJourneyConfig,
  handleAttributionJourneyPurge,
} from "../attribution-journey.mjs";

function memoryStore() {
  const values = new Map();
  const etags = new Map();
  const listPagesRead = [];
  let revision = 0;
  const store = {
    async get(key) {
      return values.has(key) ? structuredClone(values.get(key)) : null;
    },
    async getWithMetadata(key) {
      return values.has(key)
        ? {
            data: structuredClone(values.get(key)),
            etag: etags.get(key),
            metadata: {},
          }
        : null;
    },
    async setJSON(key, value, options = {}) {
      if (options.onlyIfNew && values.has(key)) return { modified: false };
      if (options.onlyIfMatch && etags.get(key) !== options.onlyIfMatch) {
        return { modified: false };
      }
      revision += 1;
      const etag = `etag-${revision}`;
      values.set(key, structuredClone(value));
      etags.set(key, etag);
      return { modified: true, etag };
    },
    async delete(key) {
      values.delete(key);
      etags.delete(key);
    },
    list({ prefix = "", paginate = false } = {}) {
      const blobs = [...values.keys()]
        .filter((key) => key.startsWith(prefix))
        .sort()
        .map((key) => ({ key, etag: etags.get(key) }));
      if (!paginate) return Promise.resolve({ blobs, directories: [] });
      return (async function* paginatedList() {
        for (let index = 0; index < blobs.length; index += 1) {
          listPagesRead.push({ prefix, index });
          yield { blobs: [blobs[index]], directories: [] };
        }
      }());
    },
  };
  return { getStoreImpl: () => store, listPagesRead, values };
}

const TOKEN = "J1_abcdefghijklmnopqrstuv";
const TOKEN_2 = "J1_bcdefghijklmnopqrstuvw";
const TOKEN_3 = "J1_cdefghijklmnopqrstuvwx";
const JOURNEY_ID = "J2_abcdefghijklmnopqrstuv";
const JOURNEY_ID_2 = "J2_bcdefghijklmnopqrstuvw";
const JOURNEY_ID_3 = "J2_cdefghijklmnopqrstuvwx";
const CLAIMANT = `C1_${"a".repeat(43)}`;
const CLAIMANT_2 = `C1_${"b".repeat(43)}`;
const SESSION = "S1_abcdefghijklmnopqrstuv";
const NOW = Date.parse("2026-08-15T15:00:00.000Z");

function metaJourney(token = TOKEN) {
  return {
    token,
    first_touch: {
      occurred_at: "2026-08-15T14:55:00.000Z",
      session_id: SESSION,
      origin: "Meta Ads",
      channel: "meta_ads",
      source: "meta",
      medium: "paid_social",
      campaign_code: "M26F02S",
      creative_code: "C01H01",
      meta_campaign_id: "120000000000000000",
      meta_adset_id: "120000000000000001",
      meta_ad_id: "120000000000000002",
      page_path: "/avaliacao-facial/",
    },
    last_touch: {
      occurred_at: "2026-08-15T14:58:00.000Z",
      session_id: SESSION,
      origin: "Meta Ads",
      channel: "meta_ads",
      campaign_code: "M26F02S",
      page_path: "/blefaroplastia/",
    },
    last_non_direct_touch: {
      occurred_at: "2026-08-15T14:55:00.000Z",
      session_id: SESSION,
      origin: "Meta Ads",
      channel: "meta_ads",
      campaign_code: "M26F02S",
      page_path: "/avaliacao-facial/",
    },
    conversion_path: "meta_site_whatsapp",
    cta: {
      page_path: "/blefaroplastia/",
      location: "hero",
      template_id: "procedure_evaluation_v1",
    },
    click_ids: { gclid: "CjwKCAjwsrbTBhAvEiwA0Bpp4example" },
    confidence: "observed",
  };
}

test("stores a durable PII-free journey behind a short single-use transport claim", async () => {
  const backing = memoryStore();
  const saved = await saveAttributionJourney(metaJourney(), {
    getStoreImpl: backing.getStoreImpl,
    now: NOW,
    createJourneyIdImpl: () => JOURNEY_ID,
  });

  assert.equal(saved.transportExpiresAt, new Date(NOW + ATTRIBUTION_TRANSPORT_TOKEN_TTL_MS).toISOString());
  assert.equal(saved.journeyExpiresAt, new Date(NOW + ATTRIBUTION_JOURNEY_TTL_MS).toISOString());
  assert.equal(backing.values.get(`transport/${TOKEN}`).journey_id, JOURNEY_ID);
  assert.equal(backing.values.get(`journey/${JOURNEY_ID}`).token, undefined);

  const resolved = await resolveAttributionJourney(TOKEN, {
    getStoreImpl: backing.getStoreImpl,
    now: NOW + 1_000,
    claimantId: CLAIMANT,
  });
  assert.equal(resolved.journey_id, JOURNEY_ID);
  assert.equal(resolved.first_touch.origin, "Meta Ads");
  assert.equal(resolved.first_touch.campaign_code, "M26F02S");
  assert.equal(resolved.cta.page_path, "/blefaroplastia/");
  assert.equal(resolved.click_ids.gclid, "CjwKCAjwsrbTBhAvEiwA0Bpp4example");
  assert.equal("token" in resolved, false);
  assert.equal(JSON.stringify(resolved).includes("+55"), false);
});

test("accepts explicit returning and patient-reported taxonomy without inferring it", async () => {
  const backing = memoryStore();
  const input = metaJourney(TOKEN_2);
  input.first_touch.origin = "Retorno de paciente";
  input.first_touch.channel = "returning_patient";
  input.last_touch.origin = "Origem informada pelo paciente";
  input.last_touch.channel = "patient_reported";
  await saveAttributionJourney(input, {
    getStoreImpl: backing.getStoreImpl,
    now: NOW,
    createJourneyIdImpl: () => JOURNEY_ID_2,
  });
  const stored = backing.values.get(`journey/${JOURNEY_ID_2}`);
  assert.equal(stored.first_touch.origin, "Retorno de paciente");
  assert.equal(stored.first_touch.channel, "returning_patient");
  assert.equal(stored.last_touch.origin, "Origem informada pelo paciente");
  assert.equal(stored.last_touch.channel, "patient_reported");
});

test("rejects identifiers and paths outside the closed contract", async () => {
  const backing = memoryStore();
  const input = metaJourney();
  input.first_touch.meta_campaign_id = "+5500000000000";
  input.first_touch.page_path = "/avaliacao-facial/?phone=0000000000000";
  await saveAttributionJourney(input, {
    getStoreImpl: backing.getStoreImpl,
    now: NOW,
    createJourneyIdImpl: () => JOURNEY_ID,
  });
  const resolved = await resolveAttributionJourney(TOKEN, {
    getStoreImpl: backing.getStoreImpl,
    now: NOW + 1,
    claimantId: CLAIMANT,
  });
  assert.equal(resolved.first_touch.meta_campaign_id, "");
  assert.equal(resolved.first_touch.page_path, "");
});

test("repeated saves never slide transport or journey expiration", async () => {
  const backing = memoryStore();
  const first = await saveAttributionJourney(metaJourney(), {
    getStoreImpl: backing.getStoreImpl,
    now: NOW,
    createJourneyIdImpl: () => JOURNEY_ID,
  });
  const second = await saveAttributionJourney(metaJourney(), {
    getStoreImpl: backing.getStoreImpl,
    now: NOW + 5 * 60 * 1_000,
    createJourneyIdImpl: () => JOURNEY_ID_2,
  });
  assert.equal(second.transportExpiresAt, first.transportExpiresAt);
  assert.equal(second.journeyExpiresAt, first.journeyExpiresAt);
  assert.equal(backing.values.get(`transport/${TOKEN}`).journey_id, JOURNEY_ID);
  assert.equal(backing.values.has(`journey/${JOURNEY_ID_2}`), false);
});

test("an altered retry cannot overwrite any field of the frozen journey envelope", async () => {
  const backing = memoryStore();
  await saveAttributionJourney(metaJourney(), {
    getStoreImpl: backing.getStoreImpl,
    now: NOW,
    createJourneyIdImpl: () => JOURNEY_ID,
  });
  const original = structuredClone(backing.values.get(`journey/${JOURNEY_ID}`));
  const altered = metaJourney();
  altered.last_touch.page_path = "/otoplastia/";
  altered.cta.location = "footer";
  altered.confidence = "partial";

  await assert.rejects(
    saveAttributionJourney(altered, {
      getStoreImpl: backing.getStoreImpl,
      now: NOW + 1_000,
      createJourneyIdImpl: () => JOURNEY_ID_2,
    }),
    /journey_payload_conflict/,
  );
  assert.deepEqual(backing.values.get(`journey/${JOURNEY_ID}`), original);
  assert.equal(backing.values.has(`journey/${JOURNEY_ID_2}`), false);
});

test("a stale durable journey fails closed and cannot be recreated by retry", async () => {
  const backing = memoryStore();
  await saveAttributionJourney(metaJourney(), {
    getStoreImpl: backing.getStoreImpl,
    now: NOW,
    createJourneyIdImpl: () => JOURNEY_ID,
  });
  const stale = backing.values.get(`journey/${JOURNEY_ID}`);
  stale.expires_at = new Date(NOW - 1).toISOString();
  backing.values.set(`journey/${JOURNEY_ID}`, stale);

  await assert.rejects(
    saveAttributionJourney(metaJourney(), {
      getStoreImpl: backing.getStoreImpl,
      now: NOW + 1_000,
      createJourneyIdImpl: () => JOURNEY_ID_2,
    }),
    /journey_state_expired/,
  );
  assert.deepEqual(backing.values.get(`journey/${JOURNEY_ID}`), stale);
  assert.equal(backing.values.has(`journey/${JOURNEY_ID_2}`), false);
});

test("concurrent conflicting saves freeze the first complete envelope and reject the loser", async () => {
  const backing = memoryStore();
  const first = metaJourney();
  const second = metaJourney();
  second.last_touch.page_path = "/otoplastia/";
  second.cta.page_path = "/otoplastia/";

  const results = await Promise.allSettled([
    saveAttributionJourney(first, {
      getStoreImpl: backing.getStoreImpl,
      now: NOW,
      createJourneyIdImpl: () => JOURNEY_ID,
    }),
    saveAttributionJourney(second, {
      getStoreImpl: backing.getStoreImpl,
      now: NOW,
      createJourneyIdImpl: () => JOURNEY_ID_2,
    }),
  ]);

  assert.equal(results.filter(({ status }) => status === "fulfilled").length, 1);
  assert.equal(results.filter(({ status }) => status === "rejected").length, 1);
  assert.match(
    results.find(({ status }) => status === "rejected").reason.message,
    /journey_payload_conflict/,
  );
  assert.equal(backing.values.get(`transport/${TOKEN}`).journey_id, JOURNEY_ID);
  assert.equal(backing.values.get(`journey/${JOURNEY_ID}`).last_touch.page_path, "/blefaroplastia/");
  assert.equal(backing.values.get(`journey/${JOURNEY_ID}`).cta.page_path, "/blefaroplastia/");
  assert.equal(backing.values.has(`journey/${JOURNEY_ID_2}`), false);
});

test("resolve normalizes stored touches against the current clock", async () => {
  const backing = memoryStore();
  await saveAttributionJourney(metaJourney(), {
    getStoreImpl: backing.getStoreImpl,
    now: NOW,
    createJourneyIdImpl: () => JOURNEY_ID,
  });
  const record = backing.values.get(`journey/${JOURNEY_ID}`);
  record.last_touch.occurred_at = new Date(NOW + 6 * 60 * 1_000).toISOString();
  backing.values.set(`journey/${JOURNEY_ID}`, record);

  const resolved = await resolveAttributionJourney(TOKEN, {
    getStoreImpl: backing.getStoreImpl,
    now: NOW + 9 * 60 * 1_000,
    claimantId: CLAIMANT,
  });
  assert.equal(resolved.last_touch.occurred_at, new Date(NOW + 6 * 60 * 1_000).toISOString());
});

test("after the first atomic claim, retries are idempotent only for its claimant", async () => {
  const backing = memoryStore();
  await saveAttributionJourney(metaJourney(), {
    getStoreImpl: backing.getStoreImpl,
    now: NOW,
    createJourneyIdImpl: () => JOURNEY_ID,
  });
  const results = await Promise.all([
    resolveAttributionJourney(TOKEN, {
      getStoreImpl: backing.getStoreImpl,
      now: NOW + 1,
      claimantId: CLAIMANT,
    }),
    resolveAttributionJourney(TOKEN, {
      getStoreImpl: backing.getStoreImpl,
      now: NOW + 1,
      claimantId: CLAIMANT,
    }),
  ]);
  assert.equal(results.filter(Boolean).length, 2);
  assert.equal(backing.values.get(`transport/${TOKEN}`).state, "claimed");
  assert.equal(backing.values.get(`transport/${TOKEN}`).claimant_id, CLAIMANT);
  assert.equal((await resolveAttributionJourney(TOKEN, {
    getStoreImpl: backing.getStoreImpl,
    now: NOW + 2,
    claimantId: CLAIMANT,
  })).journey_id, JOURNEY_ID);
  assert.equal(await resolveAttributionJourney(TOKEN, {
    getStoreImpl: backing.getStoreImpl,
    now: NOW + 2,
    claimantId: CLAIMANT_2,
  }), null);
  assert.equal(await resolveAttributionJourney(TOKEN, {
    getStoreImpl: backing.getStoreImpl,
    now: NOW + 2,
    claimantId: "raw-event-id",
  }), null);
});

test("an expired transport token cannot be redeemed or rearmed", async () => {
  const backing = memoryStore();
  await saveAttributionJourney(metaJourney(TOKEN_2), {
    getStoreImpl: backing.getStoreImpl,
    now: NOW,
    createJourneyIdImpl: () => JOURNEY_ID_2,
  });
  const afterDeadline = NOW + ATTRIBUTION_TRANSPORT_TOKEN_TTL_MS + 1;
  assert.equal(
    await resolveAttributionJourney(TOKEN_2, {
      getStoreImpl: backing.getStoreImpl,
      now: afterDeadline,
      claimantId: CLAIMANT,
    }),
    null,
  );
  assert.equal(backing.values.get(`transport/${TOKEN_2}`).state, "expired");
  await assert.rejects(
    saveAttributionJourney(metaJourney(TOKEN_2), {
      getStoreImpl: backing.getStoreImpl,
      now: afterDeadline,
      createJourneyIdImpl: () => JOURNEY_ID_3,
    }),
    /transport_token_unavailable/,
  );
});

test("purge physically removes expired journey state and transport tombstones", async () => {
  const backing = memoryStore();
  await saveAttributionJourney(metaJourney(TOKEN_3), {
    getStoreImpl: backing.getStoreImpl,
    now: NOW,
    createJourneyIdImpl: () => JOURNEY_ID_3,
  });
  const transport = backing.values.get(`transport/${TOKEN_3}`);
  transport.retention_expires_at = new Date(NOW + 60 * 24 * 60 * 60 * 1_000).toISOString();
  backing.values.set(`transport/${TOKEN_3}`, transport);
  const journey = backing.values.get(`journey/${JOURNEY_ID_3}`);
  journey.expires_at = new Date(NOW + 60 * 24 * 60 * 60 * 1_000).toISOString();
  backing.values.set(`journey/${JOURNEY_ID_3}`, journey);
  const purge = await purgeExpiredAttributionJourneys({
    getStoreImpl: backing.getStoreImpl,
    now: NOW + ATTRIBUTION_JOURNEY_TTL_MS + 1,
    limit: 2,
  });
  assert.deepEqual(purge, {
    scanned: 2,
    deleted: 2,
    transport_deleted: 1,
    journeys_deleted: 1,
    truncated: false,
  });
  assert.equal(backing.values.size, 0);
});

test("purge bounds scans per prefix after the store returns its auto-paginated list", async () => {
  const backing = memoryStore();
  const activeUntil = new Date(NOW + ATTRIBUTION_JOURNEY_TTL_MS).toISOString();
  for (let index = 0; index < 8; index += 1) {
    backing.values.set(`transport/test-${index}`, {
      version: 1,
      kind: "transport_claim",
      journey_id: JOURNEY_ID,
      state: "active",
      created_at: new Date(NOW).toISOString(),
      redeem_before: new Date(NOW + ATTRIBUTION_TRANSPORT_TOKEN_TTL_MS).toISOString(),
      retention_expires_at: activeUntil,
    });
  }
  backing.values.set(`journey/${JOURNEY_ID_2}`, {
    version: 1,
    journey_id: JOURNEY_ID_2,
    created_at: new Date(NOW - ATTRIBUTION_JOURNEY_TTL_MS - 1).toISOString(),
    expires_at: new Date(NOW - 1).toISOString(),
  });

  const purge = await purgeExpiredAttributionJourneys({
    getStoreImpl: backing.getStoreImpl,
    now: NOW,
    limit: 4,
  });
  assert.equal(purge.scanned, 3);
  assert.equal(purge.journeys_deleted, 1);
  assert.equal(purge.truncated, true);
  assert.equal(backing.listPagesRead.length, 0);
});

test("daily rotation eventually reaches an expired key beyond the first scan window", async () => {
  const backing = memoryStore();
  const activeUntil = new Date(NOW + 60 * 24 * 60 * 60 * 1_000).toISOString();
  for (let index = 0; index < 8; index += 1) {
    backing.values.set(`transport/rotated-${index}`, {
      version: 1,
      kind: "transport_claim",
      journey_id: JOURNEY_ID,
      state: "active",
      created_at: new Date(NOW).toISOString(),
      redeem_before: new Date(NOW + ATTRIBUTION_TRANSPORT_TOKEN_TTL_MS).toISOString(),
      retention_expires_at: activeUntil,
    });
  }
  const expiredKey = "transport/rotated-7";
  backing.values.set(expiredKey, {
    ...backing.values.get(expiredKey),
    created_at: new Date(NOW - ATTRIBUTION_JOURNEY_TTL_MS - 1).toISOString(),
    redeem_before: new Date(NOW - 1).toISOString(),
    retention_expires_at: new Date(NOW - 1).toISOString(),
  });

  for (let dayOffset = 0; dayOffset < 4; dayOffset += 1) {
    await purgeExpiredAttributionJourneys({
      getStoreImpl: backing.getStoreImpl,
      now: NOW + dayOffset * 24 * 60 * 60 * 1_000,
      limit: 4,
    });
  }
  assert.equal(backing.values.has(expiredKey), false);
});

test("authenticated purge endpoint applies a bounded scheduled cleanup budget", async () => {
  const secret = "purge-secret-with-at-least-thirty-two-bytes";
  const calls = [];
  const request = new Request("https://example.test/.netlify/functions/attribution-journey?limit=5000", {
    method: "DELETE",
    headers: { authorization: `Bearer ${secret}` },
  });
  const response = await handleAttributionJourneyPurge(request, {
    secret,
    now: NOW,
    purgeImpl: async (options) => {
      calls.push(options);
      return {
        scanned: 12,
        deleted: 3,
        transport_deleted: 2,
        journeys_deleted: 1,
        truncated: true,
      };
    },
  });
  assert.equal(response.status, 200);
  assert.deepEqual(calls, [{ now: NOW, limit: 1_000 }]);
  assert.deepEqual(await response.json(), {
    ok: true,
    purge: {
      scanned: 12,
      deleted: 3,
      transport_deleted: 2,
      journeys_deleted: 1,
      truncated: true,
    },
  });
});

test("purge endpoint rejects an untrusted caller before cleanup", async () => {
  const secret = "purge-secret-with-at-least-thirty-two-bytes";
  let called = false;
  const request = new Request("https://example.test/.netlify/functions/attribution-journey", {
    method: "DELETE",
    headers: { authorization: "Bearer wrong-secret" },
  });
  const response = await handleAttributionJourneyPurge(request, {
    secret,
    purgeImpl: async () => {
      called = true;
      return {};
    },
  });
  assert.equal(response.status, 401);
  assert.equal(called, false);
});

test("journey POST rejects a missing Origin and exports a bounded Netlify rate limit", async () => {
  const response = await attributionJourneyHandler(new Request(
    "https://draamandaschroeder.com.br/.netlify/functions/attribution-journey",
    { method: "POST", body: "{}" },
  ));
  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), {
    ok: false,
    error: "origin_not_allowed",
  });
  assert.deepEqual(attributionJourneyConfig.rateLimit, {
    windowLimit: 20,
    windowSize: 60,
    aggregateBy: ["ip", "domain"],
  });
});

test("journey POST accepts the canonical site Origin before validating its body", async () => {
  const response = await attributionJourneyHandler(new Request(
    "https://draamandaschroeder.com.br/.netlify/functions/attribution-journey",
    {
      method: "POST",
      headers: { origin: "https://draamandaschroeder.com.br" },
      body: "not-json",
    },
  ));
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    ok: false,
    error: "invalid_json",
  });
});

test("extracts only the short versioned transport token", () => {
  assert.equal(extractAttributionJourneyToken(`Olá.\nJID: ${TOKEN}`), TOKEN);
  assert.equal(extractAttributionJourneyToken(`JID: ${JOURNEY_ID}`), "");
  assert.equal(extractAttributionJourneyToken("JID: J1_curto"), "");
});
