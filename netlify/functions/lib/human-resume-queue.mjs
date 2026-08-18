import { createHash, randomUUID } from "node:crypto";
import { getStore } from "@netlify/blobs";

const STORE_NAME = "liv-human-resume-v1";
const VERSION = 1;
const DEFAULT_DELAY_MS = 20 * 60 * 1_000;
const CLAIM_TTL_MS = 4 * 60 * 1_000;
const MAX_TEXT_LENGTH = 2_000;
const MAX_HISTORY_TURNS = 16;

function limitedText(value, maximumLength = MAX_TEXT_LENGTH) {
  return Array.from(String(value || "").trim())
    .slice(0, maximumLength)
    .join("");
}

function normalizedPhone(value) {
  const compact = String(value || "").replace(/[\s()-]/g, "");
  return /^\+\d{8,15}$/.test(compact) ? compact : "";
}

function identity(phone) {
  return createHash("sha256")
    .update(`liv-human-resume-v1:${normalizedPhone(phone)}`)
    .digest("hex");
}

function pendingKey(phone) {
  return `pending/${identity(phone)}`;
}

function controlKey(phone) {
  return `control/${identity(phone)}`;
}

function resumeStore(getStoreImpl = getStore) {
  return getStoreImpl({
    name: STORE_NAME,
    consistency: "strong",
  });
}

function normalizedHistory(value) {
  return (Array.isArray(value) ? value : [])
    .slice(-MAX_HISTORY_TURNS)
    .map((turn) => ({
      role: turn?.role === "assistant" ? "assistant" : "patient",
      source: limitedText(turn?.source, 40),
      text: limitedText(turn?.text, 500),
      at: limitedText(turn?.at, 40),
    }))
    .filter((turn) => turn.text);
}

function parsedTime(value, fallback) {
  const parsed = new Date(value || fallback).getTime();
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizedControl(value) {
  if (!value || value.version !== VERSION) return null;
  if (
    !["human_active", "bruna_resumed", "waiting_human"].includes(
      value.status,
    )
  ) {
    return null;
  }

  return {
    version: VERSION,
    status: value.status,
    generation: limitedText(value.generation, 120),
    updatedAt: limitedText(value.updatedAt, 40),
  };
}

function normalizedPending(value) {
  if (!value || value.version !== VERSION) return null;
  if (!["pending", "processing"].includes(value.status)) return null;

  const phone = normalizedPhone(value.phone);
  const from = normalizedPhone(value.from);
  const eventId = limitedText(value.eventId, 200);
  const generation = limitedText(value.generation, 120);
  const dueAt = parsedTime(value.dueAt, NaN);

  if (!phone || !from || !eventId || !generation || !Number.isFinite(dueAt)) {
    return null;
  }

  return {
    version: VERSION,
    status: value.status,
    phone,
    from,
    eventId,
    generation,
    patientName: limitedText(value.patientName, 120),
    text: limitedText(value.text),
    messageType: limitedText(value.messageType, 40) || "text",
    platform: limitedText(value.platform, 80),
    reference: limitedText(value.reference, 200),
    referenceCategory: limitedText(value.referenceCategory, 80),
    procedure: limitedText(value.procedure, 120),
    referralContext:
      value.referralContext &&
      typeof value.referralContext === "object" &&
      !Array.isArray(value.referralContext)
        ? value.referralContext
        : null,
    recentConversation: normalizedHistory(value.recentConversation),
    morningResume: value.morningResume === true,
    receivedAt: limitedText(value.receivedAt, 40),
    dueAt,
    claimToken: limitedText(value.claimToken, 120),
    claimUntil: parsedTime(value.claimUntil, 0),
    attempts: Math.max(0, Number(value.attempts || 0)),
    updatedAt: limitedText(value.updatedAt, 40),
  };
}

async function readControl(phone, getStoreImpl = getStore) {
  const store = resumeStore(getStoreImpl);
  return normalizedControl(
    await store.get(controlKey(phone), {
      type: "json",
      consistency: "strong",
    }),
  );
}

export async function markHumanTakeover(
  { phone, eventId, at },
  { getStoreImpl = getStore, now = Date.now() } = {},
) {
  if (!normalizedPhone(phone)) return { status: "skipped" };

  try {
    const store = resumeStore(getStoreImpl);
    const generation =
      limitedText(eventId, 100) || `takeover-${now}`;
    await store.delete(pendingKey(phone));
    await store.setJSON(controlKey(phone), {
      version: VERSION,
      status: "human_active",
      generation,
      updatedAt: new Date(parsedTime(at, now)).toISOString(),
    });
    return { status: "completed", generation };
  } catch {
    return { status: "failed" };
  }
}

export async function getHumanResumeControl(
  phone,
  { getStoreImpl = getStore } = {},
) {
  if (!normalizedPhone(phone)) return null;

  try {
    return await readControl(phone, getStoreImpl);
  } catch {
    return null;
  }
}

export async function scheduleHumanResume(
  input,
  {
    getStoreImpl = getStore,
    now = Date.now(),
    delayMs = DEFAULT_DELAY_MS,
  } = {},
) {
  const phone = normalizedPhone(input?.phone);
  const from = normalizedPhone(input?.from);
  const eventId = limitedText(input?.eventId, 200);
  const messageType =
    limitedText(input?.messageType, 40).toLowerCase() ||
    "text";

  if (
    !phone ||
    !from ||
    !eventId ||
    (
      messageType === "text" &&
      !limitedText(input?.text)
    )
  ) {
    return { status: "skipped" };
  }

  try {
    const store = resumeStore(getStoreImpl);
    let control = await readControl(phone, getStoreImpl);
    const receivedAt = parsedTime(input.receivedAt, now);
    const expectedGeneration = limitedText(
      input.expectedHumanGeneration,
      100,
    );

    if (
      expectedGeneration &&
      control?.generation !== expectedGeneration
    ) {
      return {
        status: "superseded",
        reason: "newer_human_activity",
      };
    }

    const controlUpdatedAt = new Date(
      control?.updatedAt || 0,
    ).getTime();
    if (
      control?.status === "human_active" &&
      Number.isFinite(controlUpdatedAt) &&
      controlUpdatedAt > receivedAt
    ) {
      return {
        status: "superseded",
        reason: "human_replied_after_patient",
      };
    }

    if (control?.status === "waiting_human") {
      return { status: "waiting_human" };
    }

    if (!control || control.status !== "human_active") {
      control = {
        version: VERSION,
        status: "human_active",
        generation: `legacy-${new Date(now).toISOString().slice(0, 10)}`,
        updatedAt: new Date(now).toISOString(),
      };
      await store.setJSON(controlKey(phone), control);
    }

    const dueAt = Math.max(now, receivedAt) + Math.max(1, delayMs);
    await store.setJSON(pendingKey(phone), {
      version: VERSION,
      status: "pending",
      phone,
      from,
      eventId,
      generation: control.generation,
      patientName: limitedText(input.patientName, 120),
      text: limitedText(input.text),
      messageType,
      platform: limitedText(input.platform, 80),
      reference: limitedText(input.reference, 200),
      referenceCategory: limitedText(input.referenceCategory, 80),
      procedure: limitedText(input.procedure, 120),
      referralContext: input.referralContext || null,
      recentConversation: normalizedHistory(input.recentConversation),
      morningResume: input.morningResume === true,
      receivedAt: new Date(receivedAt).toISOString(),
      dueAt,
      attempts: 0,
      updatedAt: new Date(now).toISOString(),
    });

    return {
      status: "scheduled",
      dueAt: new Date(dueAt).toISOString(),
      generation: control.generation,
    };
  } catch {
    return { status: "failed" };
  }
}

export async function cancelPendingHumanResume(
  phone,
  { getStoreImpl = getStore } = {},
) {
  if (!normalizedPhone(phone)) return { status: "skipped" };

  try {
    await resumeStore(getStoreImpl).delete(pendingKey(phone));
    return { status: "completed" };
  } catch {
    return { status: "failed" };
  }
}

export async function markBrunaResumed(
  { phone, expectedHumanGeneration = "", at } = {},
  { getStoreImpl = getStore, now = Date.now() } = {},
) {
  if (!normalizedPhone(phone)) return { status: "skipped" };

  try {
    const store = resumeStore(getStoreImpl);
    const entry = await store.getWithMetadata(controlKey(phone), {
      type: "json",
      consistency: "strong",
    });
    const control = normalizedControl(entry?.data);
    const expectedGeneration = limitedText(
      expectedHumanGeneration,
      120,
    );

    if (
      !control ||
      control.status !== "human_active" ||
      (expectedGeneration && control.generation !== expectedGeneration)
    ) {
      return {
        status: "superseded",
        reason: "newer_human_activity",
      };
    }

    const write = await store.setJSON(
      controlKey(phone),
      {
        version: VERSION,
        status: "bruna_resumed",
        generation: control.generation,
        updatedAt: new Date(parsedTime(at, now)).toISOString(),
      },
      { onlyIfMatch: entry.etag },
    );

    if (!write.modified) {
      return {
        status: "superseded",
        reason: "newer_human_activity",
      };
    }

    await store.delete(pendingKey(phone));
    return { status: "completed" };
  } catch {
    return { status: "failed" };
  }
}

export async function claimDueHumanResumes(
  {
    getStoreImpl = getStore,
    now = Date.now(),
    limit = 5,
  } = {},
) {
  try {
    const store = resumeStore(getStoreImpl);
    const listing = await store.list({ prefix: "pending/" });
    const jobs = [];

    for (const blob of listing.blobs || []) {
      if (jobs.length >= limit) break;

      const entry = await store.getWithMetadata(blob.key, {
        type: "json",
        consistency: "strong",
      });
      const pending = normalizedPending(entry?.data);

      if (
        !pending ||
        pending.dueAt > now ||
        (
          pending.status === "processing" &&
          pending.claimUntil > now
        )
      ) {
        continue;
      }

      const control = await readControl(pending.phone, getStoreImpl);
      if (
        !control ||
        control.status !== "human_active" ||
        control.generation !== pending.generation
      ) {
        await store.delete(blob.key);
        continue;
      }

      const claimToken = randomUUID();
      const claimed = {
        ...pending,
        status: "processing",
        claimToken,
        claimUntil: now + CLAIM_TTL_MS,
        attempts: pending.attempts + 1,
        updatedAt: new Date(now).toISOString(),
      };
      const write = await store.setJSON(blob.key, claimed, {
        onlyIfMatch: entry.etag,
      });

      if (write.modified) {
        jobs.push({
          ...claimed,
          queueKey: blob.key,
        });
      }
    }

    return { status: "completed", jobs };
  } catch {
    return { status: "failed", jobs: [] };
  }
}

export async function isHumanResumeClaimCurrent(
  job,
  { getStoreImpl = getStore } = {},
) {
  try {
    const store = resumeStore(getStoreImpl);
    const pending = normalizedPending(
      await store.get(job.queueKey, {
        type: "json",
        consistency: "strong",
      }),
    );
    const control = await readControl(job.phone, getStoreImpl);

    return Boolean(
      pending?.status === "processing" &&
        pending.claimToken === job.claimToken &&
        pending.eventId === job.eventId &&
        control?.status === "human_active" &&
        control.generation === job.generation,
    );
  } catch {
    return false;
  }
}

export async function completeHumanResume(
  job,
  {
    controlStatus = "human_active",
    getStoreImpl = getStore,
    now = Date.now(),
  } = {},
) {
  try {
    if (
      !["human_active", "bruna_resumed", "waiting_human"].includes(
        controlStatus,
      )
    ) {
      return { status: "skipped" };
    }

    const current = await isHumanResumeClaimCurrent(job, {
      getStoreImpl,
    });
    if (!current) return { status: "superseded" };

    const store = resumeStore(getStoreImpl);
    await store.delete(job.queueKey);
    await store.setJSON(controlKey(job.phone), {
      version: VERSION,
      status: controlStatus,
      generation: job.generation,
      updatedAt: new Date(now).toISOString(),
    });
    return { status: "completed" };
  } catch {
    return { status: "failed" };
  }
}

export async function rescheduleHumanResume(
  job,
  dueAt,
  { getStoreImpl = getStore, now = Date.now() } = {},
) {
  try {
    const store = resumeStore(getStoreImpl);
    const entry = await store.getWithMetadata(job.queueKey, {
      type: "json",
      consistency: "strong",
    });
    const pending = normalizedPending(entry?.data);

    if (
      !pending ||
      pending.status !== "processing" ||
      pending.claimToken !== job.claimToken
    ) {
      return { status: "superseded" };
    }

    const write = await store.setJSON(
      job.queueKey,
      {
        ...pending,
        status: "pending",
        dueAt: parsedTime(dueAt, now + 5 * 60 * 1_000),
        claimToken: "",
        claimUntil: 0,
        updatedAt: new Date(now).toISOString(),
      },
      { onlyIfMatch: entry.etag },
    );

    return { status: write.modified ? "rescheduled" : "superseded" };
  } catch {
    return { status: "failed" };
  }
}

export const HUMAN_RESUME_DELAY_MS = DEFAULT_DELAY_MS;
