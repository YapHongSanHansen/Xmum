"use client";
// "Needs a human" queue (rule M4, FR-E7, FR-E10). Each card asks one specific
// question; answers go to the engine as RESOLVE_HANDOFF, which checks the role.
// Below it, "already paid" claims with no bank line that still pause reminders
// (M5), which only the Owner can reject (REJECT_CLAIM, PRD §22 row 2).
import { useState } from "react";
import { Ban, HelpCircle, Send } from "lucide-react";
import { customerOf, fmtDateTime, invoiceOf, timeOf, type Handoff, type Invoice, type State } from "@/engine/model";
import { useKutip } from "@/lib/store";
import { Badge, Button, Card, CardHeader, RuleTag, cx } from "@/components/ui";
import { ChatBackdrop, ChatBubble } from "./bubble";
import { dayLabel } from "./fields";
import { openHandoffs } from "./status";

const KIND_LABEL: Record<Handoff["kind"], string> = {
  promise_date: "Ambiguous date",
  claim_unverified: "Claim not in bank",
  unmatched: "Unmatched",
};

/** Unverified claims whose hand-off is closed (e.g. the slip was asked for): reminders stay paused (M5). */
function waitingClaims(s: State): Invoice[] {
  return s.invoices.filter(
    (i) =>
      i.openClaimMessageId !== null &&
      !s.receipts.some((r) => r.invoiceId === i.id && r.messageId === i.openClaimMessageId) &&
      !s.handoffs.some((h) => h.messageId === i.openClaimMessageId && h.resolved === null),
  );
}

export function HandoffQueue({ state, onOpen }: { state: State; onOpen: (messageId: string) => void }) {
  const open = openHandoffs(state);
  const waiting = waitingClaims(state);
  if (!open.length && !waiting.length) return null;
  return (
    <>
      {open.length > 0 && <OpenHandoffs state={state} open={open} onOpen={onOpen} />}
      {waiting.length > 0 && <WaitingClaims state={state} invoices={waiting} onOpen={onOpen} />}
    </>
  );
}

function OpenHandoffs({ state, open, onOpen }: { state: State; open: Handoff[]; onOpen: (messageId: string) => void }) {
  return (
    <Card tone="warn" className="mb-5">
      <CardHeader
        kicker={
          <span className="inline-flex items-center gap-1.5">
            <RuleTag id="M4" /> Hand-off
          </span>
        }
        title={`Needs a human · ${open.length}`}
        right={<span className="font-mono text-[11px] text-ink2">Bukti never guesses: one question each</span>}
      />
      <div className="grid gap-3 p-3 lg:grid-cols-2">
        {open.map((h) => (
          <HandoffCard key={h.id} state={state} h={h} onOpen={() => onOpen(h.messageId)} />
        ))}
      </div>
    </Card>
  );
}

export function HandoffCard({ state, h, onOpen }: { state: State; h: Handoff; onOpen?: () => void }) {
  const dispatch = useKutip((s) => s.dispatch);
  const msg = state.messages.find((m) => m.id === h.messageId)!;
  const c = customerOf(state, msg.customerId);
  const inv = h.invoiceId ? invoiceOf(state, h.invoiceId) : null;
  const resolve = (option: string) => dispatch({ type: "RESOLVE_HANDOFF", handoffId: h.id, option });

  return (
    <div className="border border-amber-200 bg-surface p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone="amber">{KIND_LABEL[h.kind]}</Badge>
            {inv && <Badge className="num">{inv.number}</Badge>}
            <span className="num text-[11px] text-ink2">{h.id}</span>
          </div>
          <div className="mt-1 truncate text-xs text-ink2">
            {c.name} · {timeOf(msg.receivedAt)}
          </div>
        </div>
        {onOpen && (
          <Button variant="ghost" size="sm" onClick={onOpen}>
            Open message
          </Button>
        )}
      </div>
      <p className="mt-2 border-l-2 border-l-line-strong bg-canvas px-2 py-1 text-xs italic text-ink2">“{msg.text}”</p>
      <div className="mt-2 flex items-start gap-1.5 text-sm font-semibold text-ink">
        <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <span>{h.question}</span>
      </div>
      {h.kind === "promise_date" && <PromiseDateForm h={h} onConfirm={resolve} />}
      {h.kind === "claim_unverified" && <ClaimUnverifiedForm state={state} h={h} onResolve={resolve} />}
      {h.kind === "unmatched" && (
        <div className="mt-3">
          <Button variant="secondary" size="sm" onClick={() => resolve("dismiss")}>
            Dismiss
          </Button>
        </div>
      )}
    </div>
  );
}

function PromiseDateForm({ h, onConfirm }: { h: Handoff; onConfirm: (option: string) => void }) {
  const [picked, setPicked] = useState<string | null>(null);
  return (
    <div className="mt-3">
      {h.options.length === 0 && (
        <label className="flex items-center gap-2 text-sm text-ink">
          Promised date
          <input
            type="date"
            className="h-7 rounded-[2px] border border-line-strong bg-surface px-1.5 font-mono text-xs text-ink"
            onChange={(e) => setPicked(e.target.value || null)}
          />
        </label>
      )}
      <div role="radiogroup" aria-label={h.question} className="flex flex-wrap gap-2">
        {h.options.map((d) => (
          <label
            key={d}
            className={cx(
              "flex h-[30px] cursor-pointer items-center gap-2 rounded-[2px] border px-3 text-[13px]",
              picked === d ? "border-navy bg-navy-soft text-navy" : "border-line-strong bg-surface text-ink hover:bg-canvas",
            )}
          >
            <input type="radio" name={`h-${h.id}`} value={d} checked={picked === d} onChange={() => setPicked(d)} className="accent-navy" />
            {dayLabel(d)}
          </label>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <Button size="sm" disabled={!picked} onClick={() => picked && onConfirm(picked)}>
          Confirm
        </Button>
        <span className="text-[11px] text-ink2">
          Confirming pauses reminders until the day after (<RuleTag id="M5" />)
        </span>
      </div>
    </div>
  );
}

function WaitingClaims({ state, invoices, onOpen }: { state: State; invoices: Invoice[]; onOpen: (messageId: string) => void }) {
  const isOwner = state.role === "owner";
  return (
    <Card className="mb-5">
      <CardHeader
        kicker={
          <span className="inline-flex items-center gap-1.5">
            <RuleTag id="M5" /> Paused
          </span>
        }
        title={`Says paid, not in the bank · ${invoices.length}`}
        right={<span className="font-mono text-[11px] text-ink2">Never marked paid without a matching bank line</span>}
      />
      <ul className="divide-y divide-hairline">
        {invoices.map((inv) => {
          const msg = state.messages.find((m) => m.id === inv.openClaimMessageId)!;
          const asked = state.handoffs.find((h) => h.messageId === msg.id && h.kind === "claim_unverified" && h.resolved === "send_reply");
          return (
            <li key={inv.id} className="flex min-h-[38px] flex-wrap items-center gap-3 px-4 py-3 text-sm">
              <Badge className="num">{inv.number}</Badge>
              <div className="min-w-0 flex-1">
                <div className="truncate text-ink">{customerOf(state, inv.customerId).name}</div>
                <div className="text-xs text-ink2">
                  Said paid <span className="num">{fmtDateTime(msg.receivedAt)}</span>
                  {asked ? ` · slip requested by ${asked.resolvedBy}` : ""} · reminders paused until the bank shows it or the Owner rejects the claim
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => onOpen(msg.id)}>
                Open message
              </Button>
              <RejectClaimButton isOwner={isOwner} invoiceId={inv.id} />
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

/** Owner only (§9.3: changes what a customer is treated as owing). The engine checks the role too. */
function RejectClaimButton({ isOwner, invoiceId }: { isOwner: boolean; invoiceId: string }) {
  const dispatch = useKutip((s) => s.dispatch);
  return (
    <Button
      size="sm"
      variant="secondary"
      disabled={!isOwner}
      title={isOwner ? "No bank line arrived: drop the claim and let reminders resume" : "Only the Owner can reject a payment claim"}
      onClick={() => dispatch({ type: "REJECT_CLAIM", invoiceId })}
    >
      <Ban className="h-3.5 w-3.5" aria-hidden />
      Reject claim
    </Button>
  );
}

function ClaimUnverifiedForm({ state, h, onResolve }: { state: State; h: Handoff; onResolve: (option: string) => void }) {
  const isOwner = state.role === "owner";
  return (
    <div className="mt-3 space-y-2">
      <div className="text-[11px] text-ink2">
        <RuleTag id="M1" /> Not marked paid. Draft reply for approval:
      </div>
      {h.draftReply && (
        <ChatBackdrop className="p-2">
          <ChatBubble outgoing time="draft · not sent">
            {h.draftReply}
          </ChatBubble>
        </ChatBackdrop>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => onResolve("send_reply")}>
          <Send className="h-3.5 w-3.5" /> Send reply (simulated)
        </Button>
        <Button
          size="sm"
          variant="danger"
          disabled={!isOwner}
          title={isOwner ? "Owner override: marks the invoice paid with no bank line" : "Only the Owner can mark an invoice paid without a bank line"}
          onClick={() => onResolve("mark_paid_anyway")}
        >
          Mark paid anyway
        </Button>
        {h.invoiceId && <RejectClaimButton isOwner={isOwner} invoiceId={h.invoiceId} />}
      </div>
      {!isOwner && (
        <p className="text-[11px] text-ink2">
          Mark paid anyway and Reject claim are Owner only: one changes what the customer owes with no bank line, the other ends the pause on reminders.
        </p>
      )}
    </div>
  );
}
