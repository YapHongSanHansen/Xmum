"use client";
// Top bar: Kutip, the workspace, the demo disclosure and the role switch;
// below it the demo controls (FR-H1, FR-A7, FR-F1).
import { useRef, useState } from "react";
import { Bell, BookOpen, Building2, ChevronDown, Clock, FastForward, Play, RotateCcw } from "lucide-react";
import { Button, cx } from "@/components/ui";
import { dayOf, fmtDateTime, type Role } from "@/engine/model";
import { DEMO_STOPS } from "@/engine/seed";
import { useKutip } from "@/lib/store";
import { Wordmark } from "./wordmark";
import { Navigation } from "./navigation";
import { approvalsCount } from "@/components/pages/approvals";

// `label` is the accessible name; `short` is what the switch shows.
const ROLES: { role: Role; label: string; short: string }[] = [
  { role: "owner", label: "Lim Siew Lan · Owner", short: "Owner" },
  { role: "clerk", label: "Nurul · Clerk", short: "Clerk" },
];

export function Header() {
  const state = useKutip((s) => s.state);
  const dispatch = useKutip((s) => s.dispatch);
  const go = useKutip((s) => s.go);
  const needsScan = !state.scannedDays.includes(dayOf(state.now));
  const pending = approvalsCount(state);
  return (
    <header className="app-header">
      <div className="header-main">
        <button type="button" onClick={() => go("today")} aria-label="Kutip overview">
          <Wordmark />
        </button>
        <Navigation />
        <div className="header-profile flex shrink-0 items-center gap-2.5">
          <button
            type="button"
            className="icon-button relative"
            onClick={() => go("approvals")}
            aria-label={`Approvals, ${pending} pending`}
          >
            <Bell className="h-[18px] w-[18px]" />
            {pending > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-canvas bg-[#f2783c]" />}
          </button>
          <div
            className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-[#fed987] via-[#c9d7ef] to-[#6885c1] p-[2px]"
            aria-hidden
          >
            <span className="grid h-full w-full place-items-center rounded-full border-2 border-white bg-[#e9e8e5] text-xs font-medium">
              {state.role === "owner" ? "SL" : "NU"}
            </span>
          </div>
        </div>
      </div>
      <div className="header-context">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
          <span className="flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5" aria-hidden />
            {state.business.name}
          </span>
          <span className="rounded-full bg-white px-2 py-1 text-[10px]">Demo · synthetic data</span>
          <RoleSwitcher role={state.role} onChange={(role) => dispatch({ type: "SET_ROLE", role })} />
        </div>
        <div className="demo-tools">
          <span className="mr-1 inline-flex items-center gap-1.5 tabular-nums" title="Demo clock">
            <Clock className="h-3.5 w-3.5" aria-hidden />
            <span className="sr-only">Demo clock: </span>
            {fmtDateTime(state.now)}
          </span>
          <AdvanceMenu now={state.now} onAdvance={(to) => dispatch({ type: "ADVANCE", to })} />
          {needsScan && (
            <Button size="sm" variant="ghost" onClick={() => dispatch({ type: "RUN_SCAN" })}>
              <Play className="h-3 w-3" aria-hidden />
              Scan
            </Button>
          )}
          <button type="button" onClick={() => go("guide")} className="btn btn-ghost btn-sm" aria-label="Demo guide">
            <BookOpen className="h-3.5 w-3.5" aria-hidden />
            <span className="hidden sm:inline">Guide</span>
          </button>
          <ResetButton onReset={() => dispatch({ type: "RESET" })} />
        </div>
      </div>
    </header>
  );
}

function RoleSwitcher({ role, onChange }: { role: Role; onChange: (r: Role) => void }) {
  return (
    <div className="inline-flex gap-0.5 rounded-lg bg-[#e6e7eb] p-0.5" role="group" aria-label="Role">
      {ROLES.map((r) => (
        <button
          key={r.role}
          type="button"
          aria-pressed={role === r.role}
          aria-label={r.label}
          title={r.label}
          onClick={() => role !== r.role && onChange(r.role)}
          className={cx(
            "rounded-md px-2.5 py-1 text-[11px] transition-colors",
            role === r.role ? "bg-white text-ink shadow-sm" : "text-ink2 hover:text-ink",
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
    <div
      className="advance-menu relative"
      onKeyDown={(event) => {
        if (event.key === "Escape") setOpen(false);
      }}
    >
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
    <div className="advance-panel absolute right-0 top-full z-40 mt-2 w-[min(320px,85vw)] rounded-2xl border border-line bg-surface p-2 shadow-xl">
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
              "flex min-h-10 w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-left text-xs",
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
            className="h-8 min-w-0 flex-1 rounded-xl border border-line-strong bg-surface px-2 font-mono text-xs text-ink"
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
