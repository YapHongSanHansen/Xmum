"use client";
// FR-B1: the 08:00 scan. The seed day starts unscanned, so the demo opens here.
import { ScanLine } from "lucide-react";
import { useKutip } from "@/lib/store";
import { Button } from "@/components/ui";

export default function ScanBanner() {
  const dispatch = useKutip((s) => s.dispatch);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border border-line border-l-[3px] border-l-amber-800 bg-surface px-5 py-4">
      <div className="flex items-center gap-2.5 text-[13px] text-ink">
        <ScanLine className="h-4 w-4 shrink-0 text-amber-800" aria-hidden />
        Today&apos;s 08:00 scan hasn&apos;t run.
      </div>
      <Button onClick={() => dispatch({ type: "RUN_SCAN" })}>
        <ScanLine className="h-4 w-4" aria-hidden />
        Run scan
      </Button>
    </div>
  );
}
