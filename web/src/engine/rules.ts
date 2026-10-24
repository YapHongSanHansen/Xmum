// Deterministic business rules (PRD §8). Given the same state and clock,
// every function here returns the same answer. No AI in this file.
import {
  addDays,
  customerOf,
  daysBetween,
  daysOverdue,
  dayOf,
  fmtDate,
  fmtRM,
  normInvoiceRef,
  outstanding,
  timeOf,
  type BankLine,
  type Customer,
  type Extraction,
  type Invoice,
  type Lang,
  type State,
  type Tier,
} from "./model";

export const HORIZON_DAYS = 30;
export const WARN_WITHIN_DAYS = 14;
export const CREDIT_CHECK_DAYS = 30;
export const CONFIDENCE_MIN = 0.85;
const ON_TIME_MIN = 0.8;
const TIER_SEQUENCE: Tier[] = [1, 1, 2, 3];
const TIER_GATE: Record<Tier, number> = { 0: -3, 1: 1, 2: 14, 3: 30 };

/* ---------- F1 forecast ---------- */

export function onTimeRate(c: Customer): { rate: number; n: number } {
  const n = c.history.length;
  if (n === 0) return { rate: 0, n };
  const onTime = c.history.filter((h) => h.paid <= h.due).length;
  return { rate: onTime / n, n };
}

/** Owner-entered balance + receipts approved since (P0 definition of cash). */
export const cashNow = (s: State) => s.bankBalance.amount + s.approvedReceiptTotal;

/** A claim is VERIFIED once M1 matched it to a bank line, i.e. it produced a receipt. */
export const hasVerifiedClaim = (s: State, inv: Invoice) =>
  inv.openClaimMessageId !== null && s.receipts.some((r) => r.invoiceId === inv.id && r.messageId === inv.openClaimMessageId);

export function isExpectedInflow(s: State, inv: Invoice): boolean {
  // F1: "not PAID and without a VERIFIED claim". An unverified claim leaves the inflow expected.
  if (inv.status === "paid" || hasVerifiedClaim(s, inv)) return false;
  if (inv.dueDate < dayOf(s.now)) return false;
  const { rate, n } = onTimeRate(customerOf(s, inv.customerId));
  return n >= 3 && rate >= ON_TIME_MIN;
}

export interface OutflowForecast {
  outflowId: string;
  label: string;
  short: string;
  dueDate: string;
  amount: number;
  forecast: number;
  gap: number;
  daysAway: number;
}

export function forecast(s: State, extraCash = 0): OutflowForecast[] {
  const today = dayOf(s.now);
  const end = addDays(today, HORIZON_DAYS);
  const cash = cashNow(s) + extraCash;
  const outflows = s.outflows
    .filter((o) => o.dueDate >= today && o.dueDate <= end)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  return outflows.map((o) => {
    const inflows = s.invoices
      .filter((i) => isExpectedInflow(s, i) && i.dueDate <= o.dueDate)
      .reduce((sum, i) => sum + outstanding(i), 0);
    const out = outflows.filter((x) => x.dueDate <= o.dueDate).reduce((sum, x) => sum + x.amount, 0);
    const f = cash + inflows - out;
    return {
      outflowId: o.id,
      label: o.label,
      short: o.short,
      dueDate: o.dueDate,
      amount: o.amount,
      forecast: f,
      gap: f < 0 ? -f : 0,
      daysAway: daysBetween(today, o.dueDate),
    };
  });
}

export const shortfalls = (s: State) => forecast(s).filter((f) => f.forecast < 0);

/* ---------- G1 gap impact and pay-by ---------- */

export function payBy(s: State): string {
  const today = dayOf(s.now);
  const first = shortfalls(s)[0];
  const minDate = addDays(today, 3);
  if (!first) return addDays(today, 7);
  const dayBefore = addDays(first.dueDate, -1);
  return dayBefore > minDate ? dayBefore : minDate;
}

export interface GapImpact {
  short: string;
  dueDate: string;
  before: number;
  after: number;
}

export function gapImpact(s: State, inv: Invoice): GapImpact[] {
  const before = shortfalls(s).slice(0, 2);
  const after = forecast(s, outstanding(inv));
  const by = payBy(s);
  // Paid by the pay-by date: an outflow due before that date gets no help from it.
  return before.map((b) => ({
    short: b.short,
    dueDate: b.dueDate,
    before: b.forecast,
    after: b.dueDate < by ? b.forecast : after.find((a) => a.outflowId === b.outflowId)!.forecast,
  }));
}

/* ---------- R1–R3 chase plan ---------- */

export type RowState = "remind" | "skipped" | "sent_today" | "waiting" | "escalate";

export interface PlanRow {
  invoice: Invoice;
  customer: Customer;
  daysLate: number;
  tier: Tier | null;
  state: RowState;
  rule: string;
  reason: string;
  expected: number;
  p: number;
  closesGap: boolean;
  rank: number | null;
}

function nextTier(inv: Invoice, now: string): { tier: Tier | null; waitReason?: string } {
  const late = daysOverdue(inv, now);
  const sent = inv.reminders.filter((r) => r.status === "sent");
  if (late < 1) return sent.length === 0 && late >= -3 ? { tier: 0 } : { tier: null, waitReason: "not due yet" };
  // The fixed sequence T1, T1, T2, T3 starts after an optional Tier 0 courtesy note.
  const steps = sent.filter((r) => r.tier > 0).length;
  const step = TIER_SEQUENCE[Math.min(steps, TIER_SEQUENCE.length - 1)];
  const last = sent[sent.length - 1];
  if (last && !last.answered && daysBetween(last.at, now) < 7) {
    return { tier: null, waitReason: `last reminder ${fmtDate(dayOf(last.at))}, waiting 7 days for a reply` };
  }
  if (late < TIER_GATE[step]) return { tier: null, waitReason: `Tier ${step} allowed from D+${TIER_GATE[step]}` };
  return { tier: step };
}

/** R2 reason prefix for "the customer was sent any reminder in the last 5 days". */
export const RECENT_REMINDER_REASON = "reminder sent";

function suppressReason(s: State, inv: Invoice): string | null {
  const today = dayOf(s.now);
  if (inv.status === "disputed") return "invoice disputed";
  if (inv.openClaimMessageId) {
    // M5: an open claim pauses reminders until it is settled.
    const receipt = s.receipts.find((r) => r.invoiceId === inv.id && r.messageId === inv.openClaimMessageId);
    if (receipt?.status === "proposed") return "payment verified; receipt awaiting approval";
    if (receipt?.deduction?.status === "pending") return `${fmtRM(receipt.deduction.amount)} deduction under review`;
    return "customer says paid; waiting for bank check";
  }
  if (inv.promise && today <= inv.promise.date) return `promise ${fmtDate(inv.promise.date)} not reached`;
  const paidRecently = s.bankLines
    .filter((b) => b.matchedInvoiceId === inv.id && b.at <= s.now && daysBetween(b.at, s.now) < 2)
    .at(-1);
  if (paidRecently) return `payment received ${fmtDate(dayOf(paidRecently.at))}, under 2 days ago`;
  // Any reminder to this customer, on any invoice, including one sent or queued today.
  const recent = s.invoices
    .filter((i) => i.customerId === inv.customerId)
    .flatMap((i) => i.reminders)
    .filter((r) => daysBetween(r.at, s.now) < 5)
    .sort((a, b) => a.at.localeCompare(b.at));
  if (recent.length) return `${RECENT_REMINDER_REASON} ${fmtDate(dayOf(recent[recent.length - 1].at))}, under 5 days ago`;
  return null;
}

/** Share of past invoices paid within N days of a reminder at this tier (R3). */
export function payRate(c: Customer, tier: Tier, n: number): number {
  const rows = c.history.filter((h) => h.lastReminderTier === tier && h.lastReminderDate);
  if (rows.length < 3) return 0.5;
  return rows.filter((h) => daysBetween(h.lastReminderDate!, h.paid) <= n).length / rows.length;
}

export function chasePlan(s: State): PlanRow[] {
  const today = dayOf(s.now);
  const gaps = shortfalls(s);
  const next = gaps[0];
  const n = next ? Math.max(1, daysBetween(today, next.dueDate)) : 14;

  const rows: PlanRow[] = s.invoices
    .filter((i) => i.status !== "paid" && daysOverdue(i, s.now) >= -3 && !(i.status === "part_paid" && i.openClaimMessageId === null && outstanding(i) === 0))
    .filter((i) => daysOverdue(i, s.now) >= 1 || i.reminders.length === 0)
    .filter((i) => daysOverdue(i, s.now) >= 1)
    .map((invoice) => {
      const customer = customerOf(s, invoice.customerId);
      const base = { invoice, customer, daysLate: daysOverdue(invoice, s.now), expected: 0, p: 0, closesGap: false, rank: null };
      const sentToday = invoice.reminders.find((r) => dayOf(r.at) === today);
      if (sentToday) {
        return {
          ...base,
          tier: sentToday.tier,
          state: "sent_today" as const,
          rule: "R5",
          reason: sentToday.status === "queued" ? `Tier ${sentToday.tier} queued until 08:00 (S1)` : `Tier ${sentToday.tier} sent ${timeOf(sentToday.at)} by ${sentToday.by}`,
        };
      }
      const suppressed = suppressReason(s, invoice);
      if (suppressed) return { ...base, tier: null, state: "skipped" as const, rule: "R2", reason: suppressed };
      const { tier, waitReason } = nextTier(invoice, s.now);
      if (tier === null) return { ...base, tier: null, state: "waiting" as const, rule: "R1", reason: waitReason ?? "" };
      if (tier === 3) {
        return { ...base, tier, state: "escalate" as const, rule: "R1", reason: "30+ days and unanswered: owner decides (call / stop credit / own lawyer)" };
      }
      const p = payRate(customer, tier, n);
      return { ...base, tier, state: "remind" as const, rule: "R3", reason: "", p, expected: Math.round(outstanding(invoice) * p) };
    });

  const remindable = rows
    .filter((r) => r.state === "remind")
    .sort((a, b) => b.expected - a.expected || b.daysLate - a.daysLate || b.invoice.amount - a.invoice.amount);
  let cumulative = 0;
  remindable.forEach((r, idx) => {
    r.rank = idx + 1;
    const before = cumulative;
    cumulative += r.expected;
    if (next && before < next.gap) r.closesGap = true;
    const pct = Math.round(r.p * 100);
    r.reason = `${pct}% of past invoices paid within ${n} days of a Tier ${r.tier} reminder`;
    if (r.closesGap && next) r.reason += ` · ${idx === 0 && r.expected >= next.gap ? "closes" : "helps close"} the ${next.short} gap`;
  });
  const order: Record<RowState, number> = { remind: 0, escalate: 1, sent_today: 2, waiting: 3, skipped: 4 };
  return rows.sort(
    (a, b) => order[a.state] - order[b.state] || (a.rank ?? 99) - (b.rank ?? 99) || b.daysLate - a.daysLate,
  );
}

/** Tier 0/1: clerk or owner. Tier 2: owner only (FR-C6). */
export const canApprove = (tier: Tier, role: "owner" | "clerk") => (tier <= 1 ? true : role === "owner");

/* ---------- R5 templates ---------- */

const TEMPLATES: Record<Lang, Record<0 | 1 | 2, string>> = {
  en: {
    0: "Hi {contact}, {sender} from {business} here. Friendly heads-up: {invoice} ({amount}) for {route} is due on {due}. Thank you!",
    1: "Hi {contact}, {sender} from {business} here. Friendly reminder ya, {invoice} ({amount}) for {route} was due on {due}. Can help check with your accounts? Thank you!",
    2: "Hi {contact}, {sender} from {business}. {invoice} ({amount}) is now {late} days overdue and our earlier reminders are unanswered. Please arrange payment by {payBy}, or reply with a payment date. Reply if you need a statement. Thank you.",
  },
  bm: {
    0: "Salam {contact}, ini {sender} dari {business}. Makluman mesra: invois {invoice} ({amount}) untuk {route} akan tamat tempoh pada {due}. Terima kasih!",
    1: "Salam {contact}, ini {sender} dari {business}. Peringatan mesra, invois {invoice} ({amount}) untuk {route} telah tamat tempoh pada {due}. Mohon semak ya. Terima kasih!",
    2: "Salam {contact}, ini {sender} dari {business}. Invois {invoice} ({amount}) sudah {late} hari lewat dan peringatan sebelum ini belum dijawab. Mohon buat bayaran sebelum {payBy}, atau balas dengan tarikh bayaran. Balas jika perlukan penyata. Terima kasih.",
  },
  zh: {
    0: "{contact}您好，我是{business}的{sender}。温馨提醒：{invoice}（{amount}，{route}）将于{due}到期。谢谢！",
    1: "{contact}您好，我是{business}的{sender}。温馨提醒，{invoice}（{amount}，{route}）已于{due}到期，麻烦帮忙跟进一下，谢谢！",
    2: "{contact}您好，我是{business}的{sender}。{invoice}（{amount}）已经逾期{late}天，之前的提醒还没有回复。麻烦在{payBy}前安排付款，或回复告诉我们付款日期。如需对账单请回复，谢谢！",
  },
};

export function renderReminder(s: State, inv: Invoice, tier: 0 | 1 | 2, sender: string): string {
  const c = customerOf(s, inv.customerId);
  const zhDate = (d: string) => `${+d.slice(5, 7)}月${+d.slice(8, 10)}日`;
  const date = (d: string) => (c.lang === "zh" ? zhDate(d) : fmtDate(d));
  const fields: Record<string, string> = {
    contact: c.contact,
    sender,
    business: "Lori Laju Logistics",
    invoice: inv.number,
    amount: fmtRM(outstanding(inv)),
    route: inv.delivery.route,
    due: date(inv.dueDate),
    late: String(Math.max(0, daysOverdue(inv, s.now))),
    payBy: date(payBy(s)),
  };
  return TEMPLATES[c.lang][tier].replace(/\{(\w+)\}/g, (_, k: string) => fields[k] ?? "");
}

/** Click-to-send link with no phone number: WhatsApp asks which chat to use. */
export const waShareLink = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`;

/** S1: quiet hours from 21:00 until 08:00 (08:00 itself is not quiet). */
export function inQuietHours(ts: string): boolean {
  const t = timeOf(ts);
  return t >= "21:00" || t < "08:00";
}

/* ---------- R4 credit check ---------- */

export interface CreditExposure {
  owed: number;
  worstInvoice: Invoice | null;
  worstDays: number;
  promise: string | null;
}

export function creditExposure(s: State, customerId: string): CreditExposure {
  const open = s.invoices.filter((i) => i.customerId === customerId && i.status !== "paid");
  const owed = open.reduce((sum, i) => sum + outstanding(i), 0);
  const overdue = open.filter((i) => daysOverdue(i, s.now) >= 1).sort((a, b) => daysOverdue(b, s.now) - daysOverdue(a, s.now));
  const worst = overdue[0] ?? null;
  return { owed, worstInvoice: worst, worstDays: worst ? daysOverdue(worst, s.now) : 0, promise: worst?.promise?.date ?? null };
}

export const needsCreditCheck = (s: State, customerId: string) => creditExposure(s, customerId).worstDays >= CREDIT_CHECK_DAYS;

/* ---------- Bukti: verbatim gate, M1–M3 ---------- */

const squash = (t: string) => t.replace(/\s+/g, " ").trim();

/** FR-E3: a quote is shown only if it is an exact substring of the message. */
export const quoteIsVerbatim = (quote: string | null, text: string) =>
  quote !== null && quote.trim() !== "" && squash(text).includes(squash(quote));

const NAME_STOPWORDS = new Set(["SDN", "BHD", "SYARIKAT", "TRADING", "ENTERPRISE", "THE"]);

export function payerMatches(desc: string, customer: Customer, inv: Invoice | null): boolean {
  const d = desc.toUpperCase();
  if (inv && d.replace(/[^A-Z0-9]/g, "").includes(normInvoiceRef(inv.number))) return true;
  return customer.name
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter((w) => w.length >= 4 && !NAME_STOPWORDS.has(w))
    .some((w) => d.includes(w));
}

export const visibleBankLines = (s: State) => s.bankLines.filter((b) => b.at <= s.now);

/** FR-H1: seeded inbound messages appear once the demo clock reaches their time. */
export const visibleMessages = (s: State) => s.messages.filter((m) => m.receivedAt <= s.now);

/** M1: VERIFIED only with an equal-amount bank line within 3 days and a payer match. */
export function findBankLine(s: State, amount: number, claimedAt: string, customer: Customer, inv: Invoice | null): BankLine | null {
  return (
    visibleBankLines(s).find(
      (b) =>
        b.matchedInvoiceId === null &&
        b.amount === amount &&
        Math.abs(daysBetween(b.at, claimedAt)) <= 3 &&
        payerMatches(b.description, customer, inv),
    ) ?? null
  );
}

/** M2 (single invoice): by reference, else the oldest open invoice the amount fits. */
export function resolveInvoice(s: State, customerId: string, ex: Extraction): Invoice | null {
  const open = s.invoices
    .filter((i) => i.customerId === customerId && i.status !== "paid")
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  if (ex.invoice_ref) {
    const byRef = open.find((i) => normInvoiceRef(i.number) === normInvoiceRef(ex.invoice_ref!));
    if (byRef) return byRef;
  }
  const amount = ex.amount === null ? null : Math.round(ex.amount * 100);
  const deduction = ex.deduction_amount === null ? 0 : Math.round(ex.deduction_amount * 100);
  if (amount !== null) {
    const fit = open.find((i) => outstanding(i) === amount || outstanding(i) === amount + deduction);
    if (fit) return fit;
  }
  const overdue = open.filter((i) => daysOverdue(i, s.now) >= 1);
  return overdue.length === 1 ? overdue[0] : null;
}

/** M3: a deduction links to the delivery whose destination or DO number it names. */
export function linkDeduction(reason: string, inv: Invoice): string | null {
  const r = reason.toLowerCase();
  if (r.includes(inv.delivery.destination.toLowerCase()) || r.includes(inv.delivery.doNumber.toLowerCase())) {
    return inv.delivery.doNumber;
  }
  return null;
}
