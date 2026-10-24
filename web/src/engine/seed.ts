// Synthetic demo data for Lori Laju Logistics (PRD §14). Every name, number,
// bank and message here is fictional.
import { buildHistory } from "./history";
import { addDays, rm, type Customer, type Invoice, type PastInvoice, type State, type Tier } from "./model";

export const DEMO_START = "2026-10-20T08:00";

/**
 * Builds a payment history where `gaps[i]` is the number of days between the
 * last reminder and payment, so R3's "paid within N days" rate is exact.
 */
function history(firstDue: string, tier: Tier | null, gaps: number[]): PastInvoice[] {
  return gaps.map((gap, i) => {
    const due = addDays(firstDue, i * 30);
    if (tier === null) return { due, paid: addDays(due, -gap), lastReminderTier: null, lastReminderDate: null };
    const reminder = addDays(due, tier === 1 ? 3 : 16);
    return { due, paid: addDays(reminder, gap), lastReminderTier: tier, lastReminderDate: reminder };
  });
}

const customers: Customer[] = [
  {
    id: "c-megabina",
    name: "Mega Bina Hardware Trading Sdn Bhd",
    contact: "Jessie",
    whatsapp: "+60 12-000 0141",
    lang: "en",
    // 9 of 10 paid within 11 days of a Tier 1 nudge → p = 0.9
    history: history("2025-11-02", 1, [3, 4, 4, 5, 3, 6, 4, 2, 5, 20]),
  },
  {
    id: "c-hupseng",
    name: "Syarikat Hup Seng Trading",
    contact: "李老板",
    whatsapp: "+60 12-000 0268",
    lang: "zh",
    // 3 of 10 paid within 11 days of a Tier 2 reminder → p = 0.3
    history: history("2025-11-05", 2, [5, 9, 10, 15, 20, 25, 30, 18, 14, 40]),
  },
  {
    id: "c-kilang",
    name: "Kilang Perabot Jaya Sdn Bhd",
    contact: "Encik Razak",
    whatsapp: "+60 12-000 0310",
    lang: "bm",
    // 6 of 10 within 11 days at Tier 1 → p = 0.6
    history: history("2025-11-12", 1, [4, 6, 8, 10, 3, 7, 15, 20, 25, 30]),
  },
  {
    id: "c-pelita",
    name: "Pelita Frozen Foods Sdn Bhd",
    contact: "Puan Rosnah",
    whatsapp: "+60 12-000 0296",
    lang: "bm",
    history: history("2025-11-28", 1, [5, 8, 12, 6, 9, 14, 7, 10, 11, 13]),
  },
  {
    id: "c-sinar",
    name: "Kedai Elektrik Sinar Sdn Bhd",
    contact: "Mr Gan",
    whatsapp: "+60 12-000 0331",
    lang: "en",
    // always pays before the due date → counts as an expected inflow (F1)
    history: history("2025-11-27", null, [2, 1, 3, 0, 2, 1, 4, 2, 0, 1]),
  },
  {
    id: "c-gudang",
    name: "Gudang Sejuk Prima Sdn Bhd",
    contact: "Cik Aina",
    whatsapp: "+60 12-000 0335",
    lang: "bm",
    history: history("2025-11-29", null, [1, 0, 2, 3, 1, 2, 0, 1, 2, 1]),
  },
];

function inv(
  id: string,
  customerId: string,
  ringgit: number,
  issueDate: string,
  dueDate: string,
  delivery: Invoice["delivery"],
  extra: Partial<Invoice> = {},
): Invoice {
  return {
    id,
    number: id,
    customerId,
    amount: rm(ringgit),
    paid: 0,
    issueDate,
    dueDate,
    status: "open",
    delivery,
    reminders: [],
    promise: null,
    openClaimMessageId: null,
    snooze: null,
    calls: [],
    ...extra,
  };
}

const invoices: Invoice[] = [
  inv("INV-2268", "c-hupseng", 6850, "2026-08-06", "2026-09-05",
    { doNumber: "DO-8744", date: "2026-08-06", route: "Klang → Ipoh", destination: "Ipoh" },
    {
      reminders: [
        { tier: 1, at: "2026-09-22T10:00", answered: false, by: "Nurul", text: "", status: "sent" },
        { tier: 1, at: "2026-09-30T10:00", answered: false, by: "Nurul", text: "", status: "sent" },
      ],
    }),
  inv("INV-2296", "c-pelita", 1900, "2026-08-29", "2026-09-28",
    { doNumber: "DO-8801", date: "2026-08-29", route: "Klang → Seremban", destination: "Seremban" },
    {
      reminders: [{ tier: 1, at: "2026-10-01T10:00", answered: true, by: "Nurul", text: "", status: "sent" }],
      promise: { date: "2026-10-30", messageId: "seed-pelita" },
    }),
  inv("INV-2304", "c-megabina", 3100, "2026-09-12", "2026-10-02",
    { doNumber: "DO-8812", date: "2026-09-12", route: "Shah Alam → Bukit Raja", destination: "Bukit Raja" }),
  inv("INV-2310", "c-kilang", 4200, "2026-09-12", "2026-10-12",
    { doNumber: "DO-8820", date: "2026-09-12", route: "Muar → Port Klang", destination: "Port Klang" }),
  inv("INV-2331", "c-sinar", 7500, "2026-09-27", "2026-10-27",
    { doNumber: "DO-8851", date: "2026-09-27", route: "Klang → Kajang", destination: "Kajang" }),
  inv("INV-2335", "c-gudang", 5200, "2026-09-29", "2026-10-29",
    { doNumber: "DO-8856", date: "2026-09-29", route: "Port Klang → Rawang", destination: "Rawang" }),
  inv("INV-2340", "c-megabina", 2650, "2026-10-13", "2026-11-12",
    { doNumber: "DO-8870", date: "2026-10-13", route: "Shah Alam → Puchong", destination: "Puchong" }),
  inv("INV-2343", "c-sinar", 6200, "2026-10-15", "2026-11-14",
    { doNumber: "DO-8874", date: "2026-10-15", route: "Klang → Seremban", destination: "Seremban" }),
  inv("INV-2346", "c-gudang", 4800, "2026-10-17", "2026-11-16",
    { doNumber: "DO-8879", date: "2026-10-17", route: "Port Klang → Rawang", destination: "Rawang" }),
  inv("INV-2349", "c-kilang", 3900, "2026-10-19", "2026-11-18",
    { doNumber: "DO-8883", date: "2026-10-19", route: "Muar → Port Klang", destination: "Port Klang" }),
  inv("INV-2351", "c-pelita", 2100, "2026-10-20", "2026-11-19",
    { doNumber: "DO-8886", date: "2026-10-20", route: "Klang → Seremban", destination: "Seremban" }),
  inv("INV-2354", "c-gudang", 5600, "2026-10-20", "2026-11-23",
    { doNumber: "DO-8888", date: "2026-10-20", route: "Port Klang → Kuantan", destination: "Kuantan" }),
  inv("INV-2357", "c-sinar", 3300, "2026-10-20", "2026-11-25",
    { doNumber: "DO-8890", date: "2026-10-20", route: "Klang → Kajang", destination: "Kajang" }),
  inv("INV-2360", "c-megabina", 2950, "2026-10-20", "2026-11-27",
    { doNumber: "DO-8892", date: "2026-10-20", route: "Shah Alam → Puchong", destination: "Puchong" }),
  inv("INV-2362", "c-sinar", 4400, "2026-10-20", "2026-11-30",
    { doNumber: "DO-8895", date: "2026-10-20", route: "Klang → Seremban", destination: "Seremban" }),
];

// Months of paid work, new healthy customers, older read messages and past
// bookings (engine/history.ts). Built once; invisible to F1/R1-R4/M1-M5.
const past = buildHistory(customers, invoices);
const pastPaid = past.invoices.filter((i) => i.status === "paid");
const newOpen = past.invoices.filter((i) => i.status !== "paid");

export function seedState(): State {
  return {
    // Bump when the State shape or the seed data changes, so a stale saved demo falls back to the seed.
    version: 3,
    now: DEMO_START,
    business: { name: "Lori Laju Logistics Sdn Bhd", city: "Klang", staff: 12 },
    users: [
      { id: "u-owner", name: "Lim Siew Lan", role: "owner" },
      { id: "u-clerk", name: "Nurul", role: "clerk" },
    ],
    role: "owner",
    scannedDays: [],
    bankBalance: { amount: rm(9800), enteredAt: "2026-10-20T07:45", enteredBy: "Lim Siew Lan" },
    approvedReceiptTotal: 0,
    customers: structuredClone([...customers, ...past.customers]),
    invoices: structuredClone([...pastPaid, ...invoices, ...newOpen]),
    outflows: [
      { id: "o-salaries", label: "Salaries (drivers + staff)", short: "salaries", amount: rm(24500), dueDate: "2026-10-31" },
      { id: "o-diesel", label: "Diesel fleet card", short: "diesel", amount: rm(11200), dueDate: "2026-11-05" },
    ],
    bankLines: [
      ...structuredClone(past.bankLines),
      { id: "bl-0919", at: "2026-10-19T16:10", amount: rm(1250), description: "IBG CR TOKO MAJU ENT 0919", matchedInvoiceId: null },
      { id: "bl-2304", at: "2026-10-23T14:25", amount: rm(2770), description: "DUITNOW CR MEGA BINA HARDW INV2304", matchedInvoiceId: null },
    ],
    bankDebits: [],
    messages: [
      ...structuredClone(past.messages),
      {
        id: "m-hupseng",
        customerId: "c-hupseng",
        receivedAt: "2026-10-20T11:02",
        text: "老板，那张发票我们下礼拜五才过数，sorry ah",
        image: null,
      },
      {
        id: "m-megabina",
        customerId: "c-megabina",
        receivedAt: "2026-10-23T14:30",
        text: "Hi kak, payment for INV-2304 done ya. Bank in RM2,770 just now, deduct RM330 for the 2 pallet tiles pecah at Bukit Raja. Slip attached",
        image: "/slips/bank-cempaka-inv2304.png",
      },
      {
        id: "m-kilang",
        customerId: "c-kilang",
        receivedAt: "2026-10-23T15:00",
        text: "Dah settle la semalam",
        image: null,
      },
    ],
    extractions: structuredClone(past.extractions),
    receipts: [],
    handoffs: [],
    warnings: [],
    bookings: structuredClone(past.bookings),
    creditNotes: [],
    log: [],
    counters: { CN: 56 },
  };
}

/** Demo-script stops for the "advance to" control (PRD §13). */
export const DEMO_STOPS = [
  { at: "2026-10-20T11:05", label: "Tue 20 Oct 11:05 · Hup Seng replies" },
  { at: "2026-10-21T10:20", label: "Wed 21 Oct 10:20 · Hup Seng books a lorry" },
  { at: "2026-10-23T14:30", label: "Fri 23 Oct 14:30 · Mega Bina says paid" },
  { at: "2026-10-23T15:00", label: "Fri 23 Oct 15:00 · Kilang says paid" },
];
