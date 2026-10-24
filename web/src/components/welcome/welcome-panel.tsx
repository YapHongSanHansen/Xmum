"use client";
// Judge welcome: what a cold visitor sees on Today before the demo starts.
// Shown only at the demo's start state and until dismissed (persisted in the
// store; "Reset demo" shows it again).
import { BookOpen, ScanLine, X } from "lucide-react";
import { Button } from "@/components/ui";
import type { State } from "@/engine/model";
import { useKutip } from "@/lib/store";

/** The demo is at its start: nothing logged and no scan run yet. */
export const atDemoStart = (s: State) => s.log.length === 0 && s.scannedDays.length === 0;

export default function WelcomePanel() {
  const show = useKutip((s) => atDemoStart(s.state) && !s.welcomeDismissed);
  const dispatch = useKutip((s) => s.dispatch);
  const go = useKutip((s) => s.go);
  const dismiss = useKutip((s) => s.dismissWelcome);
  if (!show) return null;

  return (
    <section aria-labelledby="welcome-title" className="relative border border-line border-l-[3px] border-l-navy bg-surface px-5 py-6 sm:px-7">
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss welcome"
        className="absolute right-3 top-3 rounded-[2px] p-1 text-ink2 hover:bg-canvas hover:text-ink"
      >
        <X className="h-4 w-4" />
      </button>

      <h2 id="welcome-title" className="max-w-[560px] pr-8 text-[18px] font-semibold leading-snug tracking-[-0.01em] text-ink">
        No surprises on payroll day, and no more credit for customers who don&apos;t pay.
      </h2>
      <p className="mt-1.5 text-[13px] text-ink2">You are Lim Siew Lan, the owner.</p>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Button onClick={() => go("guide")}>
          <BookOpen className="h-4 w-4" aria-hidden />
          Start the 3-minute guide
        </Button>
        <Button variant="secondary" onClick={() => dispatch({ type: "RUN_SCAN" })}>
          <ScanLine className="h-4 w-4" aria-hidden />
          Run the 08:00 scan
        </Button>
      </div>
    </section>
  );
}
