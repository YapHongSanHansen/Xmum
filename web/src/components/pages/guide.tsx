"use client";
// Demo guide: the PRD §13 script as a checklist. Each tick is derived from
// state, so it stays true after a reload and resets with the demo.
import { ArrowRight, Check, FastForward, Lightbulb, Play, UserRound } from "lucide-react";
import { Badge, Button, Card, PageTitle, cx } from "@/components/ui";
import { dayOf, fmtDateTime, type Role, type State } from "@/engine/model";
import { DEMO_START, DEMO_STOPS } from "@/engine/seed";
import { useKutip, type Page } from "@/lib/store";

interface Step {
  n: number;
  title: string;
  who: Role[];
  look: string;
  refs: string;
  page: Page;
  stop?: string;
  scan?: boolean;
  done: (s: State) => boolean;
  progress?: (s: State) => string | null;
}

const FIRST_DAY = dayOf(DEMO_START);
const hasReminder = (s: State, id: string) => (s.invoices.find((i) => i.id === id)?.reminders.length ?? 0) > 0;

const STEPS: Step[] = [
  {
    n: 1,
    title: "Run the 08:00 scan",
    who: ["owner"],
    look: "The early-warning card (Owner only) says salaries will be short in 11 days and lists the owner's options. Pick the one that asks the diesel supplier to move the 5 Nov bill.",
    refs: "FR-B1–B3 · R6",
    page: "today",
    scan: true,
    done: (s) => s.scannedDays.includes(FIRST_DAY) && s.warnings.some((w) => w.chosen.length > 0),
    progress: (s) => (s.scannedDays.includes(FIRST_DAY) && !s.warnings.some((w) => w.chosen.length > 0) ? "scan done, pick an option" : null),
  },
  {
    n: 2,
    title: "Chase plan: approve the gentle reminders",
    who: ["clerk"],
    look: "A ranked list with a rule ID and reason on every row; Pelita Frozen Foods is skipped (R2, promise 30 Oct). As Clerk, approve the Tier 1 reminders for INV-2304 and INV-2310.",
    refs: "FR-C1–C4, C6 · R1–R3",
    page: "today",
    done: (s) => hasReminder(s, "INV-2304") && hasReminder(s, "INV-2310"),
    progress: (s) => {
      const n = ["INV-2304", "INV-2310"].filter((id) => hasReminder(s, id)).length;
      return n === 1 ? "1 of 2 approved" : null;
    },
  },
  {
    n: 3,
    title: "Approve the firm reminder to Hup Seng",
    who: ["owner"],
    look: "The Tier 2 reminder for INV-2268 is in Chinese and only the Owner can approve it. WhatsApp opens prefilled through wa.me, or the send is simulated.",
    refs: "FR-C5–C8 · R5",
    page: "today",
    done: (s) => s.invoices.find((i) => i.id === "INV-2268")?.reminders.some((r) => r.tier === 2) ?? false,
  },
  {
    n: 4,
    title: "Hup Seng replies: which Friday?",
    who: ["clerk"],
    look: "Bukti reads the reply and shows the exact words. The date is ambiguous, so a \"Which Friday?\" hand-off appears. Pick 30 Oct and Hup Seng's reminders pause (M5).",
    refs: "FR-E2, E3, E7–E9 · M4, M5",
    page: "inbox",
    stop: DEMO_STOPS[0].at,
    done: (s) => s.handoffs.some((h) => h.kind === "promise_date" && h.resolved),
  },
  {
    n: 5,
    title: "Credit check on a new booking",
    who: ["clerk", "owner"],
    look: "As Clerk, enter a Hup Seng booking: Klang → Johor Bahru, RM2,400, 60-day credit. R4 holds it. As Owner, the card shows RM6,850 owed, 46 days late, promise 30 Oct, RM9,250 total. Choose \"ask 50% deposit\".",
    refs: "FR-D1–D3 · R4",
    page: "bookings",
    stop: DEMO_STOPS[1].at,
    done: (s) => s.bookings.some((b) => b.decidedBy !== null),
    progress: (s) => (s.bookings.some((b) => b.status === "on_hold") ? "on hold, Owner to decide" : null),
  },
  {
    n: 6,
    title: "Mega Bina pays with a deduction",
    who: ["clerk", "owner"],
    look: "The 22 and 23 Oct scans run and a second warning (5 Nov diesel) appears. The 14:25 bank line and the slip arrive; a live AI call shows each field with its exact words and confidence, including the RM330 deduction linked to DO-8812. As Clerk, approve the VERIFIED RM2,770 receipt: only then does the 31 Oct meter turn green. As Owner, accept the deduction: INV-2304 is PAID and CN-0057 is drafted.",
    refs: "FR-H1, E1–E6, E12, B4 · M1, M3",
    page: "inbox",
    stop: DEMO_STOPS[2].at,
    done: (s) => s.receipts.some((r) => r.invoiceId === "INV-2304" && r.status === "approved"),
    progress: (s) => {
      const r = s.receipts.find((x) => x.invoiceId === "INV-2304" && x.status === "approved");
      if (!r?.deduction) return null;
      return r.deduction.status === "pending" ? "receipt approved, deduction pending" : `deduction ${r.deduction.status}`;
    },
  },
  {
    n: 7,
    title: "Kilang says paid, with no proof",
    who: ["clerk"],
    look: "\"Dah settle la semalam\" has no slip and no bank line, so the invoice is not marked paid (M1). A BM reply asking for the slip is drafted; the Clerk sends it.",
    refs: "FR-E10 · M1",
    page: "inbox",
    stop: DEMO_STOPS[3].at,
    done: (s) => s.handoffs.some((h) => h.kind === "claim_unverified" && h.resolved),
  },
  {
    n: 8,
    title: "Activity log",
    who: ["owner"],
    look: "Every step above, in order, with its actor (person, rule ID, AI, inbound, bank) and demo time. Entries are append-only and export to CSV.",
    refs: "FR-G1–G2",
    page: "log",
    done: (s) => STEPS.slice(0, 7).every((st) => st.done(s)),
  },
];

const WHO_LABEL: Record<Role, string> = { owner: "Owner", clerk: "Clerk" };

const NOTICE = [
  { title: "Rules, not AI, make decisions", text: "AI only reads messages and slips. Ranking, holds, matching and pauses come from numbered rules, shown on every row." },
  { title: "Nothing is marked paid without a bank line", text: "A customer saying \"paid\" opens a claim. Only an equal-amount bank line verifies it." },
  { title: "The clerk never sees cash figures", text: "Switch to Nurul: the gap shows as yes/no, and the balance and payroll amounts are hidden." },
  { title: "Every step is logged", text: "Each action carries the demo time, the actor and the rule, in an append-only log." },
];

export default function GuidePage() {
  const s = useKutip((st) => st.state);
  const dispatch = useKutip((st) => st.dispatch);
  const go = useKutip((st) => st.go);
  const done = STEPS.map((st) => st.done(s));
  const doneCount = done.filter(Boolean).length;
  const nextIdx = done.findIndex((d) => !d);
  const needsScan = !s.scannedDays.includes(dayOf(s.now));

  return (
    <div>
      <PageTitle
        title="Demo guide"
        subtitle="The 3–4 minute demo script. Ticks update from the demo state as you go."
        right={
          <div className="flex items-center gap-3 text-sm">
            <span className="text-slate-500">
              Clock <span className="font-mono font-semibold text-slate-900">{fmtDateTime(s.now)}</span>
            </span>
            <Badge tone={doneCount === STEPS.length ? "emerald" : "slate"}>
              {doneCount} of {STEPS.length} done
            </Badge>
          </div>
        }
      />

      <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-slate-200">
        <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${(doneCount / STEPS.length) * 100}%` }} />
      </div>

      <div className="grid grid-cols-[1fr_300px] items-start gap-5">
        <ol className="space-y-3">
          {STEPS.map((step, idx) => {
            const isDone = done[idx];
            const isNext = idx === nextIdx;
            const stop = step.stop ? DEMO_STOPS.find((d) => d.at === step.stop) : undefined;
            const canAdvance = !!step.stop && step.stop > s.now;
            const hint = !isDone && step.progress ? step.progress(s) : null;
            return (
              <li key={step.n}>
                <Card className={cx("px-4 py-3.5", isNext && "ring-2 ring-emerald-400", isDone && "bg-slate-50/80")}>
                  <div className="flex gap-3">
                    <StatusDot n={step.n} done={isDone} next={isNext} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cx("text-sm font-semibold", isDone ? "text-slate-500" : "text-slate-900")}>{step.title}</span>
                        {step.who.map((r) => (
                          <Badge key={r} tone={r === "owner" ? "violet" : "sky"}>
                            {WHO_LABEL[r]}
                          </Badge>
                        ))}
                        {stop && (
                          <span className="font-mono text-[11px] text-slate-500">{fmtDateTime(stop.at)}</span>
                        )}
                        {isNext && <Badge tone="emerald">next</Badge>}
                        {hint && <Badge tone="amber">{hint}</Badge>}
                      </div>
                      <p className="mt-1 text-[13px] leading-relaxed text-slate-600">{step.look}</p>
                      <div className="mt-2.5 flex flex-wrap items-center gap-2">
                        {step.scan && needsScan && dayOf(s.now) === FIRST_DAY && (
                          <Button size="sm" className="bg-amber-500 hover:bg-amber-600" onClick={() => dispatch({ type: "RUN_SCAN" })}>
                            <Play className="h-3.5 w-3.5" aria-hidden />
                            Run 08:00 scan
                          </Button>
                        )}
                        {stop && canAdvance && (
                          <Button size="sm" variant="secondary" onClick={() => dispatch({ type: "ADVANCE", to: stop.at })}>
                            <FastForward className="h-3.5 w-3.5" aria-hidden />
                            Advance to {fmtDateTime(stop.at)}
                          </Button>
                        )}
                        {step.who
                          .filter((r) => !isDone && r !== s.role)
                          .map((r) => (
                            <Button key={r} size="sm" variant="ghost" onClick={() => dispatch({ type: "SET_ROLE", role: r })}>
                              <UserRound className="h-3.5 w-3.5" aria-hidden />
                              Act as {WHO_LABEL[r]}
                            </Button>
                          ))}
                        <Button size="sm" variant={isNext ? "primary" : "secondary"} onClick={() => go(step.page)}>
                          Go
                          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                        </Button>
                        <span className="ml-auto font-mono text-[10px] text-slate-400">{step.refs}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              </li>
            );
          })}
        </ol>

        <Card tone="good" className="sticky top-6">
          <div className="flex items-center gap-2 border-b border-emerald-200 px-4 py-3">
            <Lightbulb className="h-4 w-4 text-emerald-700" aria-hidden />
            <span className="text-sm font-semibold text-emerald-950">What to notice</span>
          </div>
          <ul className="space-y-3 px-4 py-3">
            {NOTICE.map((n) => (
              <li key={n.title} className="flex gap-2">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
                <div>
                  <div className="text-[13px] font-semibold text-slate-900">{n.title}</div>
                  <div className="text-xs leading-relaxed text-slate-600">{n.text}</div>
                </div>
              </li>
            ))}
          </ul>
          <div className="border-t border-emerald-200 px-4 py-2.5 text-[11px] text-emerald-900/70">
            Start state: seed loaded, clock {fmtDateTime(DEMO_START)}. Use &ldquo;Reset demo&rdquo; in the header to start over.
          </div>
        </Card>
      </div>
    </div>
  );
}

function StatusDot({ n, done, next }: { n: number; done: boolean; next: boolean }) {
  if (done) {
    return (
      <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-500 text-white" aria-label={`Step ${n} done`}>
        <Check className="h-3.5 w-3.5" />
      </span>
    );
  }
  return (
    <span
      className={cx(
        "mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-semibold",
        next ? "bg-emerald-50 text-emerald-700 ring-2 ring-emerald-400" : "bg-slate-100 text-slate-500 ring-1 ring-slate-200",
      )}
      aria-label={`Step ${n}`}
    >
      {n}
    </span>
  );
}
