"use client";
// R6 / FR-B3: early-warning cards, Owner only. A neutral checklist of the
// owner's own levers; Kachingg never names or recommends a lender.
import { Check, TriangleAlert } from "lucide-react";
import { useKachingg } from "@/lib/store";
import { Card, RuleTag, cx } from "@/components/ui";
import { fmtDateTime, fmtRM, type State, type Warning } from "@/engine/model";
import { forecast } from "@/engine/rules";
import { warningOptions } from "@/engine/reducer";
import { daysAwayText } from "./bits";

export default function EarlyWarnings() {
  const state = useKachingg((s) => s.state);
  if (state.role !== "owner" || state.warnings.length === 0) return null;
  return (
    <div className="space-y-4">
      {state.warnings.map((w) => (
        <WarningCard key={w.id} state={state} w={w} />
      ))}
    </div>
  );
}

function WarningCard({ state, w }: { state: State; w: Warning }) {
  const dispatch = useKachingg((s) => s.dispatch);
  const outflow = state.outflows.find((o) => o.id === w.outflowId);
  const now = forecast(state).find((f) => f.outflowId === w.outflowId);
  const options = warningOptions(state, w.outflowId);
  if (!outflow) return null;

  const stillShort = now !== undefined && now.forecast < 0;
  const raised = `Raised ${fmtDateTime(w.raisedAt)} at a gap of ${fmtRM(w.gap)} · ${outflow.label} ${fmtRM(outflow.amount)}`;
  return (
    <Card tone={stillShort ? "warn" : "good"} className="space-y-4 p-6">
      <div className="flex items-start gap-2.5">
        <TriangleAlert className={cx("mt-0.5 h-4 w-4 shrink-0", stillShort ? "text-amber-700" : "text-emerald-700")} aria-hidden />
        <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-ink" title={raised}>
          <span className="sr-only">Early warning: </span>
          {now === undefined
            ? `${outflow.label}: bill date has passed`
            : stillShort
              ? `Short ${fmtRM(now.gap)} for ${outflow.short} ${daysAwayText(now.daysAway)}`
              : `Now covered (${fmtRM(now.forecast, { sign: true })}) for ${outflow.short}`}
        </h3>
        <span className="ml-auto shrink-0">
          <RuleTag id="R6" />
        </span>
      </div>
      <ul className="flex flex-wrap gap-2" aria-label="Options">
        {options.map((opt) => {
          const chosen = w.chosen.includes(opt);
          return (
            <li key={opt}>
              <button
                type="button"
                disabled={chosen}
                aria-pressed={chosen}
                onClick={() => dispatch({ type: "CHOOSE_WARNING_OPTION", warningId: w.id, option: opt })}
                className={cx(
                  "inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border px-3 py-2 text-left text-xs transition-colors",
                  chosen
                    ? "cursor-default border-emerald-700 bg-emerald-50 font-medium text-emerald-800"
                    : "border-line-strong bg-surface text-ink hover:border-navy hover:bg-canvas",
                )}
              >
                {chosen && <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />}
                {opt}
              </button>
            </li>
          );
        })}
      </ul>
      <div className="text-xs text-ink2">Options only · no lender advice</div>
    </Card>
  );
}
