// Provider event type, never an inference from the patient's text or emoji.
export function isReactionMessageType(messageType) {
  return String(messageType || "").trim().toLowerCase() === "reaction";
}

export function isMaterialMessageType(messageType) {
  return ["image", "video", "document", "audio"].includes(
    String(messageType || "").trim().toLowerCase(),
  );
}
