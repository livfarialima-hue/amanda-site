import { getHumanResumeControl } from "./human-resume-queue.mjs";

const DEFAULT_GUARD_DELAY_MS = 1_200;
const MIN_GUARD_DELAY_MS = 500;
const MAX_GUARD_DELAY_MS = 3_000;

function guardDelayMs(value) {
  const parsed = Number.parseInt(String(value || ""), 10);
  if (!Number.isFinite(parsed)) return DEFAULT_GUARD_DELAY_MS;

  return Math.min(
    Math.max(parsed, MIN_GUARD_DELAY_MS),
    MAX_GUARD_DELAY_MS,
  );
}

export async function guardAutomaticReplyAgainstHumanRace(
  { phone, configuredDelayMs },
  {
    waitImpl = (milliseconds) =>
      new Promise((resolve) => setTimeout(resolve, milliseconds)),
    getHumanResumeControlImpl = getHumanResumeControl,
  } = {},
) {
  const delayMs = guardDelayMs(configuredDelayMs);
  await waitImpl(delayMs);

  const control = await getHumanResumeControlImpl(phone);
  const humanActive = ["human_active", "waiting_human"].includes(
    control?.status,
  );

  return {
    shouldSend: !humanActive,
    humanActive,
    controlStatus: control?.status || null,
    delayMs,
  };
}

export { DEFAULT_GUARD_DELAY_MS };
