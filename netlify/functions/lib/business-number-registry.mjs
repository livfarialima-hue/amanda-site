import { getStore } from "@netlify/blobs";

const STORE_NAME = "liv-whatsapp-business-number-v1";
const CURRENT_KEY = "current";

function normalizePhone(value) {
  const compact = String(value || "").replace(/[\s()-]/g, "");

  if (/^\+\d{8,15}$/.test(compact)) return compact;
  if (/^55\d{10,11}$/.test(compact)) return `+${compact}`;

  return "";
}

function registryStore(getStoreImpl = getStore) {
  return getStoreImpl({
    name: STORE_NAME,
    consistency: "strong",
  });
}

export async function rememberBusinessNumber(
  phone,
  { getStoreImpl = getStore, now = Date.now() } = {},
) {
  const normalized = normalizePhone(phone);

  if (!normalized) return { status: "skipped" };

  try {
    await registryStore(getStoreImpl).setJSON(CURRENT_KEY, {
      phone: normalized,
      updatedAt: new Date(now).toISOString(),
    });
    return { status: "completed", phone: normalized };
  } catch {
    return { status: "failed" };
  }
}

export async function getBusinessNumber(
  {
    env = process.env,
    getStoreImpl = getStore,
  } = {},
) {
  const configured = normalizePhone(
    env.WHATSAPP_SENDER_NUMBER,
  );

  if (configured) return configured;

  try {
    const stored = await registryStore(getStoreImpl).get(
      CURRENT_KEY,
      {
        type: "json",
        consistency: "strong",
      },
    );

    return normalizePhone(stored?.phone);
  } catch {
    return "";
  }
}
