// The synthetic business history (engine/history.ts) must stay invisible to the
// demo rules: these checks pin the properties that keep HANDOFF §4 unchanged.
import { describe, expect, it } from "vitest";
import { orbyteWorkspace } from "../orbyte/mock-data";
import { collectedByMonth, OPEN_DUE_FROM } from "./history";
import { DEMO_START, seedState } from "./seed";

const s = seedState();
const MONTHS = ["2026-07", "2026-08", "2026-09", "2026-10"];

describe("seeded business history", () => {
  it("every paid invoice has exactly one matched bank credit, dated before the demo opens", () => {
    const paid = s.invoices.filter((i) => i.status === "paid");
    expect(paid.length).toBeGreaterThanOrEqual(40);
    for (const inv of paid) {
      const lines = s.bankLines.filter((b) => b.matchedInvoiceId === inv.id);
      expect(lines, inv.number).toHaveLength(1);
      expect(lines[0].amount).toBe(inv.amount);
      expect(lines[0].at < DEMO_START).toBe(true);
      expect(inv.paid).toBe(inv.amount);
      expect(inv.reminders).toEqual([]);
      expect(inv.calls).toEqual([]);
    }
  });

  it("open invoices of the new customers fall due after every demo day's 30-day window", () => {
    const original = new Set(["c-megabina", "c-hupseng", "c-kilang", "c-pelita", "c-sinar", "c-gudang"]);
    const open = s.invoices.filter((i) => i.status !== "paid" && !original.has(i.customerId));
    expect(open.length).toBeGreaterThanOrEqual(6);
    for (const inv of open) expect(inv.dueDate >= OPEN_DUE_FROM, inv.number).toBe(true);
  });

  it("invoice numbers, DO numbers and Orbyte projects are unique", () => {
    expect(new Set(s.invoices.map((i) => i.number)).size).toBe(s.invoices.length);
    expect(new Set(s.invoices.map((i) => i.delivery.doNumber)).size).toBe(s.invoices.length);
    const w = orbyteWorkspace();
    expect(new Set(w.projects.map((p) => p.doNumber)).size).toBe(w.projects.length);
    expect(w.clients).toHaveLength(12);
  });

  it("older messages arrive already read; past bookings were never held or decided", () => {
    const old = s.messages.filter((m) => s.extractions[m.id]);
    expect(old.length).toBeGreaterThanOrEqual(5);
    for (const m of old) expect(m.receivedAt < DEMO_START).toBe(true);
    for (const b of s.bookings) {
      expect(b.status).toBe("accepted");
      expect(b.decidedBy).toBeNull();
      expect(b.id).not.toMatch(/^BK-\d{4}$/);
    }
  });

  it("collected per month: Jul–Sep populated, Oct to date before the demo", () => {
    const rows = collectedByMonth(s.bankLines, s.now, MONTHS);
    for (const r of rows) expect(r.count, r.month).toBeGreaterThan(0);
    // Owner-only figures (cash, payroll, gaps) must never coincide with a Clerk-visible total.
    const ownerOnly = [9800, 24500, 11200, 2000, 13200, 770, 10430, 6350, 4850, 12700, 12570, 35700].map((r) => r * 100);
    for (const r of rows) expect(ownerOnly).not.toContain(r.amount);
  });
});
