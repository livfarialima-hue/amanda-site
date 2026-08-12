import { runLeadClassificationBatch } from "./classify-leads.mjs";

export default async (request) => {
  let body = {};
  try {
    body = await request.json();
  } catch {
    return new Response("invalid_request", { status: 400 });
  }

  const expectedSecret = process.env.GOOGLE_SHEETS_WEBHOOK_SECRET;
  if (!expectedSecret || body.secret !== expectedSecret) {
    return new Response("unauthorized", { status: 401 });
  }

  await runLeadClassificationBatch();
  return new Response(null, { status: 204 });
};
