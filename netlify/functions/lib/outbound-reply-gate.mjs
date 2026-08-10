import { createHash, randomUUID } from "node:crypto";
import { getStore } from "@netlify/blobs";
import {
  CONVERSATION_ACTIONS,
  isExplicitDeferralWithoutRequest,
  isSimpleConversationClosing,
} from "./conversation-action-controller.mjs";
import { sendYCloudPatientText } from "./ycloud-patient-message.mjs";

const STORE_NAME = "liv-whatsapp-outbound-replies-v1";
const CLAIM_TTL_MS = 2 * 60 * 1_000;
const MAX_REPLY_LENGTH = 1_500;

function normalizedPhone(value) {
  const compact = String(value || "").replace(/[\s()-]/g, "");
  return /^\+\d{8,15}$/.test(compact) ? compact : "";
}

function limited(value, maximumLength = 1_500) {
  return Array.from(String(value || "").trim())
    .slice(0, maximumLength)
    .join("");
}

function normalizedText(value) {
  return limited(value)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function urls(value) {
  return limited(value).match(/https?:\/\/[^\s)]+/gi) || [];
}

function unsafeReplyContentReason(value) {
  const text = String(value || "");

  if (/BEGIN:VCARD|END:VCARD|VERSION:3\.0|(?:item\d+\.)?TEL(?:;|:)/i.test(text)) {
    return "contact_card_content";
  }
  if (/\[(?:nome|name|primeiro nome)\]|\{\{\s*(?:nome|name)\s*\}\}|<nome>/i.test(text)) {
    return "unresolved_placeholder";
  }
  if (/https?:\/\/(?:www\.)?draamandaschroeder(?!\.com\.br)(?:[\s/]|$)/i.test(text)) {
    return "malformed_clinic_url";
  }
  if (/\b(\d{1,2}(?::\d{2}|h(?:\d{2})?))\b\s*[,;\/-]\s*\1\b/i.test(text)) {
    return "duplicated_time";
  }

  return "";
}

function tokens(value) {
  return new Set(
    normalizedText(value)
      .split(" ")
      .filter((token) => token.length >= 3),
  );
}

function similarity(left, right) {
  const a = tokens(left);
  const b = tokens(right);
  if (a.size < 6 || b.size < 6) return 0;

  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection += 1;
  }
  return intersection / new Set([...a, ...b]).size;
}

function lastAssistantTurn(recentConversation) {
  return (Array.isArray(recentConversation) ? recentConversation : [])
    .slice()
    .reverse()
    .find((turn) => turn?.role === "assistant");
}

function store(getStoreImpl = getStore) {
  return getStoreImpl({
    name: STORE_NAME,
    consistency: "strong",
  });
}

function replyKey(phone, eventId) {
  return createHash("sha256")
    .update(
      `liv-outbound-v1:${normalizedPhone(phone)}:${limited(eventId, 200)}`,
    )
    .digest("hex");
}

export function validateOutboundReply({
  body,
  currentText,
  recentConversation = [],
  conversationAction,
}) {
  const rawReply = String(body || "").trim();
  if (Array.from(rawReply).length > MAX_REPLY_LENGTH) {
    return { allowed: false, reason: "reply_too_long" };
  }

  const reply = limited(rawReply, MAX_REPLY_LENGTH);
  if (!reply) return { allowed: false, reason: "empty_reply" };

  const unsafeReason = unsafeReplyContentReason(reply);
  if (unsafeReason) {
    return { allowed: false, reason: unsafeReason };
  }

  const action = conversationAction?.action;
  const permitted =
    action === CONVERSATION_ACTIONS.RESPOND ||
    (
      action === CONVERSATION_ACTIONS.WAIT_TEAM &&
      conversationAction?.allowHoldingReply === true
    );

  if (!permitted) {
    return {
      allowed: false,
      reason: "conversation_action_blocks_reply",
    };
  }

  if (
    isSimpleConversationClosing(currentText) ||
    isExplicitDeferralWithoutRequest(currentText)
  ) {
    return {
      allowed: false,
      reason: "patient_closed_or_deferred",
    };
  }

  const previousAssistant = lastAssistantTurn(recentConversation);
  const previousText = String(previousAssistant?.text || "");
  if (
    previousText &&
    (
      normalizedText(previousText) === normalizedText(reply) ||
      similarity(previousText, reply) >= 0.82
    )
  ) {
    return {
      allowed: false,
      reason: "substantially_repeated_reply",
    };
  }

  const previousUrls = new Set(
    (Array.isArray(recentConversation) ? recentConversation : [])
      .flatMap((turn) => urls(turn?.text))
      .map((url) => url.toLowerCase()),
  );
  if (
    urls(reply).some((url) =>
      previousUrls.has(url.toLowerCase()),
    )
  ) {
    return {
      allowed: false,
      reason: "repeated_resource",
    };
  }

  return { allowed: true, reason: "allowed", body: reply };
}

export async function claimOutboundReply(
  { phone, eventId },
  {
    getStoreImpl = getStore,
    now = Date.now(),
  } = {},
) {
  const recipient = normalizedPhone(phone);
  const normalizedEventId = limited(eventId, 200);
  if (!recipient || !normalizedEventId) {
    return { status: "skipped", reason: "invalid_identity" };
  }

  try {
    const replyStore = store(getStoreImpl);
    const key = replyKey(recipient, normalizedEventId);
    const entry = await replyStore.getWithMetadata(key, {
      type: "json",
      consistency: "strong",
    });
    const existing = entry?.data;

    if (existing?.status === "sent") {
      return { status: "duplicate", reason: "already_sent" };
    }
    if (
      existing?.status === "processing" &&
      Number(existing.claimUntil || 0) > now
    ) {
      return { status: "duplicate", reason: "already_processing" };
    }

    const claimToken = randomUUID();
    const next = {
      version: 1,
      status: "processing",
      claimToken,
      claimUntil: now + CLAIM_TTL_MS,
      updatedAt: new Date(now).toISOString(),
    };
    const write = entry?.etag
      ? await replyStore.setJSON(
          key,
          next,
          { onlyIfMatch: entry.etag },
        )
      : await replyStore.setJSON(
          key,
          next,
          { onlyIfNew: true },
        );

    return write.modified
      ? {
          status: "completed",
          key,
          claimToken,
        }
      : {
          status: "duplicate",
          reason: "concurrent_claim",
        };
  } catch {
    return { status: "failed", reason: "storage_failed" };
  }
}

async function updateClaim(
  claim,
  status,
  {
    getStoreImpl = getStore,
    now = Date.now(),
  } = {},
) {
  if (!claim?.key || !claim?.claimToken) {
    return { status: "skipped" };
  }

  try {
    const replyStore = store(getStoreImpl);
    const entry = await replyStore.getWithMetadata(claim.key, {
      type: "json",
      consistency: "strong",
    });
    if (
      entry?.data?.claimToken !== claim.claimToken ||
      !entry?.etag
    ) {
      return { status: "superseded" };
    }

    const write = await replyStore.setJSON(
      claim.key,
      {
        ...entry.data,
        status,
        claimUntil: 0,
        updatedAt: new Date(now).toISOString(),
      },
      { onlyIfMatch: entry.etag },
    );
    return {
      status: write.modified ? "completed" : "superseded",
    };
  } catch {
    return { status: "failed" };
  }
}

export async function sendControlledPatientReply(
  {
    from,
    to,
    eventId,
    body,
    currentText,
    recentConversation,
    conversationAction,
  },
  {
    sendYCloudPatientTextImpl = sendYCloudPatientText,
    getStoreImpl = getStore,
    now = Date.now(),
  } = {},
) {
  const validation = validateOutboundReply({
    body,
    currentText,
    recentConversation,
    conversationAction,
  });
  if (!validation.allowed) {
    return {
      status: "blocked",
      errorCode: validation.reason,
    };
  }

  const claim = await claimOutboundReply(
    { phone: to, eventId },
    { getStoreImpl, now },
  );
  if (claim.status === "duplicate") {
    return {
      status: "duplicate",
      errorCode: claim.reason,
    };
  }

  const delivery = await sendYCloudPatientTextImpl({
    from,
    to,
    eventId,
    body: validation.body,
  });
  if (claim.status === "completed") {
    await updateClaim(
      claim,
      delivery.status === "completed" ? "sent" : "released",
      { getStoreImpl, now },
    );
  }

  return delivery;
}

export { similarity as outboundReplySimilarity };
