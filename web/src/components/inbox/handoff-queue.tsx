"use client";
// "Needs a human" queue (rule M4, FR-E7, FR-E10). Each card asks one specific
// question; answers go to the engine as RESOLVE_HANDOFF, which checks the role.
import { useState } from "react";
import { HelpCircle, Send } from "lucide-react";
import { customerOf, invoiceOf, timeOf, type Handoff, type State } from "@/engine/model";
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

export function HandoffQueue({ state, onOpen }: { state: State; onOpen: (messageId: string) => void }) {
  const open = openHandoffs(state);
  if (!open.length) return null;
  return (
    <Card tone="warn" className="mb-5">
      <CardHeader
        kicker={
          <span className="inline-flex items-center gap-1.5">
            <RuleTag id="M4" /> Hand-off
          </span>
        }
        title={`Needs a human · ${open.length}`}
        right={<span className="text-[11px] text-slate-500">Bukti never guesses: one question each</span>}
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
    <div className="rounded-lg border border-amber-200 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone="amber">{KIND_LABEL[h.kind]}</Badge>
            {inv && <Badge>{inv.number}</Badge>}
            <span className="text-[11px] text-slate-500">{h.id}</span>
          </div>
          <div className="mt-1 truncate text-xs text-slate-600">
            {c.name} · {timeOf(msg.receivedAt)}
          </div>
        </div>
        {onOpen && (
          <Button variant="ghost" size="sm" onClick={onOpen}>
            Open message
          </Button>
        )}
      </div>
      <p className="mt-2 rounded bg-slate-50 px-2 py-1 text-xs italic text-slate-600">“{msg.text}”</p>
      <div className="mt-2 flex items-start gap-1.5 text-sm font-semibold text-slate-900">
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
      <div role="radiogroup" aria-label={h.question} className="flex flex-wrap gap-2">
        {h.options.map((d) => (
          <label
            key={d}
            className={cx(
              "flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm",
              picked === d ? "border-emerald-500 bg-emerald-50 text-emerald-900" : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50",
            )}
          >
            <input type="radio" name={`h-${h.id}`} value={d} checked={picked === d} onChange={() => setPicked(d)} className="accent-emerald-600" />
            {dayLabel(d)}
          </label>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <Button size="sm" disabled={!picked} onClick={() => picked && onConfirm(picked)}>
          Confirm
        </Button>
        <span className="text-[11px] text-slate-500">
          Confirming pauses reminders until the day after (<RuleTag id="M5" />)
        </span>
      </div>
    </div>
  );
}

function ClaimUnverifiedForm({ state, h, onResolve }: { state: State; h: Handoff; onResolve: (option: string) => void }) {
  const isOwner = state.role === "owner";
  return (
    <div className="mt-3 space-y-2">
      <div className="text-[11px] text-slate-500">
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
      </div>
      {!isOwner && <p className="text-[11px] text-slate-500">Mark paid anyway is Owner only: it changes what the customer owes with no bank line.</p>}
    </div>
  );
}
