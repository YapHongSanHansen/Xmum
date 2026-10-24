"use client";
// FR-B4 / FR-B5: one meter per upcoming outflow. The Owner sees amounts; the
// Clerk sees only "Gap: yes/no" and the due date (no balance, bill or gap figure).
import { useKutip } from "@/lib/store";
import { Badge, Card, CardHeader, Empty, Figure, NavyPanel, NavyRow, RuleTag, cx } from "@/components/ui";
import { fmtDate, fmtDateTime, fmtRM, fmtWeekday, type State } from "@/engine/model";
import { HORIZON_DAYS, cashNow, forecast, type OutflowForecast } from "@/engine/rules";
import { daysAwayText } from "./bits";

export default function CashMeters() {
  const state = useKutip((s) => s.state);
  const isOwner = state.role === "owner";
  const rows = forecast(state);

  const meters =
    rows.length === 0 ? (
      <Empty>No bills due in the next {HORIZON_DAYS} days.</Empty>
    ) : (
      <div className="grid gap-3 sm:grid-cols-2">
        {rows.map((f) => (isOwner ? <OwnerMeter key={f.outflowId} f={f} /> : <ClerkMeter key={f.outflowId} f={f} />))}
      </div>
    );

  return (
    <Card>
      <CardHeader kicker="Cash gap meters" title={`Bills due in the next ${HORIZON_DAYS} days`} right={<RuleTag id="F1" />} />
      {isOwner ? (
        // Owner only (FR-B5): the cash position never renders for the Clerk.
        <div className="grid items-start gap-4 p-4 lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)]">
          <CashPosition state={state} />
          {meters}
        </div>
      ) : (
        <div className="space-y-3 p-4">
          <div className="border border-hairline bg-canvas px-3 py-2 text-xs text-ink2">
            Amounts are visible to the Owner only. You see whether each bill has a gap.
          </div>
          {meters}
        </div>
      )}
    </Card>
  );
}

/** Owner-only navy summary: bank balance + approved receipts = cash now. */
function CashPosition({ state }: { state: State }) {
  return (
    <NavyPanel>
      <div className="font-mono text-xs text-navy-muted">Cash now · bank + approved receipts</div>
      <Figure tone="white">{fmtRM(cashNow(state))}</Figure>
      <div className="flex flex-col gap-1.5 border-t border-white/20 pt-2.5">
        <NavyRow k="Bank" v={fmtRM(state.bankBalance.amount)} />
        <div className="-mt-1 text-[11px] text-navy-muted">
          entered {fmtDateTime(state.bankBalance.enteredAt)} by {state.bankBalance.enteredBy}
        </div>
        <NavyRow k="+ Approved receipts" v={fmtRM(state.approvedReceiptTotal)} />
        <NavyRow k="= Cash" v={fmtRM(cashNow(state))} total />
      </div>
      <p className="text-[11px] leading-relaxed text-navy-muted">Plus invoices from on-time payers due before each bill; promises are not counted.</p>
    </NavyPanel>
  );
}

const dueLine = (f: OutflowForecast) => `Due ${fmtWeekday(f.dueDate)} ${fmtDate(f.dueDate)} · ${daysAwayText(f.daysAway)}`;

function OwnerMeter({ f }: { f: OutflowForecast }) {
  const short = f.forecast < 0;
  // Share of this bill covered by the money forecast to be there just before it.
  const before = f.forecast + f.amount;
  const covered = f.amount > 0 ? Math.max(0, Math.min(1, before / f.amount)) : 1;
  return (
    <div className={cx("border border-line border-l-[3px] bg-surface p-4", short ? "border-l-rose-700" : "border-l-emerald-700")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-mono text-[11px] text-ink2">{dueLine(f)}</div>
          <div className="text-[13px] font-semibold text-ink">{f.label}</div>
        </div>
        <div className="text-right">
          <div className="num text-[13px] text-ink">{fmtRM(f.amount)}</div>
          <div className="text-[11px] text-ink2">bill</div>
        </div>
      </div>
      <div className="mt-3">
        <div className={cx("font-mono text-[11px] font-medium", short ? "text-rose-700" : "text-emerald-700")}>{short ? "Short" : "Covered"}</div>
        <Figure tone={short ? "bad" : "good"} className="mt-1 block">
          {short ? fmtRM(f.gap) : fmtRM(f.forecast, { sign: true })}
        </Figure>
      </div>
      <div
        className="mt-3 h-1.5 overflow-hidden bg-hairline"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(covered * 100)}
        aria-label={`${f.short} covered`}
      >
        <div className={cx("h-full", short ? "bg-rose-700" : "bg-emerald-700")} style={{ width: `${covered * 100}%` }} />
      </div>
      <div className="num mt-1.5 text-xs text-ink2">{Math.round(covered * 100)}% of this bill covered</div>
    </div>
  );
}

function ClerkMeter({ f }: { f: OutflowForecast }) {
  const short = f.forecast < 0;
  return (
    <div className={cx("flex items-center justify-between gap-3 border border-line border-l-[3px] bg-surface px-4 py-3", short ? "border-l-rose-700" : "border-l-emerald-700")}>
      <div className="min-w-0">
        <div className="font-mono text-[11px] text-ink2">{dueLine(f)}</div>
        <div className="text-[13px] font-semibold text-ink">Bill due {fmtDate(f.dueDate)}</div>
      </div>
      <Badge tone={short ? "rose" : "emerald"}>Gap: {short ? "yes" : "no"}</Badge>
    </div>
  );
}
