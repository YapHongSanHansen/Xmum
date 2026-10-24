"use client";
// FR-C1–C4: today's chase plan. Every row carries its rule ID and a one-line reason.
import { Ban, Check, Clock, Gavel, Phone } from "lucide-react";
import { useKutip } from "@/lib/store";
import { Badge, Button, Card, CardHeader, Empty, RuleTag, cx, tbl } from "@/components/ui";
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
          <Empty>No overdue invoices. An unpaid invoice joins this plan once it is a day past its due date.</Empty>
        </div>
      ) : (
        <div className={tbl.wrap}>
          <table className={cx(tbl.table, "min-w-[880px]")}>
            <thead>
              <tr className={tbl.headRow}>
                <th className={cx(tbl.th, "w-10")}>#</th>
                <th className={tbl.th}>Customer</th>
                <th className={tbl.th}>Invoice</th>
                <th className={cx(tbl.th, "text-right")}>Outstanding</th>
                <th className={cx(tbl.th, "text-right")}>Days late</th>
                <th className={tbl.th}>Tier</th>
                <th className={tbl.th}>Why</th>
                <th className={cx(tbl.th, "text-right")}>Action</th>
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
        tbl.row,
        "align-top transition-colors",
        muted ? "bg-canvas text-ink2" : "hover:bg-canvas/60",
        selected && "bg-navy-soft hover:bg-navy-soft",
      )}
    >
      <td className={cx(tbl.td, "num text-xs text-ink2", selected && "shadow-[inset_2px_0_0_var(--accent)]")}>{row.rank ?? "–"}</td>
      <td className={tbl.td}>
        <div className={cx("font-medium", muted ? "text-ink2" : "text-ink")}>{row.customer.name}</div>
        <div className="text-xs text-ink2">
          {row.customer.contact} · {LANG_SHORT[row.customer.lang]}
        </div>
      </td>
      <td className={tbl.td}>
        <div className={cx("num whitespace-nowrap text-xs", muted ? "text-ink2" : "text-ink")}>{row.invoice.number}</div>
        <div className="whitespace-nowrap text-xs text-ink2">due {fmtDate(row.invoice.dueDate)}</div>
      </td>
      <td className={cx(tbl.td, "num whitespace-nowrap text-right", muted ? "text-ink2" : "font-medium text-ink")}>{fmtRM(outstanding(row.invoice))}</td>
      <td className={cx(tbl.td, "num text-right")}>{row.daysLate}</td>
      <td className={tbl.td}>
        <TierBadge tier={row.tier} />
      </td>
      <td className={cx(tbl.td, "max-w-[22rem]")}>
        <div className="flex flex-wrap items-center gap-1.5">
          <RuleTag id={row.rule} />
          {row.state === "skipped" && <Badge>skipped</Badge>}
          {row.state === "waiting" && <Badge>waiting</Badge>}
          {row.closesGap && <Badge tone="emerald">closes the gap</Badge>}
        </div>
        <div className="mt-1 text-xs text-ink2">{row.reason}</div>
      </td>
      <td className={cx(tbl.td, "text-right")}>
        {row.state === "remind" && (
          <Button size="sm" variant={selected ? "primary" : "secondary"} onClick={() => onReview(row.invoice.id)}>
            Review
          </Button>
        )}
        {row.state === "sent_today" &&
          (row.invoice.reminders.some((r) => r.status === "queued" && dayOf(r.at) === dayOf(state.now)) ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-navy">
              <Clock className="h-3.5 w-3.5" aria-hidden />
              {row.reason}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
              <Check className="h-3.5 w-3.5" aria-hidden />
              {row.reason}
            </span>
          ))}
        {muted && <span className="text-xs text-ink2">{row.state === "skipped" ? "Skipped" : "Waiting"}</span>}
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
        <span className="text-xs font-medium text-ink">
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
        !decided && <span className="text-xs text-ink2">The Owner decides</span>
      )}
    </div>
  );
}
