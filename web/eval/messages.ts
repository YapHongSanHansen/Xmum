// Bukti's synthetic test set (PRD NFR-4): 40 WhatsApp replies a customer of
// Lori Laju Logistics might send, each with hand-labelled expected fields.
// Every company, person, invoice number and bank is fictional; the only bank
// named is the demo's fictional "Bank Cempaka". b08 to b10 are the three
// seeded demo messages (engine/seed.ts), the rest are new.
import { rm, type Intent } from "../src/engine/model";

export type Lang = "manglish" | "bm" | "en" | "zh" | "mixed";

/** The fields the eval scores, in report order. */
export const FIELDS = ["intent", "amount", "invoice_ref", "deduction_amount", "deduction_reason", "promised_date"] as const;
export type Field = (typeof FIELDS)[number];

export interface Expected {
  intent: Intent;
  /** Amount the customer says they paid, in sen (the app's money unit); null when none. */
  amount: number | null;
  /** Invoice reference exactly as written in the message; null when none. */
  invoiceRef: string | null;
  /** Deduction in sen, and the essential words of its reason as written in the message. */
  deduction: { amount: number; reason: string } | null;
  /** Every calendar date a promise could mean (sorted ISO); [] when there is no promise date. */
  promisedDates: string[];
}

export interface EvalItem {
  id: string;
  lang: Lang;
  /** The stated "now": when the message arrived (local Malaysia time). */
  now: string;
  text: string;
  /** Slip image under public/, as in the seed; null for text-only messages. */
  image: string | null;
  expected: Expected;
  /** Fields a person could fairly label either way; left out of the score. */
  unscored?: Field[];
  note?: string;
}

// Stated "now"s. October 2026: Tue 20, Fri 23, Mon 26, Thu 29.
const TUE = "2026-10-20T10:15";
const FRI = "2026-10-23T16:40";
const MON = "2026-10-26T09:30";
const THU = "2026-10-29T14:05";

const none: Expected = { intent: "other", amount: null, invoiceRef: null, deduction: null, promisedDates: [] };
const paid = (amount: number | null, invoiceRef: string | null): Expected => ({ ...none, intent: "paid_claim", amount, invoiceRef });
const promise = (invoiceRef: string | null, promisedDates: string[]): Expected => ({ ...none, intent: "promise_to_pay", invoiceRef, promisedDates });
const deducted = (amount: number | null, invoiceRef: string | null, deduction: Expected["deduction"]): Expected => ({
  ...none,
  intent: "dispute_or_deduction",
  amount,
  invoiceRef,
  deduction,
});

export const EVAL_SET: EvalItem[] = [
  /* ---------- paid in full ---------- */
  { id: "b01", lang: "manglish", now: FRI, image: null, text: "Hi kak, INV-2412 dah bank in RM2,770 tadi ya", expected: paid(rm(2770), "INV-2412") },
  { id: "b02", lang: "bm", now: TUE, image: null, text: "Dah bank in", expected: paid(null, null), note: "claim with no amount or invoice" },
  { id: "b03", lang: "en", now: FRI, image: null, text: "Payment of 2770 for invoice 2415 made today via Bank Cempaka.", expected: paid(rm(2770), "2415"), note: "bare number, no RM" },
  { id: "b04", lang: "manglish", now: FRI, image: null, text: "Boss, transfer RM 2.7k for INV2418 already, pls check", expected: paid(rm(2700), "INV2418"), note: "k shorthand" },
  { id: "b05", lang: "en", now: MON, image: null, text: "Hi, rm2770.00 paid to your Bank Cempaka account for Inv No. 2421. Thanks", expected: paid(rm(2770), "2421") },
  { id: "b06", lang: "zh", now: FRI, image: null, text: "老板，INV-2425 的两千七百七十已经转了，请查收", expected: paid(rm(2770), "INV-2425"), note: "amount in Chinese numerals" },
  { id: "b07", lang: "zh", now: TUE, image: null, text: "已经转了", expected: paid(null, null), note: "claim with no amount or invoice" },

  /* ---------- the three seeded demo messages ---------- */
  {
    id: "b08",
    lang: "mixed",
    now: "2026-10-20T11:02",
    image: null,
    text: "老板，那张发票我们下礼拜五才过数，sorry ah",
    expected: promise(null, ["2026-10-23", "2026-10-30"]),
    note: "seeded demo message m-hupseng; 下礼拜五 can mean either Friday",
  },
  {
    id: "b09",
    lang: "manglish",
    now: "2026-10-23T14:30",
    image: "/slips/bank-cempaka-inv2304.png",
    text: "Hi kak, payment for INV-2304 done ya. Bank in RM2,770 just now, deduct RM330 for the 2 pallet tiles pecah at Bukit Raja. Slip attached",
    expected: deducted(rm(2770), "INV-2304", { amount: rm(330), reason: "2 pallet tiles pecah at Bukit Raja" }),
    note: "seeded demo message m-megabina, with the fictional Bank Cempaka slip",
  },
  { id: "b10", lang: "bm", now: "2026-10-23T15:00", image: null, text: "Dah settle la semalam", expected: paid(null, null), note: "seeded demo message m-kilang" },

  /* ---------- paid in full, continued ---------- */
  { id: "b31", lang: "zh", now: FRI, image: null, text: "发票 INV-2470 三千块已经付清了", expected: paid(rm(3000), "INV-2470"), note: "三千块" },
  { id: "b32", lang: "manglish", now: FRI, image: null, text: "Settle liao boss, INV-2472 RM3k transfer just now", expected: paid(rm(3000), "INV-2472") },
  {
    id: "b33",
    lang: "bm",
    now: MON,
    image: null,
    text: "Saya dah bank in seribu lima ratus ringgit untuk invois 2475 pagi tadi",
    expected: paid(rm(1500), "2475"),
    note: "amount in Malay words",
  },
  {
    id: "b34",
    lang: "en",
    now: MON,
    image: null,
    text: "Transferred RM1,250.50 for #2478 via Bank Cempaka, ref 2478",
    expected: paid(rm(1250.5), "#2478"),
    note: "sen in the amount; hash-style invoice ref",
  },
  {
    id: "b35",
    lang: "mixed",
    now: THU,
    image: null,
    text: "Hi boss, INV-2480 paid already 全数 RM5,600, slip later send you",
    expected: paid(rm(5600), "INV-2480"),
  },
  {
    id: "b25",
    lang: "bm",
    now: MON,
    image: null,
    text: "Ada 2 invois, INV-2462 RM900 dan INV-2463 RM1,100, kami bank in RM2,000 sekali gus",
    expected: paid(rm(2000), "INV-2462"),
    unscored: ["invoice_ref"],
    note: "three amounts; the transfer is the RM2,000; two invoices, so the single ref is not scored",
  },

  /* ---------- promise to pay ---------- */
  {
    id: "b11",
    lang: "manglish",
    now: TUE,
    image: null,
    text: "Sorry boss, cash flow tight this week. Will pay INV-2430 next Friday ya",
    expected: promise("INV-2430", ["2026-10-23", "2026-10-30"]),
  },
  { id: "b12", lang: "bm", now: TUE, image: null, text: "Puan, kami akan bayar invois 2433 Jumaat depan", expected: promise("2433", ["2026-10-23", "2026-10-30"]) },
  {
    id: "b13",
    lang: "bm",
    now: TUE,
    image: null,
    text: "Insya-Allah hujung bulan kami settle semua ya",
    expected: promise(null, []),
    unscored: ["promised_date"],
    note: "hujung bulan is not one calendar date",
  },
  { id: "b14", lang: "manglish", now: TUE, image: null, text: "Tomorrow I bank in for INV-2436 ok", expected: promise("INV-2436", ["2026-10-21"]) },
  { id: "b15", lang: "bm", now: TUE, image: null, text: "Lusa saya transfer untuk INV-2438 ya", expected: promise("INV-2438", ["2026-10-22"]), note: "lusa = the day after tomorrow" },
  { id: "b16", lang: "zh", now: TUE, image: null, text: "明天下午转账，发票 2440", expected: promise("2440", ["2026-10-21"]) },
  { id: "b17", lang: "en", now: TUE, image: null, text: "We will pay INV-2442 on 30 Oct.", expected: promise("INV-2442", ["2026-10-30"]) },
  {
    id: "b18",
    lang: "manglish",
    now: FRI,
    image: null,
    text: "Monday I settle INV-2445 can? Today bank system down",
    expected: promise("INV-2445", ["2026-10-26"]),
    note: "said on a Friday, so the coming Monday",
  },
  {
    id: "b36",
    lang: "mixed",
    now: THU,
    image: null,
    text: "Payment INV-2482 nanti Isnin depan ya, sebab boss outstation",
    expected: promise("INV-2482", ["2026-11-02", "2026-11-09"]),
    note: "Isnin depan can mean either Monday",
  },
  { id: "b37", lang: "zh", now: THU, image: null, text: "下个月五号还清，INV-2485", expected: promise("INV-2485", ["2026-11-05"]) },

  /* ---------- deductions and disputes ---------- */
  {
    id: "b19",
    lang: "en",
    now: TUE,
    image: null,
    text: "INV-2448 total RM3,450 but we bank in RM3,200 only, less RM250 for the late delivery penalty our client charged us",
    expected: deducted(rm(3200), "INV-2448", { amount: rm(250), reason: "late delivery penalty" }),
    note: "three amounts: invoice total, payment, deduction",
  },
  {
    id: "b20",
    lang: "bm",
    now: FRI,
    image: null,
    text: "Dah transfer RM1,850 untuk INV-2451. Tolak RM150 sebab 3 karton pecah masa sampai Shah Alam",
    expected: deducted(rm(1850), "INV-2451", { amount: rm(150), reason: "3 karton pecah" }),
  },
  {
    id: "b21",
    lang: "zh",
    now: FRI,
    image: null,
    text: "INV-2453 已转RM980，扣了RM120，因为有两箱湿了",
    expected: deducted(rm(980), "INV-2453", { amount: rm(120), reason: "两箱湿了" }),
  },
  {
    id: "b22",
    lang: "manglish",
    now: MON,
    image: null,
    text: "kak, bank in 2,400 for INV-2455, potong RM80 for the pallet hilang at Klang",
    expected: deducted(rm(2400), "INV-2455", { amount: rm(80), reason: "pallet hilang" }),
  },
  {
    id: "b39",
    lang: "mixed",
    now: FRI,
    image: null,
    text: "INV-2488 我们 bank in 了 RM2,150, tapi kurang RM50 sebab tol charges tak setuju",
    expected: deducted(rm(2150), "INV-2488", { amount: rm(50), reason: "tol charges" }),
  },
  {
    id: "b26",
    lang: "en",
    now: TUE,
    image: null,
    text: "Your invoice INV-2465 says RM4,500 but the agreed quote was RM4,200. Please check and resend.",
    expected: deducted(null, "INV-2465", null),
    note: "a dispute with two amounts and no payment",
  },

  /* ---------- part payment ---------- */
  {
    id: "b23",
    lang: "manglish",
    now: FRI,
    image: null,
    text: "Bank in RM1,000 dulu for INV-2458, balance hujung bulan ya",
    expected: { ...none, intent: "partial_payment", amount: rm(1000), invoiceRef: "INV-2458" },
    unscored: ["promised_date"],
  },
  {
    id: "b24",
    lang: "en",
    now: MON,
    image: null,
    text: "Paid RM1,800 today for INV-2460, the other RM1,800 will follow next week",
    expected: { ...none, intent: "partial_payment", amount: rm(1800), invoiceRef: "INV-2460" },
    unscored: ["promised_date"],
    note: "next week is not one calendar date",
  },
  {
    id: "b40",
    lang: "en",
    now: TUE,
    image: null,
    text: "Hi, we have paid half of INV-2490 (RM1,600). Remaining RM1,600 on 30 Oct.",
    expected: { ...none, intent: "partial_payment", amount: rm(1600), invoiceRef: "INV-2490", promisedDates: ["2026-10-30"] },
  },

  /* ---------- no payment content ---------- */
  { id: "b27", lang: "manglish", now: TUE, image: null, text: "Boss, lorry esok pukul berapa sampai Pasir Gudang?", expected: none },
  { id: "b28", lang: "en", now: TUE, image: null, text: "Thanks for the reminder, will check with our accounts team and revert.", expected: none, note: "no promise and no date" },
  { id: "b29", lang: "zh", now: MON, image: null, text: "你好，可以重新发一次发票吗？PDF 打不开", expected: none },
  { id: "b30", lang: "bm", now: TUE, image: null, text: "Boleh hantar semula invois bulan lepas? Saya tak jumpa", expected: none },
  { id: "b38", lang: "bm", now: FRI, image: null, text: "Ok noted kak, terima kasih", expected: none },
];
