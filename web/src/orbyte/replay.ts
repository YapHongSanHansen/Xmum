// Replays the PRD §13 demo script on the seed with the pure engine and the
// cached (hand-written) extractions. Deterministic and synthetic: it backs
// GET /api/kutip/v1/events. Mirrors engine/testkit.ts playDemo(), which is
// test-only and must not be imported by runtime code.
import { CACHED_EXTRACTIONS, CACHED_MODEL } from "../engine/cached";
import type { State } from "../engine/model";
import { apply, type Action } from "../engine/reducer";
import { seedState } from "../engine/seed";

const step = (s: State, a: Action): State => {
  const r = apply(s, a);
  if (r.error) throw new Error(`demo replay ${a.type}: ${r.error}`);
  return r.state;
};
const steps = (s: State, actions: Action[]) => actions.reduce(step, s);
const read = (messageId: string): Action => ({
  type: "APPLY_EXTRACTION",
  messageId,
  extraction: CACHED_EXTRACTIONS[messageId],
  model: CACHED_MODEL,
  cached: true,
});
const as = (role: "owner" | "clerk"): Action => ({ type: "SET_ROLE", role });
const advance = (to: string): Action => ({ type: "ADVANCE", to });

/** The final state after the whole 8-step demo script. */
export function replayDemo(): State {
  let s = step(seedState(), { type: "RUN_SCAN" });
  s = steps(s, [
    { type: "CHOOSE_WARNING_OPTION", warningId: s.warnings[0].id, option: "Ask the diesel supplier to move the 5 Nov bill" },
    as("clerk"),
    { type: "APPROVE_REMINDER", invoiceId: "INV-2304", text: "t1", edited: false },
    { type: "APPROVE_REMINDER", invoiceId: "INV-2310", text: "t1", edited: false },
    as("owner"),
    { type: "APPROVE_REMINDER", invoiceId: "INV-2268", text: "t2", edited: false },
  ]);
  s = steps(s, [advance("2026-10-20T11:05"), read("m-hupseng"), as("clerk")]);
  s = step(s, { type: "RESOLVE_HANDOFF", handoffId: s.handoffs[0].id, option: "2026-10-30" });
  s = steps(s, [
    advance("2026-10-21T10:20"),
    { type: "ENTER_BOOKING", customerId: "c-hupseng", route: "Klang → Johor Bahru", amount: 240000, terms: "credit", creditDays: 60 },
    as("owner"),
  ]);
  s = step(s, { type: "DECIDE_CREDIT", bookingId: s.bookings[0].id, decision: "deposit_requested", depositPct: 50 });
  s = steps(s, [advance("2026-10-23T14:30"), read("m-megabina")]);
  s = steps(s, [as("clerk"), { type: "APPROVE_RECEIPT", receiptId: s.receipts[0].id }]);
  s = steps(s, [as("owner"), { type: "DECIDE_DEDUCTION", receiptId: s.receipts[0].id, decision: "accepted" }]);
  s = steps(s, [advance("2026-10-23T15:00"), read("m-kilang"), as("clerk")]);
  const h = s.handoffs.find((x) => x.kind === "claim_unverified")!;
  return step(s, { type: "RESOLVE_HANDOFF", handoffId: h.id, option: "send_reply" });
}
