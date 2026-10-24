"use client";
// Right column: one message, Bukti's reading of it, and what the rules made of
// it. Every button dispatches an engine action; the UI never changes money.
import type { ReactNode } from "react";
import { CheckCircle2, Clock, HelpCircle, Loader2, Sparkles, XCircle } from "lucide-react";
import {
  customerOf,
  fmtDate,
  fmtDateTime,
  fmtRM,
  addDays,
  invoiceOf,
  outstanding,
  type ExtractionRecord,
  type Handoff,
  type InboundMessage,
  type Receipt,
  type State,
} from "@/engine/model";
import { CONFIDENCE_MIN } from "@/engine/rules";
import { useKachingg } from "@/lib/store";
import { Badge, Button, Card, CardHeader, RuleTag, cx, stagger } from "@/components/ui";
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
    <div className="space-y-6">
      <Card>
        <CardHeader
          title={
            <>
              {c.name} <span className="font-normal text-ink2">({c.contact})</span>
              <span className="mt-0.5 block text-xs font-normal tracking-normal text-ink2">
                WhatsApp <span className="num">{c.whatsapp}</span>
              </span>
            </>
          }
          right={<Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>}
        />
        <div className="p-5">
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

          {!rec && (
            <div className="mt-4">
              <Button onClick={onRead} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {loading ? "Bukti is reading…" : "Read with Bukti AI"}
              </Button>
            </div>
          )}
        </div>
      </Card>

      {!rec && loading && <ReadingSkeleton />}
      {rec && <AiReadPanel rec={rec} rows={rows} run={run} />}
      {rec && <Outcome state={state} msg={msg} rec={rec} />}
    </div>
  );
}

/** One small chip naming where the reading came from: "Cached result" or "Live · model" (FR-E11). */
function SourceChip({ run, rec }: { run: RunInfo | undefined; rec: ExtractionRecord }) {
  if (run && !run.loading) {
    return (
      <span title={run.label}>
        <Badge tone={run.failed ? "rose" : run.cached ? "amber" : "sky"} pulse={!run.failed && !run.cached}>
          {run.failed || !run.cached ? run.label : "Cached result"}
        </Badge>
      </span>
    );
  }
  return (
    <span title={rec.model}>
      <Badge tone={rec.cached ? "amber" : "sky"} pulse={!rec.cached}>
        {rec.cached ? "Cached result" : `Live · ${rec.model}`}
      </Badge>
    </span>
  );
}

/* ---------- AI READ ---------- */

const pct = (c: number) => `${Math.round(c * 100)}%`;
const FIELD_GRID = "grid grid-cols-[minmax(0,6.5rem)_minmax(0,1fr)_auto] gap-3 sm:grid-cols-[8.5rem_minmax(0,1fr)_auto]";

/** The field table's shape while Bukti reads. Hidden from assistive tech: the button already says Bukti is reading. */
function ReadingSkeleton() {
  const widths = ["w-28", "w-20", "w-36", "w-24", "w-32"];
  return (
    <div className="panel panel-ai k-rise" aria-hidden>
      <div className="panel-header">
        <div className="k-shimmer h-6 w-28" />
        <div className="k-shimmer h-6 w-20 rounded-full" />
      </div>
      <div className="px-5 pb-4">
        <div className={cx(FIELD_GRID, "h-[30px] items-center border-b border-line")}>
          <div className="k-shimmer h-3 w-10" />
          <div className="k-shimmer h-3 w-12" />
          <div className="k-shimmer h-3 w-16" />
        </div>
        <div className="divide-y divide-hairline">
          {widths.map((w) => (
            <div key={w} className={cx(FIELD_GRID, "min-h-[38px] items-center py-2.5")}>
              <div className="k-shimmer h-3 w-16" />
              <div className={cx("k-shimmer h-3.5 max-w-full", w)} />
              <div className="k-shimmer h-3 w-8" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AiReadPanel({ rec, rows, run }: { rec: ExtractionRecord; rows: FieldRow[]; run: RunInfo | undefined }) {
  return (
    <Card tone="ai" rise={0}>
      <CardHeader title="Bukti read" right={<SourceChip run={run} rec={rec} />} />
      <div className="px-5 pb-2">
        <div className={cx(FIELD_GRID, "h-[30px] items-center border-b border-line text-xs text-ink2")}>
          <span>Field</span>
          <span>Value</span>
          <span className="text-right">Confidence</span>
        </div>
        <div className="divide-y divide-hairline">
          {rows.map((r, i) => (
            <div key={r.key} className={cx(FIELD_GRID, "k-rise min-h-[38px] items-start py-2.5 text-[13px]")} style={stagger(i + 1)}>
              <div className="text-xs text-ink2">{r.label}</div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-semibold text-ink">{r.value}</span>
                  {r.source === "slip" && r.key !== "slip" && <Badge tone="violet">from slip</Badge>}
                </div>
                {r.quote && r.tone && (
                  <div className="mt-1 text-xs">
                    {/* Kept for screen readers (and text checks); inline-block so it stays on the quote's line. */}
                    <span className="inline-block h-px w-px overflow-hidden whitespace-pre [clip-path:inset(50%)]">quote: </span>
                    <mark className={cx("rounded px-0.5", MARK_CLASS[r.tone])}>{r.quote}</mark>
                  </div>
                )}
              </div>
              <div className="text-right">
                {r.confidence !== null && (
                  <span
                    className={cx("font-mono text-xs", r.confidence < CONFIDENCE_MIN ? "font-semibold text-amber-800" : "text-ink")}
                    title={r.confidence < CONFIDENCE_MIN ? `Below ${pct(CONFIDENCE_MIN)}: goes to a person (M4)` : undefined}
                  >
                    {pct(r.confidence)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      {rec.rejectedQuotes.length > 0 && (
        <div className="mx-5 mb-4 border-l-2 border-l-rose-700 pl-3 text-xs text-rose-800">
          <div className="mb-1 flex items-center gap-1.5 font-medium">
            <RuleTag id="FR-E3" /> Dropped: quote not in the message
          </div>
          <ul className="list-disc pl-5">
            {rec.rejectedQuotes.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

/* ---------- what the rules did: one compact stack of checks ---------- */

type Tone = "good" | "bad" | "warn" | "plain";
const TONE_TEXT: Record<Tone, string> = {
  good: "text-emerald-800",
  bad: "text-rose-800",
  warn: "text-amber-800",
  plain: "text-ink",
};
const TONE_ICON: Record<Tone, ReactNode> = {
  good: <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />,
  bad: <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />,
  warn: <Clock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />,
  plain: null,
};

function CheckRow({
  rule,
  label,
  tone,
  status,
  right,
  detail,
  title,
}: {
  rule: string;
  label: string;
  tone: Tone;
  status: ReactNode;
  right?: ReactNode;
  detail?: ReactNode;
  title?: string;
}) {
  return (
    <li className="grid grid-cols-[minmax(0,6.5rem)_minmax(0,1fr)] gap-3 px-5 py-3.5 sm:grid-cols-[8.5rem_minmax(0,1fr)]" title={title}>
      <div className="flex h-5 items-center gap-1.5 self-start text-xs text-ink2">
        <RuleTag id={rule} /> {label}
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className={cx("flex min-w-0 items-start gap-1.5 text-[13px] font-medium", TONE_TEXT[tone])}>
            {TONE_ICON[tone]}
            <span>{status}</span>
          </span>
          {right}
        </div>
        {detail && <div className="mt-1 text-xs text-ink2">{detail}</div>}
      </div>
    </li>
  );
}

function Outcome({ state, msg, rec }: { state: State; msg: InboundMessage; rec: ExtractionRecord }) {
  const receipt = state.receipts.find((r) => r.messageId === msg.id) ?? null;
  const handoffs = state.handoffs.filter((h) => h.messageId === msg.id);
  const ex = rec.extraction;
  const isPromise = ex.intent === "promise_to_pay" || (ex.amount === null && ex.promised_date_candidates.length > 0);
  const promised = state.invoices.find((i) => i.promise?.messageId === msg.id) ?? null;
  // A reply with no payment content (e.g. "ok noted") has nothing for the bank check to verify.
  const nothingToCheck = ex.intent === "other" && !isPromise && !receipt && handoffs.length === 0;

  return (
    <Card rise={2}>
      <CardHeader title="Checks" />
      <ul className="divide-y divide-hairline">
        {handoffs
          .filter((h) => h.resolved === null)
          .map((h) => (
            <CheckRow key={h.id} rule="M4" label="Hand-off" tone="warn" status={h.question} detail="Answer in the queue above" />
          ))}

        {isPromise ? (
          <CheckRow
            rule="M5"
            label="Promise"
            tone={promised?.promise ? "good" : "warn"}
            status={promised?.promise ? `${promised.number} promised ${dayLabel(promised.promise.date)}` : "No date confirmed yet"}
            detail={promised?.promise ? `Reminders paused until ${fmtDate(addDays(promised.promise.date, 1))}` : undefined}
          />
        ) : nothingToCheck ? (
          <CheckRow rule="M1" label="Bank" tone="plain" status="No payment mentioned: nothing to check" />
        ) : (
          <BankCheck state={state} receipt={receipt} noLine={handoffs.some((h) => h.kind === "claim_unverified")} />
        )}

        {receipt?.deduction && <DeductionCheck state={state} receipt={receipt} />}
        {receipt && <ReceiptCheck state={state} receipt={receipt} />}

        {handoffs
          .filter((h) => h.resolved !== null)
          .map((h) => (
            <ResolvedRow key={h.id} h={h} />
          ))}
      </ul>
      {receipt && <Actions state={state} receipt={receipt} />}
    </Card>
  );
}

function ResolvedRow({ h }: { h: Handoff }) {
  return (
    <CheckRow rule="M4" label="Answered" tone="plain" status={`${h.question} → ${resolvedText(h.resolved!)}`} detail={`by ${h.resolvedBy}`} />
  );
}

const resolvedText = (option: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(option)
    ? dayLabel(option)
    : ({ send_reply: "reply sent (simulated)", mark_paid_anyway: "marked paid by owner override", dismiss: "dismissed" } as Record<string, string>)[option] ?? option;

function BankCheck({ state, receipt, noLine }: { state: State; receipt: Receipt | null; noLine: boolean }) {
  const line = receipt ? state.bankLines.find((b) => b.id === receipt.bankLineId) ?? null : null;
  if (line) {
    return (
      <CheckRow
        rule="M1"
        label="Bank"
        tone="good"
        status="VERIFIED against the bank statement"
        title="Same amount, within 3 days of the claim, payer name or invoice number in the description."
        detail={
          <span className="num break-words">
            {fmtDateTime(line.at)} · {fmtRM(line.amount, { cents: true })} · {line.description}
          </span>
        }
      />
    );
  }
  return (
    <CheckRow
      rule="M1"
      label="Bank"
      tone="bad"
      status="CLAIM only: not verified"
      detail={noLine ? "No bank line found: not marked paid." : "No bank line found: not marked paid. The invoice must be identified first."}
    />
  );
}

function DeductionCheck({ state, receipt }: { state: State; receipt: Receipt }) {
  const ded = receipt.deduction!;
  const inv = invoiceOf(state, receipt.invoiceId);
  const d = inv.delivery;
  const amount = fmtRM(ded.amount, { cents: true });
  return (
    <CheckRow
      rule="M3"
      label="Deduction"
      tone={ded.linkedDo ? "plain" : "warn"}
      status={ded.linkedDo ? `${amount} · Linked to ${ded.linkedDo} (${d.destination})` : `${amount} · not linked to a delivery`}
      title={ded.linkedDo ? `${ded.reason}. ${ded.linkedDo}: ${d.route}, delivered ${fmtDate(d.date)}.` : ded.reason}
      detail={ded.linkedDo ? undefined : `Owner to check the reason on ${inv.number}`}
    />
  );
}

const INVOICE_TONE = { paid: "violet", part_paid: "amber" } as const;

function ReceiptCheck({ state, receipt }: { state: State; receipt: Receipt }) {
  const inv = invoiceOf(state, receipt.invoiceId);
  const ded = receipt.deduction;
  const original = inv.amount + (ded?.status === "accepted" ? ded.amount : 0);
  const sum = fmtRM(receipt.amount + (ded?.amount ?? 0));
  const arithmetic = `${fmtRM(receipt.amount)} paid${ded ? ` + ${fmtRM(ded.amount)} stated deduction` : ""} = ${sum}; ${inv.number} was ${fmtRM(original)}. Outstanding now ${fmtRM(outstanding(inv))}.`;
  return (
    <CheckRow
      rule="M2"
      label="Receipt"
      tone="plain"
      status={`${fmtRM(receipt.amount)} → ${inv.number}`}
      right={
        <Badge tone={inv.status === "paid" || inv.status === "part_paid" ? INVOICE_TONE[inv.status] : "slate"}>
          {inv.status.replace("_", " ").toUpperCase()}
        </Badge>
      }
      title={arithmetic}
      detail={
        <span className="num">
          {fmtRM(receipt.amount)}
          {ded ? ` + ${fmtRM(ded.amount)} deduction` : ""} = {sum} · outstanding {fmtRM(outstanding(inv))}
        </span>
      }
    />
  );
}

function Actions({ state, receipt }: { state: State; receipt: Receipt }) {
  const dispatch = useKachingg((s) => s.dispatch);
  const inv = invoiceOf(state, receipt.invoiceId);
  const ded = receipt.deduction;
  const isOwner = state.role === "owner";
  const cn = state.creditNotes.find((n) => n.invoiceId === inv.id);
  const approved = receipt.status === "approved";

  return (
    <div className="space-y-3 border-t border-line px-5 py-4 text-[13px]">
      {approved ? (
        <div className="flex items-center gap-1.5 text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden /> Receipt approved by {receipt.approvedBy}
          {ded?.status === "pending" ? ` · ${fmtRM(ded.amount)} deduction under review` : ""}
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => dispatch({ type: "APPROVE_RECEIPT", receiptId: receipt.id })} title="Slip amount equals the bank line (FR-E12)">
            <CheckCircle2 className="h-4 w-4" /> Approve receipt
          </Button>
          <span className="text-xs text-ink2">Clerk or Owner</span>
        </div>
      )}

      {ded?.status === "pending" && !approved && <p className="text-xs text-ink2">Deduction: Owner decides after approval</p>}
      {ded?.status === "pending" && approved && isOwner && (
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={() => dispatch({ type: "DECIDE_DEDUCTION", receiptId: receipt.id, decision: "accepted" })}>
            Accept deduction (drafts credit note)
          </Button>
          <Button size="sm" variant="secondary" onClick={() => dispatch({ type: "DECIDE_DEDUCTION", receiptId: receipt.id, decision: "rejected" })}>
            Reject
          </Button>
          <span className="text-xs text-ink2">Owner only</span>
        </div>
      )}
      {ded?.status === "pending" && approved && !isOwner && (
        <p className="flex items-center gap-1.5 text-xs text-ink2">
          <HelpCircle className="h-3.5 w-3.5 shrink-0" aria-hidden /> Deduction: waiting for the Owner
        </p>
      )}
      {ded?.status === "accepted" && (
        <p className="flex items-start gap-1.5 text-emerald-800">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>
            {inv.number} PAID{cn ? `; credit note ${cn.id} drafted (${fmtRM(cn.amount)}, not submitted)` : ""} · accepted by {ded.decidedBy}
          </span>
        </p>
      )}
      {ded?.status === "rejected" && (
        <p className="text-rose-800">
          Deduction rejected by {ded.decidedBy} · {fmtRM(outstanding(inv))} still owed on {inv.number}
        </p>
      )}
    </div>
  );
}
