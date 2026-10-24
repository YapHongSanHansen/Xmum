// Regression tests for the code-review fixes (25 Oct 2026).
import { describe, expect, it } from "vitest";
import { apply, run } from "./reducer";
import { seedState } from "./seed";
import { CACHED_EXTRACTIONS, CACHED_MODEL } from "./cached";
import type { Extraction } from "./model";

const at1105 = () => run(seedState(), [{ type: "RUN_SCAN" }, { type: "ADVANCE", to: "2026-10-20T11:05" }]);
const applyEx = (ex: Extraction) => ({ type: "APPLY_EXTRACTION" as const, messageId: "m-hupseng", extraction: ex, model: "test", cached: true });

describe("review fixes", () => {
  it("a single 'next Friday' date is still treated as ambiguous (M4)", () => {
    const ex = { ...CACHED_EXTRACTIONS["m-hupseng"], promised_date_candidates: ["2026-10-30"], promised_date_confidence: 0.9 };
    const s = run(at1105(), [applyEx(ex)]);
    const h = s.handoffs.find((x) => x.kind === "promise_date");
    expect(h?.options).toEqual(["2026-10-23", "2026-10-30"]);
    expect(h?.question).toBe("Which Friday?");
  });

  it("an amount with no source is gated like a text amount", () => {
    const base = CACHED_EXTRACTIONS["m-megabina"];
    let s = run(seedState(), [{ type: "RUN_SCAN" }, { type: "ADVANCE", to: "2026-10-23T14:30" }]);
    const r = apply(s, { type: "APPLY_EXTRACTION", messageId: "m-megabina", extraction: { ...base, amount_source: null, amount_quote: "RM9,999" }, model: "test", cached: true });
    s = r.state;
    expect(s.extractions["m-megabina"].rejectedQuotes.some((q) => q.startsWith("amount"))).toBe(true);
  });

  it("accepting a deduction leaves an invoice PART_PAID when money is still owed", () => {
    let s = run(seedState(), [{ type: "RUN_SCAN" }, { type: "ADVANCE", to: "2026-10-23T14:30" }]);
    const ex = { ...CACHED_EXTRACTIONS["m-megabina"], amount: 2770, deduction_amount: 300, deduction_quote: "deduct RM330 for the 2 pallet tiles pecah at Bukit Raja" };
    s = run(s, [{ type: "APPLY_EXTRACTION", messageId: "m-megabina", extraction: ex, model: CACHED_MODEL, cached: true }]);
    s = run(s, [{ type: "APPROVE_RECEIPT", receiptId: s.receipts[0].id }, { type: "DECIDE_DEDUCTION", receiptId: s.receipts[0].id, decision: "accepted" }]);
    const inv = s.invoices.find((i) => i.id === "INV-2304")!;
    expect(inv.amount - inv.paid).toBe(3000);
    expect(inv.status).toBe("part_paid");
  });
});
