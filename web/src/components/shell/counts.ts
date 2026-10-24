// Small derived counts the hub frame shows (sidebar badges, guide ticks).
import type { State } from "@/engine/model";

/** Arrived messages Bukti has not read yet, plus open hand-off questions. */
export function inboxCount(s: State): number {
  const unread = s.messages.filter((m) => m.receivedAt <= s.now && !s.extractions[m.id]).length;
  const open = s.handoffs.filter((h) => !h.resolved).length;
  return unread + open;
}
