"use client";
// Demo guide: the PRD §13 script as a checklist. Each tick is derived from
// state, so it stays true after a reload and resets with the demo.
import { ArrowRight, Check, FastForward, Play, UserRound } from "lucide-react";
import { Badge, Button, PageTitle, cx } from "@/components/ui";
import { dayOf, fmtDateTime, type Role, type State } from "@/engine/model";
import { DEMO_START, DEMO_STOPS } from "@/engine/seed";
import { useKutip, type Page } from "@/lib/store";

interface Step {
  n: number;
  title: string;
  who: Role[];
  look: string;
  /** Optional figures line, shown in mono under the sentence. */
  facts?: string;
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
    look: "Salaries are short in 11 days. Ask diesel to move the 5 Nov bill.",
    refs: "FR-B1–B3 · R6",
    page: "today",
    scan: true,
    done: (s) => s.scannedDays.includes(FIRST_DAY) && s.warnings.some((w) => w.chosen.length > 0),
    progress: (s) => (s.scannedDays.includes(FIRST_DAY) && !s.warnings.some((w) => w.chosen.length > 0) ? "scan done, pick an option" : null),
  },
  {
    n: 2,
    title: "Approve gentle reminders",
    who: ["clerk"],
    look: "Approve Tier 1 for INV-2304 and INV-2310. Pelita is skipped (R2, promise 30 Oct).",
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
    title: "Approve the firm reminder",
    who: ["owner"],
    look: "Tier 2 to Hup Seng for INV-2268, in Chinese. Owner only.",
    refs: "FR-C5–C8 · R5",
    page: "today",
    done: (s) => s.invoices.find((i) => i.id === "INV-2268")?.reminders.some((r) => r.tier === 2) ?? false,
  },
  {
    n: 4,
    title: "Hup Seng: which Friday?",
    who: ["clerk"],
    look: "Bukti quotes the reply. Pick Fri 30 Oct; reminders pause (M5).",
    refs: "FR-E2, E3, E7–E9 · M4, M5",
    page: "inbox",
    stop: DEMO_STOPS[0].at,
    done: (s) => s.handoffs.some((h) => h.kind === "promise_date" && h.resolved),
  },
  {
    n: 5,
    title: "Credit check a booking",
    who: ["clerk", "owner"],
    look: "Book Hup Seng, Klang → Johor Bahru, on 60-day credit. R4 holds it for the Owner.",
    facts: "RM2,400 · owes RM6,850 · 46 days late · promise 30 Oct · total RM9,250 → ask 50% deposit",
    refs: "FR-D1–D3 · R4",
    page: "bookings",
    stop: DEMO_STOPS[1].at,
    done: (s) => s.bookings.some((b) => b.decidedBy !== null),
    progress: (s) => (s.bookings.some((b) => b.status === "on_hold") ? "on hold, Owner to decide" : null),
  },
  {
    n: 6,
    title: "Mega Bina pays, less a deduction",
    who: ["clerk", "owner"],
    look: "Clerk approves the verified receipt; only then is 31 Oct covered. Owner accepts the deduction.",
    facts: "2nd warning 5 Nov · RM2,770 + RM330 (DO-8812) · 31 Oct covered · INV-2304 PAID · CN-0057",
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
    title: "Kilang says paid, no proof",
    who: ["clerk"],
    look: "“Dah settle la semalam”: no slip, no bank line, so not paid (M1). Send the BM reply.",
    refs: "FR-E10 · M1",
    page: "inbox",
    stop: DEMO_STOPS[3].at,
    done: (s) => s.handoffs.some((h) => h.kind === "claim_unverified" && h.resolved),
  },
  {
    n: 8,
    title: "Activity log",
    who: ["owner"],
    look: "Every step with its actor, rule and time. Append-only, exports to CSV.",
    refs: "FR-G1–G2",
    page: "log",
    done: (s) => STEPS.slice(0, 7).every((st) => st.done(s)),
  },
];

const WHO_LABEL: Record<Role, string> = { owner: "Owner", clerk: "Clerk" };

const NOTICE = ["Rules decide; AI only reads.", "Paid only with a matching bank line.", "The Clerk never sees cash figures.", "Every step is logged."];

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
        title="A quick tour"
        subtitle="Eight small steps. One complete collection story."
        right={
          <Badge tone={doneCount === STEPS.length ? "emerald" : "slate"}>
            {doneCount} of {STEPS.length} done
          </Badge>
        }
      />

      <div className="mb-6 h-2 overflow-hidden rounded-full bg-white">
        <div className="striped-fill transition-[width] duration-500" style={{ width: `${(doneCount / STEPS.length) * 100}%` }} />
      </div>

      <div className="grid items-start gap-8 lg:grid-cols-[1fr_240px]">
        <ol className="panel overflow-hidden divide-y divide-hairline">
          {STEPS.map((step, idx) => {
            const isDone = done[idx];
            const isNext = idx === nextIdx;
            const stop = step.stop ? DEMO_STOPS.find((d) => d.at === step.stop) : undefined;
            const canAdvance = !!step.stop && step.stop > s.now;
            const hint = !isDone && step.progress ? step.progress(s) : null;
            return (
              <li key={step.n} className={cx("relative px-6 py-6", isNext && "bg-navy-soft/40")}>
                {isNext && <span className="absolute inset-y-0 left-0 w-[3px] bg-navy" aria-hidden />}
                <div className="flex gap-3.5">
                  <StatusDot n={step.n} done={isDone} next={isNext} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                      <span className={cx("text-[14px] font-semibold", isDone ? "text-ink2" : "text-ink")}>{step.title}</span>
                      <span className="text-xs text-ink2">{step.who.map((r) => WHO_LABEL[r]).join(" · ")}</span>
                      {stop && !canAdvance && <span className="font-mono text-[11px] text-ink2">{fmtDateTime(stop.at)}</span>}
                      {isNext && <span className="text-xs font-medium text-navy">Next</span>}
                      {hint && <Badge tone="amber">{hint}</Badge>}
                    </div>
                    <p className="mt-1 text-[13px] leading-relaxed text-ink2">{step.look}</p>
                    {step.facts && <p className="num mt-1 text-xs leading-relaxed text-ink">{step.facts}</p>}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {step.scan && needsScan && dayOf(s.now) === FIRST_DAY && (
                        <Button size="sm" onClick={() => dispatch({ type: "RUN_SCAN" })}>
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
                      <span className="ml-auto font-mono text-[10px] text-ink2">{step.refs}</span>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>

        <aside className="panel p-6 lg:sticky lg:top-6">
          <h2 className="text-xs font-medium text-ink2">What to notice</h2>
          <ul className="mt-3 space-y-2.5">
            {NOTICE.map((n) => (
              <li key={n} className="flex gap-2 text-[13px] leading-snug text-ink">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-700" aria-hidden />
                {n}
              </li>
            ))}
          </ul>
          <p className="mt-5 border-t border-hairline pt-3 text-xs text-ink2">
            Reset demo returns to <span className="num">{fmtDateTime(DEMO_START)}</span>.
          </p>
        </aside>
      </div>
    </div>
  );
}

function StatusDot({ n, done, next }: { n: number; done: boolean; next: boolean }) {
  if (done) {
    return (
      <span className="mt-0.5 grid h-[22px] w-[22px] shrink-0 place-items-center border border-emerald-100 bg-emerald-100 text-emerald-700" aria-label={`Step ${n} done`}>
        <Check className="h-3.5 w-3.5" />
      </span>
    );
  }
  return (
    <span
      className={cx(
        "mt-0.5 grid h-[22px] w-[22px] shrink-0 place-items-center border font-mono text-[11px]",
        next ? "border-navy bg-navy text-white" : "border-line bg-surface text-ink2",
      )}
      aria-label={`Step ${n}`}
    >
      {n}
    </span>
  );
}
