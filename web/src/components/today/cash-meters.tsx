"use client";
// FR-B4 / FR-B5: one meter per upcoming outflow. The Owner sees amounts; the
// Clerk sees only "Gap: yes/no" and the due date (no balance, bill or gap figure).
import { useKutip } from "@/lib/store";
import { Badge, Empty, Figure, NavyPanel, cx } from "@/components/ui";
import { fmtDate, fmtDateTime, fmtRM, type State } from "@/engine/model";
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
      rows.map((f) => (isOwner ? <OwnerMeter key={f.outflowId} f={f} /> : <ClerkMeter key={f.outflowId} f={f} />))
    );

  return (
    <section aria-labelledby="cash-meters-title">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 id="cash-meters-title" className="text-[13px] font-medium text-ink2">
          Next {HORIZON_DAYS} days
        </h2>
        {!isOwner && <span className="text-xs text-ink2">Amounts: Owner only</span>}
      </div>
      {isOwner ? (
        // Owner only (FR-B5): the cash position never renders for the Clerk.
        <div className="grid items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <CashPosition state={state} />
          {meters}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">{meters}</div>
      )}
    </section>
  );
}

/** Owner-only navy summary: bank balance + approved receipts = cash now. */
function CashPosition({ state }: { state: State }) {
  const entered = `Bank balance entered ${fmtDateTime(state.bankBalance.enteredAt)} by ${state.bankBalance.enteredBy}`;
  return (
    <NavyPanel className="justify-between gap-4 sm:col-span-2 lg:col-span-1">
      <div>
        <div className="text-[13px] text-navy-muted">Cash now</div>
        <Figure tone="white" className="mt-2 block">
          {fmtRM(cashNow(state))}
        </Figure>
      </div>
      <div className="space-y-1 text-xs text-navy-muted">
        <div className="flex justify-between gap-3">
          <span>Bank</span>
          <span className="num">{fmtRM(state.bankBalance.amount)}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span>Approved receipts</span>
          <span className="num">+{fmtRM(state.approvedReceiptTotal)}</span>
        </div>
        <details className="pt-1 text-[11px] leading-relaxed">
          <summary className="cursor-pointer text-navy-muted hover:text-white">Details</summary>
          <p className="mt-1">{entered}.</p>
          <p>Bills also count invoices from on-time payers due before them. Promises are not counted.</p>
        </details>
      </div>
    </NavyPanel>
  );
}

function OwnerMeter({ f }: { f: OutflowForecast }) {
  const short = f.forecast < 0;
  // Share of this bill covered by the money forecast to be there just before it.
  const before = f.forecast + f.amount;
  const covered = f.amount > 0 ? Math.max(0, Math.min(1, before / f.amount)) : 1;
  const pct = Math.round(covered * 100);
  return (
    <div className="flex flex-col justify-between gap-4 border border-line bg-surface p-5">
      <div className="flex items-baseline justify-between gap-3 text-[13px]">
        <div className="min-w-0 truncate text-ink" title={`Due ${fmtDate(f.dueDate)}, ${daysAwayText(f.daysAway)}`}>
          <span className="num text-ink2">{fmtDate(f.dueDate)}</span> · {f.label}
        </div>
        <div className="num shrink-0 text-xs text-ink2" title="Bill amount">
          {fmtRM(f.amount)}
        </div>
      </div>
      <div className={cx("flex items-baseline gap-2", short ? "text-rose-700" : "text-emerald-700")}>
        <span className="text-[15px] font-medium">{short ? "Short" : "Covered"}</span>
        <Figure tone={short ? "bad" : "good"}>{short ? fmtRM(f.gap) : fmtRM(f.forecast, { sign: true })}</Figure>
      </div>
      <div className="flex items-center gap-3">
        <div
          className="h-1 flex-1 overflow-hidden bg-hairline"
          role="meter"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          aria-label={`${f.short} covered`}
        >
          <div className={cx("h-full", short ? "bg-rose-700" : "bg-emerald-700")} style={{ width: `${covered * 100}%` }} />
        </div>
        <span className="num w-9 text-right text-xs text-ink2">{pct}%</span>
      </div>
    </div>
  );
}

function ClerkMeter({ f }: { f: OutflowForecast }) {
  const short = f.forecast < 0;
  return (
    <div className="flex items-center justify-between gap-3 border border-line bg-surface px-5 py-4">
      <div className="text-[13px] text-ink" title={`Due ${daysAwayText(f.daysAway)}`}>
        Bill due <span className="num">{fmtDate(f.dueDate)}</span>
      </div>
      <Badge tone={short ? "rose" : "emerald"}>Gap: {short ? "yes" : "no"}</Badge>
    </div>
  );
}
