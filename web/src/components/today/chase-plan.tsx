"use client";
// FR-C1–C4: today's chase plan. Every row carries its rule ID and a one-line reason.
import { Ban, Check, Clock, Gavel, Phone } from "lucide-react";
import { useKachingg } from "@/lib/store";
import { Badge, Button, Card, CardHeader, Empty, RuleTag, cx, tbl } from "@/components/ui";
import { dayOf, fmtRM, outstanding, type State } from "@/engine/model";
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

/**
 * FR-C4: every row keeps its rule ID and a one-line reason. The table shows a
 * short form (6 words or fewer); the engine's full reason stays in the cell's
 * tooltip and in the review drawer. Display only: other reasons pass through.
 */
const SHORT_REASONS: [RegExp, string][] = [
  [/^(\d+)% of past invoices paid within (\d+) days of a Tier \d reminder( · .*)?$/, "$1% paid within $2 days"],
  [/^reminder sent (\d+ \w+), under 5 days ago$/, "sent $1"],
  [/^phone call (\d+ \w+) by .+, under 5 days ago$/, "called $1"],
  [/^payment received (\d+ \w+), under 2 days ago$/, "paid $1"],
  [/^customer says paid; waiting for bank check$/, "says paid; bank check pending"],
  [/^last reminder (\d+ \w+), waiting 7 days for a reply$/, "no reply since $1"],
  [/^30\+ days and unanswered: .*$/, "30+ days, no reply"],
];

function shortReason(row: PlanRow): string {
  if (row.state === "remind" && row.closesGap) return "closes the gap";
  for (const [re, out] of SHORT_REASONS) if (re.test(row.reason)) return row.reason.replace(re, out);
  return row.reason;
}

export default function ChasePlan({ selectedId, onReview }: { selectedId: string | null; onReview: (invoiceId: string) => void }) {
  const state = useKachingg((s) => s.state);
  const rows = chasePlan(state);
  const remindCount = rows.filter((r) => r.state === "remind").length;

  return (
    <Card>
      <CardHeader
        title="Collection plan"
        kicker="The right follow-up, in the right order"
        right={<span className="text-[13px] text-ink2">{remindCount ? `${remindCount} to review` : "Nothing to review"}</span>}
      />
      {rows.length === 0 ? (
        <div className="p-5">
          <Empty>No overdue invoices.</Empty>
        </div>
      ) : (
        // `relative` keeps the sr-only header inside the scroll box at 390px.
        <div className={cx(tbl.wrap, "relative")}>
          <table className={cx(tbl.table, "min-w-[760px]")}>
            <thead>
              <tr className={tbl.headRow}>
                <th className={tbl.th}>Customer</th>
                <th className={tbl.th}>Invoice</th>
                <th className={cx(tbl.th, "text-right")}>Amount</th>
                <th className={cx(tbl.th, "text-right")}>Late</th>
                <th className={tbl.th}>Tier</th>
                <th className={tbl.th}>Why</th>
                <th className={tbl.th}>
                  <span className="sr-only">Action</span>
                </th>
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
  const dispatch = useKachingg((s) => s.dispatch);
  const muted = row.state === "skipped" || row.state === "waiting";
  const isOwner = state.role === "owner";
  const queued = row.state === "sent_today" && row.invoice.reminders.some((r) => r.status === "queued" && dayOf(r.at) === dayOf(state.now));

  return (
    <tr className={cx(tbl.row, "transition-colors", muted ? "text-ink2" : "hover:bg-canvas/60", selected && "bg-navy-soft hover:bg-navy-soft")}>
      <td className={cx(tbl.td, selected && "shadow-[inset_2px_0_0_var(--accent)]")}>
        <div className={cx("font-medium", muted ? "text-ink2" : "text-ink")}>{row.customer.name}</div>
        <div className="text-xs text-ink2">
          {row.customer.contact} · {LANG_SHORT[row.customer.lang]}
        </div>
      </td>
      <td className={cx(tbl.td, "num whitespace-nowrap text-xs", muted ? "text-ink2" : "text-ink")}>{row.invoice.number}</td>
      <td className={cx(tbl.td, "num whitespace-nowrap text-right", muted ? "text-ink2" : "text-ink")}>{fmtRM(outstanding(row.invoice))}</td>
      <td className={cx(tbl.td, "num whitespace-nowrap text-right text-xs")} title={`${row.daysLate} days late`}>
        {row.daysLate}d
      </td>
      <td className={tbl.td}>
        <TierBadge tier={row.tier} />
      </td>
      <td className={tbl.td} title={row.reason}>
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <RuleTag id={row.rule} />
          {row.state === "skipped" && <Badge>skipped</Badge>}
          {row.state === "waiting" && <Badge>waiting</Badge>}
          <span className={row.state === "remind" && row.closesGap ? "font-medium text-emerald-700" : "text-ink2"}>{shortReason(row)}</span>
        </div>
      </td>
      <td className={cx(tbl.td, "text-right")}>
        {row.state === "remind" && (
          <Button size="sm" variant={selected ? "primary" : "secondary"} onClick={() => onReview(row.invoice.id)}>
            Review
          </Button>
        )}
        {row.state === "sent_today" &&
          (queued ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-navy">
              <Clock className="h-3.5 w-3.5" aria-hidden />
              Queued
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
              <Check className="h-3.5 w-3.5" aria-hidden />
              {row.rule === "FR-C9" ? "Called" : "Sent"}
            </span>
          ))}
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
