// Synthetic business history for the demo company (Jun to mid-Oct 2026), so the
// app opens on a firm with months of paid work behind it. Every name, number,
// bank line and message here is fictional.
//
// None of this may move a demo number (docs/HANDOFF.md §4):
// - every past invoice is PAID and its bank credit is already matched, so F1,
//   R1-R4 and M1/M2 never see it, and it carries no reminders or calls (R2);
// - the six new customers' open invoices are due from 26 Nov, after the 30-day
//   window ends on every demo day (latest stop 23 Oct + 30 = 22 Nov);
// - the existing six customers keep their R3 histories untouched; their paid
//   invoices are read off those same histories, so the two always agree;
// - older messages arrive already read (an extraction record) with no receipt
//   or hand-off; past bookings were never put on hold or decided.
import {
  addDays,
  rm,
  type Booking,
  type Customer,
  type Extraction,
  type ExtractionRecord,
  type InboundMessage,
  type Invoice,
  type PastInvoice,
  type BankLine,
} from "./model";

/** Invoices before this day were paid before the demo opens (20 Oct 08:00). */
const PAID_BEFORE = "2026-10-20";
/** First due date allowed for a new open invoice: past every demo day's forecast window. */
export const OPEN_DUE_FROM = "2026-11-26";

/** Small deterministic generator, so the history is the same on every load. */
function lcg(seed: number) {
  let x = seed >>> 0;
  return () => {
    x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
    return x / 2 ** 32;
  };
}

/** Amounts the Owner sees as cash or gap figures: never reuse them as invoice amounts (FR-B5 sweep). */
const OWNER_FIGURES = new Set([9800, 24500, 11200, 2000, 13200, 770, 10430, 6350, 4850, 12700, 12570, 35700, 2770, 330, 6850, 9250, 2400]);

function amountFrom(rand: () => number, min: number, max: number): number {
  for (;;) {
    const v = Math.round((min + rand() * (max - min)) / 50) * 50;
    if (!OWNER_FIGURES.has(v)) return v;
  }
}

/* ---------- new customers (healthy payers) ---------- */

interface NewCustomer {
  customer: Omit<Customer, "history">;
  route: [string, string];
  /** First issue date of the paid history and the spacing between jobs. */
  from: string;
  every: number;
  terms: number;
  min: number;
  max: number;
  /** Open invoices issued in October (not yet due). */
  open: { issue: string; terms: number }[];
}

const NEW_CUSTOMERS: NewCustomer[] = [
  {
    customer: { id: "c-tunas", name: "Tunas Mas Packaging Sdn Bhd", contact: "黄小姐", whatsapp: "+60 12-000 0412", lang: "zh" },
    route: ["Port Klang → Senai", "Senai"],
    from: "2026-06-03",
    every: 12,
    terms: 30,
    min: 2600,
    max: 6400,
    open: [{ issue: "2026-10-12", terms: 45 }],
  },
  {
    customer: { id: "c-bayu", name: "Bayu Segar Beverages Sdn Bhd", contact: "Encik Hafiz", whatsapp: "+60 12-000 0427", lang: "bm" },
    route: ["Shah Alam → Kuantan", "Kuantan"],
    from: "2026-06-08",
    every: 14,
    terms: 30,
    min: 1800,
    max: 4200,
    open: [{ issue: "2026-10-14", terms: 45 }],
  },
  {
    customer: { id: "c-delima", name: "Delima Plastics Industries Sdn Bhd", contact: "Ms Priya", whatsapp: "+60 12-000 0438", lang: "en" },
    route: ["Klang → Prai", "Prai"],
    from: "2026-06-05",
    every: 15,
    terms: 30,
    min: 3200,
    max: 7400,
    open: [
      { issue: "2026-10-09", terms: 60 },
      { issue: "2026-10-19", terms: 60 },
    ],
  },
  {
    customer: { id: "c-cahaya", name: "Cahaya Timur Paper Products Sdn Bhd", contact: "Puan Salmah", whatsapp: "+60 12-000 0453", lang: "bm" },
    route: ["Port Klang → Melaka", "Melaka"],
    from: "2026-06-10",
    every: 16,
    terms: 30,
    min: 1500,
    max: 3600,
    open: [{ issue: "2026-10-16", terms: 45 }],
  },
  {
    customer: { id: "c-yongfa", name: "Yong Fa Building Materials Sdn Bhd", contact: "陈经理", whatsapp: "+60 12-000 0466", lang: "zh" },
    route: ["Klang → Seri Kembangan", "Seri Kembangan"],
    from: "2026-06-02",
    every: 11,
    terms: 30,
    min: 2200,
    max: 5600,
    open: [{ issue: "2026-10-15", terms: 45 }],
  },
  {
    customer: { id: "c-seri", name: "Seri Mutiara Textile Sdn Bhd", contact: "Mr Kumar", whatsapp: "+60 12-000 0479", lang: "en" },
    route: ["Klang → Nilai", "Nilai"],
    from: "2026-06-12",
    every: 18,
    terms: 30,
    min: 1400,
    max: 3200,
    open: [{ issue: "2026-10-18", terms: 45 }],
  },
];

/* ---------- numbering ---------- */

/** Invoice and DO numbers run with the calendar, like the seed (INV-2268 / DO-8744 on 6 Aug). */
const ANCHOR = "2026-08-06";
const daysFromAnchor = (d: string) => Math.round((Date.parse(d) - Date.parse(ANCHOR)) / 86_400_000);

function numberer(taken: Iterable<string>, prefix: string, base: number, perDay: number, max: number) {
  const used = new Set(taken);
  return (date: string) => {
    const start = Math.min(max, base + Math.round(daysFromAnchor(date) * perDay));
    for (let k = 0; ; k++) {
      for (const n of [start + k, start - k]) {
        const id = `${prefix}${n}`;
        if (n <= max && !used.has(id)) {
          used.add(id);
          return id;
        }
      }
    }
  };
}

/* ---------- bank lines ---------- */

const payer = (name: string) =>
  name
    .toUpperCase()
    .replace(/\b(SDN|BHD|SYARIKAT)\b/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 15)
    .trim();

function creditLine(inv: Invoice, customerName: string, paid: string, rand: () => number): BankLine {
  const hour = 9 + Math.floor(rand() * 8);
  const minute = Math.floor(rand() * 6) * 10 + 5;
  const withRef = rand() < 0.75;
  const rail = withRef ? "DUITNOW CR" : "IBG CR";
  const ref = withRef ? ` ${inv.number.replace("-", "")}` : ` ${paid.slice(8, 10)}${paid.slice(5, 7)}`;
  return {
    id: `bl-h-${inv.number.slice(4)}`,
    at: `${paid}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    amount: inv.amount,
    description: `${rail} ${payer(customerName)}${ref}`,
    matchedInvoiceId: inv.id,
  };
}

/* ---------- build ---------- */

export interface History {
  customers: Customer[];
  invoices: Invoice[];
  bankLines: BankLine[];
  messages: InboundMessage[];
  extractions: Record<string, ExtractionRecord>;
  bookings: Booking[];
}

function invoiceRecord(
  number: string,
  customerId: string,
  ringgit: number,
  issueDate: string,
  dueDate: string,
  delivery: Invoice["delivery"],
  paid: boolean,
  termsDays: number,
): Invoice {
  return {
    id: number,
    number,
    customerId,
    amount: rm(ringgit),
    paid: paid ? rm(ringgit) : 0,
    issueDate,
    dueDate,
    status: paid ? "paid" : "open",
    delivery,
    reminders: [],
    promise: null,
    openClaimMessageId: null,
    snooze: null,
    calls: [],
    termsDays,
  };
}

/** Routes the existing customers' paid jobs ran on (same lanes as their seed invoices). */
const EXISTING_ROUTES: Record<string, [string, string]> = {
  "c-megabina": ["Shah Alam → Bukit Raja", "Bukit Raja"],
  "c-hupseng": ["Klang → Ipoh", "Ipoh"],
  "c-kilang": ["Muar → Port Klang", "Port Klang"],
  "c-pelita": ["Klang → Seremban", "Seremban"],
  "c-sinar": ["Klang → Kajang", "Kajang"],
  "c-gudang": ["Port Klang → Rawang", "Rawang"],
};

export function buildHistory(existing: Customer[], seedInvoices: Invoice[]): History {
  const rand = lcg(20261020);
  const nextInvoice = numberer(
    seedInvoices.map((i) => i.number.slice(4)),
    "",
    2268,
    1.25,
    2362,
  );
  const nextDo = numberer(
    seedInvoices.map((i) => i.delivery.doNumber.slice(3)),
    "",
    8744,
    2,
    8896,
  );
  const invoices: Invoice[] = [];
  const bankLines: BankLine[] = [];
  const customers: Customer[] = [];

  const job = (customerId: string, name: string, route: [string, string], ringgit: number, issue: string, due: string, paid: string | null, terms: number) => {
    const number = `INV-${nextInvoice(issue)}`;
    const delivery = { doNumber: `DO-${nextDo(issue)}`, date: issue, route: route[0], destination: route[1] };
    const inv = invoiceRecord(number, customerId, ringgit, issue, due, delivery, paid !== null, terms);
    invoices.push(inv);
    if (paid) bankLines.push(creditLine(inv, name, paid, rand));
  };

  // Existing customers: one paid invoice per R3 history entry paid since 1 Jul.
  for (const c of existing) {
    for (const h of c.history) {
      if (h.paid < "2026-07-01" || h.paid >= PAID_BEFORE) continue;
      job(c.id, c.name, EXISTING_ROUTES[c.id], amountFrom(rand, 1600, 6200), addDays(h.due, -30), h.due, h.paid, 30);
    }
  }

  // New customers: regular jobs since June, paid on or close to the due date.
  for (const n of NEW_CUSTOMERS) {
    const past: PastInvoice[] = [];
    // Older payments (Jan-May) for a longer, healthy record.
    for (let d = addDays(n.from, -150); d < n.from; d = addDays(d, 30)) {
      const due = addDays(d, n.terms);
      past.push({ due, paid: addDays(due, -Math.floor(rand() * 4)), lastReminderTier: null, lastReminderDate: null });
    }
    for (let issue = n.from; issue < "2026-10-01"; issue = addDays(issue, n.every)) {
      const due = addDays(issue, n.terms);
      // Mostly early or on the day; now and then a day or two late after a Tier 1 nudge.
      const offset = rand() < 0.85 ? -Math.floor(rand() * 5) : 1 + Math.floor(rand() * 2);
      const paid = addDays(due, offset);
      if (paid >= PAID_BEFORE) continue;
      past.push(
        offset > 0
          ? { due, paid, lastReminderTier: 1, lastReminderDate: addDays(due, 1) }
          : { due, paid, lastReminderTier: null, lastReminderDate: null },
      );
      job(n.customer.id, n.customer.name, n.route, amountFrom(rand, n.min, n.max), issue, due, paid, n.terms);
    }
    for (const o of n.open) {
      const due = addDays(o.issue, o.terms);
      if (due < OPEN_DUE_FROM) throw new Error(`history: ${n.customer.id} open invoice due ${due} is inside a demo forecast window`);
      job(n.customer.id, n.customer.name, n.route, amountFrom(rand, n.min, n.max), o.issue, due, null, o.terms);
    }
    customers.push({ ...n.customer, history: past });
  }

  invoices.sort((a, b) => a.issueDate.localeCompare(b.issueDate) || a.number.localeCompare(b.number));
  bankLines.sort((a, b) => a.at.localeCompare(b.at));
  return { customers, invoices, bankLines, ...pastMessages(), bookings: PAST_BOOKINGS };
}

/* ---------- older inbound messages, already read ---------- */

const BLANK: Omit<Extraction, "intent"> = {
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

const OLD_MESSAGES: InboundMessage[] = [
  { id: "m-h-tunas-0714", customerId: "c-tunas", receivedAt: "2026-07-14T10:12", text: "收到，谢谢。下个月的货照旧安排，麻烦星期三派车。", image: null },
  { id: "m-h-bayu-0806", customerId: "c-bayu", receivedAt: "2026-08-06T09:40", text: "Terima kasih, barang dah sampai Kuantan pagi tadi.", image: null },
  { id: "m-h-delima-0903", customerId: "c-delima", receivedAt: "2026-09-03T15:22", text: "Hi, can send us the statement for August? Our auditor is asking.", image: null },
  { id: "m-h-sinar-0918", customerId: "c-sinar", receivedAt: "2026-09-18T11:05", text: "Received the goods in good condition, thanks!", image: null },
  { id: "m-h-yongfa-1002", customerId: "c-yongfa", receivedAt: "2026-10-02T16:48", text: "九月份的对账单收到了，没问题，谢谢。", image: null },
  { id: "m-h-seri-1009", customerId: "c-seri", receivedAt: "2026-10-09T12:30", text: "Thanks for the quick delivery to Nilai yesterday. Next load on Monday ok?", image: null },
  { id: "m-h-cahaya-1015", customerId: "c-cahaya", receivedAt: "2026-10-15T17:05", text: "Boleh confirm lori sampai pukul berapa esok? Gudang buka 8 pagi.", image: null },
];

function pastMessages(): { messages: InboundMessage[]; extractions: Record<string, ExtractionRecord> } {
  const extractions: Record<string, ExtractionRecord> = {};
  for (const m of OLD_MESSAGES) {
    const at = `${m.receivedAt.slice(0, 14)}${String(Math.min(59, +m.receivedAt.slice(14, 16) + 1)).padStart(2, "0")}`;
    extractions[m.id] = { messageId: m.id, extraction: { intent: "other", ...BLANK }, model: "claude-opus-5-5", cached: true, at, rejectedQuotes: [] };
  }
  return { messages: structuredClone(OLD_MESSAGES), extractions };
}

/* ---------- past bookings ---------- */

// Ids use a month-coded form (BK-YYMM-nn) so they never collide with the
// counter-issued BK-0001 the demo's new booking receives.
const PAST_BOOKINGS: Booking[] = [
  { id: "BK-2607-01", customerId: "c-sinar", route: "Klang → Kajang", amount: rm(3400), terms: "credit", creditDays: 30, createdAt: "2026-07-21T09:15", createdBy: "Nurul", status: "accepted", decidedBy: null, depositPct: null, checkInvoiceId: null },
  { id: "BK-2608-02", customerId: "c-tunas", route: "Port Klang → Senai", amount: rm(5250), terms: "credit", creditDays: 30, createdAt: "2026-08-18T14:40", createdBy: "Nurul", status: "accepted", decidedBy: null, depositPct: null, checkInvoiceId: null },
  { id: "BK-2609-03", customerId: "c-bayu", route: "Shah Alam → Kuantan", amount: rm(2150), terms: "cod", creditDays: 0, createdAt: "2026-09-24T10:05", createdBy: "Lim Siew Lan", status: "accepted", decidedBy: null, depositPct: null, checkInvoiceId: null },
  { id: "BK-2610-04", customerId: "c-seri", route: "Klang → Nilai", amount: rm(1850), terms: "prepaid", creditDays: 0, createdAt: "2026-10-14T11:20", createdBy: "Nurul", status: "accepted", decidedBy: null, depositPct: null, checkInvoiceId: null },
];

/** Bank credits matched to an invoice, summed by calendar month ("2026-07" → sen). */
export function collectedByMonth(lines: BankLine[], now: string, months: string[]): { month: string; amount: number; count: number }[] {
  return months.map((month) => {
    const rows = lines.filter((b) => b.matchedInvoiceId !== null && b.at <= now && b.at.startsWith(month));
    return { month, amount: rows.reduce((sum, b) => sum + b.amount, 0), count: rows.length };
  });
}
