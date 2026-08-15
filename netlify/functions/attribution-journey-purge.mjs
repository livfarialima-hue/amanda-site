import { purgeExpiredAttributionJourneys } from "./lib/attribution-journey-store.mjs";
import { writeOperationalLog } from "./lib/operational-log.mjs";

const DAILY_PURGE_LIMIT = 1_000;

export default async () => {
  try {
    const purge = await purgeExpiredAttributionJourneys({
      now: Date.now(),
      limit: DAILY_PURGE_LIMIT,
    });
    writeOperationalLog({
      source: "attribution_journey_purge",
      category: "privacy_retention",
      reason: "completed",
      fields: {
        scanned: purge.scanned,
        deleted: purge.deleted,
        transportDeleted: purge.transport_deleted,
        journeysDeleted: purge.journeys_deleted,
        truncated: purge.truncated,
      },
    });
  } catch {
    writeOperationalLog({
      source: "attribution_journey_purge",
      category: "privacy_retention",
      reason: "failed",
      fields: { status: "retry_next_schedule" },
    }, "error");
  }
};

export const config = {
  // Netlify cron is UTC: 06:17 UTC = 03:17 in São Paulo.
  schedule: "17 6 * * *",
};
