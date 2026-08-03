import { createHash } from "node:crypto";
import { getStore } from "@netlify/blobs";

const STORE_NAME = "liv-external-professional-context-v1";
const VERSION = 1;
const CONTEXT_TTL_MS = 45 * 24 * 60 * 60 * 1_000;

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function normalizedPhone(value) {
  const compact = String(value || "").replace(/[\s()-]/g, "");
  return /^\+\d{8,15}$/.test(compact) ? compact : "";
}

function key(phone) {
  return createHash("sha256")
    .update(`liv-external-professional-v1:${normalizedPhone(phone)}`)
    .digest("hex");
}

function store(getStoreImpl = getStore) {
  return getStoreImpl({
    name: STORE_NAME,
    consistency: "strong",
  });
}

export function isDrHenriqueStaniakAppointmentMessage(text) {
  const value = normalize(text);
  const namesDoctor =
    /\bdr\.? henrique(?: lane)? staniak\b/.test(value);
  const structuredAppointment =
    /\b(?:agendamento confirmado|medico:)\b/.test(value) &&
    /\bdata:/.test(value) &&
    /\bhorario:/.test(value);

  return namesDoctor && structuredAppointment;
}

export function isDrHenriqueOperationalAppointmentRequest(text) {
  const value = normalize(text);
  const namesDoctor = /\bdr\.? henrique(?: lane)?(?: staniak)?\b/.test(
    value,
  );
  const requestsAppointment =
    /\b(?:agendar|agendamento|marcar|consulta|paciente)\b/.test(value);
  const containsSchedulingDetail =
    /\b(?:segunda|terca|quarta|quinta|sexta|sabado|domingo|amanha|hoje)\b/.test(
      value,
    ) ||
    /\b\d{1,2}(?::\d{2}|h(?:\d{2})?)\b/.test(value) ||
    /\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/.test(value);

  return namesDoctor && requestsAppointment && containsSchedulingDetail;
}

export function isExternalProfessionalAppointmentMessage(text) {
  return (
    isDrHenriqueStaniakAppointmentMessage(text) ||
    isDrHenriqueOperationalAppointmentRequest(text)
  );
}

export function isExplicitAmandaInquiry(text) {
  const value = normalize(text);
  return (
    /\b(?:dra\.? )?amanda(?: schroeder)?\b/.test(value) ||
    /\b(?:blefaroplastia|cirurgia plastica|frontoplastia|lifting facial|lifting cervical|lipo de papada|otoplastia|rinoplastia)\b/.test(
      value,
    )
  );
}

export async function markExternalProfessionalContext(
  { phone, at },
  { getStoreImpl = getStore, now = Date.now() } = {},
) {
  const normalized = normalizedPhone(phone);
  if (!normalized) return { status: "skipped" };

  try {
    await store(getStoreImpl).setJSON(key(normalized), {
      version: VERSION,
      professional: "dr_henrique_staniak",
      updatedAt: new Date(at || now).toISOString(),
      expiresAt: new Date(now + CONTEXT_TTL_MS).toISOString(),
    });
    return { status: "completed" };
  } catch {
    return { status: "failed" };
  }
}

export async function getExternalProfessionalContext(
  phone,
  { getStoreImpl = getStore, now = Date.now() } = {},
) {
  const normalized = normalizedPhone(phone);
  if (!normalized) return null;

  try {
    const context = await store(getStoreImpl).get(key(normalized), {
      type: "json",
      consistency: "strong",
    });
    const expiresAt = new Date(context?.expiresAt || 0).getTime();
    if (
      context?.version !== VERSION ||
      context?.professional !== "dr_henrique_staniak" ||
      !Number.isFinite(expiresAt) ||
      expiresAt <= now
    ) {
      return null;
    }
    return context;
  } catch {
    return null;
  }
}

export async function clearExternalProfessionalContext(
  phone,
  { getStoreImpl = getStore } = {},
) {
  const normalized = normalizedPhone(phone);
  if (!normalized) return { status: "skipped" };

  try {
    await store(getStoreImpl).delete(key(normalized));
    return { status: "completed" };
  } catch {
    return { status: "failed" };
  }
}
