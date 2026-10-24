"use client";
// Top bar: Kutip, the workspace, the demo disclosure and the role switch;
// below it the demo controls (FR-H1, FR-A7, FR-F1).
import { useRef, useState } from "react";
import { ChevronDown, Clock, FastForward, Play, RotateCcw } from "lucide-react";
import { Button, cx } from "@/components/ui";
import { dayOf, fmtDateTime, type Role } from "@/engine/model";
import { DEMO_STOPS } from "@/engine/seed";
import { useKutip } from "@/lib/store";
import { Wordmark } from "./wordmark";

// `label` is the accessible name; `short` is what the switch shows.
const ROLES: { role: Role; label: string; short: string }[] = [
  { role: "owner", label: "Lim Siew Lan · Owner", short: "Owner" },
  { role: "clerk", label: "Nurul · Clerk", short: "Clerk" },
];

export function Header() {
  const state = useKutip((s) => s.state);
  const dispatch = useKutip((s) => s.dispatch);
  const needsScan = !state.scannedDays.includes(dayOf(state.now));

  return (
    <header className="shrink-0 bg-surface">
      {/* Identity row. On a phone the workspace drops to its own line under Kutip and the role switch. */}
      <div className="flex min-h-[52px] flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-hairline px-4 py-2 lg:px-6">
        <Wordmark />
        <div className="order-3 flex w-full min-w-0 items-center gap-2.5 sm:order-2 sm:w-auto sm:flex-1">
          <span className="hidden h-4 w-px bg-line sm:block" aria-hidden />
          <span className="truncate text-[13px] text-ink2">{state.business.name}</span>
          <span className="inline-flex h-5 shrink-0 items-center border border-line px-1.5 text-[11px] text-ink2">Demo · synthetic data</span>
        </div>
        <div className="order-2 ml-auto sm:order-3">
          <RoleSwitcher role={state.role} onChange={(role) => dispatch({ type: "SET_ROLE", role })} />
        </div>
      </div>

      {/* Demo controls: clock, advance, scan, reset. */}
      <div className="relative flex min-h-9 flex-wrap items-center gap-x-2 gap-y-1 border-b border-line bg-canvas px-4 py-1 lg:px-6">
        <span className="mr-1 inline-flex items-center gap-1.5 font-mono text-[13px] font-medium tabular-nums text-ink" title="Demo clock">
          <Clock className="h-3.5 w-3.5 text-ink2" aria-hidden />
          <span className="sr-only">Demo clock: </span>
          {fmtDateTime(state.now)}
        </span>
        <AdvanceMenu now={state.now} onAdvance={(to) => dispatch({ type: "ADVANCE", to })} />
        {needsScan && (
          <Button size="sm" onClick={() => dispatch({ type: "RUN_SCAN" })}>
            <Play className="h-3.5 w-3.5" aria-hidden />
            Run 08:00 scan
          </Button>
        )}
        <div className="ml-auto">
          <ResetButton onReset={() => dispatch({ type: "RESET" })} />
        </div>
      </div>
    </header>
  );
}

function RoleSwitcher({ role, onChange }: { role: Role; onChange: (r: Role) => void }) {
  return (
    <div className="inline-flex border border-line-strong" role="radiogroup" aria-label="Role">
      {ROLES.map((r) => (
        <button
          key={r.role}
          type="button"
          role="radio"
          aria-checked={role === r.role}
          aria-label={r.label}
          title={r.label}
          onClick={() => role !== r.role && onChange(r.role)}
          className={cx(
            "h-7 px-3 text-xs font-medium transition-colors [&+&]:border-l [&+&]:border-line-strong",
            role === r.role ? "bg-navy text-white" : "bg-surface text-ink2 hover:bg-canvas hover:text-ink",
          )}
        >
          {r.short}
        </button>
      ))}
    </div>
  );
}

function AdvanceMenu({ now, onAdvance }: { now: string; onAdvance: (to: string) => boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="sm:relative">
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
    <div className="absolute inset-x-4 top-full z-40 mt-1.5 border sm:inset-x-auto sm:left-0 sm:w-80 border-line-strong bg-surface p-1.5">
      <div className="px-2 pb-1 pt-1.5 text-xs text-ink2">Demo stops</div>
      {DEMO_STOPS.map((stop) => {
        const passed = stop.at <= now;
        return (
          <button
            key={stop.at}
            type="button"
            disabled={passed}
            onClick={() => onPick(stop.at)}
            className={cx(
              "flex h-8 w-full items-center justify-between gap-2 px-2 text-left text-[13px]",
              passed ? "cursor-not-allowed text-ink3" : "text-ink hover:bg-navy-soft",
            )}
          >
            <span>{stop.label}</span>
            {passed && <span className="font-mono text-[11px]">passed</span>}
          </button>
        );
      })}
      <div className="mt-1.5 border-t border-hairline px-2 pb-1.5 pt-2.5">
        <label className="mb-1 block text-xs text-ink2" htmlFor="advance-custom">
          Custom time
        </label>
        <div className="flex items-center gap-2">
          <input
            id="advance-custom"
            type="datetime-local"
            value={custom}
            min={now}
            onChange={(e) => setCustom(e.target.value.slice(0, 16))}
            className="h-8 min-w-0 flex-1 rounded-[2px] border border-line-strong bg-surface px-2 font-mono text-xs text-ink"
          />
          <Button size="sm" disabled={!valid} onClick={() => onPick(custom)}>
            Advance
          </Button>
        </div>
        <p className="mt-1.5 text-[11px] text-ink2">Forward only. Each 08:00 passed runs its scan.</p>
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
    <Button size="sm" variant={armed ? "danger" : "ghost"} onClick={click} className={armed ? "" : "text-ink2 hover:bg-hairline"}>
      <RotateCcw className="h-3.5 w-3.5" aria-hidden />
      {/* On a phone the idle button is icon-only; its accessible name stays "Reset demo". */}
      {armed ? "Click again to reset" : <span className="sr-only sm:not-sr-only">Reset demo</span>}
    </Button>
  );
}
