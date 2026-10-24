"use client";
// FR-A4: the Owner enters today's bank balance. The Connect page renders this
// for the Owner only, and the engine refuses ENTER_BANK_BALANCE from the Clerk.
import { useState } from "react";
import { Wallet } from "lucide-react";
import { Badge, Button, Card, CardHeader, NavyPanel, NavyRow, RuleTag } from "@/components/ui";
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
      <CardHeader kicker="FR-A4 · cash position" title="Today's bank balance" right={<Badge tone="violet">Owner only</Badge>} />
      <div className="space-y-3 px-4 py-3">
        <NavyPanel className="p-4">
          <NavyRow k="Bank balance" v={fmtRM(b.amount, { cents: true })} />
          <NavyRow k="Entered" v={`${fmtDateTime(b.enteredAt)} · ${b.enteredBy}`} />
          <NavyRow k="Receipts approved since" v={fmtRM(state.approvedReceiptTotal, { cents: true })} />
          <NavyRow total k="Cash for the forecast" v={fmtRM(cashNow(state), { cents: true })} />
        </NavyPanel>
        <form
          className="space-y-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <label className="block text-xs font-medium text-ink2" htmlFor="bank-balance">
            Balance shown by the bank now (RM)
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
              className="h-[34px] w-full rounded-[2px] border border-line bg-surface px-2.5 font-mono text-[13px] tabular-nums text-ink placeholder:text-ink3 focus:border-navy focus:outline-none aria-[invalid=true]:border-rose-700"
            />
            <Button type="submit" disabled={amount === null || bad}>
              <Wallet className="h-4 w-4" aria-hidden />
              Save
            </Button>
          </div>
          {bad && <div className="text-[11px] text-rose-700">Enter an amount of zero or more, like 12,000.00.</div>}
          {saved && <div className="text-[11px] text-emerald-700">Saved and logged with your name. The cash meters on Today use it now.</div>}
          <p className="text-[11px] text-ink3">
            Cash = this balance + receipts a person approves after it <RuleTag id="F1" />. The Clerk never sees this figure, only &ldquo;gap: yes/no&rdquo;.
          </p>
        </form>
      </div>
    </Card>
  );
}
