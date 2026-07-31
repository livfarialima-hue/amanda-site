import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyYCloudSignature(rawBody, signatureHeader, secret) {
  if (!signatureHeader || !secret) return false;

  const parts = {};

  for (const item of String(signatureHeader).split(",")) {
    const separator = item.indexOf("=");
    if (separator === -1) continue;

    const key = item.slice(0, separator).trim();
    const value = item.slice(separator + 1).trim();
    parts[key] = value;
  }

  if (!parts.t || !parts.s) return false;

  const expected = createHmac("sha256", secret)
    .update(`${parts.t}.${String(rawBody || "")}`)
    .digest("hex");

  const expectedBuffer = Buffer.from(expected, "hex");
  const receivedBuffer = Buffer.from(parts.s, "hex");

  return (
    expectedBuffer.length === receivedBuffer.length &&
    timingSafeEqual(expectedBuffer, receivedBuffer)
  );
}
