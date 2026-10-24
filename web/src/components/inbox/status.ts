// Read-only views over engine state for the Inbox. No state changes here.
import { invoiceOf, type InboundMessage, type State } from "@/engine/model";

export type MessageStatus = "new" | "read" | "human" | "verified" | "paid";

export const STATUS_LABEL: Record<MessageStatus, string> = {
  new: "New",
  read: "Read",
  human: "Needs a human",
  verified: "Verified",
  paid: "Paid",
};

export const STATUS_TONE = {
  new: "sky",
  read: "slate",
  human: "amber",
  verified: "emerald",
  paid: "violet",
} as const;

/** Messages whose receivedAt has passed on the demo clock, newest first (FR-H1). */
export const arrivedMessages = (s: State): InboundMessage[] =>
  s.messages.filter((m) => m.receivedAt <= s.now).sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));

export const openHandoffs = (s: State) => s.handoffs.filter((h) => h.resolved === null);

export function messageStatus(s: State, m: InboundMessage): MessageStatus {
  if (!s.extractions[m.id]) return "new";
  if (s.handoffs.some((h) => h.messageId === m.id && h.resolved === null)) return "human";
  const receipt = s.receipts.find((r) => r.messageId === m.id);
  const invoiceId = receipt?.invoiceId ?? s.handoffs.find((h) => h.messageId === m.id && h.invoiceId)?.invoiceId ?? null;
  if (invoiceId && invoiceOf(s, invoiceId).status === "paid") return "paid";
  if (receipt) return "verified";
  return "read";
}
