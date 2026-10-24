"use client";
import { useState } from "react";
import { CalendarDays, Sparkles } from "lucide-react";
import { Badge, Card, CardHeader, stagger } from "@/components/ui";
import { CountUp } from "@/components/motion";
import { dayOf, fmtDate, fmtRM } from "@/engine/model";
import { cashStages } from "@/lib/cash-outlook";
import { useKachingg } from "@/lib/store";

const compact = new Intl.NumberFormat("en-MY", { notation: "compact", maximumFractionDigits: 1 });
/** Compact MYR for the chart labels, e.g. "−12.4K". `sen` may be mid-animation, so round first. */
const fmtCompact = (sen: number) => {
  const v = Math.round(sen);
  return `${v < 0 ? "−" : ""}${compact.format(Math.abs(v) / 100)}`;
};

export default function CashFlow() {
  const state = useKachingg((s) => s.state);
  const [selected, setSelected] = useState("now");
  const stages = cashStages(state);
  const active = stages.find((s) => s.id === selected) ?? stages[0];
  const scanned = state.scannedDays.includes(dayOf(state.now));
  const highest = Math.max(...stages.map((s) => s.balance), 100);
  const lowest = Math.min(...stages.map((s) => s.balance), 0);
  const range = highest - lowest;
  const zero = (highest / range) * 100;
  return (
    <Card rise={0} data-tour="cash-outlook">
      <CardHeader
        title="Cash outlook"
        kicker="A little clarity for the days ahead"
        right={<Badge tone={scanned ? "sky" : "slate"}>{scanned ? "30-day forecast" : "Forecast preview"}</Badge>}
      />
      <div className="px-6 pb-2 text-[11px] text-ink2">Projected balance after each event · MYR</div>
      <div className="flow-chart" role="group" aria-label="Projected cash balances. Select an event for details.">
        <div className="flow-columns" style={{ gridTemplateColumns: `repeat(${stages.length}, minmax(90px, 1fr))` }}>
          {stages.map((stage, i) => {
            const y = ((highest - stage.balance) / range) * 100;
            return (
              <button
                type="button"
                key={stage.id}
                className="flow-column"
                aria-pressed={active.id === stage.id}
                onClick={() => setSelected(stage.id)}
                aria-label={`${stage.label}, ${fmtDate(stage.date)}, projected ${fmtRM(stage.balance)}`}
              >
                <span className="flow-name">{stage.label}</span>
                <span className="flow-value">
                  <CountUp value={stage.balance} format={fmtCompact} />
                </span>
                <div className="flow-plot" aria-hidden>
                  <div className="flow-zero" style={{ top: `${zero}%` }} />
                  <div
                    className="flow-bar k-grow-y"
                    data-negative={stage.balance < 0}
                    style={{ ...stagger(i + 1), top: `${Math.min(y, zero)}%`, height: `${Math.abs(zero - y)}%` }}
                  />
                </div>
                <span className="flow-date">{stage.id === "now" ? "Today" : fmtDate(stage.date)}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="flow-note" aria-live="polite">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <div>
          <strong className="font-medium text-[#24395b]">
            {active.label} · {fmtRM(active.balance)}
          </strong>
          <p className="mt-1">{active.detail}</p>
        </div>
      </div>
    </Card>
  );
}

export function ClerkOverview() {
  const state = useKachingg((s) => s.state);
  return (
    <Card className="p-7" rise={0}>
      <span className="inline-flex rounded-full bg-sky-100 p-3 text-sky-700">
        <CalendarDays className="h-5 w-5" />
      </span>
      <h2 className="mt-5 text-3xl tracking-tight">A clear plan for today.</h2>
      <p className="mt-3 max-w-lg leading-relaxed text-ink2">
        Follow up overdue invoices, check customer replies, and approve verified receipts. Cash balances and bill amounts are visible to the
        Owner.
      </p>
      <div className="mt-6">
        <Badge tone="sky">{state.customers.length} customers in your workspace</Badge>
      </div>
    </Card>
  );
}
