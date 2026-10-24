"use client";
import { Wallet } from "lucide-react";
import { useKachingg } from "@/lib/store";
import { Badge, Card, CardHeader, Figure, cx, stagger } from "@/components/ui";
import { CountUp } from "@/components/motion";
import { useFlashOnChange } from "@/lib/motion";
import { fmtDate, fmtDateTime, fmtRM } from "@/engine/model";
import { cashNow, forecast, type OutflowForecast } from "@/engine/rules";

const rm = (sen: number) => fmtRM(Math.round(sen));

export default function CashMeters() {
  const state = useKachingg((s) => s.state);
  const owner = state.role === "owner";
  const rows = forecast(state);
  return (
    <Card className="flex flex-col" rise={1}>
      <CardHeader
        title={owner ? "Cash available" : "Upcoming bills"}
        right={
          <span className="icon-button h-9! w-9!" aria-hidden>
            <Wallet className="h-4 w-4" />
          </span>
        }
      />
      {owner && (
        <div className="px-6 pb-5">
          <Figure>
            <CountUp value={cashNow(state)} format={rm} />
          </Figure>
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink2">
            <span>Bank {fmtRM(state.bankBalance.amount)}</span>
            <span className="text-emerald-700">+{fmtRM(state.approvedReceiptTotal)} approved</span>
          </div>
        </div>
      )}
      <div className="mx-6 border-t border-line pt-5">
        <div className="mb-4 flex items-center justify-between text-xs text-ink2">
          <span>Upcoming bill coverage</span>
          <span>Next 30 days</span>
        </div>
        <div className="space-y-5">
          {rows.length === 0 ? (
            <p className="pb-5 text-sm text-ink2">No bills due in the next 30 days.</p>
          ) : (
            rows.map((f, i) => {
              const covered = f.amount > 0 ? Math.max(0, Math.min(1, (f.forecast + f.amount) / f.amount)) : 1;
              const pct = Math.round(covered * 100);
              return (
                <div key={f.outflowId}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="text-sm capitalize">
                      {owner ? f.short : "Bill"}
                      <span className="ml-2 text-[11px] text-ink2">{fmtDate(f.dueDate)}</span>
                    </span>
                    {owner ? (
                      <span className="text-sm tabular-nums">{fmtRM(f.amount)}</span>
                    ) : (
                      <GapBadge f={f} role={state.role} />
                    )}
                  </div>
                  {owner && (
                    <>
                      <div
                        className="striped-meter"
                        role="meter"
                        aria-label={`${f.short} covered`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={pct}
                      >
                        <div
                          className="striped-fill k-grow-x"
                          data-color={i % 2 === 0 ? "blue" : "pink"}
                          style={{ ...stagger(i + 1, "90ms"), width: `${pct}%` }}
                        />
                      </div>
                      <div className="mt-1.5 flex justify-between text-[11px] text-ink2">
                        <span>{pct}% covered</span>
                        <CoverageLine f={f} />
                      </div>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
      <details className="mx-6 mb-5 mt-auto pt-5 text-[11px] text-ink2">
        <summary className="w-fit">How this is calculated</summary>
        <p className="mt-2 leading-relaxed">
          Coverage includes expected payments from reliable customers, after earlier bills. Promises are not counted.
          {owner && ` Bank balance entered ${fmtDateTime(state.bankBalance.enteredAt)} by ${state.bankBalance.enteredBy}.`}
        </p>
      </details>
    </Card>
  );
}

/** Flash once when a bill flips from short to covered, even if that happened on another page. */
const flipsToCovered = (prev: string, next: string) => prev === "short" && next === "covered";

function CoverageLine({ f }: { f: OutflowForecast }) {
  const flash = useFlashOnChange(f.gap > 0 ? "short" : "covered", { memory: `owner:${f.outflowId}`, when: flipsToCovered });
  return (
    <span key={flash.key} className={cx(f.gap > 0 ? "text-rose-700" : "text-emerald-700", flash.className)}>
      {/* Covered: show the surplus left after this bill (F1 forecast, ≥ 0 here). */}
      {f.gap > 0 ? `${fmtRM(f.gap)} short` : `Covered ${fmtRM(f.forecast, { sign: true })}`}
    </span>
  );
}

function GapBadge({ f, role }: { f: OutflowForecast; role: string }) {
  const flash = useFlashOnChange(f.gap > 0 ? "short" : "covered", { memory: `${role}:${f.outflowId}`, when: flipsToCovered });
  return (
    <span key={flash.key} className={cx("rounded-full", flash.className)}>
      <Badge tone={f.gap > 0 ? "rose" : "emerald"}>Gap: {f.gap > 0 ? "yes" : "no"}</Badge>
    </span>
  );
}
