"use client";
// FR-B1: the 08:00 scan. The seed day starts unscanned, so the demo opens here.
import { ScanLine } from "lucide-react";
import { useKutip } from "@/lib/store";
import { Button, RuleTag } from "@/components/ui";
import { fmtDateTime } from "@/engine/model";

export default function ScanBanner() {
  const now = useKutip((s) => s.state.now);
  const dispatch = useKutip((s) => s.dispatch);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
      <div className="flex items-start gap-3">
        <ScanLine className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden />
        <div>
          <div className="text-sm font-semibold text-amber-900">Today&apos;s 08:00 scan hasn&apos;t run</div>
          <div className="text-xs text-amber-800">
            The scan works out the cash gaps, raises early warnings and builds today&apos;s chase plan. Demo clock: {fmtDateTime(now)}.
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <RuleTag id="F1" />
        <RuleTag id="R1–R3" />
        <RuleTag id="R6" />
        <Button onClick={() => dispatch({ type: "RUN_SCAN" })}>
          <ScanLine className="h-4 w-4" aria-hidden />
          Run scan
        </Button>
      </div>
    </div>
  );
}
