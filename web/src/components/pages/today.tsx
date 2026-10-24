"use client";
import { useCallback, useState } from "react";
import { CalendarDays, CheckCircle2, ScanLine } from "lucide-react";
import { useKachingg } from "@/lib/store";
import { Badge, Button, PageTitle } from "@/components/ui";
import { dayOf, fmtDate } from "@/engine/model";
import { chasePlan } from "@/engine/rules";
import CashFlow, { ClerkOverview } from "@/components/today/cash-flow";
import CashMeters from "@/components/today/cash-meters";
import { CollectionSnapshot, NextAction } from "@/components/today/collection-snapshot";
import EarlyWarnings from "@/components/today/early-warnings";
import ChasePlan from "@/components/today/chase-plan";
import ApprovalPanel from "@/components/today/approval-panel";
import CollectionsTrend from "@/components/today/collections-trend";
import WelcomePanel from "@/components/welcome/welcome-panel";

export default function TodayPage() {
  const state = useKachingg((s) => s.state);
  const dispatch = useKachingg((s) => s.dispatch);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const close = useCallback(() => setSelectedId(null), []);
  const scanned = state.scannedDays.includes(dayOf(state.now));
  const selectedRow = selectedId ? chasePlan(state).find((r) => r.invoice.id === selectedId && r.state === "remind") : undefined;
  return (
    <div>
      <PageTitle
        title="Overview"
        subtitle={
          <>
            Your cash, your customers, and a clear next step.
            <span className="mt-1 block text-xs">Customers and roles from Orbyte (simulated)</span>
          </>
        }
        right={
          <>
            <span className="inline-flex items-center gap-2 rounded-xl border border-white bg-surface px-4 py-3 text-xs shadow-sm">
              <CalendarDays className="h-4 w-4" />
              {fmtDate(state.now)} · Next 30 days
            </span>
            {scanned ? (
              <Badge tone="emerald">
                <CheckCircle2 className="h-3 w-3" />
                Scan complete
              </Badge>
            ) : (
              <Button onClick={() => dispatch({ type: "RUN_SCAN" })}>
                <ScanLine className="h-4 w-4" />
                Run daily scan
              </Button>
            )}
          </>
        }
      />
      <div className="overview-grid">
        {state.role === "owner" ? <CashFlow /> : <ClerkOverview />}
        <CashMeters />
      </div>
      <div className="overview-bottom">
        <CollectionSnapshot />
        <NextAction />
      </div>
      <div className="mt-6">
        <CollectionsTrend />
      </div>
      <div className="mt-6">
        <WelcomePanel />
      </div>
      {scanned && (
        <div className="mt-7 space-y-6">
          <EarlyWarnings />
          <section id="collection-plan" className="scroll-mt-6" aria-label="Collection plan">
            <ChasePlan selectedId={selectedRow ? selectedId : null} onReview={setSelectedId} />
          </section>
        </div>
      )}
      {selectedRow && <ApprovalPanel key={`${selectedRow.invoice.id}:${state.role}`} row={selectedRow} onClose={close} />}
    </div>
  );
}
