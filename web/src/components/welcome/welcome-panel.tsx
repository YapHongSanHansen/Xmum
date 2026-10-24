"use client";
// Judge welcome: what a cold visitor sees on Today before the demo starts.
// Shown only at the demo's start state and until dismissed (persisted in the
// store; "Reset demo" shows it again).
import { BookOpen, Check, ScanLine, X } from "lucide-react";
import { Button } from "@/components/ui";
import type { State } from "@/engine/model";
import { useKutip } from "@/lib/store";

/** The demo is at its start: nothing logged and no scan run yet. */
export const atDemoStart = (s: State) => s.log.length === 0 && s.scannedDays.length === 0;

const WATCH = [
  "Salaries flagged short 11 days ahead.",
  "A late payer's new booking held for the owner's decision.",
  "AI reads slips; nothing is marked paid until a bank line matches.",
];

export default function WelcomePanel() {
  const show = useKutip((s) => atDemoStart(s.state) && !s.welcomeDismissed);
  const dispatch = useKutip((s) => s.dispatch);
  const go = useKutip((s) => s.go);
  const dismiss = useKutip((s) => s.dismissWelcome);
  if (!show) return null;

  return (
    <section aria-labelledby="welcome-title" className="relative border border-line border-l-[3px] border-l-navy bg-surface">
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss welcome"
        className="absolute right-2.5 top-2.5 rounded-[2px] p-1 text-ink3 hover:bg-canvas hover:text-ink"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="grid grid-cols-[1fr_320px] gap-6 px-6 py-5">
        <div>
          <div className="eyebrow">Welcome to Kutip</div>
          <h2 id="welcome-title" className="mt-1.5 text-[19px] font-semibold leading-snug tracking-[-0.01em] text-ink">
            Never be surprised on payroll day, and stop giving credit to customers who don&apos;t pay.
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-ink2">
            You are <span className="font-medium text-ink">Lim Siew Lan</span>, owner of Lori Laju Logistics (fictional). Switch to Nurul
            the clerk in the header any time.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button onClick={() => go("guide")}>
              <BookOpen className="h-4 w-4" aria-hidden />
              Start the 3-minute guide
            </Button>
            <Button variant="secondary" onClick={() => dispatch({ type: "RUN_SCAN" })}>
              <ScanLine className="h-4 w-4" aria-hidden />
              Run the 08:00 scan
            </Button>
          </div>
          <p className="mt-3 text-[11px] text-ink3">All data is synthetic. Orbyte frame is simulated.</p>
        </div>

        <div className="border border-hairline bg-canvas px-4 py-3">
          <div className="eyebrow">What to watch</div>
          <ul className="mt-2 space-y-2">
            {WATCH.map((w) => (
              <li key={w} className="flex gap-2 text-[13px] leading-snug text-ink">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-700" aria-hidden />
                {w}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
