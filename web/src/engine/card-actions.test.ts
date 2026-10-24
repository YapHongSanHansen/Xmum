// FR-C9 card actions (snooze, mark disputed, "I'll call instead") and the
// Owner's "reject claim" for an unverified "already paid" claim (PRD §22 row 2).
import { describe, expect, it } from "vitest";
import { invoiceOf, type State } from "./model";
import { apply, type Action } from "./reducer";
import { chasePlan } from "./rules";
import { act, advance, as, playDemo, refused, scanned } from "./testkit";

const rowOf = (s: State, invoiceId: string) => chasePlan(s).find((r) => r.invoice.id === invoiceId)!;

const CARD_ACTIONS: [string, (invoiceId: string) => Action][] = [
  ["snooze", (invoiceId) => ({ type: "SNOOZE_REMINDER", invoiceId, until: "2026-10-23" })],
  ["mark disputed", (invoiceId) => ({ type: "MARK_DISPUTED", invoiceId })],
  ["call instead", (invoiceId) => ({ type: "CALL_INSTEAD", invoiceId })],
];

describe("FR-C9 card actions: same tier rules as approve (FR-C6)", () => {
  for (const [what, action] of CARD_ACTIONS) {
    it(`${what}: Clerk and Owner can on Tier 1; only the Owner on Tier 2`, () => {
      for (const role of ["clerk", "owner"] as const) {
        expect(apply(act(scanned(), as(role)), action("INV-2304")).error).toBeUndefined();
      }
      const clerk = act(scanned(), as("clerk"));
      const r = refused(clerk, action("INV-2268"));
      expect(r.error).toMatch(/Only the Owner/);
      expect(r.state).toBe(clerk);
      expect(apply(act(scanned(), as("owner")), action("INV-2268")).error).toBeUndefined();
    });

    it(`${what}: refused when the invoice has no reminder to act on`, () => {
      // Pelita is skipped (R2: promise 30 Oct); Sinar's invoice is not overdue.
      expect(refused(scanned(), action("INV-2296")).error).toBe("This invoice has no reminder to act on right now.");
      expect(refused(scanned(), action("INV-2331")).error).toBe("This invoice has no reminder to act on right now.");
    });
  }
});

describe("snooze to a date", () => {
  const snoozed = () => act(act(scanned(), as("clerk")), { type: "SNOOZE_REMINDER", invoiceId: "INV-2304", until: "2026-10-23" });

  it("is logged with the actor, and the reminder leaves the plan until the date", () => {
    const s = snoozed();
    expect(s.log.at(-1)).toMatchObject({ kind: "USER", actor: "Nurul", text: "snoozed Tier 1 INV-2304 until 23 Oct", refs: ["INV-2304"] });
    expect(rowOf(s, "INV-2304")).toMatchObject({ state: "skipped", rule: "R2", reason: "snoozed until 23 Oct by Nurul" });
    expect(chasePlan(s).filter((r) => r.state === "remind").map((r) => r.invoice.id)).toEqual(["INV-2310", "INV-2268"]);
  });

  it("stays out of the plan on the days before, and is back on the snooze date", () => {
    const s = act(snoozed(), advance("2026-10-22T09:00"));
    expect(rowOf(s, "INV-2304").state).toBe("skipped");
    expect(s.log.some((l) => l.at === "2026-10-21T08:00" && l.text === "skipped INV-2304: snoozed until 23 Oct by Nurul")).toBe(true);
    expect(rowOf(act(s, advance("2026-10-23T09:00")), "INV-2304")).toMatchObject({ state: "remind", tier: 1 });
  });

  it("refuses today, a past date, an impossible date, or one beyond 30 days", () => {
    for (const until of ["2026-10-20", "2026-10-19", "2026-11-31", "2026-11-20", "next week"]) {
      expect(refused(scanned(), { type: "SNOOZE_REMINDER", invoiceId: "INV-2304", until }).error).toMatch(/after today and within 30 days/);
    }
    expect(apply(scanned(), { type: "SNOOZE_REMINDER", invoiceId: "INV-2304", until: "2026-11-19" }).error).toBeUndefined();
  });
});

describe("mark disputed", () => {
  it("sets the invoice disputed, pauses reminders (M5), and is logged with the actor", () => {
    const s = act(act(scanned(), as("clerk")), { type: "MARK_DISPUTED", invoiceId: "INV-2310" });
    expect(invoiceOf(s, "INV-2310").status).toBe("disputed");
    expect(rowOf(s, "INV-2310")).toMatchObject({ state: "skipped", reason: "invoice disputed" });
    expect(s.log.at(-1)).toMatchObject({ kind: "USER", actor: "Nurul", text: "marked INV-2310 disputed: reminders paused (M5)" });
    // Still paused a week later.
    expect(rowOf(act(s, advance("2026-10-28T09:00")), "INV-2310").state).toBe("skipped");
  });
});

describe("I'll call instead", () => {
  const called = () => act(act(scanned(), as("owner")), { type: "CALL_INSTEAD", invoiceId: "INV-2268" });

  it("records a phone follow-up, sends no message, takes the row off today's plan, and is logged", () => {
    const s = called();
    const inv = invoiceOf(s, "INV-2268");
    expect(inv.calls).toEqual([{ at: "2026-10-20T08:00", by: "Lim Siew Lan" }]);
    expect(inv.reminders).toHaveLength(2);
    expect(rowOf(s, "INV-2268")).toMatchObject({ state: "sent_today", rule: "FR-C9", reason: "phone call instead, 08:00 by Lim Siew Lan" });
    expect(s.log.at(-1)).toMatchObject({
      kind: "USER",
      actor: "Lim Siew Lan",
      text: "will call instead of sending Tier 2 INV-2268: phone follow-up recorded",
    });
  });

  it("counts as contact for 5 days (R2), then the same tier is proposed again", () => {
    const s = act(called(), advance("2026-10-24T09:00"));
    expect(rowOf(s, "INV-2268")).toMatchObject({ state: "skipped", reason: "phone call 20 Oct by Lim Siew Lan, under 5 days ago" });
    expect(rowOf(act(s, advance("2026-10-25T09:00")), "INV-2268")).toMatchObject({ state: "remind", tier: 2 });
  });
});

describe("Owner rejects an unverified claim (PRD §22 row 2)", () => {
  const kilang = (s: State) => rowOf(s, "INV-2310");

  it("Clerk cannot; state unchanged", () => {
    const clerk = act(playDemo().final, as("clerk"));
    const r = refused(clerk, { type: "REJECT_CLAIM", invoiceId: "INV-2310" });
    expect(r.error).toMatch(/Only the Owner/);
    expect(r.state).toBe(clerk);
  });

  it("after the slip request was sent: clears the claim, reminders resume, logged", () => {
    const { final } = playDemo();
    const later = act(final, advance("2026-10-27T09:00"));
    expect(kilang(later)).toMatchObject({ state: "skipped", reason: "customer says paid; waiting for bank check" });
    const s = act(act(later, as("owner")), { type: "REJECT_CLAIM", invoiceId: "INV-2310" });
    expect(invoiceOf(s, "INV-2310").openClaimMessageId).toBeNull();
    expect(kilang(s)).toMatchObject({ state: "remind", tier: 1 });
    expect(s.log.at(-1)).toMatchObject({
      kind: "USER",
      actor: "Lim Siew Lan",
      text: "rejected unverified claim on INV-2310: not in the bank, reminders resume (M5)",
      refs: ["INV-2310", "m-kilang"],
    });
  });

  it("before the reply: also closes the open hand-off", () => {
    const { kilangRead } = playDemo();
    const s = act(act(kilangRead, as("owner")), { type: "REJECT_CLAIM", invoiceId: "INV-2310" });
    expect(s.handoffs.find((h) => h.kind === "claim_unverified")).toMatchObject({ resolved: "reject_claim", resolvedBy: "Lim Siew Lan" });
  });

  it("refuses a verified claim and an invoice with no claim", () => {
    const { verified } = playDemo();
    expect(refused(act(verified, as("owner")), { type: "REJECT_CLAIM", invoiceId: "INV-2304" }).error).toMatch(/matched a bank line/);
    expect(refused(scanned(), { type: "REJECT_CLAIM", invoiceId: "INV-2331" }).error).toBe("This invoice has no open payment claim.");
  });
});
