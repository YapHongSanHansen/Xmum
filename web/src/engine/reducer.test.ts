// apply(): permissions (§9.3), clock (FR-H1), log (FR-G1/G2), R4/R6/S1 actions and Bukti (FR-E*).
import { describe, expect, it } from "vitest";
import { invoiceOf, type State } from "./model";
import { apply, run, warningOptions, type Action } from "./reducer";
import { chasePlan, forecast, visibleBankLines, visibleMessages } from "./rules";
import { seedState } from "./seed";
import { RM, act, addMessage, advance, as, draft, extract, playDemo, refused, scanned, withExtraction } from "./testkit";

const texts = (s: State, actor?: string) => s.log.filter((l) => !actor || l.actor === actor).map((l) => l.text);
const lastLog = (s: State) => s.log.at(-1)!;

describe("RESET (FR-A7)", () => {
  it("returns the seed from any state", () => {
    const { final } = playDemo();
    expect(apply(final, { type: "RESET" }).state).toEqual(seedState());
  });
});

describe("permissions (§9.3)", () => {
  /** Each case: a state where the action is valid, and the action. */
  const owned: [string, () => [State, Action]][] = [
    ["act on an early warning", () => {
      const s = scanned();
      return [s, { type: "CHOOSE_WARNING_OPTION", warningId: s.warnings[0].id, option: warningOptions(s, "o-salaries")[0] }];
    }],
    ["approve a Tier 2 reminder", () => [scanned(), { type: "APPROVE_REMINDER", invoiceId: "INV-2268", text: "x", edited: false }]],
    ["decide a Tier 3 escalation", () => [scanned(), { type: "ESCALATION_DECISION", invoiceId: "INV-2268", decision: "call" }]],
    ["decide a credit check", () => {
      const s = playDemo().credit;
      const t = act(act(s, as("clerk")), { type: "ENTER_BOOKING", customerId: "c-hupseng", route: "Klang → Ipoh", amount: 100000, terms: "credit", creditDays: 30 });
      return [act(t, as("owner")), { type: "DECIDE_CREDIT", bookingId: t.bookings[1].id, decision: "cod" }];
    }],
    ["accept a deduction", () => {
      const s = playDemo().receiptApproved;
      return [s, { type: "DECIDE_DEDUCTION", receiptId: s.receipts[0].id, decision: "accepted" }];
    }],
    ["reject a deduction", () => {
      const s = playDemo().receiptApproved;
      return [s, { type: "DECIDE_DEDUCTION", receiptId: s.receipts[0].id, decision: "rejected" }];
    }],
    ["mark paid without a bank line", () => {
      const s = playDemo().kilangRead;
      return [s, { type: "RESOLVE_HANDOFF", handoffId: s.handoffs.find((h) => h.kind === "claim_unverified")!.id, option: "mark_paid_anyway" }];
    }],
  ];

  for (const [what, setup] of owned) {
    it(`Clerk cannot ${what}: {error}, state unchanged; Owner can`, () => {
      const [base, action] = setup();
      const clerk = act(base, as("clerk"));
      const r = apply(clerk, action);
      expect(r.error).toMatch(/Only the Owner/);
      expect(r.state).toBe(clerk);
      expect(r.state).toEqual(clerk);
      const owner = act(base, as("owner"));
      expect(apply(owner, action).error).toBeUndefined();
    });
  }

  const shared: [string, () => [State, Action]][] = [
    ["approve a Tier 1 reminder", () => [scanned(), { type: "APPROVE_REMINDER", invoiceId: "INV-2304", text: "x", edited: false }]],
    ["record an order", () => [scanned(), { type: "ENTER_BOOKING", customerId: "c-sinar", route: "Klang → Kajang", amount: 50000, terms: "credit", creditDays: 30 }]],
    ["approve a zero-difference VERIFIED receipt", () => {
      const s = playDemo().verified;
      return [s, { type: "APPROVE_RECEIPT", receiptId: s.receipts[0].id }];
    }],
    ["resolve a hand-off date", () => {
      const s = act(act(scanned(), advance("2026-10-20T11:05")), extract("m-hupseng"));
      return [s, { type: "RESOLVE_HANDOFF", handoffId: s.handoffs[0].id, option: "2026-10-30" }];
    }],
    ["send the templated slip request", () => {
      const s = playDemo().kilangRead;
      return [s, { type: "RESOLVE_HANDOFF", handoffId: s.handoffs.find((h) => h.kind === "claim_unverified")!.id, option: "send_reply" }];
    }],
  ];

  for (const [what, setup] of shared) {
    it(`Clerk and Owner can both ${what}`, () => {
      const [base, action] = setup();
      for (const role of ["clerk", "owner"] as const) expect(apply(act(base, as(role)), action).error).toBeUndefined();
    });
  }

  it("a receipt that does not match the invoice needs the Owner", () => {
    let s = act(scanned(), advance("2026-10-23T14:30"));
    s = act(s, extract("m-megabina", withExtraction("m-megabina", { deduction_quote: "deduct RM300" }))); // fabricated
    expect(s.receipts[0].deduction).toBeNull();
    const clerk = act(s, as("clerk"));
    expect(refused(clerk, { type: "APPROVE_RECEIPT", receiptId: s.receipts[0].id }).error).toMatch(/Only the Owner/);
    expect(apply(s, { type: "APPROVE_RECEIPT", receiptId: s.receipts[0].id }).error).toBeUndefined();
  });
});

describe("demo clock (FR-H1)", () => {
  it("cannot go backwards or stand still", () => {
    const s = scanned();
    for (const to of ["2026-10-19T09:00", "2026-10-20T07:59", "2026-10-20T08:00"]) {
      const r = refused(s, advance(to));
      expect(r.error).toBe("The demo clock only moves forward.");
      expect(r.state).toBe(s);
    }
  });

  it("from 21 Oct 10:20 to Fri 23 Oct 14:30: 22 and 23 Oct scans, then the 14:25 bank line, then the 14:30 reply", () => {
    const { credit } = playDemo();
    const s = act(credit, advance("2026-10-23T14:30"));
    const added = s.log.slice(credit.log.length);
    const keyed = added.filter((l) => l.actor !== "R2").map((l) => `${l.at} ${l.actor} ${l.text.split(":")[0]}`);
    expect(keyed).toEqual([
      "2026-10-22T08:00 SYSTEM scan",
      "2026-10-22T08:00 R6 early warning raised",
      "2026-10-23T08:00 SYSTEM scan",
      "2026-10-23T14:30 BANK line 23/10 DUITNOW CR 2,770.00 MEGA BINA HARDW INV2304 (14",
      "2026-10-23T14:30 INBOUND Mega Bina Hardware Trading Sdn Bhd message + slip (received 14",
    ]);
    expect(s.scannedDays).toEqual(["2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23"]);
  });

  it("advancing several days runs one scan per day crossed, in order", () => {
    const s = act(scanned(), advance("2026-10-26T09:00"));
    expect(s.scannedDays).toEqual(["2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23", "2026-10-24", "2026-10-25", "2026-10-26"]);
    const scans = s.log.filter((l) => l.actor === "SYSTEM" && l.text.startsWith("scan:")).map((l) => l.at);
    expect(scans).toEqual(["2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23", "2026-10-24", "2026-10-25", "2026-10-26"].map((d) => `${d}T08:00`));
  });

  it("stopping before 08:00 does not scan; the next advance runs that day's scan", () => {
    let s = act(scanned(), advance("2026-10-21T02:00"));
    expect(s.scannedDays).toEqual(["2026-10-20"]);
    s = act(s, advance("2026-10-21T09:00"));
    expect(s.scannedDays).toEqual(["2026-10-20", "2026-10-21"]);
  });

  it("arrivals are logged in time order, stamped with the demo time", () => {
    const s = act(scanned(), advance("2026-10-23T16:00"));
    const arr = s.log.filter((l) => l.kind === "BANK" || l.kind === "INBOUND");
    expect(arr.map((l) => [l.at, l.kind, l.refs?.[0]])).toEqual([
      ["2026-10-21T08:00", "INBOUND", "m-hupseng"], // arrived 11:02 on 20 Oct, logged at the next clock stop
      ["2026-10-23T16:00", "BANK", "bl-2304"],
      ["2026-10-23T16:00", "INBOUND", "m-megabina"],
      ["2026-10-23T16:00", "INBOUND", "m-kilang"],
    ]);
  });

  it("messages and bank lines are not visible before their time", () => {
    const s = act(scanned(), advance("2026-10-23T14:20"));
    expect(visibleMessages(s).map((m) => m.id)).toEqual(["m-hupseng"]);
    expect(visibleBankLines(s).map((b) => b.id)).toEqual(["bl-0919"]);
    const r = refused(s, extract("m-megabina"));
    expect(r.error).toBe("That message has not arrived yet.");
    expect(r.state).toBe(s);
    const later = act(s, advance("2026-10-23T14:25"));
    expect(visibleBankLines(later).map((b) => b.id)).toEqual(["bl-0919", "bl-2304"]);
    expect(visibleMessages(later).map((m) => m.id)).toEqual(["m-hupseng"]);
  });

  it("every action is stamped with the current demo time", () => {
    const { final } = playDemo();
    for (const l of final.log) expect(l.at <= final.now).toBe(true);
    const s = act(act(scanned(), advance("2026-10-20T09:15")), { type: "APPROVE_REMINDER", invoiceId: "INV-2304", text: "x", edited: true });
    expect(lastLog(s)).toMatchObject({ at: "2026-10-20T09:15", actor: "Lim Siew Lan", text: "approved Tier 1 INV-2304, sent (text edited)" });
    expect(invoiceOf(s, "INV-2304").reminders.at(-1)).toMatchObject({ at: "2026-10-20T09:15", text: "x", status: "sent" });
  });

  it("RUN_SCAN runs once per day", () => {
    expect(refused(scanned(), { type: "RUN_SCAN" }).error).toBe("Today's scan has already run.");
  });
});

describe("activity log (FR-G1, FR-G2)", () => {
  it("seq is strictly increasing from 1", () => {
    const { final } = playDemo();
    expect(final.log.map((l) => l.seq)).toEqual(final.log.map((_, i) => i + 1));
  });

  it("is append-only: later actions never change earlier entries or earlier states", () => {
    const run1 = playDemo();
    const states = [run1.approved, run1.promised, run1.credit, run1.verified, run1.receiptApproved, run1.deductionAccepted, run1.kilangRead, run1.final];
    const frozen = structuredClone(states);
    for (let i = 1; i < states.length; i++) expect(states[i].log.slice(0, states[i - 1].log.length)).toEqual(states[i - 1].log);
    // A second run on top of the same objects leaves them untouched (apply is pure).
    playDemo();
    act(run1.final, { type: "RESET" });
    expect(states).toEqual(frozen);
  });

  it("AI entries carry the model and refs; rule entries carry the rule ID", () => {
    const { final } = playDemo();
    const ai = final.log.filter((l) => l.kind === "AI");
    expect(ai).toHaveLength(3);
    for (const l of ai) {
      expect(l.model).toMatch(/^cached/);
      expect(l.refs?.length).toBeGreaterThan(0);
    }
    expect(ai[0].confidence).toBe(0.64);
    expect(ai[1].confidence).toBe(0.9);
    for (const l of final.log.filter((x) => x.kind === "RULE" && x.actor !== "FR-E3")) expect(l.rule).toBe(l.actor);
  });
});

describe("R6 early warning", () => {
  it("raises 31 Oct salaries on 20 Oct, 5 Nov diesel on 22 Oct (not before), and does not re-raise", () => {
    let s = scanned();
    expect(s.warnings.map((w) => [w.outflowId, RM(w.gap), w.raisedAt])).toEqual([["o-salaries", 2000, "2026-10-20T08:00"]]);
    s = act(s, advance("2026-10-21T08:00"));
    expect(s.warnings).toHaveLength(1);
    s = act(s, advance("2026-10-22T08:00"));
    expect(s.warnings.map((w) => [w.outflowId, RM(w.gap), w.raisedAt])).toEqual([
      ["o-salaries", 2000, "2026-10-20T08:00"],
      ["o-diesel", 13200, "2026-10-22T08:00"],
    ]);
    s = act(s, advance("2026-10-24T08:00"));
    expect(s.warnings).toHaveLength(2);
    expect(texts(s, "R6")).toEqual(["early warning raised: 31 Oct salaries short RM2,000", "early warning raised: 5 Nov diesel short RM13,200"]);
  });

  it("re-raises only when the gap grows by more than 10%", () => {
    const grow = (by: number) => {
      const s = draft(scanned());
      s.bankBalance.amount -= by;
      return act(s, advance("2026-10-21T08:00")).warnings.filter((w) => w.outflowId === "o-salaries");
    };
    expect(grow(20000)).toHaveLength(1); // 2,000 → 2,200: exactly 10%
    const w = grow(20100); // 2,000 → 2,201
    expect(w.map((x) => [RM(x.gap), x.raisedAt])).toEqual([[2000, "2026-10-20T08:00"], [2201, "2026-10-21T08:00"]]);
  });

  it("lists the owner's own levers and never names a lender; choices are logged", () => {
    const s = scanned();
    const opts = warningOptions(s, "o-salaries");
    expect(opts).toEqual([
      "Ask a regular customer to pay early",
      "Ask the diesel supplier to move the 5 Nov bill",
      "Hold new credit for customers 30+ days late",
      "Talk to my bank myself (note only)",
    ]);
    expect(opts.join(" ")).not.toMatch(/loan|lender|financ|overdraft|factoring|credit line/i);
    const t = act(s, { type: "CHOOSE_WARNING_OPTION", warningId: s.warnings[0].id, option: opts[1] });
    expect(t.warnings[0].chosen).toEqual([opts[1]]);
    expect(lastLog(t)).toMatchObject({ actor: "Lim Siew Lan", text: "early-warning option chosen: ask the diesel supplier to move the 5 Nov bill" });
  });
});

describe("S1 send window (FR-C7)", () => {
  it("approving at 22:00 queues the reminder; the next 08:00 scan releases it", () => {
    let s = act(scanned(), advance("2026-10-20T22:00"));
    expect(chasePlan(s).find((r) => r.invoice.id === "INV-2304")!.state).toBe("remind"); // quiet hours do not suppress
    s = run(s, [as("clerk"), { type: "APPROVE_REMINDER", invoiceId: "INV-2304", text: "x", edited: false }]);
    expect(invoiceOf(s, "INV-2304").reminders.at(-1)!.status).toBe("queued");
    expect(lastLog(s).text).toBe("approved Tier 1 INV-2304, queued until 08:00 (S1)");
    expect(chasePlan(s).find((r) => r.invoice.id === "INV-2304")!.reason).toBe("Tier 1 queued until 08:00 (S1)");
    s = act(s, advance("2026-10-21T07:59"));
    expect(invoiceOf(s, "INV-2304").reminders.at(-1)!.status).toBe("queued");
    s = act(s, advance("2026-10-21T09:00"));
    expect(invoiceOf(s, "INV-2304").reminders.at(-1)!.status).toBe("sent");
    const day21 = s.log.filter((l) => l.at === "2026-10-21T08:00").map((l) => `${l.actor}: ${l.text}`);
    expect(day21[0]).toBe("S1: released queued Tier 1 reminder for INV-2304");
    expect(day21[1]).toMatch(/^SYSTEM: scan:/);
  });

  it("a manual scan inside quiet hours does not release; the 08:00 boundary does", () => {
    let s = act(scanned(), advance("2026-10-20T22:00"));
    s = act(s, { type: "APPROVE_REMINDER", invoiceId: "INV-2304", text: "x", edited: false });
    s = act(s, advance("2026-10-21T06:00"));
    s = act(s, { type: "RUN_SCAN" });
    expect(invoiceOf(s, "INV-2304").reminders.at(-1)!.status).toBe("queued");
    s = act(s, advance("2026-10-21T08:30"));
    expect(invoiceOf(s, "INV-2304").reminders.at(-1)!.status).toBe("sent");
  });
});

describe("R4 credit check (actions)", () => {
  it("a Hup Seng credit booking goes ON HOLD with an owner card; COD and prepaid are not checked", () => {
    const { promised } = playDemo();
    const s = run(promised, [
      advance("2026-10-21T10:20"),
      { type: "ENTER_BOOKING", customerId: "c-hupseng", route: "Klang → Johor Bahru", amount: 240000, terms: "credit", creditDays: 60 },
      { type: "ENTER_BOOKING", customerId: "c-hupseng", route: "Klang → Johor Bahru", amount: 240000, terms: "cod", creditDays: 0 },
      { type: "ENTER_BOOKING", customerId: "c-hupseng", route: "Klang → Johor Bahru", amount: 240000, terms: "prepaid", creditDays: 0 },
      { type: "ENTER_BOOKING", customerId: "c-megabina", route: "Shah Alam → Puchong", amount: 120000, terms: "credit", creditDays: 30 },
    ]);
    expect(s.bookings.map((b) => [b.customerId, b.terms, b.status, b.checkInvoiceId, b.createdBy])).toEqual([
      ["c-hupseng", "credit", "on_hold", "INV-2268", "Nurul"],
      ["c-hupseng", "cod", "accepted", null, "Nurul"],
      ["c-hupseng", "prepaid", "accepted", null, "Nurul"],
      ["c-megabina", "credit", "accepted", null, "Nurul"],
    ]);
    expect(texts(s, "R4")).toEqual(["credit check raised: INV-2268 46 days late, total RM9,250"]);
  });

  it("the Owner's decision is stored on the order and logged; only an on-hold order can be decided", () => {
    const { credit } = playDemo();
    expect(credit.bookings[0]).toMatchObject({ status: "deposit_requested", depositPct: 50, decidedBy: "Lim Siew Lan" });
    expect(lastLog(credit).text).toBe("credit decision: ask 50% deposit");
    expect(refused(credit, { type: "DECIDE_CREDIT", bookingId: credit.bookings[0].id, decision: "cod" }).error).toBe("This booking is not on hold.");
  });
});

describe("Bukti", () => {
  const at1430 = () => act(scanned(), advance("2026-10-23T14:30"));

  it("FR-E2: the cached Mega Bina extraction yields amount, invoice, reference, deduction with quotes", () => {
    const s = act(at1430(), extract("m-megabina"));
    const rec = s.extractions["m-megabina"];
    expect(rec.rejectedQuotes).toEqual([]);
    expect(rec.extraction).toMatchObject({
      amount: 2770,
      invoice_ref: "INV-2304",
      bank_reference: "INV2304",
      deduction_amount: 330,
      deduction_reason: "2 pallet tiles pecah at Bukit Raja",
    });
    expect(rec.cached).toBe(true);
  });

  it("FR-E3: a fabricated quote drops the field, is logged, and goes to a person (M4)", () => {
    const fake = withExtraction("m-megabina", { amount: 2700, amount_quote: "RM2,700" });
    const s = act(at1430(), extract("m-megabina", fake));
    const rec = s.extractions["m-megabina"];
    expect(rec.rejectedQuotes).toEqual(['amount (quote "RM2,700")']);
    expect(rec.extraction.amount).toBeNull();
    expect(texts(s, "FR-E3")).toEqual(['verbatim gate dropped: amount (quote "RM2,700")']);
    expect(s.handoffs.some((h) => h.question.includes("the quoted words for the amount are not in the message"))).toBe(true);
    expect(s.log.find((l) => l.kind === "AI" && l.refs?.includes("m-megabina"))!.text).not.toContain("2,700");
  });

  it("M4: a payment field below 0.85 confidence goes to a person", () => {
    const low = withExtraction("m-megabina", { deduction_confidence: 0.6 });
    const s = act(at1430(), extract("m-megabina", low));
    const h = s.handoffs.find((x) => x.kind === "unmatched")!;
    expect(h.question).toBe("Check what Jessie said about INV-2304: the deduction is below 0.85 confidence.");
  });

  it("M1: with the bank line → VERIFIED and a receipt is proposed", () => {
    const s = act(at1430(), extract("m-megabina"));
    expect(texts(s, "M1")).toEqual(["claim VERIFIED against bank line"]);
    expect(s.receipts).toHaveLength(1);
    expect(s.receipts[0]).toMatchObject({ invoiceId: "INV-2304", amount: 277000, bankLineId: "bl-2304", status: "proposed" });
    expect(invoiceOf(s, "INV-2304").status).toBe("open");
  });

  it("M1: with the bank line removed → no PAID, no receipt, a claim_unverified hand-off", () => {
    const base = draft(scanned());
    base.bankLines = base.bankLines.filter((b) => b.id !== "bl-2304");
    const s = act(act(base, advance("2026-10-23T14:30")), extract("m-megabina"));
    expect(s.receipts).toEqual([]);
    expect(invoiceOf(s, "INV-2304")).toMatchObject({ status: "open", paid: 0, openClaimMessageId: "m-megabina" });
    expect(texts(s, "M1")).toEqual(["no bank line: claim not verified, not marked paid"]);
    const h = s.handoffs.find((x) => x.kind === "claim_unverified")!;
    expect(h).toMatchObject({ invoiceId: "INV-2304", options: ["send_reply", "mark_paid_anyway"] });
    expect(h.draftReply).toMatch(/^Thank you Jessie!.*slip/);
  });

  it("M1: a wrong payer or a line more than 3 days away does not verify", () => {
    for (const patch of [{ description: "IBG CR TOKO MAJU ENT 1023" }, { at: "2026-10-19T14:25" }]) {
      const base = draft(scanned());
      Object.assign(base.bankLines.find((b) => b.id === "bl-2304")!, patch);
      const s = act(act(base, advance("2026-10-23T14:30")), extract("m-megabina"));
      expect(s.receipts).toEqual([]);
    }
  });

  it("M2/M3: single invoice with the stated deduction, linked to DO-8812", () => {
    const s = act(at1430(), extract("m-megabina"));
    expect(s.receipts[0].deduction).toMatchObject({ amount: 33000, linkedDo: "DO-8812", status: "pending" });
    expect(texts(s, "M3")).toEqual(["deduction linked to DO-8812 (Bukit Raja)"]);
    expect(s.handoffs).toEqual([]); // exact match: nothing for a person
  });

  it("M4: '下礼拜五才过数' → 'Which Friday? 23 Oct / 30 Oct'; no promise until a person picks", () => {
    const s = act(act(scanned(), advance("2026-10-20T11:05")), extract("m-hupseng"));
    expect(s.handoffs).toHaveLength(1);
    expect(s.handoffs[0]).toMatchObject({ kind: "promise_date", invoiceId: "INV-2268", question: "Which Friday?", options: ["2026-10-23", "2026-10-30"] });
    expect(invoiceOf(s, "INV-2268").promise).toBeNull();
    expect(refused(s, { type: "RESOLVE_HANDOFF", handoffId: s.handoffs[0].id, option: "2026-10-24" }).error).toBe("Pick one of the offered dates.");
  });

  it("M4: a single confident, non-relative date sets the promise directly", () => {
    // Relative weekdays (下礼拜五) are always ambiguous; see review-fixes.test.ts.
    const one = withExtraction("m-hupseng", { promised_date_candidates: ["2026-10-30"], promised_date_confidence: 0.93, promised_date_quote: "才过数" });
    const s = act(act(scanned(), advance("2026-10-20T11:05")), extract("m-hupseng", one));
    expect(s.handoffs).toEqual([]);
    expect(invoiceOf(s, "INV-2268").promise).toEqual({ date: "2026-10-30", messageId: "m-hupseng" });
    expect(texts(s, "M5")).toEqual(["reminders paused for INV-2268 until 31 Oct"]);
  });

  it("M4: a single date below 0.85 confidence still asks a person", () => {
    const low = withExtraction("m-hupseng", { promised_date_candidates: ["2026-10-30"], promised_date_confidence: 0.7 });
    const s = act(act(scanned(), advance("2026-10-20T11:05")), extract("m-hupseng", low));
    expect(s.handoffs.map((h) => h.kind)).toEqual(["promise_date"]);
    expect(invoiceOf(s, "INV-2268").promise).toBeNull();
  });

  it("M4: a promise date dropped by the verbatim gate can be typed in by the person", () => {
    const fake = withExtraction("m-hupseng", { promised_date_quote: "下个月才过数" });
    let s = act(act(scanned(), advance("2026-10-20T11:05")), extract("m-hupseng", fake));
    expect(s.handoffs[0]).toMatchObject({ kind: "promise_date", options: [] });
    s = act(s, { type: "RESOLVE_HANDOFF", handoffId: s.handoffs[0].id, option: "2026-11-06" });
    expect(invoiceOf(s, "INV-2268").promise?.date).toBe("2026-11-06");
  });

  it("M5 / FR-E8-E9: no Hup Seng reminder until 31 Oct; the follow-up appears on 31 Oct if unpaid", () => {
    const { promised } = playDemo();
    const row = (s: State) => chasePlan(s).find((r) => r.invoice.id === "INV-2268")!;
    expect(texts(promised, "M5")).toEqual(["reminders paused for INV-2268 until 31 Oct"]);
    let s = act(promised, advance("2026-10-30T09:00"));
    expect([row(s).state, row(s).reason]).toEqual(["skipped", "promise 30 Oct not reached"]);
    s = act(s, advance("2026-10-31T09:00"));
    // Unpaid after the promise: back in the plan. T1, T1, T2 already sent and D+56 ≥ 30, so R1 gives Tier 3.
    expect([row(s).state, row(s).tier, row(s).rule]).toEqual(["escalate", 3, "R1"]);
    expect(s.log.filter((l) => l.at === "2026-10-31T08:00" && l.text.includes("INV-2268"))).toEqual([]);
  });

  it("receipt approval → PART_PAID; Owner accepts the deduction → PAID + CN-0057; meter flips only on approval", () => {
    const { verified, receiptApproved, deductionAccepted } = playDemo();
    expect(forecast(verified).map((f) => RM(f.forecast))).toEqual([-2000, -13200]); // VERIFIED is not cash
    expect(invoiceOf(receiptApproved, "INV-2304")).toMatchObject({ status: "part_paid", paid: 277000 });
    expect(texts(receiptApproved, "Nurul").at(-1)).toBe("approved receipt RM2,770: INV-2304 PART_PAID, RM330 under review");
    expect(texts(receiptApproved, "SYSTEM").at(-1)).toBe("31 Oct salaries: covered (+RM770)");
    expect(receiptApproved.bankLines.find((b) => b.id === "bl-2304")!.matchedInvoiceId).toBe("INV-2304");
    const inv = invoiceOf(deductionAccepted, "INV-2304");
    expect([inv.status, inv.amount, inv.paid]).toEqual(["paid", 277000, 277000]);
    expect(deductionAccepted.creditNotes).toEqual([
      { id: "CN-0057", invoiceId: "INV-2304", amount: 33000, reason: "2 pallet tiles pecah at Bukit Raja", at: "2026-10-23T14:30" },
    ]);
    expect(lastLog(deductionAccepted).text).toBe("accepted RM330 deduction: INV-2304 PAID, credit note CN-0057 drafted (not submitted)");
    expect(forecast(deductionAccepted).map((f) => RM(f.forecast))).toEqual([770, -10430]);
  });

  it("a deduction cannot be decided before the receipt is approved; a rejected one stays owed", () => {
    const { verified, receiptApproved } = playDemo();
    expect(refused(verified, { type: "DECIDE_DEDUCTION", receiptId: verified.receipts[0].id, decision: "accepted" }).error).toBe("Approve the receipt first.");
    const s = act(act(receiptApproved, as("owner")), { type: "DECIDE_DEDUCTION", receiptId: receiptApproved.receipts[0].id, decision: "rejected" });
    expect(invoiceOf(s, "INV-2304")).toMatchObject({ status: "part_paid", amount: 310000, paid: 277000 });
    expect(s.creditNotes).toEqual([]);
  });

  it("FR-E10: Kilang 'Dah settle la semalam' → BM slip request drafted, no PAID proposal", () => {
    const { kilangRead, final } = playDemo();
    expect(kilangRead.receipts.filter((r) => r.invoiceId === "INV-2310")).toEqual([]);
    expect(invoiceOf(kilangRead, "INV-2310").status).toBe("open");
    const h = kilangRead.handoffs.find((x) => x.kind === "claim_unverified")!;
    expect(h.draftReply).toBe("Terima kasih Encik Razak! Kami belum nampak dalam bank lagi, boleh share slip atau no. rujukan?");
    expect(lastLog(final)).toMatchObject({ actor: "Nurul", text: "sent templated reply asking for the slip" });
    expect(invoiceOf(final, "INV-2310").status).toBe("open");
  });

  it("the Owner can mark paid without a bank line, and it is logged as an override", () => {
    const { kilangRead } = playDemo();
    const h = kilangRead.handoffs.find((x) => x.kind === "claim_unverified")!;
    const s = act(act(kilangRead, as("owner")), { type: "RESOLVE_HANDOFF", handoffId: h.id, option: "mark_paid_anyway" });
    expect(invoiceOf(s, "INV-2310").status).toBe("paid");
    expect(lastLog(s).text).toBe("marked INV-2310 paid without a bank line (owner override)");
  });

  it("M2: a claim with an unknown invoice number falls back to the customer's single overdue invoice", () => {
    const s0 = addMessage(scanned(), { id: "m-x", customerId: "c-pelita", receivedAt: "2026-10-20T08:00", text: "dah bank in boss", image: null });
    const s = act(act(s0, as("clerk")), extract("m-x", withExtraction("m-kilang", { intent: "paid_claim", invoice_ref: "INV-9999", invoice_ref_quote: null, invoice_ref_confidence: 0.95 })));
    expect(s.handoffs.map((h) => [h.kind, h.invoiceId])).toEqual([["claim_unverified", "INV-2296"]]);
  });

  it("F1: an unverified claim leaves an expected inflow counted; a verified one removes it until approved", () => {
    let s = addMessage(scanned(), { id: "m-sinar", customerId: "c-sinar", receivedAt: "2026-10-20T08:00", text: "Paid INV-2331 RM7,500", image: null });
    const claim = withExtraction("m-megabina", {
      intent: "paid_claim", amount: 7500, amount_quote: "RM7,500", invoice_ref: "INV-2331", invoice_ref_quote: "INV-2331",
      deduction_amount: null, deduction_reason: null, deduction_quote: null, has_slip: false,
    });
    const unverified = act(s, extract("m-sinar", claim));
    expect(forecast(unverified).map((f) => RM(f.forecast))).toEqual([-2000, -13200]);
    s = draft(s);
    s.bankLines.push({ id: "bl-sinar", at: "2026-10-20T07:30", amount: 750000, description: "IBG CR KEDAI ELEKTRIK SINAR", matchedInvoiceId: null });
    const verified = act(s, extract("m-sinar", claim));
    expect(verified.receipts).toHaveLength(1);
    expect(forecast(verified).map((f) => RM(f.forecast))).toEqual([-9500, -20700]);
    const approved = act(verified, { type: "APPROVE_RECEIPT", receiptId: verified.receipts[0].id });
    expect(forecast(approved).map((f) => RM(f.forecast))).toEqual([-2000, -13200]);
  });

  it("an extraction is applied once per message", () => {
    const s = act(at1430(), extract("m-megabina"));
    const again = apply(s, extract("m-megabina"));
    expect(again.error).toBeUndefined();
    expect(again.state.receipts).toHaveLength(1);
    expect(again.state.log).toEqual(s.log);
  });
});
