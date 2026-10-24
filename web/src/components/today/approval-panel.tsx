"use client";
// FR-C5–C9: the approval drawer for one remindable invoice. Text comes only from
// the fixed R5 template; the sender may edit it, and the edit is logged. Snooze,
// mark disputed and "I'll call instead" follow the same tier rules as approve.
import { useEffect, useState, type ReactNode } from "react";
import { CalendarClock, ExternalLink, Lock, MessageCircle, Moon, Phone, RotateCcw, Send, TriangleAlert, Truck, X } from "lucide-react";
import { useKutip } from "@/lib/store";
import { Badge, Button, RuleTag, cx } from "@/components/ui";
import { addDays, dayOf, daysBetween, fmtDate, fmtDateTime, fmtRM, outstanding, userOf } from "@/engine/model";
import { HORIZON_DAYS, canApprove, gapImpact, inQuietHours, payBy, renderReminder, shortfalls, waShareLink, type PlanRow } from "@/engine/rules";
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
      <button type="button" aria-label="Close" className="absolute inset-0 bg-ink/30" onClick={onClose} />
      <aside role="dialog" aria-modal="true" aria-label={`Review reminder for ${invoice.number}`} className="relative flex h-full w-full max-w-[560px] flex-col border-l border-line-strong bg-surface">
        <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <div className="eyebrow">Review reminder</div>
            <div className="mt-0.5 flex flex-wrap items-center gap-2">
              <span className="num text-[15px] font-semibold text-ink">{invoice.number}</span>
              <TierBadge tier={row.tier} />
              {row.closesGap && <Badge tone="emerald">closes the gap</Badge>}
            </div>
            <div className="mt-0.5 text-sm text-ink">{customer.name}</div>
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
            <div className="flex items-start gap-2 border border-hairline bg-canvas px-3 py-2 text-sm text-ink">
              <Truck className="mt-0.5 h-4 w-4 shrink-0 text-ink2" aria-hidden />
              <div>
                <div>{invoice.delivery.route}</div>
                <div className="text-xs text-ink2">
                  <span className="num">{invoice.delivery.doNumber}</span> · delivered {fmtDate(invoice.delivery.date)} to {invoice.delivery.destination}
                </div>
              </div>
            </div>
          </section>

          <section>
            <SectionTitle>Past reminders</SectionTitle>
            {invoice.reminders.length === 0 ? (
              <div className="text-sm text-ink2">None yet for this invoice.</div>
            ) : (
              <ul className="divide-y divide-hairline border border-line text-sm">
                {invoice.reminders.map((r, i) => (
                  <li key={i} className="flex min-h-[38px] items-center justify-between gap-2 px-3 py-1.5">
                    <span className="num text-xs text-ink">{fmtDateTime(r.at)}</span>
                    <span className="flex items-center gap-2">
                      <TierBadge tier={r.tier} />
                      <span className="text-xs text-ink2">by {r.by}</span>
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
            <div className="text-sm text-ink">
              Pays within {n} days of a Tier {tier} reminder <span className="num font-semibold">{Math.round(row.p * 100)}%</span> of the time
              {points >= 3 ? (
                <span className="text-ink2"> ({points} past invoices)</span>
              ) : (
                <span className="text-ink2"> (fewer than 3 past reminders at this tier, so Kutip assumes 50%)</span>
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
              className="w-full resize-y rounded-[2px] border border-line-strong bg-surface px-3 py-2 text-sm leading-relaxed text-ink focus:border-navy focus:outline-none"
            />
            <div className="mt-1 flex items-center justify-between text-xs text-ink2">
              <span>
                Fixed Tier {tier} ({tierName(tier)}) template, sender {myName}. {edited ? "Edited: the edit will be logged." : "You may edit before sending."}
              </span>
              {edited && (
                <button type="button" className="inline-flex items-center gap-1 text-ink2 hover:text-ink" onClick={() => setText(original)}>
                  <RotateCcw className="h-3 w-3" aria-hidden />
                  Reset
                </button>
              )}
            </div>
          </section>
        </div>

        <footer className="space-y-3 border-t border-line px-5 py-4">
          {quiet && allowed && (
            <div className="flex items-start gap-2 border-l-[3px] border-l-navy bg-navy-soft px-3 py-2 text-xs text-navy">
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
                  className="inline-flex h-[34px] items-center justify-center gap-2 whitespace-nowrap rounded-[2px] border border-line-strong bg-white px-3.5 text-[13px] font-medium leading-none text-ink transition-colors hover:bg-canvas"
                >
                  <MessageCircle className="h-4 w-4 text-emerald-600" aria-hidden />
                  Open in WhatsApp
                  <ExternalLink className="h-3 w-3 text-ink2" aria-hidden />
                </a>
                )}
              </div>
              {!quiet && <div className="text-[11px] text-ink2">
                &ldquo;Open in WhatsApp&rdquo; approves the reminder (logged), then opens WhatsApp to pick the chat; no number is filled in. A person presses send.
              </div>}
              <CardActions invoiceId={invoice.id} invoiceNumber={invoice.number} today={dayOf(state.now)} onDone={onClose} />
            </>
          ) : (
            <div className="flex items-start gap-2 border-l-[3px] border-l-amber-800 bg-amber-50 px-3 py-2 text-sm text-amber-900">
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

/** FR-C9: the other card actions. Each is an engine action, role-checked and logged with the actor. */
function CardActions({ invoiceId, invoiceNumber, today, onDone }: { invoiceId: string; invoiceNumber: string; today: string; onDone: () => void }) {
  const dispatch = useKutip((s) => s.dispatch);
  const [until, setUntil] = useState(addDays(today, 3));
  const [confirmDispute, setConfirmDispute] = useState(false);
  const first = addDays(today, 1);
  const last = addDays(today, HORIZON_DAYS);
  const validUntil = until >= first && until <= last;
  const done = (ok: boolean) => ok && onDone();

  return (
    <div className="space-y-2 border-t border-line pt-3">
      <div className="eyebrow">Or instead</div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-xs text-ink2">
          <span className="sr-only">Snooze until</span>
          <input
            type="date"
            value={until}
            min={first}
            max={last}
            onChange={(e) => setUntil(e.target.value)}
            className="h-7 rounded-[2px] border border-line-strong bg-surface px-1.5 font-mono text-xs text-ink"
          />
        </label>
        <Button size="sm" variant="secondary" disabled={!validUntil} onClick={() => done(dispatch({ type: "SNOOZE_REMINDER", invoiceId, until }))}>
          <CalendarClock className="h-3.5 w-3.5" aria-hidden />
          Snooze to {validUntil ? fmtDate(until) : "date"}
        </Button>
        <Button size="sm" variant="secondary" onClick={() => done(dispatch({ type: "CALL_INSTEAD", invoiceId }))}>
          <Phone className="h-3.5 w-3.5" aria-hidden />
          I&apos;ll call instead
        </Button>
        {!confirmDispute && (
          <Button size="sm" variant="danger" onClick={() => setConfirmDispute(true)}>
            <TriangleAlert className="h-3.5 w-3.5" aria-hidden />
            Mark disputed
          </Button>
        )}
      </div>
      {confirmDispute && (
        <div className="flex flex-wrap items-center gap-2 border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
          <span className="flex-1">Mark {invoiceNumber} disputed? Reminders pause until the dispute is settled (M5).</span>
          <Button size="sm" variant="danger" onClick={() => done(dispatch({ type: "MARK_DISPUTED", invoiceId }))}>
            Confirm dispute
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setConfirmDispute(false)}>
            Cancel
          </Button>
        </div>
      )}
      <div className="text-[11px] text-ink2">
        Snooze returns the reminder on that date. A call is recorded as a phone follow-up and counts as contact for 5 days <RuleTag id="R2" />. Each is logged with your name.
      </div>
    </div>
  );
}

/** Clerk view of G1: whether paying covers the next bill, never the amounts (FR-B5). */
function ClerkNextBill({ row }: { row: PlanRow }) {
  const state = useKutip((s) => s.state);
  const next = gapImpact(state, row.invoice)[0];
  const answer = !next ? "no bill is short" : next.after >= 0 ? "yes" : next.after > next.before ? "partly" : "no";
  return (
    <div className="text-sm text-ink">
      If paid by {fmtDate(payBy(state))}, covers the next bill:{" "}
      <span className={cx("font-semibold", answer === "yes" ? "text-emerald-700" : "text-ink2")}>{answer}</span>
    </div>
  );
}

function OwnerGapImpact({ row }: { row: PlanRow }) {
  const state = useKutip((s) => s.state);
  const impact = gapImpact(state, row.invoice);
  if (impact.length === 0) return <div className="text-sm text-ink2">No shortfall in the next 30 days.</div>;
  return (
    <div className="border border-line bg-canvas px-3 py-2 text-sm">
      <div className="mb-1 text-ink">If paid by {fmtDate(payBy(state))}:</div>
      <ul className="space-y-0.5">
        {impact.map((g) => (
          <li key={g.dueDate + g.short} className="num text-xs text-ink">
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
    <div className="border border-line px-3 py-2">
      <div className="font-mono text-[11px] text-ink2">{label}</div>
      <div className="num text-right font-medium text-ink">{value}</div>
    </div>
  );
}

function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-1.5 flex items-center justify-between gap-2">
      <h3 className="eyebrow">{children}</h3>
      {right}
    </div>
  );
}
