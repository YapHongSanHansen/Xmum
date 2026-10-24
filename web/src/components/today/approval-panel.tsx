"use client";
// FR-C5–C9: the approval drawer for one remindable invoice. Text comes only from
// the fixed R5 template; the sender may edit it, and the edit is logged. Snooze,
// mark disputed and "I'll call instead" follow the same tier rules as approve.
import { useState, type ReactNode } from "react";
import { CalendarClock, ExternalLink, Lock, MessageCircle, Moon, Phone, RotateCcw, Send, TriangleAlert, X } from "lucide-react";
import { useDialog } from "@/lib/use-dialog";
import { useKachingg } from "@/lib/store";
import { Badge, Button, RuleTag, cx } from "@/components/ui";
import { addDays, dayOf, fmtDate, fmtDateTime, fmtRM, outstanding, userOf } from "@/engine/model";
import { HORIZON_DAYS, canApprove, gapImpact, inQuietHours, payBy, renderReminder, waShareLink, type PlanRow } from "@/engine/rules";
import { LANG_LABEL, TierBadge, tierName } from "./bits";

export default function ApprovalPanel({ row, onClose }: { row: PlanRow; onClose: () => void }) {
  const state = useKachingg((s) => s.state);
  const dispatch = useKachingg((s) => s.dispatch);
  const { invoice, customer } = row;
  const tier = (row.tier ?? 1) as 0 | 1 | 2;
  const myName = userOf(state, state.role).name;
  const original = renderReminder(state, invoice, tier, myName);
  const [text, setText] = useState(original);
  const edited = text !== original;
  const isOwner = state.role === "owner";
  const allowed = canApprove(tier, state.role);
  const quiet = inQuietHours(state.now);

  const dialogRef = useDialog<HTMLElement>(onClose);

  // R3 payment pattern: under 3 past reminders at this tier, the engine assumes 50%.
  const points = customer.history.filter((h) => h.lastReminderTier === tier && h.lastReminderDate).length;

  const approve = () => {
    const ok = dispatch({ type: "APPROVE_REMINDER", invoiceId: invoice.id, text, edited });
    if (ok) onClose();
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-ink/25 backdrop-blur-sm" onClick={onClose} />
      <aside ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={`Review reminder for ${invoice.number}`} className="relative flex h-full w-full max-w-[560px] flex-col rounded-l-3xl border-l border-white bg-surface shadow-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-line px-6 py-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="num text-[15px] font-semibold text-ink">{invoice.number}</span>
              <TierBadge tier={row.tier} />
              {row.closesGap && <Badge tone="emerald">closes the gap</Badge>}
            </div>
            <div className="mt-1 text-[13px] text-ink2">{customer.name}</div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close panel">
            <X className="h-4 w-4" aria-hidden />
          </Button>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-1.5 text-[13px]">
            <Fact label="Outstanding">
              <span className="num font-medium text-ink">{fmtRM(outstanding(invoice))}</span>
            </Fact>
            <Fact label="Due">
              <span className="num">{fmtDate(invoice.dueDate)}</span> · <span className="num">{row.daysLate}</span> days late
            </Fact>
            <Fact label="Delivery">
              {invoice.delivery.route}
              <div className="text-xs text-ink2">
                <span className="num">{invoice.delivery.doNumber}</span> · <span className="num">{fmtDate(invoice.delivery.date)}</span> · {invoice.delivery.destination}
              </div>
            </Fact>
            <Fact label="Why">
              {row.reason} <span className="text-ink2">{points >= 3 ? `(${points} past invoices)` : "(under 3 past reminders, so 50% assumed)"}</span>{" "}
              <RuleTag id="R3" />
            </Fact>
          </dl>

          <section>
            <SectionTitle>Past reminders</SectionTitle>
            {invoice.reminders.length === 0 ? (
              <div className="text-[13px] text-ink2">None yet</div>
            ) : (
              <ul className="space-y-1 text-xs">
                {invoice.reminders.map((r, i) => (
                  <li key={i} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-ink2">
                    <span className="num text-ink">{fmtDateTime(r.at)}</span>
                    <span>
                      T{r.tier} · {r.by}
                    </span>
                    {r.status === "queued" ? (
                      <span className="text-navy">· queued</span>
                    ) : r.answered ? (
                      <span className="text-emerald-700">· answered</span>
                    ) : (
                      <span className="text-rose-700">· no reply</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            {isOwner ? (
              <>
                <SectionTitle right={<RuleTag id="G1" />}>If paid by {fmtDate(payBy(state))}</SectionTitle>
                <OwnerGapImpact row={row} />
              </>
            ) : (
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
              aria-label="Message"
              className="w-full resize-y rounded-xl border border-line-strong bg-surface px-3 py-2 text-sm leading-relaxed text-ink focus:border-navy focus:outline-none"
            />
            <div className="mt-1 flex items-center justify-between gap-2 text-xs text-ink2">
              <span title={`Fixed Tier ${tier} (${tierName(tier)}) template, sender ${myName}`}>{edited ? "Edited · the edit is logged" : `T${tier} template · editable`}</span>
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
            <div className="flex items-center gap-2 text-xs text-navy">
              <Moon className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span>Quiet hours, 21:00 to 08:00</span>
              <RuleTag id="S1" />
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
                    title="Approves the reminder (logged), then opens WhatsApp. No number is filled in; a person presses send."
                    className="inline-flex h-[34px] items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-line-strong bg-white px-3.5 text-[13px] font-medium leading-none text-ink transition-colors hover:bg-canvas"
                  >
                    <MessageCircle className="h-4 w-4 text-emerald-600" aria-hidden />
                    Open in WhatsApp
                    <ExternalLink className="h-3 w-3 text-ink2" aria-hidden />
                  </a>
                )}
              </div>
              <CardActions invoiceId={invoice.id} invoiceNumber={invoice.number} today={dayOf(state.now)} onDone={onClose} />
            </>
          ) : (
            <div className="flex flex-wrap items-center gap-2 border-l-[3px] border-l-amber-800 bg-amber-50 px-3 py-2 text-[13px] text-amber-900">
              <Lock className="h-4 w-4 shrink-0" aria-hidden />
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
  const dispatch = useKachingg((s) => s.dispatch);
  const [until, setUntil] = useState(addDays(today, 3));
  const [confirmDispute, setConfirmDispute] = useState(false);
  const first = addDays(today, 1);
  const last = addDays(today, HORIZON_DAYS);
  const validUntil = until >= first && until <= last;
  const done = (ok: boolean) => ok && onDone();

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1">
        <label className="flex items-center">
          <span className="sr-only">Snooze until</span>
          <input
            type="date"
            value={until}
            min={first}
            max={last}
            onChange={(e) => setUntil(e.target.value)}
            className="h-7 rounded-xl border border-line bg-surface px-1.5 font-mono text-xs text-ink"
          />
        </label>
        <Button
          size="sm"
          variant="ghost"
          disabled={!validUntil}
          title="The reminder comes back on that date. Logged."
          onClick={() => done(dispatch({ type: "SNOOZE_REMINDER", invoiceId, until }))}
        >
          <CalendarClock className="h-3.5 w-3.5" aria-hidden />
          Snooze to {validUntil ? fmtDate(until) : "date"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          title="Recorded as a phone follow-up; counts as contact for 5 days (R2). Logged."
          onClick={() => done(dispatch({ type: "CALL_INSTEAD", invoiceId }))}
        >
          <Phone className="h-3.5 w-3.5" aria-hidden />
          I&apos;ll call instead
        </Button>
        {!confirmDispute && (
          <Button size="sm" variant="ghost" onClick={() => setConfirmDispute(true)}>
            <TriangleAlert className="h-3.5 w-3.5" aria-hidden />
            Mark disputed
          </Button>
        )}
      </div>
      {confirmDispute && (
        <div className="flex flex-wrap items-center gap-2 border-l-[3px] border-l-rose-700 bg-rose-50 px-3 py-2 text-xs text-rose-800">
          <span className="flex-1">Mark {invoiceNumber} disputed? Reminders pause (M5).</span>
          <Button size="sm" variant="danger" onClick={() => done(dispatch({ type: "MARK_DISPUTED", invoiceId }))}>
            Confirm dispute
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setConfirmDispute(false)}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}

/** Clerk view of G1: whether paying covers the next bill, never the amounts (FR-B5). */
function ClerkNextBill({ row }: { row: PlanRow }) {
  const state = useKachingg((s) => s.state);
  const next = gapImpact(state, row.invoice)[0];
  const answer = !next ? "no bill is short" : next.after >= 0 ? "yes" : next.after > next.before ? "partly" : "no";
  return (
    <div className="flex items-center justify-between gap-2 text-[13px] text-ink" title={`If paid by ${fmtDate(payBy(state))}`}>
      <span>
        Covers next bill: <span className={cx("font-semibold", answer === "yes" ? "text-emerald-700" : "text-ink2")}>{answer}</span>
      </span>
      <RuleTag id="G1" />
    </div>
  );
}

function OwnerGapImpact({ row }: { row: PlanRow }) {
  const state = useKachingg((s) => s.state);
  const impact = gapImpact(state, row.invoice);
  if (impact.length === 0) return <div className="text-[13px] text-ink2">No shortfall in the next 30 days.</div>;
  return (
    <ul className="space-y-1">
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
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-ink2">{label}</dt>
      <dd className="min-w-0 text-ink">{children}</dd>
    </>
  );
}

function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-2">
      <h3 className="text-xs font-medium text-ink2">{children}</h3>
      {right}
    </div>
  );
}
