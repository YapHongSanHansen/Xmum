"use client";
// Browser side of Bukti's AI step. Calls the server route; if the network or
// the route fails, the demo continues on the cached extraction (FR-E11).
import { CACHED_EXTRACTIONS, CACHED_MODEL } from "@/engine/cached";
import type { Extraction } from "@/engine/model";

export type ReadResult =
  | { extraction: Extraction; model: string; cached: false; ms: number }
  | { extraction: Extraction; model: string; cached: true; reason: string };

function offline(messageId: string, reason: string): ReadResult {
  const extraction = CACHED_EXTRACTIONS[messageId];
  if (!extraction) throw new Error(`No cached reading for ${messageId}`);
  return { extraction, model: CACHED_MODEL, cached: true, reason };
}

export async function readMessage(messageId: string): Promise<ReadResult> {
  try {
    const res = await fetch("/api/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId }),
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return offline(messageId, `offline (HTTP ${res.status})`);
    return (await res.json()) as ReadResult;
  } catch (e) {
    return offline(messageId, e instanceof DOMException && e.name === "TimeoutError" ? "timed out" : "offline");
  }
}
