"use client";
import { ArrowRight, Lightbulb, MessageCircle } from "lucide-react";
import { Badge, Button, Card, CardHeader, Figure, stagger } from "@/components/ui";
import { CountUp } from "@/components/motion";
import { useKachingg } from "@/lib/store";
import { dayOf, daysOverdue, fmtDate, fmtRM, outstanding } from "@/engine/model";
import { chasePlan, forecast } from "@/engine/rules";
import { inboxCount } from "@/components/shell/counts";

export function CollectionSnapshot() {
  const state = useKachingg((s) => s.state);
  const go = useKachingg((s) => s.go);
  const open = state.invoices.filter((i) => outstanding(i) > 0 && i.status !== "paid");
  const buckets = [
    { label: "Not yet due", color: "#91bdf6", invoices: open.filter((i) => daysOverdue(i, state.now) <= 0) },
    {
      label: "1–14 days",
      color: "#3990f7",
      invoices: open.filter((i) => daysOverdue(i, state.now) > 0 && daysOverdue(i, state.now) <= 14),
    },
    {
      label: "15–30 days",
      color: "#5966ed",
      invoices: open.filter((i) => daysOverdue(i, state.now) > 14 && daysOverdue(i, state.now) <= 30),
    },
    { label: "31+ days", color: "#ee5b9f", invoices: open.filter((i) => daysOverdue(i, state.now) > 30) },
  ];
  const unread = inboxCount(state);
  // Dots pop in one after another across the buckets; the stagger is capped so the last lands by ~0.6s.
  const offsets = buckets.map((_, b) => buckets.slice(0, b).reduce((n, x) => n + Math.min(x.invoices.length, 12), 0));
  return (
    <div className="grid gap-[18px] sm:grid-cols-[1.2fr_1fr]">
      <Card rise={2}>
        <CardHeader title="Receivables" right={<Badge>{open.length} open</Badge>} />
        <div className="px-6 pb-6">
          <Figure>
            <CountUp value={open.reduce((sum, i) => sum + outstanding(i), 0)} format={(v) => fmtRM(Math.round(v))} />
          </Figure>
          <p className="mt-2 text-xs text-ink2">Outstanding across all customers</p>
          <div className="mt-7 grid grid-cols-4 gap-2" aria-label="Invoice ageing">
            {buckets.map((bucket, b) => (
              <div key={bucket.label}>
                <div className="flex min-h-12 max-w-20 flex-wrap content-end gap-1" aria-hidden>
                  {Array.from({ length: Math.min(bucket.invoices.length, 12) }, (_, i) => (
                    <span
                      key={i}
                      className="k-pop h-3 w-3 rounded-[4px]"
                      style={{ ...stagger(Math.min(offsets[b] + i, 12) + 4, "35ms"), background: bucket.color }}
                    />
                  ))}
                </div>
                <div className="mt-2 text-[10px] text-ink2">{bucket.label}</div>
                <div className="mt-1 text-sm">{bucket.invoices.length}</div>
              </div>
            ))}
          </div>
        </div>
      </Card>
      <Card className="flex flex-col" rise={3}>
        <CardHeader title="Bukti inbox" right={<MessageCircle className="h-5 w-5 text-ink2" />} />
        <div className="flex flex-1 flex-col px-6 pb-6">
          <Figure>
            <CountUp value={unread} format={(v) => String(Math.round(v))} duration={500} />
          </Figure>
          <p className="mt-3 text-xs leading-relaxed text-ink2">
            {unread > 0
              ? "Customer replies ready to review. Turn payment claims into verified receipts."
              : "All caught up. New replies will appear here as the demo moves forward."}
          </p>
          <div className="mt-auto pt-6">
            <Button variant="secondary" size="sm" onClick={() => go("inbox")}>
              Open inbox
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

export function NextAction() {
  const state = useKachingg((s) => s.state);
  const dispatch = useKachingg((s) => s.dispatch);
  const go = useKachingg((s) => s.go);
  const scanned = state.scannedDays.includes(dayOf(state.now));
  const gap = state.role === "owner" ? forecast(state).find((f) => f.gap > 0) : undefined;
  const ready = scanned ? chasePlan(state).filter((r) => r.state === "remind").length : 0;
  return (
    <section className="insight-card k-rise" style={stagger(3)} aria-label="Your next step">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-2 rounded-xl border border-white/40 bg-white/15 px-3 py-1.5 text-xs">
          <Lightbulb className="h-4 w-4" aria-hidden />
          Your next step
        </span>
        <span className="text-xs">{gap ? fmtDate(gap.dueDate) : "Today"}</span>
      </div>
      <div className="insight-copy">
        <div className="text-[56px] leading-none tracking-[-.06em]">
          {!scanned ? "Let’s begin." : gap ? `${gap.daysAway} days` : `${ready} to review`}
        </div>
        <h2 className="mt-4 max-w-xs text-xl font-medium leading-snug tracking-tight">
          {!scanned
            ? "Know what’s ahead. Decide what’s next."
            : gap
              ? `Time to close a ${fmtRM(gap.gap)} gap.`
              : ready > 0
                ? "A little follow-up goes a long way."
                : "You’re on top of today’s collections."}
        </h2>
        <p className="mt-3 text-xs leading-relaxed text-white">
          {!scanned
            ? "Run your daily scan to find cash gaps and prioritise the customers to follow up."
            : gap
              ? `Your ${gap.short} bill needs attention. Review the collection plan and choose your next move.`
              : "Every payment is checked. Every important decision stays with a person."}
        </p>
      </div>
      <Button
        variant="secondary"
        className="w-fit border-white/50! bg-white/90!"
        onClick={() =>
          !scanned
            ? dispatch({ type: "RUN_SCAN" })
            : ready > 0
              ? document.getElementById("collection-plan")?.scrollIntoView({ behavior: "smooth", block: "start" })
              : go("approvals")
        }
      >
        {!scanned ? "Run daily scan" : ready > 0 ? "View collection plan" : "Open approvals"}
        <ArrowRight className="h-4 w-4" />
      </Button>
    </section>
  );
}
