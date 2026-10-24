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
        // Two stacked columns so the feed fits the narrow Inbox column without squeezing.
        <table className={cx(tbl.table, "text-xs")}>
          <thead>
            <tr className={tbl.headRow}>
              <th className={tbl.th}>Date · description</th>
              <th className={cx(tbl.th, "text-right")}>Amount · matched</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((b) => (
              <tr key={b.id} className={cx(tbl.row, "align-top")}>
                <td className={tbl.td}>
                  <div className="num whitespace-nowrap text-ink2">{fmtDateTime(b.at)}</div>
                  <div className="num mt-0.5 break-words text-[11px] text-ink">{b.description}</div>
                </td>
                <td className={cx(tbl.td, "text-right")}>
                  <div className="num whitespace-nowrap text-[13px] font-medium text-ink">{fmtRM(b.amount, { cents: true })}</div>
                  <div className="mt-1">
                    {b.matchedInvoiceId ? (
                      <Badge tone="emerald" className="num">
                        {invoiceOf(state, b.matchedInvoiceId).number}
                      </Badge>
                    ) : (
                      <span className="text-ink2">not matched</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}
