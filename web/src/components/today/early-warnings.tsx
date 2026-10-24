"use client";
// R6 / FR-B3: early-warning cards, Owner only. A neutral checklist of the
// owner's own levers; Kutip never names or recommends a lender.
import { CircleCheck, Square, TriangleAlert } from "lucide-react";
import { useKutip } from "@/lib/store";
import { Card, RuleTag, cx } from "@/components/ui";
import { fmtDate, fmtDateTime, fmtRM, type State, type Warning } from "@/engine/model";
import { forecast } from "@/engine/rules";
import { warningOptions } from "@/engine/reducer";
import { daysAwayText } from "./bits";

export default function EarlyWarnings() {
  const state = useKutip((s) => s.state);
  if (state.role !== "owner" || state.warnings.length === 0) return null;
  return (
    <div className="space-y-3">
      {state.warnings.map((w) => (
        <WarningCard key={w.id} state={state} w={w} />
      ))}
    </div>
  );
}

function WarningCard({ state, w }: { state: State; w: Warning }) {
  const dispatch = useKutip((s) => s.dispatch);
  const outflow = state.outflows.find((o) => o.id === w.outflowId);
  const now = forecast(state).find((f) => f.outflowId === w.outflowId);
  const options = warningOptions(state, w.outflowId);
  if (!outflow) return null;

  const stillShort = now !== undefined && now.forecast < 0;
  return (
    <Card tone={stillShort ? "warn" : "good"}>
      <div className="flex items-start justify-between gap-3 border-b border-hairline px-4 py-3">
        <div className="flex items-start gap-2.5">
          <TriangleAlert className={cx("mt-0.5 h-4 w-4 shrink-0", stillShort ? "text-amber-700" : "text-emerald-700")} aria-hidden />
          <div>
            <div className={cx("font-mono text-xs font-medium", stillShort ? "text-amber-800" : "text-emerald-700")}>
              Early warning · {fmtDate(outflow.dueDate)} {outflow.short}
            </div>
            <div className="mt-0.5 text-[15px] font-semibold tracking-[-0.01em] text-ink">
              {now === undefined
                ? `${outflow.label}: bill date has passed`
                : stillShort
                  ? `Short ${fmtRM(now.gap)} for ${outflow.short} ${daysAwayText(now.daysAway)}, if nobody else pays`
                  : `Now covered (${fmtRM(now.forecast, { sign: true })}) for ${outflow.short}`}
            </div>
            <div className="mt-0.5 text-xs text-ink2 tabular-nums">
              Raised {fmtDateTime(w.raisedAt)} at a gap of {fmtRM(w.gap)} · {outflow.label} {fmtRM(outflow.amount)}
            </div>
          </div>
        </div>
        <RuleTag id="R6" />
      </div>
      <div className="px-4 py-3">
        <div className="mb-2 text-xs font-medium text-ink2">Your options (tick what you will do; each choice is logged)</div>
        <ul className="grid gap-1.5 sm:grid-cols-2">
          {options.map((opt) => {
            const chosen = w.chosen.includes(opt);
            return (
              <li key={opt}>
                <button
                  type="button"
                  disabled={chosen}
                  onClick={() => dispatch({ type: "CHOOSE_WARNING_OPTION", warningId: w.id, option: opt })}
                  className={cx(
                    "flex min-h-[38px] w-full items-center gap-2 rounded-[2px] border px-2.5 py-2 text-left text-[13px] transition-colors",
                    chosen
                      ? "cursor-default border-emerald-300 bg-emerald-50 text-emerald-900"
                      : "border-line bg-surface text-ink hover:border-navy hover:bg-canvas",
                  )}
                >
                  {chosen ? (
                    <CircleCheck className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                  ) : (
                    <Square className="h-4 w-4 shrink-0 text-ink2" aria-hidden />
                  )}
                  <span>{opt}</span>
                </button>
              </li>
            );
          })}
        </ul>
        <div className="mt-3 text-[11px] text-ink2">Kutip lists options only. It does not recommend a lender.</div>
      </div>
    </Card>
  );
}
