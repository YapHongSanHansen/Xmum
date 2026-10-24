"use client";
// FR-D2 / FR-D3: bookings with status badges, and the R4 credit-check card for
// bookings on hold. Only the Owner decides; the Clerk sees the card read-only.
import { useState } from "react";
import { CircleCheck } from "lucide-react";
import { useKachingg } from "@/lib/store";
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
  const state = useKachingg((s) => s.state);
  const bookings = [...state.bookings].reverse();
  const onHold = bookings.filter((b) => b.status === "on_hold").length;

  return (
    <Card>
      <CardHeader
        title="Bookings"
        right={
          onHold > 0 && (
            <span className="text-xs text-amber-800">
              <span className="num">{onHold}</span> on hold
            </span>
          )
        }
      />
      {bookings.length === 0 ? (
        <div className="p-5">
          <Empty>No bookings yet.</Empty>
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
      <div
        className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 px-5 py-3"
        title={`${b.id} · entered ${fmtDateTime(b.createdAt)} by ${b.createdBy}`}
      >
        <div className="min-w-0">
          <div className="text-[13px] font-semibold text-ink">{c.name}</div>
          <div className="mt-0.5 text-xs text-ink2">
            {b.route} · {termsText(b)}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="num text-[13px] font-medium text-ink">{fmtRM(b.amount)}</span>
          <StatusBadge b={b} />
        </div>
      </div>
      {b.status === "on_hold" && <CreditCheck state={state} b={b} />}
      {b.decidedBy && b.status !== "on_hold" && (
        <div className="flex flex-wrap items-center gap-1.5 px-5 pb-3 text-xs text-ink2">
          <CircleCheck className="h-3.5 w-3.5 text-emerald-700" aria-hidden />
          <span>
            <span className="font-medium text-ink">{DECISION_TEXT[b.status as CreditDecision](b)}</span> · by {b.decidedBy}
          </span>
        </div>
      )}
    </div>
  );
}

function CreditCheck({ state, b }: { state: State; b: Booking }) {
  const dispatch = useKachingg((s) => s.dispatch);
  const [pct, setPct] = useState(50);
  const exp = creditExposure(state, b.customerId);
  const worst = exp.worstInvoice;
  const isOwner = state.role === "owner";
  const decide = (decision: CreditDecision) => dispatch({ type: "DECIDE_CREDIT", bookingId: b.id, decision, depositPct: decision === "deposit_requested" ? pct : undefined });

  return (
    <div className="mx-5 mb-4 border-l-[3px] border-l-amber-800 pl-4">
      <div className="mb-2 flex items-center gap-2 text-[13px] font-medium text-ink">
        Credit check
        <RuleTag id="R4" />
      </div>
      <dl className="grid grid-cols-[minmax(0,7.5rem)_minmax(0,1fr)] gap-x-4 gap-y-1 text-[13px]">
        <dt className="text-ink2">New booking</dt>
        <dd className="text-ink">
          <span className="num">{fmtRM(b.amount)}</span> · {termsText(b)}
        </dd>
        <dt className="text-ink2">Already owes</dt>
        <dd className="text-ink">
          {worst ? (
            <>
              <span className="num text-xs">{worst.number}</span> <span className="num font-medium">{fmtRM(outstanding(worst))}</span> ·{" "}
              <span className="font-medium text-rose-700">{exp.worstDays} days late</span>
              {exp.owed !== outstanding(worst) && <span className="num text-ink2"> ({fmtRM(exp.owed)} total)</span>}
            </>
          ) : (
            <span className="num">{fmtRM(exp.owed)}, none overdue</span>
          )}
        </dd>
        {exp.promise && (
          <>
            <dt className="text-ink2">Promised</dt>
            <dd className="num text-ink">
              {fmtWeekday(exp.promise)} {fmtDate(exp.promise)}
            </dd>
          </>
        )}
        <dt className="text-ink2">Total if accepted</dt>
        <dd className="num font-semibold text-ink">{fmtRM(exp.owed + b.amount)}</dd>
      </dl>

      {isOwner ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => decide("accepted")}>
            Accept on credit
          </Button>
          <div className="inline-flex items-center border border-line-strong bg-white">
            <Button size="sm" variant="secondary" className="h-[26px] rounded-none border-0" onClick={() => decide("deposit_requested")}>
              Ask deposit
            </Button>
            <select
              aria-label="Deposit percent"
              value={pct}
              onChange={(e) => setPct(Number(e.target.value))}
              className="h-[26px] border-l border-line-strong bg-white px-1.5 font-mono text-xs tabular-nums text-ink"
            >
              {[20, 30, 50, 70, 100].map((p) => (
                <option key={p} value={p}>
                  {p}%
                </option>
              ))}
            </select>
          </div>
          <Button size="sm" variant="secondary" onClick={() => decide("cod")}>
            Cash on delivery
          </Button>
          <Button size="sm" variant="secondary" onClick={() => decide("call_first")}>
            Call first
          </Button>
        </div>
      ) : (
        <div className="mt-3 text-xs font-medium text-amber-800">Waiting for the Owner</div>
      )}
    </div>
  );
}
