// FR-A1 invoice CSV, FR-A4 owner bank balance, FR-A5 bank statement CSV:
// parsers, role checks, log entries, and what the Clerk can see (FR-B5).
import { describe, expect, it } from "vitest";
import { rm, type State } from "./model";
import { apply } from "./reducer";
import { chasePlan, forecast, visibleBankLines } from "./rules";
import { SAMPLE_BANK_CSV, SAMPLE_INVOICE_CSV, bankPreviewFor, parseAmount, parseBankCsv, parseDate, parseInvoiceCsv } from "./imports";
import { RM, act, advance, as, extract, playDemo, refused, scanned } from "./testkit";
import { seedState } from "./seed";

const INV_HEADER = "number,customer,amount,issue date,due date,terms,status";
const invCsv = (...rows: string[]) => [INV_HEADER, ...rows].join("\n");
const GOOD = "INV-2400,Kedai Elektrik Sinar Sdn Bhd,1000.00,2026-10-01,2026-10-31,30,open";
/** The one invalid row's reason, for a file with a single data row. */
const reasonOf = (row: string, s: State = seedState()) => {
  const p = parseInvoiceCsv(invCsv(row), s);
  expect(p.rows).toHaveLength(0);
  expect(p.invalid).toHaveLength(1);
  expect(p.invalid[0].line).toBe(2);
  return p.invalid[0].reason;
};

const BANK_HEADER = "date,amount,description";
const bankCsv = (...rows: string[]) => [BANK_HEADER, ...rows].join("\n");

describe("field parsers", () => {
  it("dates: YYYY-MM-DD or DD/MM/YYYY, impossible dates rejected", () => {
    expect(parseDate("2026-10-20")).toBe("2026-10-20");
    expect(parseDate("5/11/2026")).toBe("2026-11-05");
    expect(parseDate("31/11/2026")).toBeNull();
    expect(parseDate("2026-02-30")).toBeNull();
    expect(parseDate("2026-13-01")).toBeNull();
    expect(parseDate("20 Oct")).toBeNull();
  });

  it("amounts: RM prefix, thousands commas and up to 2 decimals, in sen", () => {
    expect(parseAmount("RM3,100.00")).toBe(310000);
    expect(parseAmount("1980.5")).toBe(198050);
    expect(parseAmount("-860.00")).toBe(-86000);
    expect(parseAmount("-RM12")).toBe(-1200);
    expect(parseAmount("4O0.00")).toBeNull();
    expect(parseAmount("1.234")).toBeNull();
  });
});

describe("FR-A1 invoice CSV parser", () => {
  it("the sample: 3 valid rows, lines 5 and 6 invalid with a reason each", () => {
    const p = parseInvoiceCsv(SAMPLE_INVOICE_CSV, seedState());
    expect(p.error).toBeNull();
    expect(p.rows.map((r) => [r.line, r.number, r.customerId, RM(r.amount), r.dueDate, r.termsDays])).toEqual([
      [2, "INV-2365", "c-sinar", 2850, "2026-12-04", 45],
      [3, "INV-2366", "c-gudang", 1980.5, "2026-12-19", 60],
      [4, "INV-2367", "c-pelita", 1450, "2026-12-19", 60],
    ]);
    expect(p.invalid.map((r) => r.line)).toEqual([5, 6]);
    expect(p.invalid[0].reason).toBe("duplicate: INV-2304 already exists");
    expect(p.invalid[1].reason).toContain('unknown customer "Syarikat Bintang Timur"');
    expect(p.invalid[1].reason).toContain('bad due date "31/11/2026"');
  });

  it("matches customers by name, ignoring case, punctuation and 'Sdn Bhd'", () => {
    const p = parseInvoiceCsv(invCsv("INV-2401,gudang sejuk prima sdn. bhd.,500,2026-10-01,2026-10-31,30,open"), seedState());
    expect(p.rows[0].customerId).toBe("c-gudang");
  });

  it("each invalid reason, in plain words", () => {
    expect(reasonOf("INV-2400,Kedai Elektrik Sinar Sdn Bhd,12abc,2026-10-01,2026-10-31,30,open")).toBe('bad amount "12abc"');
    expect(reasonOf("INV-2400,Kedai Elektrik Sinar Sdn Bhd,0,2026-10-01,2026-10-31,30,open")).toBe("amount must be more than zero");
    expect(reasonOf("INV-2400,Kedai Elektrik Sinar Sdn Bhd,100,2026-02-30,2026-10-31,30,open")).toContain('bad issue date "2026-02-30"');
    expect(reasonOf("INV-2400,Kedai Elektrik Sinar Sdn Bhd,100,2026-10-01,32/10/2026,30,open")).toContain('bad due date "32/10/2026"');
    expect(reasonOf("INV-2400,Kedai Elektrik Sinar Sdn Bhd,100,2026-10-15,2026-10-01,30,open")).toBe("due date is before the issue date");
    expect(reasonOf("INV-2400,Kedai Elektrik Sinar Sdn Bhd,100,2026-10-25,2026-11-25,30,open")).toBe("issue date is after today (20 Oct)");
    expect(reasonOf("INV-2400,Kedai Elektrik Sinar Sdn Bhd,100,2026-10-01,2026-10-31,thirty,open")).toContain('bad terms "thirty"');
    expect(reasonOf("INV-2400,Toko Tiada Sdn Bhd,100,2026-10-01,2026-10-31,30,open")).toContain('unknown customer "Toko Tiada Sdn Bhd"');
    expect(reasonOf("INV-2400,,100,2026-10-01,2026-10-31,30,open")).toBe("missing customer");
    expect(reasonOf("INV-2400,Kedai Elektrik Sinar Sdn Bhd,100,2026-10-01,2026-10-31,30")).toBe("missing status");
    expect(reasonOf("inv 2304,Mega Bina Hardware Trading Sdn Bhd,100,2026-10-01,2026-10-31,30,open")).toBe("duplicate: inv 2304 already exists");
    expect(reasonOf("INV-2400,Kedai Elektrik Sinar Sdn Bhd,100,2026-10-01,2026-10-31,30,paid")).toContain("already paid");
    expect(reasonOf("INV-2400,Kedai Elektrik Sinar Sdn Bhd,100,2026-10-01,2026-10-31,30,part paid")).toContain("part_paid needs the amount already paid");
    expect(reasonOf("INV-2400,Kedai Elektrik Sinar Sdn Bhd,100,2026-10-01,2026-10-31,30,overdue")).toBe('unknown status "overdue" (use open or disputed)');
  });

  it("a number repeated within the file is invalid on the later line", () => {
    const p = parseInvoiceCsv(invCsv(GOOD, GOOD.replace("1000.00", "2000")), seedState());
    expect(p.rows).toHaveLength(1);
    expect(p.invalid).toEqual([{ line: 3, number: "INV-2400", raw: expect.any(String), reason: "duplicate: INV-2400 is also on line 2" }]);
  });

  it("a missing required column or an empty file is a whole-file error", () => {
    const p = parseInvoiceCsv("number,customer,amount,issue date,due date,status\n" + GOOD, seedState());
    expect(p.error).toBe("Missing column: terms.");
    expect(p.rows).toHaveLength(0);
    expect(parseInvoiceCsv("  \n", seedState()).error).toBe("The file is empty.");
  });

  it("blank lines are skipped; line numbers still count them", () => {
    const p = parseInvoiceCsv(`${INV_HEADER}\n\n${GOOD}\n`, seedState());
    expect(p.rows.map((r) => r.line)).toEqual([3]);
  });
});

describe("IMPORT_INVOICES (FR-A1, §9.3 'Import invoices': Owner and Clerk)", () => {
  for (const role of ["owner", "clerk"] as const) {
    it(`${role} imports only the valid rows, and it is logged with the actor`, () => {
      const s = act(act(scanned(), as(role)), { type: "IMPORT_INVOICES", csv: SAMPLE_INVOICE_CSV });
      expect(s.invoices.length).toBe(seedState().invoices.length + 3);
      expect(s.invoices.some((i) => i.number === "INV-2368")).toBe(false);
      const entry = s.log.at(-1)!;
      expect(entry.kind).toBe("USER");
      expect(entry.actor).toBe(role === "owner" ? "Lim Siew Lan" : "Nurul");
      expect(entry.text).toBe("imported 3 invoices from CSV: INV-2365, INV-2366, INV-2367; 2 rows not imported");
      expect(entry.refs).toEqual(["INV-2365", "INV-2366", "INV-2367"]);
    });
  }

  it("importing the sample does not move the demo's numbers (all due beyond the 30-day horizon)", () => {
    const base = scanned();
    const s = act(base, { type: "IMPORT_INVOICES", csv: SAMPLE_INVOICE_CSV });
    expect(forecast(s)).toEqual(forecast(base));
    expect(chasePlan(s).map((r) => r.invoice.number)).toEqual(chasePlan(base).map((r) => r.invoice.number));
  });

  it("a file with no valid rows, or a missing column, is refused and changes nothing", () => {
    const once = act(scanned(), { type: "IMPORT_INVOICES", csv: SAMPLE_INVOICE_CSV });
    const again = refused(once, { type: "IMPORT_INVOICES", csv: SAMPLE_INVOICE_CSV });
    expect(again.error).toBe("No valid rows to import.");
    expect(again.state).toBe(once);
    expect(refused(once, { type: "IMPORT_INVOICES", csv: "number,customer\nX,Y" }).error).toMatch(/^Missing columns: /);
  });

  it("imported invoices feed the rules: an overdue one is chased (R1), a disputed one is skipped (R2)", () => {
    const csv = invCsv(
      "INV-2400,Kedai Elektrik Sinar Sdn Bhd,1000,2026-09-01,2026-10-01,30,open",
      "INV-2401,Gudang Sejuk Prima Sdn Bhd,800,2026-09-01,2026-10-01,30,disputed",
    );
    const s = act(seedState(), { type: "IMPORT_INVOICES", csv });
    const plan = chasePlan(s);
    expect(plan.find((r) => r.invoice.number === "INV-2400")).toMatchObject({ state: "remind", tier: 1 });
    expect(plan.find((r) => r.invoice.number === "INV-2401")).toMatchObject({ state: "skipped", reason: "invoice disputed" });
  });
});

describe("FR-A4 owner bank-balance entry", () => {
  it("the Clerk is refused and nothing changes", () => {
    const clerk = act(scanned(), as("clerk"));
    const r = refused(clerk, { type: "ENTER_BANK_BALANCE", amount: rm(12000) });
    expect(r.error).toMatch(/Only the Owner/);
    expect(r.state).toBe(clerk);
  });

  it("stores the value and who entered it, logs both, and the forecast uses it (F1)", () => {
    const s = act(scanned(), { type: "ENTER_BANK_BALANCE", amount: rm(12000) });
    expect(s.bankBalance).toEqual({ amount: rm(12000), enteredAt: "2026-10-20T08:00", enteredBy: "Lim Siew Lan" });
    // 12,000 + 12,700 − 24,500 = +200; 5 Nov: 200 − 11,200 = −11,000.
    expect(forecast(s).map((f) => RM(f.forecast))).toEqual([200, -11000]);
    expect(s.log.slice(-3).map((l) => `${l.kind} ${l.actor}: ${l.text}`)).toEqual([
      "USER Lim Siew Lan: entered today's bank balance (FR-A4)",
      "SYSTEM SYSTEM: bank balance RM12,000.00, entered by Lim Siew Lan",
      "SYSTEM SYSTEM: 31 Oct salaries: covered (+RM200)",
    ]);
  });

  it("a lower balance that opens a gap is logged as 'now short'", () => {
    const covered = act(scanned(), { type: "ENTER_BANK_BALANCE", amount: rm(12000) });
    const s = act(covered, { type: "ENTER_BANK_BALANCE", amount: rm(11000) });
    expect(s.log.at(-1)!.text).toBe("31 Oct salaries: now short RM800");
  });

  it("cash restarts from the new balance: receipts approved before it are not counted twice", () => {
    const { receiptApproved } = playDemo();
    expect(forecast(receiptApproved).map((f) => RM(f.forecast))).toEqual([770, -10430]);
    const s = act(act(receiptApproved, as("owner")), { type: "ENTER_BANK_BALANCE", amount: rm(12570) });
    expect(s.approvedReceiptTotal).toBe(0);
    expect(forecast(s).map((f) => RM(f.forecast))).toEqual([770, -10430]);
  });

  it("refuses a negative or fractional-sen amount", () => {
    for (const amount of [-100, 10.5, Number.NaN]) {
      expect(refused(scanned(), { type: "ENTER_BANK_BALANCE", amount }).error).toMatch(/zero or more/);
    }
  });

  it("FR-B5: the figure appears only on SYSTEM lines, which the activity log redacts for the Clerk", () => {
    const s = act(scanned(), { type: "ENTER_BANK_BALANCE", amount: rm(12345) });
    const withFigure = s.log.filter((l) => l.text.includes("12,345"));
    expect(withFigure.length).toBeGreaterThan(0);
    expect(withFigure.every((l) => l.kind === "SYSTEM")).toBe(true);
    expect(s.log.filter((l) => l.kind === "USER").every((l) => !/RM[\d,]/.test(l.text))).toBe(true);
  });
});

describe("FR-A5 bank statement CSV parser", () => {
  it("the sample: 2 credits, 1 debit, line 5 a bad amount; the balance column is ignored", () => {
    const p = parseBankCsv(SAMPLE_BANK_CSV, seedState());
    expect(p.error).toBeNull();
    expect(p.credits.map((r) => [r.line, r.at, RM(r.amount), r.description])).toEqual([
      [2, "2026-10-19T09:12", 1500, "IBG CR TOKO SERI ANGGERIK"],
      [3, "2026-10-19T11:40", 640, "DUITNOW CR KEDAI RUNCIT AMANI 1019"],
    ]);
    expect(p.debits.map((r) => [r.line, RM(r.amount)])).toEqual([[4, -860]]);
    expect(p.invalid).toEqual([{ line: 5, reason: "bad amount (use a number, debits negative)", debit: false }]);
    expect(p.balanceIgnored).toBe(true);
    // No balance figure is carried anywhere in the result.
    expect(JSON.stringify(p)).not.toMatch(/8,300|830000|8,080|808000/);
  });

  it("each invalid reason, in plain words", () => {
    const reason = (row: string) => parseBankCsv(bankCsv(row), seedState()).invalid[0]?.reason;
    expect(reason("2026-10-32,100.00,IBG CR X")).toContain('bad date "2026-10-32"');
    expect(reason("2026-10-19 9:1,100.00,IBG CR X")).toContain("bad date");
    expect(reason("2026-10-21,100.00,IBG CR X")).toBe("dated after the demo clock (20 Oct)");
    expect(reason("2026-10-19,0.00,IBG CR X")).toBe("amount is zero");
    expect(reason("2026-10-19,abc,IBG CR X")).toBe("bad amount (use a number, debits negative)");
    expect(reason("2026-10-19,100.00,")).toBe("missing description");
    expect(reason("19/10/2026,1250.00,IBG CR TOKO MAJU ENT 0919")).toBe("duplicate of a line already imported");
    const p = parseBankCsv(bankCsv("2026-10-19,100.00,IBG CR X", "2026-10-19,100.00,ibg cr x"), seedState());
    expect(p.invalid).toEqual([{ line: 3, reason: "duplicate of line 2", debit: false }]);
    expect(parseBankCsv("date,description\n2026-10-19,X", seedState()).error).toBe("Missing column: amount.");
  });

  it("FR-B5: the Clerk's preview has credit lines only, no debit amounts, no balance", () => {
    const csv = SAMPLE_BANK_CSV + '\n2026-10-40,BAD DATE DEBIT,-975.00,"7,105.00"';
    const p = parseBankCsv(csv, seedState());
    expect(p.invalid.map((r) => [r.line, r.debit])).toEqual([[5, false], [6, true]]);
    const clerk = bankPreviewFor(p, "clerk");
    expect(clerk.credits).toHaveLength(2);
    expect(clerk.debits).toEqual([]);
    expect(clerk.invalid.map((r) => r.line)).toEqual([5]);
    expect(clerk.hiddenDebits).toBe(2);
    expect(clerk.balanceIgnored).toBe(false);
    const text = JSON.stringify(clerk);
    for (const leak of ["860", "975", "8,300", "830000", "7,105", "BAD DATE DEBIT", "AUTODEBIT"]) expect(text).not.toContain(leak);
    // The Owner sees everything that was read.
    const owner = bankPreviewFor(p, "owner");
    expect(owner.debits).toHaveLength(1);
    expect(owner.invalid).toHaveLength(2);
  });
});

describe("IMPORT_BANK_STATEMENT (FR-A5: Owner and Clerk; debits Owner only)", () => {
  for (const role of ["owner", "clerk"] as const) {
    it(`${role} imports credits for matching and keeps debits apart; logged with the actor`, () => {
      const base = act(scanned(), as(role));
      const s = act(base, { type: "IMPORT_BANK_STATEMENT", csv: SAMPLE_BANK_CSV });
      const credits = s.bankLines.filter((b) => b.description.includes("ANGGERIK") || b.description.includes("AMANI"));
      expect(credits.map((b) => [b.id, RM(b.amount), b.matchedInvoiceId])).toEqual([
        ["BL-0001", 1500, null],
        ["BL-0002", 640, null],
      ]);
      expect(s.bankDebits.map((b) => [b.id, RM(b.amount)])).toEqual([["BD-0001", -860]]);
      const added = s.log.slice(base.log.length);
      expect(added.map((l) => `${l.kind} ${l.actor}: ${l.text}`)).toEqual([
        `USER ${role === "owner" ? "Lim Siew Lan" : "Nurul"}: imported bank statement: 2 credit lines for matching (M1), 1 debit line kept for the Owner; 1 row not imported`,
        "BANK BANK: line 19/10 1,500.00 IBG CR TOKO SERI ANGGERIK (imported)",
        "BANK BANK: line 19/10 640.00 DUITNOW CR KEDAI RUNCIT AMANI 1019 (imported)",
      ]);
    });
  }

  it("FR-B5: what every role sees (bank feed, log) carries no debit and no balance figure", () => {
    const s = act(act(scanned(), as("clerk")), { type: "IMPORT_BANK_STATEMENT", csv: SAMPLE_BANK_CSV });
    expect(visibleBankLines(s).every((b) => b.amount > 0)).toBe(true);
    const logText = JSON.stringify(s.log);
    for (const leak of ["860", "8,300", "8,940", "8,080", "AUTODEBIT"]) expect(logText).not.toContain(leak);
    // The cash forecast is unchanged: P0 cash is the owner-entered balance (F1).
    expect(forecast(s)).toEqual(forecast(scanned()));
  });

  it("a second import of the same file is refused as all duplicates", () => {
    const once = act(scanned(), { type: "IMPORT_BANK_STATEMENT", csv: SAMPLE_BANK_CSV });
    expect(refused(once, { type: "IMPORT_BANK_STATEMENT", csv: SAMPLE_BANK_CSV }).error).toBe("No valid lines to import.");
  });

  it("an imported credit line verifies a claim (M1): Kilang's 'Dah settle' with the bank line present", () => {
    const { deductionAccepted } = playDemo();
    let s = act(deductionAccepted, advance("2026-10-23T15:00"));
    s = act(s, { type: "IMPORT_BANK_STATEMENT", csv: bankCsv("2026-10-22 16:00,4200.00,DUITNOW CR KILANG PERABOT JAYA") });
    s = act(s, extract("m-kilang"));
    expect(s.receipts.find((r) => r.invoiceId === "INV-2310")).toMatchObject({ amount: rm(4200), status: "proposed" });
    expect(s.log.some((l) => l.actor === "M1" && l.text === "claim VERIFIED against bank line" && l.refs?.includes("INV-2310"))).toBe(true);
  });

  it("refuses a file with a missing column", () => {
    expect(apply(scanned(), { type: "IMPORT_BANK_STATEMENT", csv: "date,amount\n2026-10-19,5" }).error).toBe("Missing column: description.");
  });
});
