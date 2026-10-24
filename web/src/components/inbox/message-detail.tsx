"use client";
// Right column: one message, Bukti's reading of it, and what the rules made of
// it. Every button dispatches an engine action; the UI never changes money.
import { AlertTriangle, CheckCircle2, FileText, Landmark, Loader2, ScanText, Sparkles, XCircle } from "lucide-react";
import {
  customerOf,
  fmtDate,
  fmtDateTime,
  fmtRM,
  addDays,
  invoiceOf,
  outstanding,
  type ExtractionRecord,
  type InboundMessage,
  type Receipt,
  type State,
} from "@/engine/model";
import { CONFIDENCE_MIN } from "@/engine/rules";
import { useKutip } from "@/lib/store";
import { Badge, Button, Card, CardHeader, RuleTag, cx } from "@/components/ui";
import { ChatBackdrop, ChatBubble, SlipThumb } from "./bubble";
import { HighlightedText, type QuoteMark } from "./highlight";
import { MARK_CLASS, dayLabel, fieldRows, type FieldRow } from "./fields";
import { STATUS_LABEL, STATUS_TONE, messageStatus } from "./status";

export type RunInfo = { loading: true } | { loading: false; label: string; cached: boolean; failed?: boolean };

export function MessageDetail({
  state,
  msg,
  run,
  onRead,
  onEnlarge,
}: {
  state: State;
  msg: InboundMessage;
  run: RunInfo | undefined;
  onRead: () => void;
  onEnlarge: (src: string) => void;
}) {
  const c = customerOf(state, msg.customerId);
  const rec = state.extractions[msg.id];
  const status = messageStatus(state, msg);
  const rows = rec ? fieldRows(rec, msg) : [];
  const marks: QuoteMark[] = rows.filter((r) => r.quote && r.tone).map((r) => ({ quote: r.quote!, tone: r.tone! }));
  const loading = run?.loading === true;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          kicker={`WhatsApp · ${c.whatsapp} · linked to customer`}
          title={
            <span className="flex flex-wrap items-center gap-2">
              {c.name} <span className="font-normal text-slate-500">({c.contact})</span>
            </span>
          }
          right={<Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>}
        />
        <div className="p-3">
          <ChatBackdrop>
            <ChatBubble time={fmtDateTime(msg.receivedAt)}>
              {msg.image && (
                <div className="mb-2">
                  <SlipThumb src={msg.image} size="md" onOpen={() => onEnlarge(msg.image!)} />
                </div>
              )}
              <p className="whitespace-pre-wrap">
                <HighlightedText text={msg.text} marks={marks} />
              </p>
            </ChatBubble>
          </ChatBackdrop>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            {!rec && (
              <Button onClick={onRead} disabled={loading} className="bg-sky-600 hover:bg-sky-700 disabled:bg-sky-300">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {loading ? "Bukti is reading…" : "Read with Bukti AI"}
              </Button>
            )}
            <RunLabel run={run} rec={rec} />
          </div>
        </div>
      </Card>

      {rec && <AiReadPanel rec={rec} rows={rows} />}
      {rec && <Outcome state={state} msg={msg} rec={rec} />}
    </div>
  );
}

function RunLabel({ run, rec }: { run: RunInfo | undefined; rec: ExtractionRecord | undefined }) {
  if (run?.loading) return <span className="text-xs text-slate-500">Sending the message to claude-opus-5-5…</span>;
  if (run && !run.loading) {
    return (
      <Badge tone={run.failed ? "rose" : run.cached ? "amber" : "sky"} className="text-xs">
        {run.label}
      </Badge>
    );
  }
  if (rec) {
    return (
      <Badge tone={rec.cached ? "amber" : "sky"} className="text-xs">
        {rec.cached ? "Cached result" : `Live · ${rec.model}`}
      </Badge>
    );
  }
  return <span className="text-xs text-slate-500">Bukti extracts the fields; the rules decide. Nothing is marked paid without a bank line.</span>;
}

/* ---------- AI READ ---------- */

const pct = (c: number) => `${Math.round(c * 100)}%`;

function AiReadPanel({ rec, rows }: { rec: ExtractionRecord; rows: FieldRow[] }) {
  return (
    <Card tone="ai">
      <CardHeader
        kicker={
          <span className="inline-flex items-center gap-1.5">
            <ScanText className="h-3.5 w-3.5" /> AI read
          </span>
        }
        title="What Bukti read"
        right={<span className="font-mono text-[10px] text-slate-500">{rec.model}</span>}
      />
      <div className="divide-y divide-sky-100 px-4">
        {rows.map((r) => (
          <div key={r.key} className="grid grid-cols-[8.5rem_1fr_auto] items-start gap-3 py-2 text-sm">
            <div className="text-xs font-medium text-slate-500">{r.label}</div>
            <div className="min-w-0">
              <div className="font-semibold text-slate-900">{r.value}</div>
              {r.quote && r.tone && (
                <div className="mt-0.5 text-xs text-slate-600">
                  quote: <mark className={cx("rounded px-0.5", MARK_CLASS[r.tone])}>{r.quote}</mark>
                </div>
              )}
            </div>
            <div className="flex flex-col items-end gap-1">
              {r.confidence !== null && (
                <span className={cx("font-mono text-xs", r.confidence < CONFIDENCE_MIN ? "font-semibold text-amber-700" : "text-slate-700")}>
                  {pct(r.confidence)}
                </span>
              )}
              {r.source && <Badge tone={r.source === "slip" ? "violet" : "slate"}>{r.source === "slip" ? "from slip" : "from message"}</Badge>}
            </div>
          </div>
        ))}
      </div>
      {rec.rejectedQuotes.length > 0 && (
        <div className="mx-4 mb-3 rounded-md border border-rose-200 bg-rose-50 p-2 text-xs text-rose-800">
          <div className="mb-1 flex items-center gap-1.5 font-semibold">
            <RuleTag id="FR-E3" /> Verbatim gate dropped these (quote not found in the message):
          </div>
          <ul className="list-disc pl-5">
            {rec.rejectedQuotes.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </div>
      )}
      <p className="px-4 pb-3 text-[11px] text-slate-500">
        Highlights show the exact words each field came from. Confidence below {pct(CONFIDENCE_MIN)} goes to a person (M4).
      </p>
    </Card>
  );
}

/* ---------- what the rules did ---------- */

function Outcome({ state, msg, rec }: { state: State; msg: InboundMessage; rec: ExtractionRecord }) {
  const receipt = state.receipts.find((r) => r.messageId === msg.id) ?? null;
  const handoffs = state.handoffs.filter((h) => h.messageId === msg.id);
  const ex = rec.extraction;
  const isPromise = ex.intent === "promise_to_pay" || (ex.amount === null && ex.promised_date_candidates.length > 0);
  const promised = state.invoices.find((i) => i.promise?.messageId === msg.id) ?? null;

  return (
    <>
      {handoffs
        .filter((h) => h.resolved === null)
        .map((h) => (
          <div key={h.id} className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <RuleTag id="M4" />
            <span>
              Needs a human: <b>{h.question}</b> Answer it in the queue at the top of this page.
            </span>
          </div>
        ))}

      {isPromise ? (
        <Card>
          <CardHeader kicker={<RuleTag id="M5" />} title="Promise to pay" />
          <div className="px-4 py-3 text-sm text-slate-700">
            {promised?.promise ? (
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                {promised.number}: promised {dayLabel(promised.promise.date)}. Reminders paused until {fmtDate(addDays(promised.promise.date, 1))}.
              </span>
            ) : (
              "No date confirmed yet. Nothing is paid until a bank line arrives."
            )}
          </div>
        </Card>
      ) : (
        <BankCheck state={state} receipt={receipt} noLine={handoffs.some((h) => h.kind === "claim_unverified")} />
      )}

      {receipt?.deduction && <DeductionPanel state={state} receipt={receipt} />}
      {receipt && <ProposedAction state={state} receipt={receipt} />}

      {handoffs
        .filter((h) => h.resolved !== null)
        .map((h) => (
          <div key={h.id} className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            <span>
              {h.question} → <b>{resolvedText(h.resolved!)}</b> by {h.resolvedBy}
            </span>
          </div>
        ))}
    </>
  );
}

const resolvedText = (option: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(option)
    ? dayLabel(option)
    : ({ send_reply: "reply sent (simulated)", mark_paid_anyway: "marked paid by owner override", dismiss: "dismissed" } as Record<string, string>)[option] ?? option;

function BankCheck({ state, receipt, noLine }: { state: State; receipt: Receipt | null; noLine: boolean }) {
  const line = receipt ? state.bankLines.find((b) => b.id === receipt.bankLineId) ?? null : null;
  return (
    <Card tone={line ? "good" : "bad"}>
      <CardHeader
        kicker={
          <span className="inline-flex items-center gap-1.5">
            <RuleTag id="M1" /> Bank check
          </span>
        }
        title={line ? "VERIFIED against the bank statement" : "CLAIM only: not verified"}
        right={<Landmark className={cx("h-4 w-4", line ? "text-emerald-600" : "text-rose-600")} />}
      />
      <div className="px-4 py-3 text-sm">
        {line ? (
          <>
            <div className="rounded-md border border-emerald-200 bg-white px-3 py-2 font-mono text-xs text-slate-800">
              {fmtDateTime(line.at)} · {fmtRM(line.amount, { cents: true })} · {line.description}
            </div>
            <p className="mt-2 text-xs text-slate-600">Same amount, within 3 days of the claim, payer name or invoice number in the description.</p>
          </>
        ) : (
          <div className="flex items-start gap-1.5 text-rose-800">
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              {noLine ? "No bank line found: not marked paid." : "No bank line found: not marked paid. The invoice must be identified first."}
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}

function DeductionPanel({ state, receipt }: { state: State; receipt: Receipt }) {
  const ded = receipt.deduction!;
  const inv = invoiceOf(state, receipt.invoiceId);
  const d = inv.delivery;
  return (
    <Card tone="warn">
      <CardHeader
        kicker={
          <span className="inline-flex items-center gap-1.5">
            <RuleTag id="M3" /> Deduction
          </span>
        }
        title={`${fmtRM(ded.amount, { cents: true })} · ${ded.reason}`}
        right={<AlertTriangle className="h-4 w-4 text-amber-600" />}
      />
      <div className="space-y-2 px-4 py-3 text-sm text-slate-700">
        {ded.linkedDo ? (
          <div className="flex items-start gap-1.5">
            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
            <span>
              Linked to <b>{ded.linkedDo}</b>: {d.route}, delivered {fmtDate(d.date)} (destination {d.destination} named in the reason).
            </span>
          </div>
        ) : (
          <div>Not linked to any delivery on {inv.number}: the Owner should check the reason.</div>
        )}
        <div className="text-xs text-slate-500">
          Customer&apos;s words: <mark className={cx("rounded px-0.5", MARK_CLASS.deduction)}>{ded.quote}</mark>
        </div>
      </div>
    </Card>
  );
}

function ProposedAction({ state, receipt }: { state: State; receipt: Receipt }) {
  const dispatch = useKutip((s) => s.dispatch);
  const inv = invoiceOf(state, receipt.invoiceId);
  const ded = receipt.deduction;
  const isOwner = state.role === "owner";
  const original = inv.amount + (ded?.status === "accepted" ? ded.amount : 0);
  const cn = state.creditNotes.find((n) => n.invoiceId === inv.id);
  const approved = receipt.status === "approved";

  return (
    <Card tone={approved ? "good" : undefined}>
      <CardHeader
        kicker={
          <span className="inline-flex items-center gap-1.5">
            <RuleTag id="M2" /> Proposed action
          </span>
        }
        title={`Receipt ${fmtRM(receipt.amount)} → ${inv.number}`}
        right={<Badge tone={inv.status === "paid" ? "violet" : inv.status === "part_paid" ? "amber" : "slate"}>{inv.status.replace("_", " ").toUpperCase()}</Badge>}
      />
      <div className="space-y-3 px-4 py-3 text-sm text-slate-700">
        <p className="text-xs text-slate-600">
          {fmtRM(receipt.amount)} paid{ded ? ` + ${fmtRM(ded.amount)} stated deduction` : ""} = {fmtRM(receipt.amount + (ded?.amount ?? 0))}; {inv.number} was{" "}
          {fmtRM(original)}. Outstanding now {fmtRM(outstanding(inv))}.
        </p>

        {approved ? (
          <div className="flex items-center gap-1.5 text-emerald-800">
            <CheckCircle2 className="h-4 w-4" /> Receipt approved by {receipt.approvedBy}
            {ded?.status === "pending" ? ` · ${fmtRM(ded.amount)} deduction under review` : ""}
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => dispatch({ type: "APPROVE_RECEIPT", receiptId: receipt.id })}>
              <CheckCircle2 className="h-4 w-4" /> Approve receipt
            </Button>
            <span className="text-[11px] text-slate-500">Owner or Clerk: slip amount equals the bank line (FR-E12).</span>
          </div>
        )}

        {ded && (
          <div className="rounded-md border border-amber-200 bg-amber-50/60 p-3">
            <div className="mb-2 text-xs font-semibold text-slate-800">
              Deduction {fmtRM(ded.amount)} <RuleTag id="M3" />
            </div>
            {ded.status === "pending" && !approved && <p className="text-xs text-slate-600">Decided by the Owner after the receipt is approved.</p>}
            {ded.status === "pending" && approved && isOwner && (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => dispatch({ type: "DECIDE_DEDUCTION", receiptId: receipt.id, decision: "accepted" })}>
                  Accept deduction (drafts credit note)
                </Button>
                <Button size="sm" variant="secondary" onClick={() => dispatch({ type: "DECIDE_DEDUCTION", receiptId: receipt.id, decision: "rejected" })}>
                  Reject
                </Button>
              </div>
            )}
            {ded.status === "pending" && approved && !isOwner && (
              <p className="text-xs text-slate-600">Waiting for the Owner: accepting a deduction changes what the customer owes.</p>
            )}
            {ded.status === "accepted" && (
              <p className="flex items-center gap-1.5 text-xs text-emerald-800">
                <CheckCircle2 className="h-3.5 w-3.5" /> Accepted by {ded.decidedBy}. {inv.number} PAID
                {cn ? `; credit note ${cn.id} drafted (${fmtRM(cn.amount)}, not submitted)` : ""}.
              </p>
            )}
            {ded.status === "rejected" && (
              <p className="text-xs text-rose-800">
                Rejected by {ded.decidedBy}: {fmtRM(outstanding(inv))} still owed on {inv.number}.
              </p>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
