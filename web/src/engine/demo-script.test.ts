// PRD §13 demo script on cached extractions must reproduce the §13a activity log
// (FR-G2). Replaces the earlier smoke test.
//
// Known, accepted difference: on the 21, 22 and 23 Oct scans the engine also logs
// one R2 line per skipped invoice ("skipped INV-2268: promise 30 Oct not reached",
// "skipped INV-2296: …") and an R2 "no new reminders today" line. §13a folds these
// into "scan: no new reminders (R2)" (21 Oct) and bare "scan" (22, 23 Oct). The
// test removes exactly those extra lines, checks they are what we expect, and then
// requires §13a entry for entry.
import { describe, expect, it } from "vitest";
import type { LogEntry } from "./model";
import { chasePlan, forecast } from "./rules";
import { RM, playDemo } from "./testkit";

/** §13a: [demo time, actor, key phrases the action must contain]. */
const EXPECTED: [string, string, string[]][] = [
  ["2026-10-20T08:00", "SYSTEM", ["scan: 4 overdue; 31 Oct salaries short RM2,000; 5 Nov diesel short RM13,200"]],
  ["2026-10-20T08:00", "R6", ["early warning raised: 31 Oct salaries short RM2,000"]],
  ["2026-10-20T08:00", "R2", ["skipped INV-2296: promise 30 Oct not reached"]],
  ["2026-10-20T08:00", "R3", ["chase plan: 1 INV-2304 (closes the gap), 2 INV-2310, 3 INV-2268"]],
  ["2026-10-20T08:00", "Lim Siew Lan", ["early-warning option chosen: ask", "supplier to move the 5 Nov bill"]],
  ["2026-10-20T08:00", "Nurul", ["approved Tier 1 INV-2304, sent"]],
  ["2026-10-20T08:00", "Nurul", ["approved Tier 1 INV-2310, sent"]],
  ["2026-10-20T08:00", "Lim Siew Lan", ["approved Tier 2 INV-2268, sent"]],
  ["2026-10-20T11:05", "INBOUND", ["Syarikat Hup Seng Trading message (received 11:02)"]],
  ["2026-10-20T11:05", "AI", ["promise to pay; date ambiguous (23 Oct or 30 Oct)"]],
  ["2026-10-20T11:05", "M4", ["hand-off raised: Which Friday?"]],
  ["2026-10-20T11:05", "Nurul", ["confirmed promise date 30 Oct"]],
  ["2026-10-20T11:05", "M5", ["reminders paused for INV-2268 until 31 Oct"]],
  ["2026-10-21T08:00", "SYSTEM", ["scan"]],
  ["2026-10-21T10:20", "Nurul", ["entered booking: Syarikat Hup Seng Trading, RM2,400, credit"]],
  ["2026-10-21T10:20", "R4", ["credit check raised: INV-2268 46 days late, total RM9,250"]],
  ["2026-10-21T10:20", "Lim Siew Lan", ["credit decision: ask 50% deposit"]],
  ["2026-10-22T08:00", "SYSTEM", ["scan"]],
  ["2026-10-22T08:00", "R6", ["early warning raised: 5 Nov diesel short RM13,200"]],
  ["2026-10-23T08:00", "SYSTEM", ["scan"]],
  ["2026-10-23T14:30", "BANK", ["line 23/10 DUITNOW CR 2,770.00 MEGA BINA HARDW INV2304 (14:25)"]],
  ["2026-10-23T14:30", "INBOUND", ["Mega Bina Hardware Trading", "message + slip"]],
  ["2026-10-23T14:30", "AI", ["amount RM2,770.00 (0.98)", "invoice INV-2304 (0.97)", "deduction RM330.00 (0.90)"]],
  ["2026-10-23T14:30", "M1", ["claim VERIFIED against bank line"]],
  ["2026-10-23T14:30", "M3", ["deduction linked to DO-8812 (Bukit Raja)"]],
  ["2026-10-23T14:30", "Nurul", ["approved receipt RM2,770: INV-2304 PART_PAID, RM330 under review"]],
  ["2026-10-23T14:30", "SYSTEM", ["31 Oct salaries: covered (+RM770)"]],
  ["2026-10-23T14:30", "Lim Siew Lan", ["accepted RM330 deduction: INV-2304 PAID, credit note CN-0057 drafted"]],
  ["2026-10-23T15:00", "INBOUND", ["Kilang Perabot Jaya", "message"]],
  ["2026-10-23T15:00", "AI", ["says paid; no slip"]],
  ["2026-10-23T15:00", "M1", ["no bank line: claim not verified, not marked paid"]],
  ["2026-10-23T15:00", "Nurul", ["sent templated reply asking for the slip"]],
];

const QUIET_SCAN_DAYS = ["2026-10-21T08:00", "2026-10-22T08:00", "2026-10-23T08:00"];
const isExtraR2 = (l: LogEntry) => l.actor === "R2" && QUIET_SCAN_DAYS.includes(l.at);
const show = (l: LogEntry) => `${l.at} ${l.actor}: ${l.text}`;

describe("PRD §13 demo script → §13a activity log", () => {
  const demo = playDemo();
  const log = demo.final.log;

  it("step checkpoints match the §8 seed checks", () => {
    expect(forecast(demo.approved).map((f) => RM(f.forecast))).toEqual([-2000, -13200]);
    expect(forecast(demo.receiptApproved).map((f) => RM(f.forecast))).toEqual([770, -10430]);
    // The plan before approval is checked in rules.test.ts (R1/R3); after step 3 all three went out today.
    expect(chasePlan(demo.approved).filter((r) => r.state === "sent_today").map((r) => `${r.invoice.number}:T${r.tier}`)).toEqual([
      "INV-2268:T2",
      "INV-2304:T1",
      "INV-2310:T1",
    ]);
  });

  it("the only extra lines are R2 skip / no-new-reminder lines on the 21-23 Oct scans", () => {
    const extra = log.filter(isExtraR2);
    expect(extra.map(show)).toEqual(
      QUIET_SCAN_DAYS.flatMap((at) => [
        `${at} R2: skipped INV-2268: promise 30 Oct not reached`,
        `${at} R2: skipped INV-2296: promise 30 Oct not reached`,
        `${at} R2: no new reminders today`,
      ]),
    );
  });

  it("reproduces every §13a entry, in order, with the same actor, time and action", () => {
    const core = log.filter((l) => !isExtraR2(l));
    expect(core.map(show)).toHaveLength(EXPECTED.length);
    core.forEach((l, i) => {
      const [at, actor, phrases] = EXPECTED[i];
      const where = `§13a #${i + 1}: got "${show(l)}"`;
      expect(l.at, where).toBe(at);
      expect(l.actor, where).toBe(actor);
      for (const p of phrases) expect(l.text, where).toContain(p);
    });
  });

  it("each extra R2 line sits inside its day's scan block, right after the SYSTEM scan entry", () => {
    for (const at of QUIET_SCAN_DAYS) {
      const day = log.filter((l) => l.at === at);
      expect(day[0].actor).toBe("SYSTEM");
      expect(day.at(-1)!.text).toBe("no new reminders today");
    }
  });
});
