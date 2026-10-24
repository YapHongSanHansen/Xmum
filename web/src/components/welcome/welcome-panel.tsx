"use client";
import { ArrowRight, BookOpen, X } from "lucide-react";
import { Button } from "@/components/ui";
import type { State } from "@/engine/model";
import { useKachingg } from "@/lib/store";
export const atDemoStart = (s: State) => s.log.length === 0 && s.scannedDays.length === 0;
export default function WelcomePanel() {
  const show = useKachingg((s) => atDemoStart(s.state) && !s.welcomeDismissed);
  const go = useKachingg((s) => s.go);
  const dismiss = useKachingg((s) => s.dismissWelcome);
  if (!show) return null;
  return (
    <section className="flex flex-wrap items-center gap-4 rounded-2xl border border-white bg-white/50 p-4" aria-label="Welcome to Kachingg">
      <BookOpen className="h-5 w-5 text-ink2" aria-hidden />
      <div className="min-w-0 flex-1">
        <h2 className="text-sm font-medium">Meet your collection assistant.</h2>
        <p className="mt-1 text-xs text-ink2">Take a three-minute tour, from a cash warning to a verified payment.</p>
      </div>
      <Button size="sm" variant="secondary" onClick={() => go("guide")}>
        Explore the demo
        <ArrowRight className="h-3.5 w-3.5" />
      </Button>
      <button type="button" onClick={dismiss} aria-label="Dismiss welcome" className="p-2 text-ink2">
        <X className="h-4 w-4" />
      </button>
    </section>
  );
}
