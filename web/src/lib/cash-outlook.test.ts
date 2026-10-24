import { describe, expect, it } from "vitest";
import { seedState } from "../engine/seed";
import { forecast, cashNow } from "../engine/rules";
import { cashStages } from "./cash-outlook";

describe("cash outlook presentation data", () => {
  it("agrees with the rules engine at every bill date, including negative balances", () => {
    const state = seedState();
    const stages = cashStages(state);
    expect(stages[0].balance).toBe(cashNow(state));
    for (const bill of forecast(state)) expect(stages.find((s) => s.date === bill.dueDate)?.balance).toBe(bill.forecast);
    expect(stages.some((s) => s.balance < 0)).toBe(true);
  });
  it("groups same-day bills and income into one final balance", () => {
    const state = seedState();
    state.outflows.push({ ...state.outflows[0], id: "extra-bill", amount: 12345 });
    const stages = cashStages(state);
    const date = state.outflows[0].dueDate;
    expect(stages.filter((s) => s.id === date)).toHaveLength(1);
    expect(stages.find((s) => s.id === date)?.balance).toBe(forecast(state).find((f) => f.dueDate === date)?.forecast);
  });
  it("recalculates from approved cash and respects the forecast horizon", () => {
    const state = seedState();
    state.approvedReceiptTotal = 277000;
    state.outflows.push({ ...state.outflows[0], id: "later", dueDate: "2027-01-01" });
    const stages = cashStages(state);
    expect(stages.some((s) => s.date === "2027-01-01")).toBe(false);
    expect(stages[0].balance).toBe(state.bankBalance.amount + 277000);
    for (const bill of forecast(state)) expect(stages.find((s) => s.date === bill.dueDate)?.balance).toBe(bill.forecast);
  });
  it("produces a read-only preview without running a scan or changing the demo", () => {
    const state = seedState();
    const before = structuredClone(state);
    cashStages(state);
    expect(state).toEqual(before);
    expect(state.scannedDays).toHaveLength(0);
  });
});
