// One pure owner for the inbound envelopes already supported by the webhook.
// Referral headlines, quoted context and provider errors are not patient text.
export function extractInboundText(message) {
  const candidates = [
    message?.text?.body,
    typeof message?.text === "string" ? message.text : "",
    message?.body,
    message?.content?.text?.body,
    typeof message?.content?.text === "string" ? message.content.text : "",
    message?.message?.text?.body,
    message?.image?.caption,
    message?.video?.caption,
    message?.document?.caption,
    message?.content?.image?.caption,
    message?.content?.video?.caption,
    message?.content?.document?.caption,
  ];
  return String(candidates.find(
    (candidate) => typeof candidate === "string" && candidate.trim().length > 0,
  ) || "");
}
