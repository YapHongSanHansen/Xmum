"use client";
// FR-A5: bank statement CSV import. Credit lines go to matching (M1); debit
// lines are kept for the Owner. The Clerk's view is built by the engine's
// bankPreviewFor(): credit lines only, no debits, no balance (FR-B5), and the
// raw file is never shown to the Clerk.
import { useMemo, useState } from "react";
import { Upload } from "lucide-react";
import { Button, Card, CardHeader, RuleTag } from "@/components/ui";
import { fmtDateTime, fmtRM } from "@/engine/model";
import { SAMPLE_BANK_CSV, bankPreviewFor, parseBankCsv, type BankRow } from "@/engine/imports";
import { useKachingg } from "@/lib/store";
import { CsvSource, FormatNote, InvalidRows, LedgerTable, cellCls, numCls, rowCls } from "./csv-source";

export function BankImport() {
  const state = useKachingg((s) => s.state);
  const dispatch = useKachingg((s) => s.dispatch);
  const owner = state.role === "owner";
  const [text, setText] = useState("");
  const [done, setDone] = useState<string | null>(null);
  const parsed = useMemo(() => (text.trim() ? parseBankCsv(text, state) : null), [text, state]);
  // Everything rendered below comes from the role's view, never from `parsed` directly.
  const preview = parsed ? bankPreviewFor(parsed, state.role) : null;
  const credits = preview?.credits.length ?? 0;
  const debits = preview?.debits.length ?? 0;
  // A Clerk's import still keeps valid debit lines for the Owner, so it can run with no credits shown.
  const canImport = !!parsed && parsed.credits.length + parsed.debits.length > 0;
  const label = owner
    ? `Import ${credits + debits} line${credits + debits === 1 ? "" : "s"}`
    : credits > 0
      ? `Import ${credits} credit line${credits === 1 ? "" : "s"}`
      : "Import file";

  const run = () => {
    if (dispatch({ type: "IMPORT_BANK_STATEMENT", csv: text })) {
      setDone(owner ? `Imported ${credits} credit and ${debits} debit lines.` : `Imported ${credits} credit lines for matching.`);
      setText("");
    }
  };

  return (
    <Card>
      <CardHeader title="Bank statement (CSV)" />
      <div className="space-y-3 px-5 py-4">
        <div className="flex items-center gap-1.5 text-xs text-ink2">
          <span>{owner ? "Credits to matching; debits stay with you" : "Credit lines only; debits are Owner only"}</span>
          <RuleTag id="M1" />
        </div>
        <FormatNote>
          Columns: <span className="font-mono">date, amount, description</span>; credits positive, debits negative.
          {owner && " A balance column is ignored."}
        </FormatNote>
        <CsvSource
          label="Bank statement CSV"
          text={text}
          onText={(t) => {
            setText(t);
            setDone(null);
          }}
          sample={SAMPLE_BANK_CSV}
          showText={owner}
          placeholder="date,amount,description"
        />

        {done && !preview && <div className="border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">{done}</div>}
        {preview?.error && <div className="border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{preview.error}</div>}

        {preview && !preview.error && (
          <>
            {credits > 0 && <Lines title="Credits" rows={preview.credits} />}
            {owner && debits > 0 && <Lines title="Debits · Owner only" rows={preview.debits} debit />}
            {owner && preview.balanceIgnored && (
              <div className="text-xs text-ink2">File balance ignored; the forecast uses your entered balance (F1).</div>
            )}
            <InvalidRows rows={preview.invalid} />
            {!owner && preview.hiddenDebits > 0 && (
              <div className="text-xs text-ink2">
                {preview.hiddenDebits} debit line{preview.hiddenDebits === 1 ? "" : "s"} hidden (Owner only)
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <Button disabled={!canImport} onClick={run}>
                <Upload className="h-4 w-4" aria-hidden />
                {label}
              </Button>
              <span className="text-xs text-ink2">A person approves every receipt</span>
            </div>
          </>
        )}

        {owner && state.bankDebits.length > 0 && (
          <div className="border-t border-hairline pt-2 text-xs text-ink2">
            Debits on file: <span className="num">{state.bankDebits.length}</span>
          </div>
        )}
      </div>
    </Card>
  );
}

function Lines({ title, rows, debit }: { title: string; rows: BankRow[]; debit?: boolean }) {
  return (
    <div className="space-y-1.5">
      <div className="text-xs font-medium text-ink2">{title}</div>
      <LedgerTable head={[{ label: "Line" }, { label: "Date" }, { label: "Amount", right: true }, { label: "Description" }]}>
        {rows.map((r) => (
          <tr key={r.line} className={rowCls}>
            <td className={`${cellCls} font-mono text-ink2`}>{r.line}</td>
            <td className={`${cellCls} whitespace-nowrap font-mono text-ink2`}>{fmtDateTime(r.at)}</td>
            <td className={`${numCls} ${debit ? "text-rose-700" : "text-ink"}`}>{fmtRM(r.amount, { cents: true })}</td>
            <td className={`${cellCls} font-mono text-[11px] text-ink`}>{r.description}</td>
          </tr>
        ))}
      </LedgerTable>
    </div>
  );
}
