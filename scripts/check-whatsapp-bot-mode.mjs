const DEFAULT_ENDPOINT =
  "https://draamandaschroeder.com.br/api/ycloud/webhook";
const VALID_MODES = new Set(["off", "shadow", "active"]);

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? String(process.argv[index + 1] || "").trim() : "";
}

const expectedMode = argumentValue("--expect").toLowerCase();
if (expectedMode && !VALID_MODES.has(expectedMode)) {
  throw new Error("--expect deve ser off, shadow ou active.");
}

const endpoint = String(
  process.env.WHATSAPP_BOT_HEALTH_URL || DEFAULT_ENDPOINT,
).trim();
const response = await fetch(endpoint, {
  method: "GET",
  headers: { accept: "application/json" },
  signal: AbortSignal.timeout(15_000),
});

if (!response.ok) {
  throw new Error(`Health check HTTP ${response.status}.`);
}

const payload = await response.json();
const observedMode = String(payload.automationMode || "")
  .trim()
  .toLowerCase();

if (!VALID_MODES.has(observedMode)) {
  throw new Error("O endpoint não devolveu um modo de automação válido.");
}

console.log(`BOT_MODE_STATUS=${observedMode}`);
console.log(JSON.stringify({
  endpoint,
  observedMode,
  processingMode: payload.processingMode || null,
  sheetsConfigured:
    payload.sheetsConfigured === true || payload.sheetsWebhookConfigured === true,
  openAIConfigured: payload.openAIConfigured === true,
}));

if (expectedMode && observedMode !== expectedMode) {
  console.error(
    `BOT_MODE_MISMATCH: esperado=${expectedMode} observado=${observedMode}`,
  );
  process.exitCode = 1;
}
