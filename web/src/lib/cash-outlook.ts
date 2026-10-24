import { addDays, dayOf, fmtRM, outstanding, type State } from "../engine/model";
import { cashNow, HORIZON_DAYS, isExpectedInflow } from "../engine/rules";

export interface CashStage {
  id: string;
  label: string;
  date: string;
  balance: number;
  detail: string;
}
export function cashStages(state: State): CashStage[] {
  const today = dayOf(state.now);
  const end = addDays(today, HORIZON_DAYS);
  const stages: CashStage[] = [
    {
      id: "now",
      label: "Available now",
      date: today,
      balance: cashNow(state),
      detail: "Your entered bank balance plus approved receipts. Unverified payments are never included.",
    },
  ];
  const events = new Map<string, { income: number; bills: number; labels: string[] }>();
  for (const invoice of state.invoices) {
    if (!isExpectedInflow(state, invoice) || invoice.dueDate > end) continue;
    const entry = events.get(invoice.dueDate) ?? { income: 0, bills: 0, labels: [] };
    entry.income += outstanding(invoice);
    events.set(invoice.dueDate, entry);
  }
  for (const bill of state.outflows) {
    if (bill.dueDate < today || bill.dueDate > end) continue;
    const entry = events.get(bill.dueDate) ?? { income: 0, bills: 0, labels: [] };
    entry.bills += bill.amount;
    entry.labels.push(bill.short);
    events.set(bill.dueDate, entry);
  }
  let balance = cashNow(state);
  for (const [date, event] of [...events.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    balance += event.income - event.bills;
    const parts = [
      event.income > 0 ? `${fmtRM(event.income)} expected from customers with a reliable on-time history` : "",
      event.bills > 0 ? `${fmtRM(event.bills)} due for ${event.labels.join(" and ")}` : "",
    ].filter(Boolean);
    stages.push({
      id: date,
      label: event.bills > 0 ? `After ${event.labels.join(" & ")}` : "Expected payments",
      date,
      balance,
      detail: `${parts.join("; ")}. Promises to pay are excluded.`,
    });
  }
  return stages;
}
