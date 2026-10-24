"use client";
// The simulated bank CSV, as far as the demo clock has reached (rule M1 input).
import { fmtDateTime, fmtRM, invoiceOf, type State } from "@/engine/model";
import { visibleBankLines } from "@/engine/rules";
import { Badge, Card, CardHeader, Empty } from "@/components/ui";

export function BankStatement({ state }: { state: State }) {
  const lines = visibleBankLines(state);
  return (
    <Card>
      <CardHeader kicker="Bank feed" title="Bank statement (simulated CSV)" right={<span className="text-[11px] text-slate-500">credits only</span>} />
      <div className="p-3">
        {lines.length === 0 ? (
          <Empty>No bank lines yet.</Empty>
        ) : (
          <table className="w-full text-left font-mono text-[11px]">
            <thead className="text-slate-500">
              <tr>
                <th className="pb-1 font-medium">date</th>
                <th className="pb-1 text-right font-medium">amount</th>
                <th className="pb-1 pl-3 font-medium">description</th>
                <th className="pb-1 font-medium">matched</th>
              </tr>
            </thead>
            <tbody className="text-slate-800">
              {lines.map((b) => (
                <tr key={b.id} className="border-t border-slate-100 align-top">
                  <td className="py-1 pr-2 whitespace-nowrap">{fmtDateTime(b.at)}</td>
                  <td className="py-1 text-right whitespace-nowrap">{fmtRM(b.amount, { cents: true })}</td>
                  <td className="py-1 pl-3 break-all">{b.description}</td>
                  <td className="py-1 pl-2">
                    {b.matchedInvoiceId ? <Badge tone="emerald">{invoiceOf(state, b.matchedInvoiceId).number}</Badge> : <span className="text-slate-400">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Card>
  );
}
