"use client";
// Bank alerts (automatic): the owner forwards the bank's credit-alert emails once
// to a Kachingg address; each alert becomes a credit line for matching (M1).
// Simulated: there is no mailbox, so a person pastes an alert below. Parsing is
// the engine's parseBankAlert() (rules, not AI); the reducer parses the same text
// again, so the preview and the added line cannot disagree. Debits are refused
// and a balance figure in the alert is never read (FR-B5).
import { useMemo, useState } from "react";
import { BellRing, Plus } from "lucide-react";
import { Badge, Button, Card, CardHeader, RuleTag } from "@/components/ui";
import { ALERT_ADDRESS, parseBankAlert, sampleBankAlert } from "@/engine/bank-alerts";
import { fmtDateTime, fmtRM } from "@/engine/model";
import { visibleBankLines } from "@/engine/rules";
import { useKachingg } from "@/lib/store";
import { LedgerTable, cellCls, numCls, rowCls } from "./csv-source";

export function BankAlerts() {
  const state = useKachingg((s) => s.state);
  const dispatch = useKachingg((s) => s.dispatch);
  const [text, setText] = useState("");
  const [done, setDone] = useState<string | null>(null);
  const parsed = useMemo(() => (text.trim() ? parseBankAlert(text) : null), [text]);
  const future = parsed?.ok && parsed.line.at > state.now;

  const alerts = visibleBankLines(state).filter((b) => b.source === "alert");
  const last = alerts.at(-1)?.at ?? null;

  const add = () => {
    if (!parsed?.ok) return;
    if (dispatch({ type: "RECEIVE_BANK_ALERT", text })) {
      setDone(`Added ${fmtRM(parsed.line.amount, { cents: true })} to the bank feed for matching.`);
      setText("");
    }
  };

  return (
    <Card>
      <CardHeader
        title="Bank alerts (automatic)"
        right={
<Badge tone="emerald">On (simulated)</Badge>
        }
      />
      <div className="space-y-3 px-5 py-4">
        <p className="text-xs leading-relaxed text-ink2">
          Forward your bank&apos;s credit-alert emails once; every incoming payment appears here within seconds.
        </p>
        <dl className="grid gap-x-6 gap-y-2 text-xs sm:grid-cols-[auto_1fr]">
          <dt className="text-ink2">Forward to</dt>
          <dd className="min-w-0">
            <code className="break-all font-mono text-[12px] text-ink">{ALERT_ADDRESS}</code>
            <span className="ml-2 text-[11px] text-ink2">simulated, not a real mailbox</span>
          </dd>
          <dt className="text-ink2">Last alert</dt>
          <dd className="num text-ink">{last ? fmtDateTime(last) : "No alerts yet"}</dd>
          <dt className="text-ink2">Reads</dt>
          <dd className="flex flex-wrap items-center gap-1.5 text-ink2">
            Incoming credits only, by fixed rules (not AI); debits and balances are ignored <RuleTag id="M1" />
          </dd>
        </dl>

        <details className="group border-t border-hairline pt-3">
          <summary className="w-fit cursor-pointer text-xs font-medium text-ink hover:text-navy">Simulate an incoming alert</summary>
          <div className="mt-3 space-y-3">
            <textarea
              aria-label="Bank alert text"
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setDone(null);
              }}
              rows={5}
              spellCheck={false}
              placeholder="Paste a credit alert email or app notification"
              className="w-full resize-y rounded-xl border border-line bg-surface px-3 py-2 font-mono text-[11px] leading-relaxed text-ink placeholder:text-ink3 focus:border-navy focus:outline-none"
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setText(sampleBankAlert(state.now));
                  setDone(null);
                }}
              >
                <BellRing className="h-3.5 w-3.5" aria-hidden />
                Load sample
              </Button>
              {text && (
                <Button size="sm" variant="ghost" onClick={() => setText("")}>
                  Clear
                </Button>
              )}
              <span className="text-[11px] text-ink2">Fictional Bank Cempaka alert; no invoice matches it</span>
            </div>

            {done && !parsed && <div className="k-rise border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">{done}</div>}
            {parsed && !parsed.ok && <div className="border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{parsed.reason}</div>}
            {parsed?.ok && (
              <div className="k-rise space-y-2">
                <div className="text-xs font-medium text-ink2">Parsed credit</div>
                <LedgerTable head={[{ label: "Date" }, { label: "Amount", right: true }, { label: "Description" }]}>
                  <tr className={rowCls}>
                    <td className={`${cellCls} whitespace-nowrap font-mono text-ink2`}>{fmtDateTime(parsed.line.at)}</td>
                    <td className={`${numCls} text-ink`}>{fmtRM(parsed.line.amount, { cents: true })}</td>
                    <td className={`${cellCls} font-mono text-[11px] text-ink`}>{parsed.line.description}</td>
                  </tr>
                </LedgerTable>
                {future && (
                  <div className="text-xs text-rose-700">Dated after the demo clock ({fmtDateTime(state.now)}); move the clock first.</div>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <Button disabled={!!future} onClick={add}>
                    <Plus className="h-4 w-4" aria-hidden />
                    Add to bank feed
                  </Button>
                  <span className="text-xs text-ink2">A person approves every receipt</span>
                </div>
              </div>
            )}
          </div>
        </details>
      </div>
    </Card>
  );
}
