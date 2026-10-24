// Turns one gated ExtractionRecord into display rows for the AI READ panel and
// the <mark> highlights in the bubble. Display only; the engine already applied
// the verbatim gate (FR-E3) before storing the record.
import { fmtDate, fmtRM, fmtWeekday, type ExtractionRecord, type InboundMessage, type Intent } from "@/engine/model";
import { quoteIsVerbatim } from "@/engine/rules";

export type QuoteTone = "amount" | "invoice" | "deduction" | "promise";

export interface FieldRow {
  key: string;
  label: string;
  value: string;
  quote: string | null;
  tone: QuoteTone | null;
  source: "message" | "slip" | null;
  confidence: number | null;
}

export const INTENT_LABEL: Record<Intent, string> = {
  paid_claim: "Says paid",
  partial_payment: "Part payment",
  promise_to_pay: "Promise to pay",
  dispute_or_deduction: "Paid with a deduction / dispute",
  other: "Other",
};

export const MARK_CLASS: Record<QuoteTone, string> = {
  amount: "bg-emerald-200/80 text-emerald-950",
  invoice: "bg-sky-200/80 text-sky-950",
  deduction: "bg-amber-200/80 text-amber-950",
  promise: "bg-violet-200/80 text-violet-950",
};

export const dayLabel = (iso: string) => `${fmtWeekday(iso)} ${fmtDate(iso)}`;

const verbatim = (quote: string | null, text: string) => (quote !== null && quoteIsVerbatim(quote, text) ? quote : null);

export function fieldRows(rec: ExtractionRecord, msg: InboundMessage): FieldRow[] {
  const ex = rec.extraction;
  const rows: FieldRow[] = [
    { key: "intent", label: "Intent", value: INTENT_LABEL[ex.intent], quote: null, tone: null, source: "message", confidence: null },
  ];
  if (ex.amount !== null) {
    const fromText = ex.amount_source === "text";
    rows.push({
      key: "amount",
      label: "Amount paid",
      value: fmtRM(Math.round(ex.amount * 100), { cents: true }),
      quote: fromText ? verbatim(ex.amount_quote, msg.text) : null,
      tone: "amount",
      source: fromText ? "message" : "slip",
      confidence: ex.amount_confidence,
    });
  }
  if (ex.invoice_ref !== null) {
    const q = verbatim(ex.invoice_ref_quote, msg.text);
    rows.push({ key: "invoice", label: "Invoice", value: ex.invoice_ref, quote: q, tone: "invoice", source: q ? "message" : "slip", confidence: ex.invoice_ref_confidence });
  }
  if (ex.bank_reference !== null) {
    const inText = quoteIsVerbatim(ex.bank_reference, msg.text);
    rows.push({
      key: "bankref",
      label: "Transfer reference",
      value: ex.bank_reference,
      quote: null,
      tone: null,
      source: inText ? "message" : "slip",
      confidence: ex.bank_reference_confidence,
    });
  }
  if (ex.deduction_amount !== null) {
    rows.push({
      key: "deduction",
      label: "Deduction",
      value: `${fmtRM(Math.round(ex.deduction_amount * 100), { cents: true })}${ex.deduction_reason ? ` · ${ex.deduction_reason}` : ""}`,
      quote: verbatim(ex.deduction_quote, msg.text),
      tone: "deduction",
      source: "message",
      confidence: ex.deduction_confidence,
    });
  }
  if (ex.promised_date_candidates.length) {
    rows.push({
      key: "promise",
      label: ex.promised_date_candidates.length > 1 ? "Promised date (ambiguous)" : "Promised date",
      value: ex.promised_date_candidates.map(dayLabel).join(" or "),
      quote: verbatim(ex.promised_date_quote, msg.text),
      tone: "promise",
      source: "message",
      confidence: ex.promised_date_confidence,
    });
  }
  if (ex.has_slip) {
    rows.push({ key: "slip", label: "Slip", value: "Transfer slip attached", quote: null, tone: null, source: "slip", confidence: null });
  }
  return rows;
}
