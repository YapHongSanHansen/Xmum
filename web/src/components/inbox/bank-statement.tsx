"use client";
// The simulated bank CSV, as far as the demo clock has reached (rule M1 input).
import { fmtDateTime, fmtRM, invoiceOf, type State } from "@/engine/model";
import { visibleBankLines } from "@/engine/rules";
import { Badge, Card, CardHeader, Empty, cx, tbl } from "@/components/ui";

export function BankStatement({ state }: { state: State }) {
  const lines = visibleBankLines(state);
  return (
    <Card>
      <CardHeader kicker="Bank feed" title="Bank statement (simulated CSV)" right={<span className="font-mono text-[11px] text-ink2">credits only</span>} />
      {lines.length === 0 ? (
        <div className="p-4">
          <Empty>No bank lines yet. Credits appear here as the demo clock passes them; use &ldquo;Advance to&rdquo; in the header.</Empty>
        </div>
      ) : (
        <div className={tbl.wrap}>
          <table className={cx(tbl.table, "text-xs")}>
            <thead>
              <tr className={tbl.headRow}>
                <th className={tbl.th}>Date</th>
                <th className={cx(tbl.th, "text-right")}>Amount</th>
                <th className={tbl.th}>Description</th>
                <th className={tbl.th}>Matched</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((b) => (
                <tr key={b.id} className={cx(tbl.row, "align-top")}>
                  <td className={cx(tbl.td, "num whitespace-nowrap text-ink2")}>{fmtDateTime(b.at)}</td>
                  <td className={cx(tbl.td, "num whitespace-nowrap text-right font-medium text-ink")}>{fmtRM(b.amount, { cents: true })}</td>
                  <td className={cx(tbl.td, "break-words text-ink [overflow-wrap:anywhere]")}>{b.description}</td>
                  <td className={tbl.td}>
                    {b.matchedInvoiceId ? (
                      <Badge tone="emerald" className="num whitespace-nowrap">
                        {invoiceOf(state, b.matchedInvoiceId).number}
                      </Badge>
                    ) : (
                      <span className="text-ink2">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
