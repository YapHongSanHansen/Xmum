"use client";
// Orbyte's shared approvals inbox (PRD FR-O3): every Kutip decision waiting
// for a person, in one list, with who may act. Acting happens on the module page.
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useKutip, type Page } from "@/lib/store";
import { Badge, Button, Card, CardHeader, Empty, PageTitle, RuleTag } from "@/components/ui";
import { customerOf, dayOf, fmtDate, fmtRM, invoiceOf, type Role, type State } from "@/engine/model";
import { chasePlan, forecast } from "@/engine/rules";

interface Pending {
  key: string;
  rule: string;
  title: string;
  detail: string;
  who: Role[];
  page: Page;
}

function pendingItems(s: State): Pending[] {
  const items: Pending[] = [];
  const owner = s.role === "owner";
  for (const w of s.warnings.filter((x) => x.chosen.length === 0)) {
    const o = s.outflows.find((x) => x.id === w.outflowId)!;
    const gapNow = forecast(s).find((f) => f.outflowId === w.outflowId)?.gap ?? 0;
    if (gapNow === 0) continue;
    items.push({
      key: w.id,
      rule: "R6",
      title: `Early warning: ${fmtDate(o.dueDate)} ${o.short}`,
      detail: owner ? `Short ${fmtRM(gapNow)}; choose what to do` : "Cash note for the Owner",
      who: ["owner"],
      page: "today",
    });
  }
  // The chase plan exists only after today's 08:00 scan.
  for (const r of s.scannedDays.includes(dayOf(s.now)) ? chasePlan(s) : []) {
    if (r.state === "remind" && r.tier !== null) {
      items.push({
        key: `rem-${r.invoice.id}`,
        rule: "R3",
        title: `${r.tier >= 2 ? "Firm" : "Gentle"} reminder: ${r.invoice.number}`,
        detail: `${r.customer.name} · ${r.daysLate} days late`,
        who: r.tier >= 2 ? ["owner"] : ["owner", "clerk"],
        page: "today",
      });
    }
    if (r.state === "escalate") {
      items.push({ key: `esc-${r.invoice.id}`, rule: "R1", title: `Escalation: ${r.invoice.number}`, detail: r.customer.name, who: ["owner"], page: "today" });
    }
  }
  for (const b of s.bookings.filter((x) => x.status === "on_hold")) {
    items.push({
      key: b.id,
      rule: "R4",
      title: `Credit check: ${customerOf(s, b.customerId).name}`,
      detail: `${b.route} · ${fmtRM(b.amount)} on ${b.creditDays}-day credit`,
      who: ["owner"],
      page: "bookings",
    });
  }
  for (const r of s.receipts) {
    const inv = invoiceOf(s, r.invoiceId);
    if (r.status === "proposed") {
      items.push({ key: r.id, rule: "M1", title: `Receipt ${fmtRM(r.amount)} for ${inv.number}`, detail: "Verified against the bank line", who: ["owner", "clerk"], page: "inbox" });
    } else if (r.deduction?.status === "pending") {
      items.push({ key: `${r.id}-d`, rule: "M3", title: `Deduction ${fmtRM(r.deduction.amount)} on ${inv.number}`, detail: r.deduction.reason, who: ["owner"], page: "inbox" });
    }
  }
  for (const h of s.handoffs.filter((x) => !x.resolved)) {
    items.push({
      key: h.id,
      rule: "M4",
      title: h.kind === "promise_date" ? `Confirm promised date (${h.question})` : h.kind === "claim_unverified" ? "Customer says paid, no bank line" : "Unclear message",
      detail: customerOf(s, s.messages.find((m) => m.id === h.messageId)!.customerId).name,
      who: ["owner", "clerk"],
      page: "inbox",
    });
  }
  return items;
}

export default function ApprovalsPage() {
  const state = useKutip((s) => s.state);
  const go = useKutip((s) => s.go);
  const items = pendingItems(state);
  const mine = items.filter((i) => i.who.includes(state.role));
  const others = items.filter((i) => !i.who.includes(state.role));

  const list = (rows: Pending[], canAct: boolean) => (
    <ul className="divide-y divide-hairline">
      {rows.map((i) => (
        <li key={i.key} className="flex min-h-[38px] flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-2.5 transition-colors hover:bg-canvas/60">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[13px] font-medium text-ink">
              <RuleTag id={i.rule} />
              {i.title}
            </div>
            <div className="mt-0.5 text-xs text-ink2">{i.detail}</div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {i.who.map((w) => (
              <Badge key={w} tone={w === "owner" ? "violet" : "sky"}>
                {w === "owner" ? "Owner" : "Clerk"}
              </Badge>
            ))}
            <Button size="sm" variant={canAct ? "primary" : "secondary"} onClick={() => go(i.page)}>
              {canAct ? "Open" : "View"}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );

  return (
    <div>
      <PageTitle
        title="Approvals"
        subtitle="Orbyte's shared approvals inbox: every Kutip decision waiting for a person. Each decision is recorded in the activity log."
      />
      <div className="space-y-5">
        <Card>
          <CardHeader kicker={state.role === "owner" ? "Lim Siew Lan · Owner" : "Nurul · Clerk"} title={`Waiting for you (${mine.length})`} />
          {mine.length ? (
            list(mine, true)
          ) : (
            <div className="p-4">
              <Empty>
                <CheckCircle2 className="mx-auto mb-1 h-5 w-5 text-emerald-600" aria-hidden />
                Nothing waiting for your role.
              </Empty>
            </div>
          )}
        </Card>
        {others.length > 0 && (
          <Card>
            <CardHeader kicker="Other roles" title={`Waiting for someone else (${others.length})`} />
            {list(others, false)}
          </Card>
        )}
      </div>
    </div>
  );
}

export const approvalsCount = (s: State) => pendingItems(s).filter((i) => i.who.includes(s.role)).length;
