import { callClassificationSheets } from "./lib/sheets-classification-client.mjs";
import { exportConversationArchive } from "./lib/conversation-archive-outbox.mjs";

export async function archiveConversationBatch({ env = process.env, callSheetsImpl = callClassificationSheets, ...options } = {}) {
  return exportConversationArchive({ env, callSheetsImpl, ...options });
}

export default async () => {
  const result = await archiveConversationBatch();
  console.log(JSON.stringify({ source: "conversation_archive", ...result }));
  if (result.status === "failed") throw new Error("conversation_archive_failed");
};
export const config = { schedule: "*/5 * * * *" };
