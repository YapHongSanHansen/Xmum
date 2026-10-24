"use client";
// Collected per month: bank credits matched to invoices (Jul, Aug, Sep, Oct to
// date). Display only. Collections are invoice-level amounts, so both roles see
// them; bank balance, payroll and gap amounts stay Owner only (FR-B5).
import { Card, CardHeader } from "@/components/ui";
import { useKachingg } from "@/lib/store";
import { fmtRM } from "@/engine/model";
import { collectedByMonth } from "@/engine/history";

const MONTHS: [key: string, label: string][] = [
  ["2026-07", "Jul"],
  ["2026-08", "Aug"],
  ["2026-09", "Sep"],
  ["2026-10", "Oct to date"],
];

export default function CollectionsTrend() {
  const state = useKachingg((s) => s.state);
  const rows = collectedByMonth(state.bankLines, state.now, MONTHS.map(([k]) => k));
  const max = Math.max(1, ...rows.map((r) => r.amount));
  return (
    <div className="k-rise" style={{ ["--i" as string]: 0 }}>
      <Card>
        <CardHeader title="Collected per month" right={<span className="text-xs text-ink2">Bank credits matched to invoices</span>} />
        <div className="grid grid-cols-4 items-end gap-3 px-6 pb-6" role="list" aria-label="Collected per month">
          {rows.map((r, index) => (
            <div key={r.month} role="listitem" className="flex flex-col items-center gap-2">
              <span className="num text-xs font-medium text-ink">{fmtRM(r.amount)}</span>
              <div className="flex h-28 w-full max-w-16 items-end" aria-hidden>
                <div
                  className="k-grow-y w-full rounded-t-[6px] bg-[#3990f7]"
                  style={{ height: `${Math.max(4, Math.round((r.amount / max) * 100))}%`, ["--i" as string]: index }}
                />
              </div>
              <span className="text-[11px] text-ink2">
                {MONTHS[index][1]} · <span className="num">{r.count}</span> paid
              </span>
            </div>
          ))}
        </div>
    </Card>
    </div>
  );
}
