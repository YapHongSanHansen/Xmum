"use client";
// FR-C5–C8: the approval drawer for one remindable invoice. Text comes only from
// the fixed R5 template; the sender may edit it, and the edit is logged.
import { useEffect, useState, type ReactNode } from "react";
import { ExternalLink, Lock, MessageCircle, Moon, RotateCcw, Send, Truck, X } from "lucide-react";
import { useKutip } from "@/lib/store";
import { Badge, Button, RuleTag, cx } from "@/components/ui";
import { dayOf, daysBetween, fmtDate, fmtDateTime, fmtRM, outstanding, userOf } from "@/engine/model";
import { canApprove, gapImpact, inQuietHours, payBy, renderReminder, shortfalls, waShareLink, type PlanRow } from "@/engine/rules";
import { LANG_LABEL, TierBadge, tierName } from "./bits";

export default function ApprovalPanel({ row, onClose }: { row: PlanRow; onClose: () => void }) {
  const state = useKutip((s) => s.state);
  const dispatch = useKutip((s) => s.dispatch);
  const { invoice, customer } = row;
  const tier = (row.tier ?? 1) as 0 | 1 | 2;
  const myName = userOf(state, state.role).name;
  const original = renderReminder(state, invoice, tier, myName);
  const [text, setText] = useState(original);
  const edited = text !== original;
  const isOwner = state.role === "owner";
  const allowed = canApprove(tier, state.role);
  const quiet = inQuietHours(state.now);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // R3 payment pattern: N = days until the next shortfall (14 if none).
  const next = shortfalls(state)[0];
  const n = next ? Math.max(1, daysBetween(dayOf(state.now), next.dueDate)) : 14;
  const points = customer.history.filter((h) => h.lastReminderTier === tier && h.lastReminderDate).length;

  const approve = () => {
    const ok = dispatch({ type: "APPROVE_REMINDER", invoiceId: invoice.id, text, edited });
    if (ok) onClose();
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-slate-900/30" onClick={onClose} />
      <aside role="dialog" aria-modal="true" aria-label={`Review reminder for ${invoice.number}`} className="relative flex h-full w-full max-w-[560px] flex-col bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Review reminder</div>
            <div className="mt-0.5 flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm font-semibold text-slate-900">{invoice.number}</span>
              <TierBadge tier={row.tier} />
              {row.closesGap && <Badge tone="emerald">closes the gap</Badge>}
            </div>
            <div className="mt-0.5 text-sm text-slate-700">{customer.name}</div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close panel">
            <X className="h-4 w-4" aria-hidden />
          </Button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <section className="grid grid-cols-3 gap-3 text-sm">
            <Fact label="Outstanding" value={fmtRM(outstanding(invoice))} />
            <Fact label="Due" value={fmtDate(invoice.dueDate)} />
            <Fact label="Days late" value={String(row.daysLate)} />
          </section>

          <section>
            <SectionTitle>Delivery</SectionTitle>
            <div className="flex items-start gap-2 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <Truck className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden />
              <div>
                <div>{invoice.delivery.route}</div>
                <div className="text-xs text-slate-500">
                  <span className="font-mono">{invoice.delivery.doNumber}</span> · delivered {fmtDate(invoice.delivery.date)} to {invoice.delivery.destination}
                </div>
              </div>
            </div>
          </section>

          <section>
            <SectionTitle>Past reminders</SectionTitle>
            {invoice.reminders.length === 0 ? (
              <div className="text-sm text-slate-500">None yet for this invoice.</div>
            ) : (
              <ul className="divide-y divide-slate-100 rounded-md border border-slate-200 text-sm">
                {invoice.reminders.map((r, i) => (
                  <li key={i} className="flex items-center justify-between gap-2 px-3 py-1.5">
                    <span className="tabular-nums text-slate-700">{fmtDateTime(r.at)}</span>
                    <span className="flex items-center gap-2">
                      <TierBadge tier={r.tier} />
                      <span className="text-xs text-slate-500">by {r.by}</span>
                      {r.status === "queued" ? (
                        <Badge tone="violet">queued</Badge>
                      ) : r.answered ? (
                        <Badge tone="emerald">answered</Badge>
                      ) : (
                        <Badge tone="rose">no reply</Badge>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <SectionTitle right={<RuleTag id="R3" />}>Payment pattern</SectionTitle>
            <div className="text-sm text-slate-700">
              Pays within {n} days of a Tier {tier} reminder <span className="font-semibold tabular-nums">{Math.round(row.p * 100)}%</span> of the time
              {points >= 3 ? (
                <span className="text-slate-500"> ({points} past invoices)</span>
              ) : (
                <span className="text-slate-500"> (fewer than 3 past reminders at this tier, so Kutip assumes 50%)</span>
              )}
            </div>
          </section>

          <section>
            <SectionTitle right={<RuleTag id="G1" />}>{isOwner ? "Gap impact" : "Next bill"}</SectionTitle>
            {isOwner ? <OwnerGapImpact row={row} /> : (
              <ClerkNextBill row={row} />
            )}
          </section>

          <section>
            <SectionTitle right={<RuleTag id="R5" />}>
              Message · {LANG_LABEL[customer.lang]} · to {customer.contact}
            </SectionTitle>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={6}
              className="w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm leading-relaxed text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
            <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
              <span>
                Fixed Tier {tier} ({tierName(tier)}) template, sender {myName}. {edited ? "Edited: the edit will be logged." : "You may edit before sending."}
              </span>
              {edited && (
                <button type="button" className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900" onClick={() => setText(original)}>
                  <RotateCcw className="h-3 w-3" aria-hidden />
                  Reset
                </button>
              )}
            </div>
          </section>
        </div>

        <footer className="space-y-3 border-t border-slate-200 px-5 py-4">
          {quiet && allowed && (
            <div className="flex items-start gap-2 rounded-md bg-violet-50 px-3 py-2 text-xs text-violet-900">
              <Moon className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              <span>
                Quiet hours (21:00 to 08:00). Approving now queues the reminder until 08:00. <RuleTag id="S1" />
              </span>
            </div>
          )}
          {allowed ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={approve}>
                  <Send className="h-4 w-4" aria-hidden />
                  {quiet ? "Approve & queue until 08:00" : "Approve & send (simulated)"}
                </Button>
                {!quiet && (
                <a
                  onClick={approve}
                  href={waShareLink(text)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-9 items-center gap-1.5 rounded-md bg-white px-3.5 text-sm font-medium text-slate-800 ring-1 ring-slate-300 hover:bg-slate-50"
                >
                  <MessageCircle className="h-4 w-4 text-emerald-600" aria-hidden />
                  Open in WhatsApp
                  <ExternalLink className="h-3 w-3 text-slate-400" aria-hidden />
                </a>
                )}
              </div>
              {!quiet && <div className="text-[11px] text-slate-500">
                &ldquo;Open in WhatsApp&rdquo; approves the reminder (logged), then opens WhatsApp to pick the chat; no number is filled in. A person presses send.
              </div>}
            </>
          ) : (
            <div className="flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span className="flex-1">Firm reminders need the Owner.</span>
              <Button size="sm" variant="secondary" onClick={() => dispatch({ type: "SET_ROLE", role: "owner" })}>
                Switch to Owner
              </Button>
            </div>
          )}
        </footer>
      </aside>
    </div>
  );
}

/** Clerk view of G1: whether paying covers the next bill, never the amounts (FR-B5). */
function ClerkNextBill({ row }: { row: PlanRow }) {
  const state = useKutip((s) => s.state);
  const next = gapImpact(state, row.invoice)[0];
  const answer = !next ? "no bill is short" : next.after >= 0 ? "yes" : next.after > next.before ? "partly" : "no";
  return (
    <div className="text-sm text-slate-700">
      If paid by {fmtDate(payBy(state))}, covers the next bill:{" "}
      <span className={cx("font-semibold", answer === "yes" ? "text-emerald-700" : "text-slate-600")}>{answer}</span>
    </div>
  );
}

function OwnerGapImpact({ row }: { row: PlanRow }) {
  const state = useKutip((s) => s.state);
  const impact = gapImpact(state, row.invoice);
  if (impact.length === 0) return <div className="text-sm text-slate-500">No shortfall in the next 30 days.</div>;
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
      <div className="mb-1 text-slate-700">If paid by {fmtDate(payBy(state))}:</div>
      <ul className="space-y-0.5">
        {impact.map((g) => (
          <li key={g.dueDate + g.short} className="tabular-nums text-slate-700">
            {fmtDate(g.dueDate)} {g.short} <span className="text-rose-700">short {fmtRM(-g.before)}</span> →{" "}
            {g.after >= 0 ? (
              <span className="font-semibold text-emerald-700">covered ({fmtRM(g.after, { sign: true })})</span>
            ) : (
              <span className="font-semibold text-rose-700">{fmtRM(-g.after)}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="text-right font-semibold tabular-nums text-slate-900">{value}</div>
    </div>
  );
}

function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-1.5 flex items-center justify-between gap-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{children}</h3>
      {right}
    </div>
  );
}
