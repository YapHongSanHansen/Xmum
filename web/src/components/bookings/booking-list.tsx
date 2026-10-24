"use client";
// FR-D2 / FR-D3: bookings with status badges, and the R4 credit-check card for
// bookings on hold. Only the Owner decides; the Clerk sees the card read-only.
import { useState } from "react";
import { Banknote, CircleCheck, Hand, Percent, Phone, ShieldAlert } from "lucide-react";
import { useKutip } from "@/lib/store";
import { Badge, Button, Card, CardHeader, Empty, RuleTag } from "@/components/ui";
import { customerOf, fmtDate, fmtDateTime, fmtRM, fmtWeekday, outstanding, type Booking, type State } from "@/engine/model";
import { creditExposure } from "@/engine/rules";
import type { CreditDecision } from "@/engine/reducer";

const TERMS: Record<Booking["terms"], string> = { credit: "credit", cod: "cash on delivery", prepaid: "prepaid" };

const termsText = (b: Booking) => (b.terms === "credit" ? `${b.creditDays}-day credit` : TERMS[b.terms]);

function StatusBadge({ b }: { b: Booking }) {
  switch (b.status) {
    case "on_hold":
      return <Badge tone="amber">On hold · credit check</Badge>;
    case "accepted":
      return <Badge tone="emerald">{b.decidedBy ? "Accepted on credit" : "Accepted"}</Badge>;
    case "deposit_requested":
      return <Badge tone="sky">{b.depositPct}% deposit requested</Badge>;
    case "cod":
      return <Badge tone="violet">Cash on delivery</Badge>;
    case "call_first":
      return <Badge tone="amber">Call first</Badge>;
  }
}

const DECISION_TEXT: Record<CreditDecision, (b: Booking) => string> = {
  accepted: () => "Accept on credit",
  deposit_requested: (b) => `Ask ${b.depositPct}% deposit`,
  cod: () => "Cash on delivery",
  call_first: () => "Call first",
};

export default function BookingList() {
  const state = useKutip((s) => s.state);
  const bookings = [...state.bookings].reverse();
  const onHold = bookings.filter((b) => b.status === "on_hold").length;

  return (
    <Card>
      <CardHeader
        kicker="Bookings"
        title={bookings.length ? `${bookings.length} booking${bookings.length === 1 ? "" : "s"}${onHold ? ` · ${onHold} waiting for a credit decision` : ""}` : "No bookings yet"}
        right={<RuleTag id="R4" />}
      />
      {bookings.length === 0 ? (
        <div className="p-4">
          <Empty>New bookings appear here. Use &ldquo;Fill demo booking&rdquo; to enter the Hup Seng order.</Empty>
        </div>
      ) : (
        <div className="divide-y divide-line">
          {bookings.map((b) => (
            <BookingRow key={b.id} state={state} b={b} />
          ))}
        </div>
      )}
    </Card>
  );
}

function BookingRow({ state, b }: { state: State; b: Booking }) {
  const c = customerOf(state, b.customerId);
  return (
    <div>
      <div className="flex min-h-[38px] flex-wrap items-start justify-between gap-3 px-4 py-2.5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[13px] font-semibold text-ink">{c.name}</span>
            <StatusBadge b={b} />
          </div>
          <div className="mt-0.5 text-xs text-ink2">
            {b.route} · {termsText(b)}
          </div>
          <div className="mt-0.5 text-[11px] text-ink2">
            <span className="num">{b.id}</span> · entered <span className="num">{fmtDateTime(b.createdAt)}</span> by {b.createdBy}
          </div>
        </div>
        <div className="num text-right text-[13px] font-medium text-ink">{fmtRM(b.amount)}</div>
      </div>
      {b.status === "on_hold" && <CreditCheck state={state} b={b} />}
      {b.decidedBy && b.status !== "on_hold" && (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-hairline bg-canvas px-4 py-2 text-xs text-ink">
          <CircleCheck className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
          Credit decision: <span className="font-medium">{DECISION_TEXT[b.status as CreditDecision](b)}</span> · by {b.decidedBy}
        </div>
      )}
    </div>
  );
}

function CreditCheck({ state, b }: { state: State; b: Booking }) {
  const dispatch = useKutip((s) => s.dispatch);
  const [pct, setPct] = useState(50);
  const exp = creditExposure(state, b.customerId);
  const worst = exp.worstInvoice;
  const isOwner = state.role === "owner";
  const decide = (decision: CreditDecision) => dispatch({ type: "DECIDE_CREDIT", bookingId: b.id, decision, depositPct: decision === "deposit_requested" ? pct : undefined });

  return (
    <div className="border-l-[3px] border-t border-l-amber-800 border-t-hairline bg-amber-50 px-4 py-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 font-mono text-xs font-medium text-amber-900">
          <ShieldAlert className="h-3.5 w-3.5" aria-hidden />
          Credit check
        </div>
        <RuleTag id="R4" />
      </div>
      <dl className="grid grid-cols-[minmax(0,7rem)_minmax(0,1fr)] gap-x-3 gap-y-1 text-[13px] sm:grid-cols-[9rem_minmax(0,1fr)]">
        <dt className="text-ink2">New booking</dt>
        <dd className="text-ink">
          {b.route} · <span className="num">{fmtRM(b.amount)}</span> · {termsText(b)}
        </dd>
        <dt className="text-ink2">Already owes</dt>
        <dd className="text-ink">
          {worst ? (
            <>
              <span className="num text-xs">{worst.number}</span> <span className="num font-medium">{fmtRM(outstanding(worst))}</span> ·{" "}
              <span className="font-medium text-rose-700">{exp.worstDays} days late</span>
              {exp.owed !== outstanding(worst) && <span className="num text-ink2"> ({fmtRM(exp.owed)} owed in total)</span>}
            </>
          ) : (
            <span className="num">{fmtRM(exp.owed)}, nothing overdue now</span>
          )}
        </dd>
        {exp.promise && (
          <>
            <dt className="text-ink2">Promised</dt>
            <dd className="text-ink">
              pay on {fmtWeekday(exp.promise)} {fmtDate(exp.promise)}
            </dd>
          </>
        )}
        <dt className="text-ink2">Total if accepted</dt>
        <dd className="num font-semibold text-ink">{fmtRM(exp.owed + b.amount)}</dd>
      </dl>

      {isOwner ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => decide("accepted")}>
            <CircleCheck className="h-3.5 w-3.5" aria-hidden />
            Accept on credit
          </Button>
          <div className="inline-flex items-center border border-line-strong bg-surface">
            <Button size="sm" variant="ghost" className="rounded-none" onClick={() => decide("deposit_requested")}>
              <Percent className="h-3.5 w-3.5" aria-hidden />
              Ask deposit
            </Button>
            <select
              aria-label="Deposit percent"
              value={pct}
              onChange={(e) => setPct(Number(e.target.value))}
              className="h-7 border-l border-line-strong bg-surface px-1.5 font-mono text-xs tabular-nums text-ink"
            >
              {[20, 30, 50, 70, 100].map((p) => (
                <option key={p} value={p}>
                  {p}%
                </option>
              ))}
            </select>
          </div>
          <Button size="sm" variant="secondary" onClick={() => decide("cod")}>
            <Banknote className="h-3.5 w-3.5" aria-hidden />
            Cash on delivery
          </Button>
          <Button size="sm" variant="secondary" onClick={() => decide("call_first")}>
            <Phone className="h-3.5 w-3.5" aria-hidden />
            Call first
          </Button>
        </div>
      ) : (
        <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-amber-900">
          <Hand className="h-3.5 w-3.5" aria-hidden />
          Waiting for the Owner. The booking stays on hold until the Owner decides.
        </div>
      )}
    </div>
  );
}
