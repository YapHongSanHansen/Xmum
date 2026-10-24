"use client";
// FR-A4: the Owner enters today's bank balance. The Connect page renders this
// for the Owner only, and the engine refuses ENTER_BANK_BALANCE from the Clerk.
import { useState } from "react";
import { Badge, Button, Card, CardHeader, RuleTag } from "@/components/ui";
import { fmtDateTime, fmtRM } from "@/engine/model";
import { parseAmount } from "@/engine/imports";
import { cashNow } from "@/engine/rules";
import { useKutip } from "@/lib/store";

export function BalanceEntry() {
  const state = useKutip((s) => s.state);
  const dispatch = useKutip((s) => s.dispatch);
  const [value, setValue] = useState("");
  const [saved, setSaved] = useState(false);
  const amount = value.trim() ? parseAmount(value) : null;
  const bad = value.trim() !== "" && (amount === null || amount < 0);
  const b = state.bankBalance;

  const save = () => {
    if (amount === null || bad) return;
    if (dispatch({ type: "ENTER_BANK_BALANCE", amount })) {
      setValue("");
      setSaved(true);
    }
  };

  return (
    <Card>
      <CardHeader title="Bank balance" right={<Badge tone="violet">Owner only</Badge>} />
      <div className="space-y-4 px-5 py-4">
        <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1.5 text-[13px]">
          <dt className="text-ink2">Balance</dt>
          <dd className="num text-right text-ink">{fmtRM(b.amount, { cents: true })}</dd>
          <dt className="text-ink2">Entered</dt>
          <dd className="num text-right text-xs text-ink2">
            {fmtDateTime(b.enteredAt)} · {b.enteredBy}
          </dd>
          <dt className="text-ink2">Approved since</dt>
          <dd className="num text-right text-ink">{fmtRM(state.approvedReceiptTotal, { cents: true })}</dd>
          <dt className="flex items-center gap-1.5 border-t border-hairline pt-1.5 font-medium text-ink">
            Cash for forecast <RuleTag id="F1" />
          </dt>
          <dd className="num border-t border-hairline pt-1.5 text-right font-semibold text-ink">{fmtRM(cashNow(state), { cents: true })}</dd>
        </dl>
        <form
          className="space-y-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <label className="block text-xs text-ink2" htmlFor="bank-balance">
            Balance now (RM)
          </label>
          <div className="flex gap-2">
            <input
              id="bank-balance"
              inputMode="decimal"
              autoComplete="off"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setSaved(false);
              }}
              placeholder="e.g. 9,800.00"
              aria-invalid={bad}
              className="h-[34px] w-full rounded-xl border border-line bg-surface px-2.5 font-mono text-[13px] tabular-nums text-ink placeholder:text-ink3 focus:border-navy focus:outline-none aria-[invalid=true]:border-rose-700"
            />
            <Button type="submit" disabled={amount === null || bad}>
              Save
            </Button>
          </div>
          {bad && <div className="text-xs text-rose-700">Enter 0 or more, e.g. 12,000.00</div>}
          {saved && <div className="text-xs text-emerald-700">Saved · logged</div>}
        </form>
      </div>
    </Card>
  );
}
