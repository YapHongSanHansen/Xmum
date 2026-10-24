// Shared helpers for the engine's Vitest suites. Not imported by the app.
import { CACHED_EXTRACTIONS, CACHED_MODEL } from "./cached";
import type { Extraction, InboundMessage, State } from "./model";
import { apply, run, type Action } from "./reducer";
import { seedState } from "./seed";

/** Sen to ringgit, for readable expectations. */
export const RM = (sen: number) => sen / 100;

export const extract = (messageId: string, extraction: Extraction = CACHED_EXTRACTIONS[messageId]): Action => ({
  type: "APPLY_EXTRACTION",
  messageId,
  extraction,
  model: CACHED_MODEL,
  cached: true,
});

export const withExtraction = (id: string, patch: Partial<Extraction>): Extraction => ({
  ...CACHED_EXTRACTIONS[id],
  ...patch,
});

/** Applies one action and fails the test if it is refused. */
export function act(s: State, a: Action): State {
  const r = apply(s, a);
  if (r.error) throw new Error(`${a.type}: ${r.error}`);
  return r.state;
}

/** Applies one action that must be refused; returns the error and the (unchanged) state. */
export function refused(s: State, a: Action): { error: string; state: State } {
  const r = apply(s, a);
  if (!r.error) throw new Error(`${a.type} was expected to be refused`);
  return { error: r.error, state: r.state };
}

export const as = (role: "owner" | "clerk"): Action => ({ type: "SET_ROLE", role });
export const advance = (to: string): Action => ({ type: "ADVANCE", to });

/** Seed with the 20 Oct 08:00 scan already run (demo step 1, before any choice). */
export const scanned = () => run(seedState(), [{ type: "RUN_SCAN" }]);

/**
 * Seeded business history (engine/history.ts): bookings, read messages and matched
 * bank credits that exist before the demo opens. Tests about what the demo itself
 * creates or reveals filter these out with `demoOnly`.
 */
const SEED = seedState();
const HISTORY_IDS = new Set([
  ...SEED.bookings.map((b) => b.id),
  ...Object.keys(SEED.extractions),
  ...SEED.bankLines.filter((b) => b.matchedInvoiceId !== null).map((b) => b.id),
]);
export const demoOnly = <T extends { id: string }>(xs: T[]): T[] => xs.filter((x) => !HISTORY_IDS.has(x.id));

/** Mutable copy of a state, for building fixtures the seed does not contain. */
export const draft = (s: State): State => structuredClone(s);

export function addMessage(s: State, m: InboundMessage): State {
  const d = draft(s);
  d.messages.push(m);
  return d;
}

export interface DemoRun {
  /** After step 1-3: scan, option chosen, three reminders approved (20 Oct 08:00). */
  approved: State;
  /** After step 4: Hup Seng promise confirmed for 30 Oct (20 Oct 11:05). */
  promised: State;
  /** After step 5: booking entered and decided (21 Oct 10:20). */
  credit: State;
  /** Step 6: Mega Bina extraction applied, receipt proposed, not yet approved (23 Oct 14:30). */
  verified: State;
  /** Step 6: receipt approved by the Clerk. */
  receiptApproved: State;
  /** Step 6: deduction accepted by the Owner. */
  deductionAccepted: State;
  /** Step 7: Kilang claim read, reply not yet sent (23 Oct 15:00). */
  kilangRead: State;
  /** Step 7 done: the Clerk sent the templated reply. */
  final: State;
}

/** Plays the PRD §13 demo script on cached extractions. */
export function playDemo(): DemoRun {
  let s = act(seedState(), { type: "RUN_SCAN" });
  s = run(s, [
    { type: "CHOOSE_WARNING_OPTION", warningId: s.warnings[0].id, option: "Ask the diesel supplier to move the 5 Nov bill" },
    as("clerk"),
    { type: "APPROVE_REMINDER", invoiceId: "INV-2304", text: "t1", edited: false },
    { type: "APPROVE_REMINDER", invoiceId: "INV-2310", text: "t1", edited: false },
    as("owner"),
    { type: "APPROVE_REMINDER", invoiceId: "INV-2268", text: "t2", edited: false },
  ]);
  const approved = s;
  s = run(s, [advance("2026-10-20T11:05"), extract("m-hupseng"), as("clerk")]);
  s = act(s, { type: "RESOLVE_HANDOFF", handoffId: s.handoffs[0].id, option: "2026-10-30" });
  const promised = s;
  s = run(s, [
    advance("2026-10-21T10:20"),
    { type: "ENTER_BOOKING", customerId: "c-hupseng", route: "Klang → Johor Bahru", amount: 240000, terms: "credit", creditDays: 60 },
    as("owner"),
  ]);
  s = act(s, { type: "DECIDE_CREDIT", bookingId: s.bookings.find((b) => b.status === "on_hold")!.id, decision: "deposit_requested", depositPct: 50 });
  const credit = s;
  s = run(s, [advance("2026-10-23T14:30"), extract("m-megabina")]);
  const verified = s;
  s = run(s, [as("clerk"), { type: "APPROVE_RECEIPT", receiptId: s.receipts[0].id }]);
  const receiptApproved = s;
  s = run(s, [as("owner"), { type: "DECIDE_DEDUCTION", receiptId: s.receipts[0].id, decision: "accepted" }]);
  const deductionAccepted = s;
  s = run(s, [advance("2026-10-23T15:00"), extract("m-kilang"), as("clerk")]);
  const kilangRead = s;
  const h = s.handoffs.find((x) => x.kind === "claim_unverified")!;
  const final = act(s, { type: "RESOLVE_HANDOFF", handoffId: h.id, option: "send_reply" });
  return { approved, promised, credit, verified, receiptApproved, deductionAccepted, kilangRead, final };
}
