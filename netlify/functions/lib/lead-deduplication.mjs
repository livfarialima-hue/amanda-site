const EXACT_MESSAGE_DUPLICATE_REASONS = new Set([
  "event_id",
  "message_id",
]);

const ALLOWED_DUPLICATE_REASONS = new Set([
  ...EXACT_MESSAGE_DUPLICATE_REASONS,
  "phone_window",
  "phone_identity",
]);

export function normalizeDuplicateReason(data) {
  const candidate =
    data?.duplicateReason ??
    data?.duplicate_reason ??
    data?.reason;

  if (typeof candidate !== "string") return null;

  const normalized = candidate.trim().toLowerCase();
  return ALLOWED_DUPLICATE_REASONS.has(normalized)
    ? normalized
    : null;
}

export function shouldSuppressAutomationForDuplicate(delivery) {
  if (delivery?.duplicate !== true) return false;

  // Older downstream deployments did not return duplicateReason and only
  // deduplicated exact webhook events. Keep that case conservative.
  if (!delivery.duplicateReason) return true;

  return EXACT_MESSAGE_DUPLICATE_REASONS.has(
    delivery.duplicateReason,
  );
}
