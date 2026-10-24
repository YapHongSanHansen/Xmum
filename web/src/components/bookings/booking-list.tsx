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
      <div className="space-y-3 p-4">
        {bookings.length === 0 ? (
          <Empty>New bookings appear here. Use &ldquo;Fill demo booking&rdquo; to enter the Hup Seng order.</Empty>
        ) : (
          bookings.map((b) => <BookingRow key={b.id} state={state} b={b} />)
        )}
      </div>
    </Card>
  );
}

function BookingRow({ state, b }: { state: State; b: Booking }) {
  const c = customerOf(state, b.customerId);
  return (
    <div className="rounded-md border border-slate-200">
      <div className="flex flex-wrap items-start justify-between gap-3 px-3 py-2.5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-slate-900">{c.name}</span>
            <StatusBadge b={b} />
          </div>
          <div className="mt-0.5 text-xs text-slate-600">
            {b.route} · {termsText(b)}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-400">
            <span className="font-mono">{b.id}</span> · entered {fmtDateTime(b.createdAt)} by {b.createdBy}
          </div>
        </div>
        <div className="text-right text-sm font-semibold tabular-nums text-slate-900">{fmtRM(b.amount)}</div>
      </div>
      {b.status === "on_hold" && <CreditCheck state={state} b={b} />}
      {b.decidedBy && b.status !== "on_hold" && (
        <div className="flex items-center gap-1.5 border-t border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-700">
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
    <div className="border-t border-amber-200 bg-amber-50/60 px-3 py-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-900">
          <ShieldAlert className="h-3.5 w-3.5" aria-hidden />
          Credit check
        </div>
        <RuleTag id="R4" />
      </div>
      <dl className="grid grid-cols-[9rem_1fr] gap-x-3 gap-y-1 text-sm">
        <dt className="text-slate-500">New booking</dt>
        <dd className="text-slate-800">
          {b.route} · <span className="tabular-nums">{fmtRM(b.amount)}</span> · {termsText(b)}
        </dd>
        <dt className="text-slate-500">Already owes</dt>
        <dd className="text-slate-800">
          {worst ? (
            <>
              <span className="font-mono text-xs">{worst.number}</span> <span className="font-medium tabular-nums">{fmtRM(outstanding(worst))}</span> ·{" "}
              <span className="font-medium text-rose-700">{exp.worstDays} days late</span>
              {exp.owed !== outstanding(worst) && <span className="text-slate-500 tabular-nums"> ({fmtRM(exp.owed)} owed in total)</span>}
            </>
          ) : (
            <span className="tabular-nums">{fmtRM(exp.owed)}, nothing overdue now</span>
          )}
        </dd>
        {exp.promise && (
          <>
            <dt className="text-slate-500">Promised</dt>
            <dd className="text-slate-800">
              pay on {fmtWeekday(exp.promise)} {fmtDate(exp.promise)}
            </dd>
          </>
        )}
        <dt className="text-slate-500">Total if accepted</dt>
        <dd className="font-semibold tabular-nums text-slate-900">{fmtRM(exp.owed + b.amount)}</dd>
      </dl>

      {isOwner ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => decide("accepted")}>
            <CircleCheck className="h-3.5 w-3.5" aria-hidden />
            Accept on credit
          </Button>
          <div className="inline-flex items-center overflow-hidden rounded-md ring-1 ring-slate-300">
            <Button size="sm" variant="ghost" className="rounded-none bg-white" onClick={() => decide("deposit_requested")}>
              <Percent className="h-3.5 w-3.5" aria-hidden />
              Ask deposit
            </Button>
            <select
              aria-label="Deposit percent"
              value={pct}
              onChange={(e) => setPct(Number(e.target.value))}
              className="h-7 border-l border-slate-300 bg-white px-1.5 text-xs tabular-nums text-slate-800 focus:outline-none"
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
