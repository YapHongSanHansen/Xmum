"use client";
// FR-A1: invoice CSV import with a preview. The engine parses the text for the
// preview and again on import (IMPORT_INVOICES), so only valid rows land.
import { useMemo, useState } from "react";
import { Upload } from "lucide-react";
import { Badge, Button, Card, CardHeader, RuleTag } from "@/components/ui";
import { fmtDate, fmtRM } from "@/engine/model";
import { SAMPLE_INVOICE_CSV, parseInvoiceCsv } from "@/engine/imports";
import { useKutip } from "@/lib/store";
import { CsvSource, InvalidRows, LedgerTable, cellCls, numCls, rowCls } from "./csv-source";

export function InvoiceImport() {
  const state = useKutip((s) => s.state);
  const dispatch = useKutip((s) => s.dispatch);
  const [text, setText] = useState("");
  const [done, setDone] = useState<string | null>(null);
  const preview = useMemo(() => (text.trim() ? parseInvoiceCsv(text, state) : null), [text, state]);
  const n = preview?.rows.length ?? 0;

  const run = () => {
    if (dispatch({ type: "IMPORT_INVOICES", csv: text })) {
      setDone(`Imported ${n} invoice${n === 1 ? "" : "s"}. Logged in the activity log; the next scan includes them.`);
      setText("");
    }
  };

  return (
    <Card>
      <CardHeader
        kicker="FR-A1 · Orbyte Connect"
        title="Import invoices (CSV)"
        right={<Badge tone="violet">Owner · Clerk</Badge>}
      />
      <div className="space-y-3 px-4 py-3">
        <p className="text-xs text-ink2">
          Columns: <span className="font-mono">number, customer, amount, issue date, due date, terms, status</span> (optional:{" "}
          <span className="font-mono">do number, route, destination</span>). Customers must already be in Orbyte clients records. Dates as YYYY-MM-DD or
          DD/MM/YYYY; status open or disputed.
        </p>
        <CsvSource
          label="Invoice CSV"
          text={text}
          onText={(t) => {
            setText(t);
            setDone(null);
          }}
          sample={SAMPLE_INVOICE_CSV}
          showText
          placeholder="number,customer,amount,issue date,due date,terms,status"
        />

        {done && !preview && <div className="border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">{done}</div>}

        {preview?.error && <div className="border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{preview.error}</div>}

        {preview && !preview.error && (
          <>
            {n > 0 && (
              <LedgerTable
                head={[
                  { label: "Line" },
                  { label: "Number" },
                  { label: "Customer" },
                  { label: "Amount", right: true },
                  { label: "Issued" },
                  { label: "Due" },
                  { label: "Terms", right: true },
                  { label: "Status" },
                ]}
              >
                {preview.rows.map((r) => (
                  <tr key={r.line} className={rowCls}>
                    <td className={`${cellCls} font-mono text-ink3`}>{r.line}</td>
                    <td className={`${cellCls} font-mono text-ink`}>{r.number}</td>
                    <td className={`${cellCls} text-ink`}>{r.customerName}</td>
                    <td className={numCls}>{fmtRM(r.amount, { cents: true })}</td>
                    <td className={`${cellCls} whitespace-nowrap text-ink2`}>{fmtDate(r.issueDate)}</td>
                    <td className={`${cellCls} whitespace-nowrap text-ink2`}>{fmtDate(r.dueDate)}</td>
                    <td className={numCls}>{r.termsDays}d</td>
                    <td className={cellCls}>
                      <Badge tone={r.status === "disputed" ? "amber" : "slate"}>{r.status}</Badge>
                    </td>
                  </tr>
                ))}
              </LedgerTable>
            )}
            <InvalidRows rows={preview.invalid.map((r) => ({ line: r.line, reason: r.reason, label: r.number || undefined }))} />
            <div className="flex flex-wrap items-center gap-2">
              <Button disabled={n === 0} onClick={run}>
                <Upload className="h-4 w-4" aria-hidden />
                Import {n} invoice{n === 1 ? "" : "s"}
              </Button>
              <span className="text-[11px] text-ink3">
                Invalid rows are listed and left out. Nothing is marked paid by an import <RuleTag id="M1" />
              </span>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
