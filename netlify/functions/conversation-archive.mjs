import { callClassificationSheets } from "./lib/sheets-classification-client.mjs";

export async function archiveConversationBatch({ env = process.env, callSheetsImpl = callClassificationSheets } = {}) {
  if (env.WHATSAPP_CONVERSATION_ARCHIVE_ENABLED !== "true") return { status: "disabled", rows: 0 };
  const startAt = env.WHATSAPP_CONVERSATION_ARCHIVE_START_AT;
  if (!Number.isFinite(Date.parse(startAt))) return { status: "failed", errorCode: "archive_start_missing", rows: 0 };
  const result = await callSheetsImpl("archive_conversations", { archive: { startAt } }, { env, timeoutMs: 20000 });
  return result.status === "completed" ? { status: result.data.status, rows: result.data.rows,
    lastArchivedRow: result.data.lastArchivedRow, receipt: result.data.receipt || null, hasMore: result.data.hasMore === true }
    : { status: "failed", errorCode: result.errorCode, rows: 0 };
}

export default async () => {
  const result = await archiveConversationBatch();
  console.log(JSON.stringify({ source: "conversation_archive", ...result }));
  if (result.status === "failed") throw new Error("conversation_archive_failed");
};
export const config = { schedule: "*/5 * * * *" };
