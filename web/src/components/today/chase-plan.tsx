"use client";
// FR-C1–C4: today's chase plan. Every row carries its rule ID and a one-line reason.
import { Ban, Check, Clock, Gavel, Phone } from "lucide-react";
import { useKutip } from "@/lib/store";
import { Badge, Button, Card, CardHeader, Empty, RuleTag, cx } from "@/components/ui";
import { dayOf, fmtDate, fmtRM, outstanding, type State } from "@/engine/model";
import { chasePlan, type PlanRow } from "@/engine/rules";
import { LANG_SHORT, TierBadge } from "./bits";

const ESCALATION_CHOICES = [
  { decision: "call", label: "Call", icon: Phone },
  { decision: "stop credit", label: "Stop credit", icon: Ban },
  { decision: "refer to own lawyer", label: "Refer to own lawyer", icon: Gavel },
] as const;

/** The engine only logs escalation decisions, so the latest one is read back from the log. */
function escalationDecision(s: State, row: PlanRow): { decision: string; actor: string } | null {
  const prefix = `escalation for ${row.invoice.number}: `;
  const entry = s.log.filter((l) => l.kind === "USER" && l.text.startsWith(prefix)).at(-1);
  return entry ? { decision: entry.text.slice(prefix.length), actor: entry.actor } : null;
}

export default function ChasePlan({ selectedId, onReview }: { selectedId: string | null; onReview: (invoiceId: string) => void }) {
  const state = useKutip((s) => s.state);
  const rows = chasePlan(state);
  const remindCount = rows.filter((r) => r.state === "remind").length;

  return (
    <Card>
      <CardHeader
        kicker="Chase plan"
        title={
          remindCount
            ? `${remindCount} reminder${remindCount === 1 ? "" : "s"} to review, ranked by cash expected before the next bill`
            : "No reminders to review right now"
        }
        right={
          <div className="flex gap-1">
            <RuleTag id="R1" />
            <RuleTag id="R2" />
            <RuleTag id="R3" />
          </div>
        }
      />
      {rows.length === 0 ? (
        <div className="p-4">
          <Empty>No overdue invoices.</Empty>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <th className="w-10 px-4 py-2">#</th>
                <th className="px-3 py-2">Customer</th>
                <th className="px-3 py-2">Invoice</th>
                <th className="px-3 py-2 text-right">Outstanding</th>
                <th className="px-3 py-2 text-right">Days late</th>
                <th className="px-3 py-2">Tier</th>
                <th className="px-3 py-2">Why</th>
                <th className="px-4 py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <PlanTableRow key={row.invoice.id} state={state} row={row} selected={row.invoice.id === selectedId} onReview={onReview} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function PlanTableRow({ state, row, selected, onReview }: { state: State; row: PlanRow; selected: boolean; onReview: (id: string) => void }) {
  const dispatch = useKutip((s) => s.dispatch);
  const muted = row.state === "skipped" || row.state === "waiting";
  const isOwner = state.role === "owner";

  return (
    <tr
      className={cx(
        "border-b border-slate-100 align-top last:border-0",
        muted && "bg-slate-50/70 text-slate-400",
        selected && "bg-emerald-50/70",
      )}
    >
      <td className="px-4 py-3 tabular-nums text-slate-500">{row.rank ?? "–"}</td>
      <td className="px-3 py-3">
        <div className={cx("font-medium", muted ? "text-slate-500" : "text-slate-900")}>{row.customer.name}</div>
        <div className="text-xs text-slate-500">
          {row.customer.contact} · {LANG_SHORT[row.customer.lang]}
        </div>
      </td>
      <td className="px-3 py-3">
        <div className={cx("font-mono text-xs", muted ? "text-slate-500" : "text-slate-800")}>{row.invoice.number}</div>
        <div className="text-xs text-slate-500">due {fmtDate(row.invoice.dueDate)}</div>
      </td>
      <td className={cx("px-3 py-3 text-right tabular-nums", muted ? "text-slate-500" : "font-medium text-slate-900")}>
        {fmtRM(outstanding(row.invoice))}
      </td>
      <td className="px-3 py-3 text-right tabular-nums">{row.daysLate}</td>
      <td className="px-3 py-3">
        <TierBadge tier={row.tier} />
      </td>
      <td className="max-w-[22rem] px-3 py-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <RuleTag id={row.rule} />
          {row.state === "skipped" && <Badge>skipped</Badge>}
          {row.state === "waiting" && <Badge>waiting</Badge>}
          {row.closesGap && <Badge tone="emerald">closes the gap</Badge>}
        </div>
        <div className={cx("mt-1 text-xs", muted ? "text-slate-400" : "text-slate-600")}>{row.reason}</div>
      </td>
      <td className="px-4 py-3 text-right">
        {row.state === "remind" && (
          <Button size="sm" variant={selected ? "primary" : "secondary"} onClick={() => onReview(row.invoice.id)}>
            Review
          </Button>
        )}
        {row.state === "sent_today" &&
          (row.invoice.reminders.some((r) => r.status === "queued" && dayOf(r.at) === dayOf(state.now)) ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-violet-700">
              <Clock className="h-3.5 w-3.5" aria-hidden />
              {row.reason}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
              <Check className="h-3.5 w-3.5" aria-hidden />
              {row.reason}
            </span>
          ))}
        {muted && <span className="text-xs text-slate-400">{row.state === "skipped" ? "Skipped" : "Waiting"}</span>}
        {row.state === "escalate" && <EscalationActions state={state} row={row} isOwner={isOwner} onDecide={(decision) => dispatch({ type: "ESCALATION_DECISION", invoiceId: row.invoice.id, decision })} />}
      </td>
    </tr>
  );
}

function EscalationActions({ state, row, isOwner, onDecide }: { state: State; row: PlanRow; isOwner: boolean; onDecide: (d: string) => void }) {
  const decided = escalationDecision(state, row);
  return (
    <div className="flex flex-col items-end gap-1.5">
      {decided && (
        <span className="text-xs font-medium text-slate-700">
          Decided: {decided.decision} · {decided.actor}
        </span>
      )}
      {isOwner ? (
        <div className="flex flex-wrap justify-end gap-1">
          {ESCALATION_CHOICES.map(({ decision, label, icon: Icon }) => (
            <Button key={decision} size="sm" variant={decided?.decision === decision ? "primary" : "secondary"} onClick={() => onDecide(decision)}>
              <Icon className="h-3.5 w-3.5" aria-hidden />
              {label}
            </Button>
          ))}
        </div>
      ) : (
        !decided && <span className="text-xs text-slate-500">The Owner decides</span>
      )}
    </div>
  );
}
