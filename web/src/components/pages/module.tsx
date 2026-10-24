"use client";
// Placeholder for Orbyte's existing modules (PRD FR-O1): present, not part of this demo.
import { ArrowRight, Boxes } from "lucide-react";
import { Badge, Button, Card } from "@/components/ui";
import { useKutip } from "@/lib/store";

export default function ModulePage() {
  const name = useKutip((s) => s.moduleName) ?? "This";
  const go = useKutip((s) => s.go);
  return (
    <div className="mx-auto mt-16 max-w-lg">
      <Card className="px-8 py-10 text-center">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-500">
          <Boxes className="h-6 w-6" aria-hidden />
        </div>
        <div className="mb-2 flex items-center justify-center gap-2">
          <h1 className="text-lg font-semibold text-slate-900">{name}</h1>
          <Badge>Part of Orbyte</Badge>
        </div>
        <p className="text-sm text-slate-600">
          {name} is an existing Orbyte module, shown for context. It is not part of this demo.
        </p>
        <Button className="mt-6" onClick={() => go("today")}>
          Back to Kutip Today
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Button>
      </Card>
    </div>
  );
}
