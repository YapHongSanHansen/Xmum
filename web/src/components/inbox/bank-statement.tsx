"use client";
// The simulated bank feed (bank alerts and CSV transaction exports), as far as
// the demo clock has reached (rule M1 input).
import { useState } from "react";
import { fmtDateTime, fmtRM, invoiceOf, type State } from "@/engine/model";
import { visibleBankLines } from "@/engine/rules";
import { Badge, Button, Card, CardHeader, Empty, cx, tbl } from "@/components/ui";

/** Lines shown before "Show all": the newest first, so today's credits sit on top. */
const FIRST = 8;

export function BankStatement({ state }: { state: State }) {
  const [all, setAll] = useState(false);
  const newest = [...visibleBankLines(state)].reverse();
  const lines = all ? newest : newest.slice(0, FIRST);
  return (
    <Card>
      <CardHeader
        title="Bank feed"
        right={
          <span title="Simulated bank feed: incoming credits from forwarded bank alerts and CSV transaction exports">
            <Badge>credits only</Badge>
          </span>
        }
      />
      {lines.length === 0 ? (
        <div className="p-4">
          <Empty>No bank lines yet.</Empty>
        </div>
      ) : (
        // Date and description stack so the feed fits the narrow Inbox column; unmatched lines stay muted.
        <table className={cx(tbl.table, "text-xs")}>
          <thead className="sr-only">
            <tr>
              <th>Date and description</th>
              <th>Amount and match</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((b) => {
              const matched = b.matchedInvoiceId !== null;
              return (
                <tr key={b.id} className={cx(tbl.row, "align-top", !matched && "text-ink2")}>
                  <td className={tbl.td}>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="num whitespace-nowrap text-[11px] text-ink2">{fmtDateTime(b.at)}</span>
                      <SourceChip alert={b.source === "alert"} />
                    </div>
                    <div className={cx("num mt-0.5 break-words text-[11px]", matched && "text-ink")}>{b.description}</div>
                  </td>
                  <td className={cx(tbl.td, "text-right")}>
                    <div className={cx("num whitespace-nowrap text-[13px]", matched && "font-medium text-ink")}>{fmtRM(b.amount, { cents: true })}</div>
                    <div className="mt-1">
                      {b.matchedInvoiceId ? (
                        <Badge tone="emerald" className="num">
                          {invoiceOf(state, b.matchedInvoiceId).number}
                        </Badge>
                      ) : (
                        <span className="text-[11px]">not matched</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      {newest.length > FIRST && (
        <div className="border-t border-hairline px-4 py-2 text-right">
          <Button size="sm" variant="ghost" onClick={() => setAll((v) => !v)}>
            {all ? "Show latest only" : `Show all ${newest.length} lines`}
          </Button>
        </div>
      )}
    </Card>
  );
}

/** How the line arrived: a forwarded bank alert, or a CSV transaction export (absent means CSV). */
function SourceChip({ alert }: { alert: boolean }) {
  return (
    <span
      title={alert ? "Arrived by bank alert (simulated)" : "Imported from a CSV transaction export"}
      className={cx(
        "inline-flex h-4 items-center rounded-full px-1.5 text-[10px] font-medium leading-none",
        alert ? "bg-sky-100 text-sky-700" : "bg-hairline text-ink2",
      )}
    >
      {alert ? "alert" : "CSV"}
    </span>
  );
}
