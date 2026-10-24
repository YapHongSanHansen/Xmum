// PRD §8 business rules, checked against the §8 seed checks and §14 data.
import { describe, expect, it } from "vitest";
import { invoiceOf, type State, type Tier } from "./model";
import {
  cashNow,
  chasePlan,
  creditExposure,
  forecast,
  gapImpact,
  inQuietHours,
  isExpectedInflow,
  linkDeduction,
  needsCreditCheck,
  payBy,
  payerMatches,
  payRate,
  quoteIsVerbatim,
  renderReminder,
  resolveInvoice,
  waShareLink,
} from "./rules";
import { run } from "./reducer";
import { seedState } from "./seed";
import { CACHED_EXTRACTIONS } from "./cached";
import { RM, draft, playDemo, scanned, withExtraction } from "./testkit";

const rowOf = (s: State, id: string) => chasePlan(s).find((r) => r.invoice.id === id);

describe("F1 forecast", () => {
  it("seed on Tue 20 Oct: 31 Oct salaries −2,000, 5 Nov diesel −13,200", () => {
    const fc = forecast(seedState());
    expect(fc.map((f) => [f.short, f.dueDate, RM(f.forecast), RM(f.gap), f.daysAway])).toEqual([
      ["salaries", "2026-10-31", -2000, 2000, 11],
      ["diesel", "2026-11-05", -13200, 13200, 16],
    ]);
  });

  it("is 9,800 cash + 12,700 expected inflows (Sinar 7,500 + Gudang 5,200) − outflows", () => {
    const s = seedState();
    expect(RM(cashNow(s))).toBe(9800);
    const counted = s.invoices.filter((i) => isExpectedInflow(s, i) && i.dueDate <= "2026-11-05");
    expect(counted.map((i) => i.id)).toEqual(["INV-2331", "INV-2335"]);
    expect(RM(counted.reduce((n, i) => n + i.amount, 0))).toBe(12700);
  });

  it("does not count overdue invoices, promises, or customers below 80% on time", () => {
    const s = seedState();
    expect(isExpectedInflow(s, invoiceOf(s, "INV-2296"))).toBe(false); // Pelita: overdue, has a promise
    expect(isExpectedInflow(s, invoiceOf(s, "INV-2340"))).toBe(false); // Mega Bina: not on time
    const later = draft(s);
    later.now = "2026-10-28T08:00";
    expect(isExpectedInflow(later, invoiceOf(later, "INV-2331"))).toBe(false); // Sinar, due 27 Oct, now overdue
  });

  it("needs at least 3 past invoices for the on-time rate", () => {
    const s = draft(seedState());
    s.customers.find((c) => c.id === "c-sinar")!.history.splice(2);
    expect(isExpectedInflow(s, invoiceOf(s, "INV-2331"))).toBe(false);
  });

  it("after the RM2,770 receipt is approved on 23 Oct: +770 (31 Oct), −10,430 (5 Nov)", () => {
    const { verified, receiptApproved } = playDemo();
    expect(forecast(verified).map((f) => RM(f.forecast))).toEqual([-2000, -13200]);
    expect(RM(cashNow(receiptApproved))).toBe(12570);
    expect(forecast(receiptApproved).map((f) => RM(f.forecast))).toEqual([770, -10430]);
  });

  it("ignores outflows beyond the 30-day horizon", () => {
    const s = draft(seedState());
    s.outflows.push({ id: "o-far", label: "Far", short: "far", amount: 100, dueDate: "2026-11-20" });
    expect(forecast(s).map((f) => f.short)).toEqual(["salaries", "diesel"]);
  });
});

describe("G1 gap impact and pay-by", () => {
  it("Hup Seng on 20 Oct: pay-by 30 Oct; 31 Oct −2,000 → +4,850; 5 Nov −13,200 → −6,350", () => {
    const s = scanned();
    expect(payBy(s)).toBe("2026-10-30");
    const g = gapImpact(s, invoiceOf(s, "INV-2268"));
    expect(g.map((x) => [x.short, RM(x.before), RM(x.after)])).toEqual([
      ["salaries", -2000, 4850],
      ["diesel", -13200, -6350],
    ]);
  });

  it("pay-by is never earlier than today + 3, and does not help an outflow due before it", () => {
    const s = draft(seedState());
    s.now = "2026-10-29T09:00"; // salaries 31 Oct is 2 days away
    expect(payBy(s)).toBe("2026-11-01");
    const g = gapImpact(s, invoiceOf(s, "INV-2268"));
    expect(g[0].short).toBe("salaries");
    expect(g[0].after).toBe(g[0].before);
    expect(g[1].after - g[1].before).toBe(685000);
  });

  it("with no shortfall, pay-by is today + 7", () => {
    const s = draft(seedState());
    s.bankBalance.amount = 10_000_000;
    expect(payBy(s)).toBe("2026-10-27");
  });

  it("the Clerk's yes/no comes from closesGap: Mega Bina helps cover the next bill", () => {
    expect(rowOf(scanned(), "INV-2304")!.closesGap).toBe(true);
  });
});

describe("R1 tier", () => {
  it("seed: Mega Bina T1 (18 late), Kilang T1 (8 late), Hup Seng T2 (45 late)", () => {
    const plan = chasePlan(scanned());
    const remind = plan.filter((r) => r.state === "remind");
    expect(remind.map((r) => [r.invoice.number, r.customer.id, r.tier, r.daysLate])).toEqual([
      ["INV-2304", "c-megabina", 1, 18],
      ["INV-2310", "c-kilang", 1, 8],
      ["INV-2268", "c-hupseng", 2, 45],
    ]);
  });

  const withReminders = (tiers: Tier[], answered = false) => {
    const s = draft(scanned());
    // Hup Seng INV-2268, 45 days late; reminders a week apart ending 13 Oct.
    invoiceOf(s, "INV-2268").reminders = tiers.map((tier, i) => ({
      tier,
      at: ["2026-09-15T10:00", "2026-09-22T10:00", "2026-09-29T10:00", "2026-10-06T10:00"][i],
      answered,
      by: "Nurul",
      text: "",
      status: "sent" as const,
    }));
    return rowOf(s, "INV-2268")!;
  };

  it("follows the fixed sequence Tier 1, Tier 1 again, Tier 2, Tier 3", () => {
    expect(withReminders([]).tier).toBe(1);
    expect(withReminders([1]).tier).toBe(1);
    expect(withReminders([1, 1]).tier).toBe(2);
    const t3 = withReminders([1, 1, 2]);
    expect([t3.tier, t3.state]).toEqual([3, "escalate"]);
    expect(t3.reason).toMatch(/owner decides/);
  });

  it("a Tier 0 courtesy note does not count as a step of the sequence", () => {
    expect(withReminders([0]).tier).toBe(1);
    expect(withReminders([0, 1]).tier).toBe(1);
    expect(withReminders([0, 1, 1]).tier).toBe(2);
  });

  it("waits 7 days for a reply to the previous reminder", () => {
    const s = draft(scanned());
    const inv = invoiceOf(s, "INV-2268");
    inv.reminders.push({ tier: 2, at: "2026-10-14T10:00", answered: false, by: "Lim Siew Lan", text: "", status: "sent" });
    const waiting = rowOf(s, "INV-2268")!;
    expect([waiting.state, waiting.rule, waiting.tier]).toEqual(["waiting", "R1", null]);
    expect(waiting.reason).toBe("last reminder 14 Oct, waiting 7 days for a reply");
    s.now = "2026-10-21T08:00"; // 7 days later
    expect(rowOf(s, "INV-2268")!.state).toBe("escalate");
  });

  it("waits at its step until the tier's day gate (Tier 3 from D+30)", () => {
    const s = draft(scanned());
    const inv = invoiceOf(s, "INV-2310");
    inv.dueDate = "2026-09-28"; // 20 Oct is D+22
    inv.reminders = [
      { tier: 1, at: "2026-09-29T10:00", answered: false, by: "Nurul", text: "", status: "sent" },
      { tier: 1, at: "2026-10-06T10:00", answered: false, by: "Nurul", text: "", status: "sent" },
      { tier: 2, at: "2026-10-13T10:00", answered: false, by: "Lim Siew Lan", text: "", status: "sent" },
    ];
    const row = rowOf(s, "INV-2310")!;
    expect([row.state, row.reason]).toEqual(["waiting", "Tier 3 allowed from D+30"]);
    s.now = "2026-10-28T08:00"; // D+30
    expect(rowOf(s, "INV-2310")!.state).toBe("escalate");
  });

  it("waits for the Tier 2 gate (D+14) when earlier reminders were answered", () => {
    const s = draft(scanned());
    const inv = invoiceOf(s, "INV-2310"); // due 12 Oct, D+8 on 20 Oct
    inv.reminders = [
      { tier: 1, at: "2026-10-13T10:00", answered: true, by: "Nurul", text: "", status: "sent" },
      { tier: 1, at: "2026-10-14T10:00", answered: true, by: "Nurul", text: "", status: "sent" },
    ];
    expect(rowOf(s, "INV-2310")!.reason).toBe("Tier 2 allowed from D+14");
    s.now = "2026-10-26T08:00"; // D+14
    const row = rowOf(s, "INV-2310")!;
    expect([row.state, row.tier]).toEqual(["remind", 2]);
  });

  it("every plan row carries a rule ID and a reason (FR-C4)", () => {
    for (const s of Object.values(playDemo())) {
      for (const r of chasePlan(s)) {
        expect(r.rule).toMatch(/^(R1|R2|R3|R5)$/);
        expect(r.reason.length).toBeGreaterThan(0);
      }
    }
  });

  // PRD R1 allows Tier 0 from D-3; the engine's chasePlan lists overdue invoices only. See report.
  it.todo("R1 Tier 0 courtesy reminder from D-3 for invoices not yet due");
});

describe("R2 suppress", () => {
  it("Pelita is skipped with 'promise 30 Oct not reached' (FR-C2)", () => {
    const r = rowOf(scanned(), "INV-2296")!;
    expect([r.state, r.rule, r.reason]).toEqual(["skipped", "R2", "promise 30 Oct not reached"]);
  });

  it("a promise stops suppressing the day after the promised date", () => {
    const s = draft(scanned());
    s.now = "2026-10-30T08:00";
    expect(rowOf(s, "INV-2296")!.state).toBe("skipped");
    s.now = "2026-10-31T08:00";
    expect(rowOf(s, "INV-2296")!.state).toBe("remind");
  });

  it("skips a customer sent any reminder in the last 5 days", () => {
    const { approved } = playDemo();
    const s = draft(approved);
    s.now = "2026-10-21T08:00";
    const r = rowOf(s, "INV-2304")!;
    expect([r.state, r.rule, r.reason]).toEqual(["skipped", "R2", "reminder sent 20 Oct, under 5 days ago"]);
    s.now = "2026-10-25T08:00"; // 5 days later: R2 no longer applies, R1 still waits 7 days
    expect(rowOf(s, "INV-2304")!.state).toBe("waiting");
    s.now = "2026-10-27T08:00";
    expect(rowOf(s, "INV-2304")!.state).toBe("remind");
  });

  it("a reminder on one invoice suppresses the customer's other overdue invoices the same day", () => {
    let s = draft(scanned());
    invoiceOf(s, "INV-2340").dueDate = "2026-10-10"; // a second overdue Mega Bina invoice
    expect(rowOf(s, "INV-2340")!.state).toBe("remind");
    invoiceOf(s, "INV-2304").reminders.push({ tier: 1, at: s.now, answered: false, by: "Nurul", text: "", status: "sent" });
    s = draft(s);
    expect(rowOf(s, "INV-2304")!.state).toBe("sent_today");
    const other = rowOf(s, "INV-2340")!;
    expect([other.state, other.reason]).toEqual(["skipped", "reminder sent 20 Oct, under 5 days ago"]);
  });

  it("skips an invoice with an open claim (M5)", () => {
    const { kilangRead } = playDemo();
    const r = rowOf(kilangRead, "INV-2310")!;
    expect([r.state, r.rule, r.reason]).toEqual(["skipped", "R2", "customer says paid; waiting for bank check"]);
  });

  it("skips a disputed invoice", () => {
    const s = draft(scanned());
    invoiceOf(s, "INV-2304").status = "disputed";
    const r = rowOf(s, "INV-2304")!;
    expect([r.state, r.rule, r.reason]).toEqual(["skipped", "R2", "invoice disputed"]);
  });

  it("skips an invoice with a payment logged in the last 2 days", () => {
    const { receiptApproved } = playDemo();
    const s = run(receiptApproved, [
      { type: "SET_ROLE", role: "owner" },
      { type: "DECIDE_DEDUCTION", receiptId: receiptApproved.receipts[0].id, decision: "rejected" },
    ]);
    expect(invoiceOf(s, "INV-2304").status).toBe("part_paid");
    expect(rowOf(s, "INV-2304")!.reason).toBe("payment received 23 Oct, under 2 days ago");
  });

  it("explains a verified claim or a deduction under review", () => {
    const { verified, receiptApproved } = playDemo();
    expect(rowOf(verified, "INV-2304")!.reason).toBe("payment verified; receipt awaiting approval");
    expect(rowOf(receiptApproved, "INV-2304")!.reason).toBe("RM330 deduction under review");
  });
});

describe("R3 priority", () => {
  it("20 Oct, N = 11: Mega Bina 2,790 (closes the gap), Kilang 2,520, Hup Seng 2,055", () => {
    const remind = chasePlan(scanned()).filter((r) => r.state === "remind");
    expect(remind.map((r) => [r.invoice.number, r.p, RM(r.expected), r.rank, r.closesGap])).toEqual([
      ["INV-2304", 0.9, 2790, 1, true],
      ["INV-2310", 0.6, 2520, 2, false],
      ["INV-2268", 0.3, 2055, 3, false],
    ]);
    expect(remind[0].reason).toBe("90% of past invoices paid within 11 days of a Tier 1 reminder · closes the salaries gap");
    expect(remind[1].reason).toBe("60% of past invoices paid within 11 days of a Tier 1 reminder");
    expect(remind.every((r) => r.rule === "R3")).toBe(true);
  });

  it("p = 0.5 when the customer has fewer than 3 data points at that tier", () => {
    const c = draft(seedState()).customers.find((x) => x.id === "c-megabina")!;
    expect(payRate(c, 1, 11)).toBe(0.9);
    c.history.splice(2);
    expect(payRate(c, 1, 11)).toBe(0.5);
    expect(payRate(c, 2, 11)).toBe(0.5); // no Tier 2 history at all
  });

  it("marks the smallest leading set that covers the gap ('helps close' when one is not enough)", () => {
    const s = draft(seedState());
    s.bankBalance.amount -= 100000; // gap 3,000 > Mega Bina's 2,790
    const remind = chasePlan(s).filter((r) => r.state === "remind");
    expect(remind.map((r) => r.closesGap)).toEqual([true, true, false]);
    expect(remind[0].reason).toMatch(/helps close the salaries gap$/);
  });

  it("breaks ties by days overdue, then amount", () => {
    const s = draft(seedState());
    invoiceOf(s, "INV-2310").amount = 465000; // 4,650 × 0.6 = 2,790, same as Mega Bina
    const remind = chasePlan(s).filter((r) => r.state === "remind");
    expect(remind.slice(0, 2).map((r) => [r.invoice.number, RM(r.expected), r.daysLate])).toEqual([
      ["INV-2304", 2790, 18],
      ["INV-2310", 2790, 8],
    ]);
  });
});

describe("R4 credit check", () => {
  it("Hup Seng on 21 Oct: RM6,850 owed, 46 days late, promise 30 Oct", () => {
    const { promised } = playDemo();
    const s = draft(promised);
    s.now = "2026-10-21T10:20";
    const e = creditExposure(s, "c-hupseng");
    expect([RM(e.owed), e.worstInvoice?.number, e.worstDays, e.promise]).toEqual([6850, "INV-2268", 46, "2026-10-30"]);
    expect(needsCreditCheck(s, "c-hupseng")).toBe(true);
  });

  it("a customer under 30 days late is not checked", () => {
    const s = draft(seedState());
    s.now = "2026-10-21T10:20";
    expect(creditExposure(s, "c-megabina").worstDays).toBe(19);
    expect(needsCreditCheck(s, "c-megabina")).toBe(false);
    expect(needsCreditCheck(s, "c-sinar")).toBe(false); // nothing overdue
  });
});

describe("R5 templates", () => {
  const s = scanned();
  const noBraces = (t: string) => expect(t).not.toMatch(/[{}]/);

  it("Tier 1 EN (Mega Bina) has contact, invoice, amount, due date and sender", () => {
    const t = renderReminder(s, invoiceOf(s, "INV-2304"), 1, "Nurul");
    expect(t).toBe(
      "Hi Jessie, Nurul from Lori Laju Logistics here. Friendly reminder ya, INV-2304 (RM3,100) for Shah Alam → Bukit Raja was due on 2 Oct. Can help check with your accounts? Thank you!",
    );
  });

  it("Tier 1 BM (Kilang) is in Malay", () => {
    const t = renderReminder(s, invoiceOf(s, "INV-2310"), 1, "Nurul");
    for (const part of ["Salam Encik Razak", "Nurul", "INV-2310", "RM4,200", "12 Oct", "Peringatan mesra"]) expect(t).toContain(part);
    noBraces(t);
  });

  it("Tier 2 ZH (Hup Seng) is in Chinese with days late, pay-by 30 Oct, and offers a statement", () => {
    const t = renderReminder(s, invoiceOf(s, "INV-2268"), 2, "Lim Siew Lan");
    for (const part of ["李老板您好", "Lim Siew Lan", "INV-2268", "RM6,850", "逾期45天", "10月30日", "对账单"]) expect(t).toContain(part);
    noBraces(t);
  });

  it("Tier 2 offers a statement instead of claiming one is attached", () => {
    const t = renderReminder(s, invoiceOf(s, "INV-2304"), 2, "Lim Siew Lan");
    expect(t).toContain("Reply if you need a statement");
    expect(t).toContain("by 30 Oct");
    expect(t).not.toMatch(/attach/i);
  });

  it("every tier and language renders with no merge field left", () => {
    for (const inv of s.invoices) for (const tier of [0, 1, 2] as const) noBraces(renderReminder(s, inv, tier, "Nurul"));
  });

  it("wa.me link carries the encoded text", () => {
    expect(waShareLink("Hi Jessie & co")).toBe("https://wa.me/?text=Hi%20Jessie%20%26%20co");
  });
});

describe("S1 quiet hours", () => {
  it("are 21:00 to 08:00, with 08:00 itself not quiet", () => {
    expect(["21:00", "22:00", "23:59", "00:00", "07:59"].every((t) => inQuietHours(`2026-10-20T${t}`))).toBe(true);
    expect(["08:00", "12:00", "20:59"].some((t) => inQuietHours(`2026-10-20T${t}`))).toBe(false);
  });
});

describe("Bukti helpers (FR-E3, M1-M3)", () => {
  const text = seedState().messages.find((m) => m.id === "m-megabina")!.text;

  it("verbatim gate accepts exact substrings (whitespace-normalised) only", () => {
    expect(quoteIsVerbatim("RM2,770", text)).toBe(true);
    expect(quoteIsVerbatim("deduct  RM330 for the\n2 pallet tiles", text)).toBe(true);
    expect(quoteIsVerbatim("RM2,700", text)).toBe(false);
    expect(quoteIsVerbatim("rm2,770", text)).toBe(false);
    expect(quoteIsVerbatim("", text)).toBe(false);
    expect(quoteIsVerbatim(null, text)).toBe(false);
    expect(quoteIsVerbatim("下礼拜五才过数", "老板，那张发票我们下礼拜五才过数，sorry ah")).toBe(true);
  });

  it("payer match: a significant word of the name, or the invoice number", () => {
    const s = seedState();
    const mega = s.customers.find((c) => c.id === "c-megabina")!;
    expect(payerMatches("DUITNOW CR MEGA BINA HARDW INV2304", mega, null)).toBe(true);
    expect(payerMatches("DUITNOW CR SOMEONE INV2304", mega, invoiceOf(s, "INV-2304"))).toBe(true);
    expect(payerMatches("IBG CR TOKO MAJU ENT 0919", mega, invoiceOf(s, "INV-2304"))).toBe(false);
    expect(payerMatches("IBG CR SDN BHD TRADING", mega, null)).toBe(false); // stopwords only
  });

  it("M2: by reference, else by amount (with or without the stated deduction)", () => {
    const s = scanned();
    expect(resolveInvoice(s, "c-megabina", CACHED_EXTRACTIONS["m-megabina"])?.id).toBe("INV-2304");
    const noRef = withExtraction("m-megabina", { invoice_ref: null });
    expect(resolveInvoice(s, "c-megabina", noRef)?.id).toBe("INV-2304"); // 2,770 + 330 = 3,100
    expect(resolveInvoice(s, "c-megabina", { ...noRef, amount: 3100, deduction_amount: null })?.id).toBe("INV-2304");
  });

  it("M3: the deduction links to DO-8812 by destination or DO number", () => {
    const inv = invoiceOf(seedState(), "INV-2304");
    expect(linkDeduction("2 pallet tiles pecah at Bukit Raja", inv)).toBe("DO-8812");
    expect(linkDeduction("damaged on do-8812", inv)).toBe("DO-8812");
    expect(linkDeduction("late delivery", inv)).toBeNull();
  });
});
