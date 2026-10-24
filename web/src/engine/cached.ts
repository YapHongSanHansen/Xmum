// Cached Bukti extractions for the seeded messages (PRD FR-E11). Used when the
// live AI call is unavailable, and labelled "cached result" in the UI.
import type { Extraction } from "./model";

const none = {
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
} satisfies Omit<Extraction, "intent">;

export const CACHED_EXTRACTIONS: Record<string, Extraction> = {
  "m-hupseng": {
    ...none,
    intent: "promise_to_pay",
    promised_date_candidates: ["2026-10-23", "2026-10-30"],
    promised_date_quote: "下礼拜五才过数",
    promised_date_confidence: 0.64,
  },
  "m-megabina": {
    ...none,
    intent: "dispute_or_deduction",
    amount: 2770,
    amount_quote: "RM2,770",
    amount_source: "text",
    amount_confidence: 0.98,
    invoice_ref: "INV-2304",
    invoice_ref_quote: "INV-2304",
    invoice_ref_confidence: 0.97,
    bank_reference: "INV2304",
    bank_reference_confidence: 0.95,
    deduction_amount: 330,
    deduction_reason: "2 pallet tiles pecah at Bukit Raja",
    deduction_quote: "deduct RM330 for the 2 pallet tiles pecah at Bukit Raja",
    deduction_confidence: 0.9,
    has_slip: true,
  },
  "m-kilang": {
    ...none,
    intent: "paid_claim",
  },
};

export const CACHED_MODEL = "cached (claude-opus-5-5 run, saved)";
