"use client";
// Approvals inbox (PRD FR-O3): every Kutip decision waiting for a person, in
// one list, with who may act. Acting happens on the page that owns the item.
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useKutip, type Page } from "@/lib/store";
import { Badge, Button, Card, CardHeader, Empty, MetricRow, PageTitle, RuleTag } from "@/components/ui";
import { customerOf, dayOf, fmtDate, fmtRM, invoiceOf, type Role, type State } from "@/engine/model";
import { chasePlan, forecast } from "@/engine/rules";

interface Pending {
  key: string;
  rule: string;
  type: string;
  subject: string;
  detail?: string;
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
      type: "Early warning",
      subject: `${fmtDate(o.dueDate)} ${o.short}`,
      detail: owner ? `short ${fmtRM(gapNow)}` : "cash note for the Owner",
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
        type: r.tier >= 2 ? "Firm reminder" : "Gentle reminder",
        subject: `${r.invoice.number} · ${r.customer.name}`,
        detail: `${r.daysLate} days late`,
        who: r.tier >= 2 ? ["owner"] : ["owner", "clerk"],
        page: "today",
      });
    }
    if (r.state === "escalate") {
      items.push({
        key: `esc-${r.invoice.id}`,
        rule: "R1",
        type: "Escalation",
        subject: `${r.invoice.number} · ${r.customer.name}`,
        who: ["owner"],
        page: "today",
      });
    }
  }
  for (const b of s.bookings.filter((x) => x.status === "on_hold")) {
    items.push({
      key: b.id,
      rule: "R4",
      type: "Credit check",
      subject: customerOf(s, b.customerId).name,
      detail: `${fmtRM(b.amount)} · ${b.creditDays}-day credit`,
      who: ["owner"],
      page: "bookings",
    });
  }
  for (const r of s.receipts) {
    const inv = invoiceOf(s, r.invoiceId);
    if (r.status === "proposed") {
      items.push({
        key: r.id,
        rule: "M1",
        type: "Receipt",
        subject: `${fmtRM(r.amount)} · ${inv.number}`,
        detail: "bank line matched",
        who: ["owner", "clerk"],
        page: "inbox",
      });
    } else if (r.deduction?.status === "pending") {
      items.push({
        key: `${r.id}-d`,
        rule: "M3",
        type: "Deduction",
        subject: `${fmtRM(r.deduction.amount)} · ${inv.number}`,
        detail: r.deduction.reason,
        who: ["owner"],
        page: "inbox",
      });
    }
  }
  for (const h of s.handoffs.filter((x) => !x.resolved)) {
    const customer = customerOf(s, s.messages.find((m) => m.id === h.messageId)!.customerId).name;
    items.push({
      key: h.id,
      rule: "M4",
      type: h.kind === "promise_date" ? "Confirm date" : h.kind === "claim_unverified" ? "Paid, no bank line" : "Unclear message",
      subject: customer,
      detail: h.kind === "promise_date" ? h.question : undefined,
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
      {rows.map((item) => (
        <li key={item.key} className="flex items-start justify-between gap-4 px-6 py-5">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-ink2">
              {item.type}
              <RuleTag id={item.rule} />
            </div>
            <div className="text-sm font-medium">{item.subject}</div>
            {item.detail && <p className="mt-1 text-xs text-ink2">{item.detail}</p>}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {item.who.map((role) => (
                <Badge key={role} tone={role === "owner" ? "violet" : "sky"}>
                  {role === "owner" ? "Owner" : "Clerk"}
                </Badge>
              ))}
            </div>
          </div>
          <Button
            size="sm"
            variant={canAct ? "primary" : "secondary"}
            onClick={() => go(item.page)}
            aria-label={`${canAct ? "Open" : "View"} ${item.type}: ${item.subject}`}
          >
            {canAct ? "Open" : "View"}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Button>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="min-w-0">
      <PageTitle
        title="Approvals"
        subtitle={
          <>
            A little human judgement, right where it matters.
            <span className="mt-1 block text-xs">Also listed in Orbyte Approvals (simulated).</span>
          </>
        }
      />
      <MetricRow
        items={[
          { label: "Waiting for you", value: mine.length },
          { label: "With another role", value: others.length },
          { label: "Total pending", value: items.length },
        ]}
      />
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <Card className={others.length ? "" : "xl:col-span-2"}>
          <CardHeader title={`Waiting for you · ${mine.length}`} />
          {mine.length ? (
            list(mine, true)
          ) : (
            <div className="p-5">
              <Empty>
                <CheckCircle2 className="mx-auto mb-1 h-5 w-5 text-emerald-700" aria-hidden />
                Nothing waiting.
              </Empty>
            </div>
          )}
        </Card>
        {others.length > 0 && (
          <Card>
            <CardHeader title={`Other roles · ${others.length}`} />
            {list(others, false)}
          </Card>
        )}
      </div>
    </div>
  );
}

export const approvalsCount = (s: State) => pendingItems(s).filter((i) => i.who.includes(s.role)).length;
