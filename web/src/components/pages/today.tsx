"use client";
// Today: the 08:00 scan, cash-gap meters, early warnings and the chase plan
// (PRD §7B, §7C). Every number comes from the engine; this page only renders it.
import { useCallback, useState } from "react";
import { useKutip } from "@/lib/store";
import { Empty, PageTitle } from "@/components/ui";
import { dayOf, fmtDateTime, userOf } from "@/engine/model";
import { chasePlan } from "@/engine/rules";
import ScanBanner from "@/components/today/scan-banner";
import CashMeters from "@/components/today/cash-meters";
import EarlyWarnings from "@/components/today/early-warnings";
import ChasePlan from "@/components/today/chase-plan";
import ApprovalPanel from "@/components/today/approval-panel";

export default function TodayPage() {
  const state = useKutip((s) => s.state);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const close = useCallback(() => setSelectedId(null), []);

  const scanned = state.scannedDays.includes(dayOf(state.now));
  const me = userOf(state, state.role);
  const selectedRow = selectedId ? chasePlan(state).find((r) => r.invoice.id === selectedId && r.state === "remind") : undefined;

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-6">
      <PageTitle
        title="Today"
        subtitle={`${fmtDateTime(state.now)} · signed in as ${me.name} (${state.role === "owner" ? "Owner" : "Clerk"})`}
      />

      {!scanned && <ScanBanner />}

      {scanned ? (
        <>
          <CashMeters />
          <EarlyWarnings />
          <ChasePlan selectedId={selectedRow ? selectedId : null} onReview={setSelectedId} />
        </>
      ) : (
        <Empty>Run today&apos;s scan to see the cash gaps and today&apos;s chase plan.</Empty>
      )}

      {selectedRow && <ApprovalPanel key={`${selectedRow.invoice.id}:${state.role}`} row={selectedRow} onClose={close} />}
    </div>
  );
}
