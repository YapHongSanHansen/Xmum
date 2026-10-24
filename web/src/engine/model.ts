// Kachingg domain model. Money is integer sen; times are local Asia/Kuala_Lumpur
// strings ("2026-10-20T08:00"), dates are "2026-10-20". See docs/PRD.md §9.

export type Lang = "en" | "bm" | "zh";
export type Role = "owner" | "clerk";
export type Tier = 0 | 1 | 2 | 3;

export interface User {
  id: string;
  name: string;
  role: Role;
}

export interface PastInvoice {
  due: string;
  paid: string;
  lastReminderTier: Tier | null;
  lastReminderDate: string | null;
}

export interface Customer {
  id: string;
  name: string;
  contact: string;
  whatsapp: string;
  lang: Lang;
  history: PastInvoice[];
}

export interface ReminderSent {
  tier: Tier;
  at: string;
  answered: boolean;
  by: string;
  text: string;
  status: "sent" | "queued";
}

export interface Delivery {
  doNumber: string;
  date: string;
  route: string;
  destination: string;
}

export type InvoiceStatus = "open" | "part_paid" | "paid" | "disputed";

export interface Invoice {
  id: string;
  number: string;
  customerId: string;
  amount: number;
  paid: number;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  delivery: Delivery;
  reminders: ReminderSent[];
  promise: { date: string; messageId: string } | null;
  openClaimMessageId: string | null;
  /** FR-C9: a person snoozed the reminder; it returns to the plan on `until`. */
  snooze: { until: string; by: string } | null;
  /** FR-C9 "I'll call instead": phone follow-ups a person chose over a message. */
  calls: { at: string; by: string }[];
  /** Payment terms in days, when the source carries them (FR-A1 CSV). */
  termsDays?: number;
}

export interface Outflow {
  id: string;
  label: string;
  short: string;
  amount: number;
  dueDate: string;
}

export interface BankLine {
  id: string;
  at: string;
  amount: number;
  description: string;
  matchedInvoiceId: string | null;
  /** How the line reached Kachingg: a forwarded bank alert, or a transaction CSV export. Absent means CSV. */
  source?: BankLineSource;
}

export type BankLineSource = "alert" | "csv";

export interface InboundMessage {
  id: string;
  customerId: string;
  receivedAt: string;
  text: string;
  image: string | null;
}

export type Intent =
  | "paid_claim"
  | "partial_payment"
  | "promise_to_pay"
  | "dispute_or_deduction"
  | "other";

/** What Bukti's AI step returns for one inbound message (PRD FR-E2). */
export interface Extraction {
  intent: Intent;
  amount: number | null;
  amount_quote: string | null;
  amount_source: "text" | "image" | null;
  amount_confidence: number;
  invoice_ref: string | null;
  invoice_ref_quote: string | null;
  invoice_ref_confidence: number;
  bank_reference: string | null;
  bank_reference_confidence: number;
  deduction_amount: number | null;
  deduction_reason: string | null;
  deduction_quote: string | null;
  deduction_confidence: number;
  promised_date_candidates: string[];
  promised_date_quote: string | null;
  promised_date_confidence: number;
  has_slip: boolean;
}

export interface ExtractionRecord {
  messageId: string;
  extraction: Extraction;
  model: string;
  cached: boolean;
  at: string;
  /** Fields dropped by the verbatim gate (FR-E3). */
  rejectedQuotes: string[];
}

export interface Receipt {
  id: string;
  messageId: string;
  invoiceId: string;
  amount: number;
  bankLineId: string;
  status: "proposed" | "approved";
  approvedBy: string | null;
  deduction: {
    amount: number;
    reason: string;
    quote: string;
    linkedDo: string | null;
    status: "pending" | "accepted" | "rejected";
    decidedBy: string | null;
  } | null;
}

export type HandoffKind = "promise_date" | "claim_unverified" | "unmatched";

export interface Handoff {
  id: string;
  kind: HandoffKind;
  messageId: string;
  invoiceId: string | null;
  question: string;
  options: string[];
  draftReply: string | null;
  resolved: string | null;
  resolvedBy: string | null;
}

export interface Warning {
  id: string;
  outflowId: string;
  gap: number;
  raisedAt: string;
  chosen: string[];
}

export type BookingStatus = "accepted" | "on_hold" | "deposit_requested" | "cod" | "call_first";

export interface Booking {
  id: string;
  customerId: string;
  route: string;
  amount: number;
  terms: "credit" | "cod" | "prepaid";
  creditDays: number;
  createdAt: string;
  createdBy: string;
  status: BookingStatus;
  decidedBy: string | null;
  depositPct: number | null;
  checkInvoiceId: string | null;
}

export interface CreditNote {
  id: string;
  invoiceId: string;
  amount: number;
  reason: string;
  at: string;
}

export type ActorKind = "SYSTEM" | "RULE" | "AI" | "INBOUND" | "BANK" | "USER";

export interface LogEntry {
  seq: number;
  at: string;
  kind: ActorKind;
  actor: string;
  text: string;
  rule?: string;
  refs?: string[];
  model?: string;
  confidence?: number;
}

export interface State {
  version: number;
  now: string;
  business: { name: string; city: string; staff: number };
  users: User[];
  role: Role;
  scannedDays: string[];
  bankBalance: { amount: number; enteredAt: string; enteredBy: string };
  approvedReceiptTotal: number;
  customers: Customer[];
  invoices: Invoice[];
  outflows: Outflow[];
  /** Credit lines only: the input for matching (M1). Every role sees these. */
  bankLines: BankLine[];
  /** Debit lines from an imported transaction export (FR-A5). Owner only, never shown to the Clerk. */
  bankDebits: BankLine[];
  messages: InboundMessage[];
  extractions: Record<string, ExtractionRecord>;
  receipts: Receipt[];
  handoffs: Handoff[];
  warnings: Warning[];
  bookings: Booking[];
  creditNotes: CreditNote[];
  log: LogEntry[];
  counters: Record<string, number>;
}

/* ---------- time ---------- */

const MS_DAY = 86_400_000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const dayOf = (ts: string) => ts.slice(0, 10);
export const timeOf = (ts: string) => ts.slice(11, 16);
const toUtc = (date: string) => Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10));

/** Whole days from a to b (b − a). */
export const daysBetween = (a: string, b: string) => Math.round((toUtc(dayOf(b)) - toUtc(dayOf(a))) / MS_DAY);

export function addDays(date: string, n: number): string {
  const d = new Date(toUtc(dayOf(date)) + n * MS_DAY);
  return d.toISOString().slice(0, 10);
}

export const fmtDate = (date: string) => `${+date.slice(8, 10)} ${MONTHS[+date.slice(5, 7) - 1]}`;
export const fmtWeekday = (date: string) => WEEKDAYS[new Date(toUtc(dayOf(date))).getUTCDay()];
export const fmtDateTime = (ts: string) => `${fmtWeekday(ts)} ${fmtDate(ts)} ${timeOf(ts)}`;

/* ---------- money ---------- */

export const rm = (ringgit: number) => Math.round(ringgit * 100);

export function fmtRM(sen: number, opts: { cents?: boolean; sign?: boolean } = {}): string {
  const neg = sen < 0;
  const abs = Math.abs(sen) / 100;
  const body = abs.toLocaleString("en-MY", {
    minimumFractionDigits: opts.cents ? 2 : 0,
    maximumFractionDigits: opts.cents ? 2 : 0,
  });
  const sign = neg ? "−" : opts.sign ? "+" : "";
  return `${sign}RM${body}`;
}

/* ---------- lookups ---------- */

export const customerOf = (s: State, id: string) => s.customers.find((c) => c.id === id)!;
export const invoiceOf = (s: State, id: string) => s.invoices.find((i) => i.id === id)!;
export const userOf = (s: State, role: Role) => s.users.find((u) => u.role === role)!;
export const outstanding = (inv: Invoice) => inv.amount - inv.paid;
export const daysOverdue = (inv: Invoice, now: string) => daysBetween(inv.dueDate, now);
export const normInvoiceRef = (ref: string) => ref.toUpperCase().replace(/[^A-Z0-9]/g, "");
