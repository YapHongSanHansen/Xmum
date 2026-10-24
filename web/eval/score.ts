// Scores Bukti's readings against the hand labels in messages.ts. It scores what
// the product would act on: the reading after the engine's verbatim gate
// (gate.ts), with any field below the engine's 0.85 threshold counted as
// "held" for a person, never as a match. Pure functions, tested on fake
// readings in bukti.test.ts.
import { fmtRM, type Extraction } from "../src/engine/model";
import { CONFIDENCE_MIN } from "../src/engine/rules";
import { FIELDS, type EvalItem, type Field } from "./messages";

/** PRD NFR-4: at least 95% exact match on the amount field. */
export const NFR4_AMOUNT_TARGET = 0.95;

export type Outcome = "match" | "mismatch" | "held";

export interface FieldResult {
  id: string;
  field: Field;
  outcome: Outcome;
  expected: string;
  got: string;
}

/** One message the model read live, after the gate. */
export interface ScoredRun {
  id: string;
  results: FieldResult[];
  dropped: string[];
}

/** One message with no live reading (no key, timeout, API error...). Never scored. */
export interface NotScored {
  id: string;
  reason: string;
}

export interface FieldTally {
  scored: number;
  match: number;
  mismatch: number;
  held: number;
}

export interface Summary {
  messages: number;
  scoredMessages: number;
  notScored: NotScored[];
  perField: Record<Field, FieldTally>;
  /** Fields the verbatim gate dropped, across all scored messages. */
  gateDrops: number;
  /** Every field that is not a match (mismatch or held). */
  misses: FieldResult[];
}

/* ---------- comparisons ---------- */

/** Ringgit from the model to sen, the same rounding the reducer uses. */
const toSen = (ringgit: number | null) => (ringgit === null ? null : Math.round(ringgit * 100));
const money = (sen: number | null) => (sen === null ? "none" : fmtRM(sen, { cents: true }));
const dateList = (d: string[]) => [...new Set(d)].sort().join(", ") || "none";
const squash = (t: string) => t.toLowerCase().replace(/\s+/g, " ").trim();

/** Invoice refs compare on their digits: "INV-2412", "inv 2412" and "#2412" are one invoice. */
export const refKey = (ref: string | null) => (ref === null ? null : ref.replace(/\D/g, ""));

interface Check {
  ok: boolean;
  /** Confidence when the product would hold the field for a person, else null. */
  heldAt: number | null;
  expected: string;
  got: string;
}

const below = (present: boolean, confidence: number) => (present && confidence < CONFIDENCE_MIN ? confidence : null);

/** Scores one gated reading. Fields listed in item.unscored are left out. */
export function scoreItem(item: EvalItem, ex: Extraction): FieldResult[] {
  const want = item.expected;
  const amount = toSen(ex.amount);
  const deduction = toSen(ex.deduction_amount);
  // A reason is only shown alongside a deduction amount.
  const reason = deduction === null ? null : ex.deduction_reason;
  const deductionHeld = below(deduction !== null, ex.deduction_confidence);

  const checks: Record<Field, Check> = {
    intent: { ok: ex.intent === want.intent, heldAt: null, expected: want.intent, got: ex.intent },
    amount: {
      ok: amount === want.amount,
      heldAt: below(amount !== null, ex.amount_confidence),
      expected: money(want.amount),
      got: money(amount),
    },
    invoice_ref: {
      ok: refKey(ex.invoice_ref) === refKey(want.invoiceRef),
      heldAt: below(ex.invoice_ref !== null, ex.invoice_ref_confidence),
      expected: want.invoiceRef ?? "none",
      got: ex.invoice_ref ?? "none",
    },
    deduction_amount: {
      ok: deduction === (want.deduction?.amount ?? null),
      heldAt: deductionHeld,
      expected: money(want.deduction?.amount ?? null),
      got: money(deduction),
    },
    deduction_reason: {
      ok: want.deduction === null ? reason === null : reason !== null && squash(reason).includes(squash(want.deduction.reason)),
      heldAt: deductionHeld,
      expected: want.deduction ? `contains "${want.deduction.reason}"` : "none",
      got: reason === null ? "none" : `"${reason}"`,
    },
    // Dates are scored on the candidates offered; the threshold only decides
    // whether a person must pick one, so it never holds the field back.
    promised_date: {
      ok: dateList(ex.promised_date_candidates) === dateList(want.promisedDates),
      heldAt: null,
      expected: dateList(want.promisedDates),
      got: dateList(ex.promised_date_candidates),
    },
  };

  return FIELDS.filter((f) => !item.unscored?.includes(f)).map((field) => {
    const c = checks[field];
    const held = c.heldAt !== null;
    return {
      id: item.id,
      field,
      outcome: held ? "held" : c.ok ? "match" : "mismatch",
      expected: c.expected,
      got: held ? `${c.got} (confidence ${c.heldAt} < ${CONFIDENCE_MIN}, goes to a person)` : c.got,
    };
  });
}

/* ---------- summary ---------- */

export function summarize(messages: number, runs: ScoredRun[], notScored: NotScored[]): Summary {
  const perField = Object.fromEntries(FIELDS.map((f) => [f, { scored: 0, match: 0, mismatch: 0, held: 0 }])) as Record<Field, FieldTally>;
  for (const r of runs) {
    for (const res of r.results) {
      const t = perField[res.field];
      t.scored += 1;
      t[res.outcome] += 1;
    }
  }
  return {
    messages,
    scoredMessages: runs.length,
    notScored,
    perField,
    gateDrops: runs.reduce((n, r) => n + r.dropped.length, 0),
    misses: runs.flatMap((r) => r.results.filter((res) => res.outcome !== "match")),
  };
}

/** Share of scored fields that match, or null when nothing was scored. */
export const accuracy = (t: FieldTally) => (t.scored ? t.match / t.scored : null);
