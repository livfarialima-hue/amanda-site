// A single versioned choice for every Bruna inference consumer.
// Environment variables must not silently restore an older model or effort.
export const BRUNA_MODEL = "gpt-6.1-sol";
export const BRUNA_REASONING_EFFORT = "medium";
// Includes reasoning and structured output; patient-facing text keeps its own limit.
export const BRUNA_MAX_OUTPUT_TOKENS = 4096;
export const BRUNA_TEXT_VERBOSITY = "low";

// Ceilings, not delays: fast responses return immediately. Keep classification
// below its existing 20-second batch deadline and reserve time for delivery.
export const BRUNA_CONVERSATION_TIMEOUT_MS = 20_000;
export const BRUNA_CLASSIFICATION_TIMEOUT_MS = 15_000;
export const BRUNA_FOLLOWUP_REVIEW_TIMEOUT_MS = 12_000;
// A continuity rewrite shares the conversation deadline; avoid starting a
// second paid request with less time than the previous live slow case needed.
export const BRUNA_REVISION_MIN_REMAINING_MS = 8_000;
