// POST /api/extract {messageId} → Bukti's reading of one seeded message.
// The API key stays on the server (ANTHROPIC_API_KEY) and is never returned.
// No `runtime` export: cacheComponents is on, so the default Node.js runtime applies.
import { extract } from "@/lib/extract-server";

export const maxDuration = 30;

export async function POST(request: Request) {
  let messageId: unknown;
  try {
    messageId = ((await request.json()) as { messageId?: unknown }).messageId;
  } catch {
    return Response.json({ error: "Body must be JSON: {messageId}" }, { status: 400 });
  }
  if (typeof messageId !== "string" || !messageId) {
    return Response.json({ error: "messageId is required" }, { status: 400 });
  }
  const result = await extract(messageId);
  if (!result) return Response.json({ error: `Unknown message ${messageId}` }, { status: 404 });
  return Response.json(result);
}
