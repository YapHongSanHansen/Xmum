// Tests for the Bukti eval itself: the test set is well formed and the scorer
// counts correctly on hand-made fake readings. These are not a score of the
// model; only `pnpm eval:bukti` with a live key produces one.
import { afterEach, describe, expect, it } from "vitest";
import type { Extraction } from "../src/engine/model";
import { extractMessage } from "../src/lib/extract-server";
import { gateWithEngine } from "./gate";
import { EVAL_SET, FIELDS, type EvalItem } from "./messages";
import { accuracy, refKey, scoreItem, summarize, type ScoredRun } from "./score";

const blank: Extraction = {
  intent: "other",
  amount: null,
  amount_quote: null,
  amount_source: null,
  amount_confidence: 0,
  invoice_ref: null,
  invoice_ref_quote: null,
  invoice_ref_confidence: 0,
  bank_reference: null,
  bank_reference_confidence: 0,
  deduction_amount: null,
  deduction_reason: null,
  deduction_quote: null,
  deduction_confidence: 0,
  promised_date_candidates: [],
  promised_date_quote: null,
  promised_date_confidence: 0,
  has_slip: false,
};

const item = (id: string): EvalItem => EVAL_SET.find((i) => i.id === id)!;
const outcomes = (id: string, ex: Extraction) =>
  Object.fromEntries(scoreItem(item(id), gateWithEngine(item(id).text, ex, "fake").extraction).map((r) => [r.field, r.outcome]));

/** A correct reading of b01: "Hi kak, INV-2412 dah bank in RM2,770 tadi ya". */
const b01Right: Extraction = {
  ...blank,
  intent: "paid_claim",
  amount: 2770,
  amount_quote: "RM2,770",
  amount_source: "text",
  amount_confidence: 0.97,
  invoice_ref: "INV-2412",
  invoice_ref_quote: "INV-2412",
  invoice_ref_confidence: 0.96,
};

/** A correct reading of b20, a payment with a deduction. */
const b20Right: Extraction = {
  ...blank,
  intent: "dispute_or_deduction",
  amount: 1850,
  amount_quote: "RM1,850",
  amount_source: "text",
  amount_confidence: 0.95,
  invoice_ref: "INV-2451",
  invoice_ref_quote: "INV-2451",
  invoice_ref_confidence: 0.95,
  deduction_amount: 150,
  deduction_reason: "3 karton pecah masa sampai Shah Alam",
  deduction_quote: "Tolak RM150 sebab 3 karton pecah masa sampai Shah Alam",
  deduction_confidence: 0.9,
};

describe("test set", () => {
  it("has 40 messages with unique ids", () => {
    expect(EVAL_SET).toHaveLength(40);
    expect(new Set(EVAL_SET.map((i) => i.id)).size).toBe(40);
  });

  it("stores quoted labels as exact substrings of their messages", () => {
    for (const i of EVAL_SET) {
      if (i.expected.invoiceRef !== null) expect(i.text, i.id).toContain(i.expected.invoiceRef);
      if (i.expected.deduction) expect(i.text, i.id).toContain(i.expected.deduction.reason);
    }
  });

  it("labels amounts in whole sen, dates as sorted ISO days, and only known fields as unscored", () => {
    const iso = /^\d{4}-\d{2}-\d{2}$/;
    for (const i of EVAL_SET) {
      const { amount, deduction, promisedDates } = i.expected;
      if (amount !== null) expect(Number.isInteger(amount) && amount > 0, i.id).toBe(true);
      if (deduction) expect(Number.isInteger(deduction.amount) && deduction.amount > 0, i.id).toBe(true);
      for (const d of promisedDates) expect(d, i.id).toMatch(iso);
      expect([...promisedDates].sort(), i.id).toEqual(promisedDates);
      expect(i.now, i.id).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
      for (const f of i.unscored ?? []) expect(FIELDS, i.id).toContain(f);
    }
  });

  it("covers every language and every intent", () => {
    expect(new Set(EVAL_SET.map((i) => i.lang))).toEqual(new Set(["manglish", "bm", "en", "zh", "mixed"]));
    expect(new Set(EVAL_SET.map((i) => i.expected.intent))).toEqual(
      new Set(["paid_claim", "partial_payment", "promise_to_pay", "dispute_or_deduction", "other"]),
    );
  });

  it("includes the three seeded demo messages verbatim", () => {
    expect(item("b08").text).toBe("老板，那张发票我们下礼拜五才过数，sorry ah");
    expect(item("b10").text).toBe("Dah settle la semalam");
    expect(item("b09").expected.amount).toBe(277000);
  });
});

describe("scorer on fake readings", () => {
  it("scores a correct reading as all matches", () => {
    expect(outcomes("b01", b01Right)).toEqual(Object.fromEntries(FIELDS.map((f) => [f, "match"])));
    expect(outcomes("b20", b20Right)).toEqual(Object.fromEntries(FIELDS.map((f) => [f, "match"])));
  });

  it("drops an amount whose quote is not in the message, so it is a mismatch", () => {
    const ex = { ...b01Right, amount_quote: "RM2,700", amount: 2700 };
    const gated = gateWithEngine(item("b01").text, ex, "fake");
    expect(gated.dropped).toHaveLength(1);
    expect(gated.extraction.amount).toBeNull();
    expect(outcomes("b01", ex).amount).toBe("mismatch");
  });

  it("holds a right amount below 0.85 confidence instead of counting it", () => {
    expect(outcomes("b01", { ...b01Right, amount_confidence: 0.84 }).amount).toBe("held");
    expect(outcomes("b01", { ...b01Right, amount_confidence: 0.85 }).amount).toBe("match");
  });

  it("matches invoice refs on their digits", () => {
    expect(refKey("INV-2412")).toBe(refKey("inv 2412"));
    expect(refKey("#2478")).toBe("2478");
    expect(outcomes("b01", { ...b01Right, invoice_ref: "INV2412" }).invoice_ref).toBe("match");
    expect(outcomes("b01", { ...b01Right, invoice_ref: "INV-2413" }).invoice_ref).toBe("mismatch");
  });

  it("compares promised dates as a set and flags a missing alternative", () => {
    const both = { ...blank, intent: "promise_to_pay" as const, promised_date_quote: "下礼拜五", promised_date_confidence: 0.6 };
    expect(outcomes("b08", { ...both, promised_date_candidates: ["2026-10-30", "2026-10-23"] }).promised_date).toBe("match");
    expect(outcomes("b08", { ...both, promised_date_candidates: ["2026-10-30"] }).promised_date).toBe("mismatch");
  });

  it("needs the expected reason words inside the deduction reason", () => {
    expect(outcomes("b20", { ...b20Right, deduction_reason: "3 karton pecah" }).deduction_reason).toBe("match");
    expect(outcomes("b20", { ...b20Right, deduction_reason: "damaged goods" }).deduction_reason).toBe("mismatch");
  });

  it("skips unscored fields", () => {
    const fields = scoreItem(item("b25"), blank).map((r) => r.field);
    expect(fields).not.toContain("invoice_ref");
    expect(fields).toHaveLength(FIELDS.length - 1);
  });

  it("summarises tallies, gate drops and misses, and never counts unscored messages", () => {
    const run = (id: string, ex: Extraction): ScoredRun => {
      const g = gateWithEngine(item(id).text, ex, "fake");
      return { id, results: scoreItem(item(id), g.extraction), dropped: g.dropped };
    };
    const s = summarize(40, [run("b01", b01Right), run("b01", { ...b01Right, amount_quote: "RM9,999" })], [{ id: "b02", reason: "timed out" }]);
    expect(s.scoredMessages).toBe(2);
    expect(s.notScored).toEqual([{ id: "b02", reason: "timed out" }]);
    expect(s.perField.amount).toEqual({ scored: 2, match: 1, mismatch: 1, held: 0 });
    expect(accuracy(s.perField.amount)).toBe(0.5);
    expect(accuracy(s.perField.intent)).toBe(1);
    expect(s.gateDrops).toBe(1);
    expect(s.misses.map((m) => `${m.id}:${m.field}`)).toEqual(["b01:amount"]);
    expect(accuracy({ scored: 0, match: 0, mismatch: 0, held: 0 })).toBeNull();
  });
});

describe("live reader", () => {
  const key = process.env.ANTHROPIC_API_KEY;
  afterEach(() => {
    if (key === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = key;
  });

  it("returns no reading without a key, never a cached one", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const i = item("b09");
    const read = await extractMessage({ id: "m-megabina", customerId: "c-megabina", receivedAt: i.now, text: i.text, image: null });
    expect(read).toEqual({ ok: false, reason: "no API key" });
  });
});
