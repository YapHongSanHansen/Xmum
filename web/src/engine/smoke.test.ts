import { describe, expect, it } from "vitest";
import { run } from "./reducer";
import { seedState } from "./seed";
import { CACHED_EXTRACTIONS, CACHED_MODEL } from "./cached";
import { chasePlan, forecast } from "./rules";

const ex = (id: string) => ({ type: "APPLY_EXTRACTION" as const, messageId: id, extraction: CACHED_EXTRACTIONS[id], model: CACHED_MODEL, cached: true });

describe("demo script smoke", () => {
  it("runs end to end on cached extractions", () => {
    let s = run(seedState(), [{ type: "RUN_SCAN" }]);
    expect(forecast(s).map((f) => f.forecast / 100)).toEqual([-2000, -13200]);
    expect(chasePlan(s).filter((r) => r.state === "remind").map((r) => `${r.invoice.number}:T${r.tier}`)).toEqual(["INV-2304:T1", "INV-2310:T1", "INV-2268:T2"]);
    s = run(s, [
      { type: "CHOOSE_WARNING_OPTION", warningId: s.warnings[0].id, option: "Ask the diesel supplier to move the 5 Nov bill" },
      { type: "SET_ROLE", role: "clerk" },
      { type: "APPROVE_REMINDER", invoiceId: "INV-2304", text: "x", edited: false },
      { type: "APPROVE_REMINDER", invoiceId: "INV-2310", text: "x", edited: false },
      { type: "SET_ROLE", role: "owner" },
      { type: "APPROVE_REMINDER", invoiceId: "INV-2268", text: "x", edited: false },
      { type: "ADVANCE", to: "2026-10-20T11:05" },
      ex("m-hupseng"),
      { type: "SET_ROLE", role: "clerk" },
    ]);
    s = run(s, [
      { type: "RESOLVE_HANDOFF", handoffId: s.handoffs[0].id, option: "2026-10-30" },
      { type: "ADVANCE", to: "2026-10-21T10:20" },
      { type: "ENTER_BOOKING", customerId: "c-hupseng", route: "Klang → Johor Bahru", amount: 240000, terms: "credit", creditDays: 60 },
      { type: "SET_ROLE", role: "owner" },
    ]);
    s = run(s, [
      { type: "DECIDE_CREDIT", bookingId: s.bookings[0].id, decision: "deposit_requested", depositPct: 50 },
      { type: "ADVANCE", to: "2026-10-23T14:30" },
      ex("m-megabina"),
      { type: "SET_ROLE", role: "clerk" },
    ]);
    s = run(s, [{ type: "APPROVE_RECEIPT", receiptId: s.receipts[0].id }]);
    expect(forecast(s)[0].forecast / 100).toBe(770);
    s = run(s, [
      { type: "SET_ROLE", role: "owner" },
      { type: "DECIDE_DEDUCTION", receiptId: s.receipts[0].id, decision: "accepted" },
      { type: "ADVANCE", to: "2026-10-23T15:00" },
      ex("m-kilang"),
      { type: "SET_ROLE", role: "clerk" },
    ]);
    s = run(s, [{ type: "RESOLVE_HANDOFF", handoffId: s.handoffs.find((x) => x.kind === "claim_unverified")!.id, option: "send_reply" }]);
    console.log(s.log.map((l) => `${l.seq}\t${l.at}\t${l.actor}\t${l.text}`).join("\n"));
  });
});
