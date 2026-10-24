"use client";
// The simulated bank CSV, as far as the demo clock has reached (rule M1 input).
import { fmtDateTime, fmtRM, invoiceOf, type State } from "@/engine/model";
import { visibleBankLines } from "@/engine/rules";
import { Badge, Card, CardHeader, Empty, cx, tbl } from "@/components/ui";

export function BankStatement({ state }: { state: State }) {
  const lines = visibleBankLines(state);
  return (
    <Card>
      <CardHeader
        title="Bank feed"
        right={
          <span title="Simulated bank CSV: incoming credits only">
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
                    <div className="num whitespace-nowrap text-[11px] text-ink2">{fmtDateTime(b.at)}</div>
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
    </Card>
  );
}
