"use client";
// Placeholder for Orbyte's existing modules (PRD FR-O1): present, not part of this demo.
import { ArrowRight, Boxes } from "lucide-react";
import { Badge, Button, Card } from "@/components/ui";
import { useKutip } from "@/lib/store";

export default function ModulePage() {
  const name = useKutip((s) => s.moduleName) ?? "This";
  const go = useKutip((s) => s.go);
  return (
    <div className="mx-auto mt-8 max-w-lg sm:mt-16">
      <Card className="flex flex-col items-start gap-3 px-6 py-8 sm:px-8">
        <div className="grid h-10 w-10 place-items-center border border-line bg-canvas text-ink2">
          <Boxes className="h-5 w-5" aria-hidden />
        </div>
        <div className="eyebrow">Orbyte module</div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-ink">{name}</h1>
          <Badge>Part of Orbyte</Badge>
        </div>
        <p className="text-[13px] text-ink2">{name} is an existing Orbyte module, shown for context. It is not part of this demo.</p>
        <Button className="mt-2" onClick={() => go("today")}>
          Back to Kutip Today
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Button>
      </Card>
    </div>
  );
}
