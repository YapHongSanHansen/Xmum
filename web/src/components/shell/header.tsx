"use client";
// Hub header (PRD FR-O1) plus the demo controls (FR-H1, FR-A7, FR-F1).
import { useRef, useState } from "react";
import { ChevronDown, Clock, FastForward, Play, RotateCcw } from "lucide-react";
import { Badge, Button, cx } from "@/components/ui";
import { dayOf, fmtDateTime, type Role } from "@/engine/model";
import { DEMO_STOPS } from "@/engine/seed";
import { useKutip } from "@/lib/store";
import { Wordmark } from "./wordmark";

const ROLES: { role: Role; label: string }[] = [
  { role: "owner", label: "Lim Siew Lan · Owner" },
  { role: "clerk", label: "Nurul · Clerk" },
];

export function Header() {
  const state = useKutip((s) => s.state);
  const dispatch = useKutip((s) => s.dispatch);
  const needsScan = !state.scannedDays.includes(dayOf(state.now));

  return (
    <header className="shrink-0 border-b border-slate-200 bg-white">
      <div className="flex h-14 items-center justify-between gap-4 px-5">
        <div className="flex min-w-0 items-center gap-4">
          <Wordmark />
          <span className="h-6 w-px bg-slate-200" aria-hidden />
          <div className="min-w-0">
            <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Workspace</div>
            <div className="truncate text-sm font-semibold text-slate-900">{state.business.name}</div>
          </div>
          <Badge tone="amber">Simulated hub · synthetic data</Badge>
        </div>
        <RoleSwitcher role={state.role} onChange={(role) => dispatch({ type: "SET_ROLE", role })} />
      </div>

      <div className="flex h-12 items-center justify-between gap-4 border-t border-slate-100 bg-slate-50/80 px-5">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Demo clock</span>
          <span className="inline-flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1 font-mono text-sm font-semibold text-slate-900 ring-1 ring-slate-200">
            <Clock className="h-3.5 w-3.5 text-slate-500" aria-hidden />
            {fmtDateTime(state.now)}
          </span>
          <AdvanceMenu now={state.now} onAdvance={(to) => dispatch({ type: "ADVANCE", to })} />
          {needsScan && (
            <Button
              size="sm"
              className="bg-amber-500 text-white shadow-sm ring-2 ring-amber-200 hover:bg-amber-600"
              onClick={() => dispatch({ type: "RUN_SCAN" })}
            >
              <Play className="h-3.5 w-3.5" aria-hidden />
              Run 08:00 scan
            </Button>
          )}
        </div>
        <ResetButton onReset={() => dispatch({ type: "RESET" })} />
      </div>
    </header>
  );
}

function RoleSwitcher({ role, onChange }: { role: Role; onChange: (r: Role) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Orbyte role</span>
      <div className="inline-flex rounded-md bg-slate-100 p-0.5 ring-1 ring-slate-200" role="radiogroup" aria-label="Orbyte role">
        {ROLES.map((r) => (
          <button
            key={r.role}
            type="button"
            role="radio"
            aria-checked={role === r.role}
            onClick={() => role !== r.role && onChange(r.role)}
            className={cx(
              "rounded px-3 py-1 text-xs font-medium transition-colors",
              role === r.role ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:text-slate-800",
            )}
          >
            {r.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function AdvanceMenu({ now, onAdvance }: { now: string; onAdvance: (to: string) => boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <Button size="sm" variant="secondary" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <FastForward className="h-3.5 w-3.5" aria-hidden />
        Advance to
        <ChevronDown className="h-3.5 w-3.5" aria-hidden />
      </Button>
      {open && (
        <>
          <button type="button" aria-label="Close menu" className="fixed inset-0 z-30 cursor-default" onClick={() => setOpen(false)} />
          <AdvancePanel
            now={now}
            onPick={(to) => {
              if (onAdvance(to)) setOpen(false);
            }}
          />
        </>
      )}
    </div>
  );
}

function AdvancePanel({ now, onPick }: { now: string; onPick: (to: string) => void }) {
  // Mounted fresh each time the menu opens, so the field starts at "now".
  const [custom, setCustom] = useState(now);
  const valid = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(custom) && custom > now;
  return (
    <div className="absolute left-0 top-full z-40 mt-1.5 w-80 rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg">
      <div className="px-2 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Demo script stops</div>
      {DEMO_STOPS.map((stop) => {
        const passed = stop.at <= now;
        return (
          <button
            key={stop.at}
            type="button"
            disabled={passed}
            onClick={() => onPick(stop.at)}
            className={cx(
              "flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm",
              passed ? "cursor-not-allowed text-slate-400" : "text-slate-800 hover:bg-emerald-50 hover:text-emerald-900",
            )}
          >
            <span>{stop.label}</span>
            {passed && <span className="text-[11px]">passed</span>}
          </button>
        );
      })}
      <div className="mt-1.5 border-t border-slate-100 px-2 pb-1.5 pt-2.5">
        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400" htmlFor="advance-custom">
          Custom time
        </label>
        <div className="flex items-center gap-2">
          <input
            id="advance-custom"
            type="datetime-local"
            value={custom}
            min={now}
            onChange={(e) => setCustom(e.target.value.slice(0, 16))}
            className="h-8 min-w-0 flex-1 rounded-md border border-slate-300 px-2 font-mono text-xs text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <Button size="sm" disabled={!valid} onClick={() => onPick(custom)}>
            Advance
          </Button>
        </div>
        <p className="mt-1.5 text-[11px] text-slate-500">The clock only moves forward. Each 08:00 crossed runs that day&apos;s scan.</p>
      </div>
    </div>
  );
}

function ResetButton({ onReset }: { onReset: () => void }) {
  const [armed, setArmed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const click = () => {
    if (timer.current) clearTimeout(timer.current);
    if (armed) {
      setArmed(false);
      onReset();
      return;
    }
    setArmed(true);
    timer.current = setTimeout(() => setArmed(false), 4000);
  };
  return (
    <Button size="sm" variant={armed ? "danger" : "ghost"} onClick={click} className={armed ? "" : "text-slate-500"}>
      <RotateCcw className="h-3.5 w-3.5" aria-hidden />
      {armed ? "Click again to reset" : "Reset demo"}
    </Button>
  );
}
