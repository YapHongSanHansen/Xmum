"use client";
// FR-B4 / FR-B5: one meter per upcoming outflow. The Owner sees amounts; the
// Clerk sees only "Gap: yes/no" and the due date (no balance, bill or gap figure).
import { Landmark } from "lucide-react";
import { useKutip } from "@/lib/store";
import { Badge, Card, CardHeader, Empty, RuleTag, cx } from "@/components/ui";
import { fmtDate, fmtDateTime, fmtRM, fmtWeekday } from "@/engine/model";
import { HORIZON_DAYS, cashNow, forecast, type OutflowForecast } from "@/engine/rules";
import { daysAwayText } from "./bits";

export default function CashMeters() {
  const state = useKutip((s) => s.state);
  const isOwner = state.role === "owner";
  const rows = forecast(state);

  return (
    <Card>
      <CardHeader
        kicker="Cash gap meters"
        title={`Bills due in the next ${HORIZON_DAYS} days`}
        right={<RuleTag id="F1" />}
      />
      <div className="space-y-3 p-4">
        {isOwner ? (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">
            <Landmark className="h-3.5 w-3.5 text-slate-500" aria-hidden />
            <span>
              Cash: bank <span className="font-medium tabular-nums text-slate-900">{fmtRM(state.bankBalance.amount)}</span> (entered{" "}
              {fmtDateTime(state.bankBalance.enteredAt)} by {state.bankBalance.enteredBy}) + approved receipts{" "}
              <span className="font-medium tabular-nums text-slate-900">{fmtRM(state.approvedReceiptTotal)}</span> ={" "}
              <span className="font-semibold tabular-nums text-slate-900">{fmtRM(cashNow(state))}</span>
            </span>
            <span className="text-slate-400">· plus invoices from on-time payers due before each bill; promises are not counted</span>
          </div>
        ) : (
          <div className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">
            Amounts are visible to the Owner only. You see whether each bill has a gap.
          </div>
        )}
        {rows.length === 0 ? (
          <Empty>No bills due in the next {HORIZON_DAYS} days.</Empty>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {rows.map((f) => (isOwner ? <OwnerMeter key={f.outflowId} f={f} /> : <ClerkMeter key={f.outflowId} f={f} />))}
          </div>
        )}
      </div>
    </Card>
  );
}

const dueLine = (f: OutflowForecast) => `Due ${fmtWeekday(f.dueDate)} ${fmtDate(f.dueDate)} · ${daysAwayText(f.daysAway)}`;

function OwnerMeter({ f }: { f: OutflowForecast }) {
  const short = f.forecast < 0;
  // Share of this bill covered by the money forecast to be there just before it.
  const before = f.forecast + f.amount;
  const covered = f.amount > 0 ? Math.max(0, Math.min(1, before / f.amount)) : 1;
  return (
    <div className={cx("rounded-md border p-3", short ? "border-rose-200 bg-rose-50/50" : "border-emerald-200 bg-emerald-50/50")}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{dueLine(f)}</div>
          <div className="text-sm font-semibold text-slate-900">{f.label}</div>
        </div>
        <div className="text-right text-sm font-semibold tabular-nums text-slate-900">{fmtRM(f.amount)}</div>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(covered * 100)} aria-label={`${f.short} covered`}>
        <div className={cx("h-full rounded-full", short ? "bg-rose-500" : "bg-emerald-500")} style={{ width: `${covered * 100}%` }} />
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 text-xs">
        <span className="text-slate-500 tabular-nums">{Math.round(covered * 100)}% of this bill covered</span>
        {short ? (
          <span className="font-semibold tabular-nums text-rose-700">Short {fmtRM(f.gap)}</span>
        ) : (
          <span className="font-semibold tabular-nums text-emerald-700">Covered {fmtRM(f.forecast, { sign: true })}</span>
        )}
      </div>
    </div>
  );
}

function ClerkMeter({ f }: { f: OutflowForecast }) {
  const short = f.forecast < 0;
  return (
    <div className={cx("flex items-center justify-between gap-3 rounded-md border p-3", short ? "border-rose-200 bg-rose-50/50" : "border-emerald-200 bg-emerald-50/50")}>
      <div>
        <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{dueLine(f)}</div>
        <div className="text-sm font-semibold text-slate-900">Bill due {fmtDate(f.dueDate)}</div>
      </div>
      <Badge tone={short ? "rose" : "emerald"}>Gap: {short ? "yes" : "no"}</Badge>
    </div>
  );
}
