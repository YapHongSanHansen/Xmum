// Bank credit alerts (simulated forwarding mailbox): the rules-only parser and
// RECEIVE_BANK_ALERT. Alerts become credit lines for M1; debits are refused and a
// balance figure is never read; the Clerk never sees a debit or balance amount.
import { describe, expect, it } from "vitest";
import { parseBankAlert, sampleBankAlert } from "./bank-alerts";
import { rm } from "./model";
import { apply } from "./reducer";
import { forecast, payerMatches, visibleBankLines } from "./rules";
import { seedState } from "./seed";
import { RM, act, advance, as, extract, playDemo, refused, scanned } from "./testkit";

const DUITNOW =
  "Bank Cempaka: You have received RM2,770.00 via DuitNow Transfer from MEGA BINA HARDW on 23/10/2026 14:25. Ref: INV2304";

const IBG = [
  "Subject: Cempaka Alert - IBG Credit",
  "",
  "Dear Valued Customer,",
  "An Interbank GIRO (IBG) credit of MYR 1,500.00 has been credited into your account 8812-****-4410 on 19 Oct 2026 at 09:12.",
  "Sender: TOKO SERI ANGGERIK",
  "Payment details: INV-2290",
  "Available balance: MYR 8,300.00",
].join("\n");

const PUSH = "Cempaka: Money in +RM640.00 from KEDAI RUNCIT AMANI · 19 Oct 2026, 2:25 PM · Ref INV2296";

const ok = (text: string) => {
  const p = parseBankAlert(text);
  if (!p.ok) throw new Error(`expected a credit, got: ${p.reason}`);
  return p.line;
};
const reason = (text: string) => {
  const p = parseBankAlert(text);
  if (p.ok) throw new Error("expected a refusal");
  return p.reason;
};

describe("parseBankAlert: accepted formats", () => {
  it("DuitNow email: amount, date and time, payer, reference, in the bank feed's own style", () => {
    expect(ok(DUITNOW)).toEqual({
      at: "2026-10-23T14:25",
      amount: rm(2770),
      description: "DUITNOW CR MEGA BINA HARDW INV2304",
      rail: "DuitNow",
      payer: "MEGA BINA HARDW",
      reference: "INV2304",
    });
  });

  it("IBG credit email: multi-line body, named month, sender and payment details; balance ignored", () => {
    const l = ok(IBG);
    expect(l).toEqual({
      at: "2026-10-19T09:12",
      amount: rm(1500),
      description: "IBG CR TOKO SERI ANGGERIK INV-2290",
      rail: "IBG",
      payer: "TOKO SERI ANGGERIK",
      reference: "INV-2290",
    });
    // The balance figure and the masked account number are never kept.
    for (const leak of ["8,300", "830000", "8812", "4410"]) expect(JSON.stringify(l)).not.toContain(leak);
  });

  it("app push notification: short form, 12-hour time, no rail named", () => {
    expect(ok(PUSH)).toEqual({
      at: "2026-10-19T14:25",
      amount: rm(640),
      description: "TRANSFER CR KEDAI RUNCIT AMANI INV2296",
      rail: "Transfer",
      payer: "KEDAI RUNCIT AMANI",
      reference: "INV2296",
    });
  });

  it("a balance stated before the amount is not mistaken for the credit", () => {
    const l = ok("Bank Cempaka: Bal RM9,999.00. You have received RM120.00 via DuitNow from SURIA MAKAN on 2026-10-20 10:05.");
    expect(l.amount).toBe(rm(120));
    expect(l.at).toBe("2026-10-20T10:05");
  });

  it("the sample alert parses, and its payer matches no customer", () => {
    const l = ok(sampleBankAlert("2026-10-20T08:00"));
    expect(l).toMatchObject({ at: "2026-10-20T08:00", amount: rm(1180), payer: "RIMBA HIJAU NURSERY", reference: "TRIP1023" });
    const s = seedState();
    expect(s.customers.some((c) => payerMatches(l.description, c, null))).toBe(false);
  });
});

describe("parseBankAlert: refused", () => {
  it("debits: money going out is never added, and the reason carries no amount", () => {
    for (const debit of [
      "Bank Cempaka: You have transferred RM860.00 to CEMPAKA FLEET CARD on 19/10/2026 15:05.",
      "Bank Cempaka: RM500.00 has been debited from your account on 19/10/2026 11:00. Ref: SALARY",
      "Cempaka: -RM75.00 DuitNow QR to KEDAI KOPI ASIA · 19 Oct 2026, 1:10 PM",
      "IBG DR RM1,200.00 PEMBEKAL DIESEL on 20/10/2026 09:00",
    ]) {
      const r = reason(debit);
      expect(r).toBe("This alert is for money going out (a debit). Only incoming credits are added.");
      expect(r).not.toMatch(/\d/);
    }
  });

  it("no amount", () => {
    expect(reason("Bank Cempaka: You have received money via DuitNow from MEGA BINA HARDW on 23/10/2026 14:25.")).toMatch(/^No amount found/);
  });

  it("no date (and an impossible date)", () => {
    expect(reason("Bank Cempaka: You have received RM2,770.00 via DuitNow from MEGA BINA HARDW. Ref: INV2304")).toMatch(/^No date found/);
    expect(reason("Bank Cempaka: You have received RM10.00 from MEGA BINA HARDW on 31/02/2026 14:25.")).toMatch(/^No date found/);
  });

  it("not a credit alert, empty text, zero amount, nothing to match on", () => {
    expect(reason("Your OTP for Bank Cempaka is 123456. Valid until 23/10/2026 14:25.")).toMatch(/^Not a credit alert/);
    expect(reason("   ")).toBe("The alert is empty.");
    expect(reason("You have received RM0.00 from MEGA BINA HARDW on 23/10/2026 14:25.")).toBe("The amount is zero.");
    expect(reason("You have received RM50.00 on 23/10/2026 14:25.")).toMatch(/^No payer name or reference/);
  });
});

describe("RECEIVE_BANK_ALERT (Owner and Clerk; credits only)", () => {
  for (const role of ["owner", "clerk"] as const) {
    it(`${role} adds the alert as a credit line for matching, logged with the actor`, () => {
      const base = act(scanned(), as(role));
      const s = act(base, { type: "RECEIVE_BANK_ALERT", text: sampleBankAlert(base.now) });
      const line = s.bankLines.find((b) => b.description.includes("RIMBA HIJAU"))!;
      expect(line).toEqual({
        id: "BL-0001",
        at: base.now,
        amount: rm(1180),
        description: "DUITNOW CR RIMBA HIJAU NURSERY TRIP1023",
        matchedInvoiceId: null,
        source: "alert",
      });
      expect(visibleBankLines(s)).toContainEqual(line);
      const added = s.log.slice(base.log.length);
      expect(added.map((l) => `${l.kind} ${l.actor}: ${l.text}`)).toEqual([
        `BANK BANK: bank alert received (simulated): RM1,180.00 DuitNow from RIMBA HIJAU NURSERY, ref TRIP1023 · line 20/10 08:00, added by ${role === "owner" ? "Lim Siew Lan" : "Nurul"}`,
      ]);
      // A credit that matches no invoice changes no demo number (F1 uses the entered balance).
      expect(forecast(s)).toEqual(forecast(scanned()));
    });
  }

  it("refuses a debit, for the Clerk too, leaving no trace of its amount", () => {
    const base = act(scanned(), as("clerk"));
    const { error, state } = refused(base, {
      type: "RECEIVE_BANK_ALERT",
      text: "Bank Cempaka: You have transferred RM860.00 to CEMPAKA FLEET CARD on 19/10/2026 15:05. Available balance RM8,940.00",
    });
    expect(error).toBe("This alert is for money going out (a debit). Only incoming credits are added.");
    expect(state).toBe(base);
    expect(state.bankDebits).toEqual([]);
  });

  it("FR-B5: a credit alert that states the balance stores and logs no balance figure", () => {
    const s = act(act(scanned(), as("clerk")), {
      type: "RECEIVE_BANK_ALERT",
      text: "Bank Cempaka: You have received RM640.00 via DuitNow from KEDAI RUNCIT AMANI on 20/10/2026 07:50. Available balance: RM10,440.00",
    });
    const text = JSON.stringify([s.bankLines, s.log]);
    for (const leak of ["10,440", "1044000"]) expect(text).not.toContain(leak);
    expect(visibleBankLines(s).every((b) => b.amount > 0)).toBe(true);
  });

  it("refuses an alert dated after the demo clock, and the same alert twice", () => {
    const s = scanned();
    expect(refused(s, { type: "RECEIVE_BANK_ALERT", text: DUITNOW.replace("23/10/2026", "24/10/2026") }).error).toMatch(/dated after the demo clock/);
    const once = act(s, { type: "RECEIVE_BANK_ALERT", text: PUSH });
    expect(refused(once, { type: "RECEIVE_BANK_ALERT", text: PUSH }).error).toBe("This alert is already in the bank feed.");
  });

  it("an alert credit verifies a claim (M1): Kilang's 'Dah settle' with the alert line present", () => {
    const { deductionAccepted } = playDemo();
    let s = act(deductionAccepted, advance("2026-10-23T15:00"));
    s = act(s, {
      type: "RECEIVE_BANK_ALERT",
      text: "Bank Cempaka: You have received RM4,200.00 via DuitNow Transfer from KILANG PERABOT JAYA on 22/10/2026 16:00. Ref: INV2310",
    });
    s = act(s, extract("m-kilang"));
    expect(s.receipts.find((r) => r.invoiceId === "INV-2310")).toMatchObject({ amount: rm(4200), status: "proposed" });
    // Still not paid: a person approves the receipt.
    expect(s.invoices.find((i) => i.id === "INV-2310")!.status).not.toBe("paid");
  });
});

describe("demo contract: the seeded Mega Bina line arrives by bank alert", () => {
  it("is labelled as an alert, keeps its numbers, and M1 still finds it at 14:30", () => {
    const seed = seedState();
    const megabina = seed.bankLines.find((b) => b.id === "bl-2304")!;
    expect(megabina).toMatchObject({ at: "2026-10-23T14:25", amount: rm(2770), source: "alert" });
    // M1 at 14:30 proposes the receipt against this very line; the person approves it next.
    const { verified } = playDemo();
    expect(verified.receipts.map((r) => [r.invoiceId, r.bankLineId, RM(r.amount), r.status])).toEqual([["INV-2304", "bl-2304", 2770, "proposed"]]);
  });

  it("refuses an unknown role's alert (roles are checked)", () => {
    const s = { ...scanned(), role: "sales" as never };
    expect(apply(s, { type: "RECEIVE_BANK_ALERT", text: PUSH }).error).toBe("Your role cannot add a bank alert.");
  });
});
