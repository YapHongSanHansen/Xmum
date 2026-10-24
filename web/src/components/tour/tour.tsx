"use client";
// "Start tour": a spotlight walkthrough. Each step scrolls to one element,
// rings it and points an arrow at it; four fixed panels dim and blur the rest
// of the page, so the hole stays sharp and clickable. The tour only moves
// between pages and never changes demo data. Closed by default, not persisted.
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ArrowRight, Check, X } from "lucide-react";
import { Button } from "@/components/ui";
import { dayOf } from "@/engine/model";
import { useKachingg } from "@/lib/store";
import { useDialog } from "@/lib/use-dialog";
import { usePrefersReducedMotion } from "@/lib/motion";
import { TOUR_STEPS } from "./steps";

/** Space between the element and its ring. */
const PAD = 8;
/** Distance from the ring to the card; the arrow sits in this gap. */
const GAP = 46;
const CARD_W = 340;
const EDGE = 16;
/** At or below this width the card docks as a bottom sheet. */
const MOBILE = 640;
/** How long a step waits for its element before it is skipped. */
const WAIT_MS = 600;
/** Height kept free for the card when scrolling an element into view. */
const RESERVE = 250;

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}
interface Geometry {
  hole: Box | null;
  vw: number;
  vh: number;
  cardH: number;
}
interface Shown {
  index: number;
  el: HTMLElement | null;
  /** scannedDays.length when the interactive step opened. */
  scanBase: number;
}

const isVisible = (el: Element): el is HTMLElement => el instanceof HTMLElement && el.getClientRects().length > 0;
const findTarget = (selector: string) => Array.from(document.querySelectorAll(selector)).find(isVisible) ?? null;
const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi));
const sameBox = (a: Box | null, b: Box | null) =>
  a === b || (!!a && !!b && a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height);

/** Scroll the element into the part of the screen the card leaves free. */
function reveal(el: HTMLElement, smooth: boolean) {
  el.scrollIntoView({ block: "nearest", inline: "nearest" });
  const r = el.getBoundingClientRect();
  const free = window.innerHeight - RESERVE;
  const offset = r.height + 2 * PAD > free - 2 * EDGE ? EDGE + PAD + 8 : (free - r.height) / 2;
  window.scrollTo({ top: Math.max(0, window.scrollY + r.top - offset), behavior: smooth ? "smooth" : "auto" });
}

export function Tour() {
  const index = useKachingg((s) => s.tourStep);
  if (index === null) return null;
  return createPortal(<TourOverlay index={index} />, document.body);
}

function TourOverlay({ index }: { index: number }) {
  const role = useKachingg((s) => s.state.role);
  const scanCount = useKachingg((s) => s.state.scannedDays.length);
  const setTourStep = useKachingg((s) => s.setTourStep);
  const endTour = useKachingg((s) => s.endTour);
  const reduced = usePrefersReducedMotion();
  const dialogRef = useDialog<HTMLDivElement>(endTour);
  const nextRef = useRef<HTMLButtonElement>(null);
  const dir = useRef<1 | -1>(1);
  const [shown, setShown] = useState<Shown | null>(null);
  const [geom, setGeom] = useState<Geometry | null>(null);

  // Resolve the requested step: change page, wait for the element, scroll to
  // it. A step whose element is missing (e.g. Owner-only for the Clerk) is
  // skipped in the direction of travel.
  useEffect(() => {
    const step = TOUR_STEPS[index];
    const skip = () => {
      const n = index + dir.current;
      if (n >= TOUR_STEPS.length) endTour();
      else setTourStep(Math.max(0, n));
    };
    if (!step) {
      endTour();
      return;
    }
    const { state, page, go } = useKachingg.getState();
    if (step.ownerOnly && state.role !== "owner") {
      skip();
      return;
    }
    if (step.waitForScan && state.scannedDays.includes(dayOf(state.now))) {
      skip();
      return;
    }
    if (step.page && page !== step.page) go(step.page);
    const scanBase = state.scannedDays.length;
    const started = performance.now();
    let timer = 0;
    const poll = () => {
      if (!step.target) {
        setShown({ index, el: null, scanBase });
        return;
      }
      const el = findTarget(step.target);
      if (el) {
        reveal(el, !reduced);
        setShown({ index, el, scanBase });
      } else if (performance.now() - started > WAIT_MS) {
        skip();
      } else {
        timer = window.setTimeout(poll, 50);
      }
    };
    timer = window.setTimeout(poll, 0);
    return () => window.clearTimeout(timer);
    // `role` re-checks Owner-only steps if the role changes mid-tour.
  }, [index, role, reduced, endTour, setTourStep]);

  // Follow the element every frame: scrolling, resizing and content changes
  // (the scan swaps its button for a badge) all move the ring and card.
  useEffect(() => {
    if (!shown) return;
    const selector = TOUR_STEPS[shown.index]?.target;
    let node = shown.el;
    let raf = 0;
    const tick = () => {
      if (selector && (!node || !node.isConnected)) node = findTarget(selector);
      const r = node?.getBoundingClientRect();
      const hole = r
        ? {
            top: Math.round(r.top - PAD),
            left: Math.round(r.left - PAD),
            width: Math.round(r.width + 2 * PAD),
            height: Math.round(r.height + 2 * PAD),
          }
        : null;
      const cardH = dialogRef.current?.offsetHeight ?? 190;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      setGeom((prev) =>
        prev && sameBox(prev.hole, hole) && prev.vw === vw && prev.vh === vh && prev.cardH === cardH ? prev : { hole, vw, vh, cardH },
      );
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [shown, dialogRef]);

  const step = shown ? TOUR_STEPS[shown.index] : undefined;
  // Never render Owner-only copy for the Clerk, even for a frame.
  const allowed = step && !(step.ownerOnly && role !== "owner") ? step : undefined;
  const waiting = !!allowed?.waitForScan && !!shown && scanCount <= shown.scanBase;
  const last = index === TOUR_STEPS.length - 1;

  const next = useCallback(() => {
    if (waiting) return;
    dir.current = 1;
    if (last) endTour();
    else setTourStep(index + 1);
  }, [waiting, last, index, endTour, setTourStep]);
  const back = useCallback(() => {
    dir.current = -1;
    setTourStep(Math.max(0, index - 1));
  }, [index, setTourStep]);

  // Arrow keys move between steps; Esc is handled by useDialog. On the
  // interactive step, Tab from the last card button reaches the real button.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const t = event.target as HTMLElement | null;
      if (t?.closest("input, textarea, select")) return;
      if (event.key === "ArrowRight") {
        event.preventDefault();
        next();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        back();
      } else if (event.key === "Tab" && !event.shiftKey && waiting && shown?.el?.isConnected) {
        const buttons = dialogRef.current?.querySelectorAll<HTMLButtonElement>("button:not([disabled])");
        if (buttons && document.activeElement === buttons[buttons.length - 1]) {
          event.preventDefault();
          event.stopImmediatePropagation();
          shown.el.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [next, back, waiting, shown, dialogRef]);

  // Focus Next whenever a step appears or the scan unlocks it.
  useEffect(() => {
    if (shown && !waiting) nextRef.current?.focus({ preventScroll: true });
  }, [shown, waiting]);

  const applicable = TOUR_STEPS.filter((s) => !(s.ownerOnly && role !== "owner"));
  const position = allowed ? applicable.indexOf(allowed) + 1 : 0;
  const layout = geom ? place(geom) : null;
  const ready = !!allowed && !!layout;

  return (
    <div className="tour-root" data-reduced={reduced || undefined}>
      <Backdrop hole={layout?.hole ?? null} vw={geom?.vw ?? 0} vh={geom?.vh ?? 0} />
      {layout?.hole && (
        <div
          className="tour-ring"
          aria-hidden
          style={{ top: layout.hole.top, left: layout.hole.left, width: layout.hole.width, height: layout.hole.height }}
        />
      )}
      {ready && layout.arrow && (
        <svg
          className="tour-arrow"
          aria-hidden
          width="28"
          height="36"
          viewBox="0 0 28 36"
          style={{ left: layout.arrow.x, top: layout.arrow.y, transform: `translate(-50%, -50%) rotate(${layout.arrow.rotate}deg)` }}
        >
          <g className="tour-arrow-bob">
            <path d="M14 33V6" />
            <path d="M5 14l9-9 9 9" />
          </g>
        </svg>
      )}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        aria-describedby="tour-text"
        tabIndex={-1}
        className="tour-card"
        data-sheet={layout?.sheet || undefined}
        style={layout?.card ?? { visibility: "hidden" }}
      >
        <div aria-live="polite">
          {allowed && (
            <>
              <p className="font-mono text-[11px] text-ink2">
                {position} / {applicable.length}
              </p>
              <h2 id="tour-title" className="mt-1 text-[15px] font-semibold tracking-[-0.01em] text-ink">
                {allowed.title}
              </h2>
              <p id="tour-text" className="mt-1.5 text-[13px] leading-relaxed text-ink2">
                {allowed.waitForScan && !waiting && allowed.doneText ? allowed.doneText : allowed.text}
              </p>
            </>
          )}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button size="sm" variant="secondary" onClick={back} disabled={index === 0}>
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Back
          </Button>
          <button ref={nextRef} type="button" className="btn btn-primary btn-sm" onClick={next} disabled={waiting}>
            {last ? "Finish" : "Next"}
            {last ? <Check className="h-3.5 w-3.5" aria-hidden /> : <ArrowRight className="h-3.5 w-3.5" aria-hidden />}
          </button>
          <button type="button" onClick={endTour} className="btn btn-ghost btn-sm ml-auto text-ink2">
            <X className="h-3.5 w-3.5" aria-hidden />
            Skip tour
          </button>
        </div>
      </div>
    </div>
  );
}

/** Four panels around the hole; one full panel when the step has no element. */
function Backdrop({ hole, vw, vh }: { hole: Box | null; vw: number; vh: number }) {
  if (!hole) return <div className="tour-shade" style={{ top: 0, left: 0, width: "100vw", height: "100vh" }} />;
  const top = clamp(hole.top, 0, vh);
  const bottom = clamp(hole.top + hole.height, top, vh);
  const left = clamp(hole.left, 0, vw);
  const right = clamp(hole.left + hole.width, left, vw);
  const panels: CSSProperties[] = [
    { top: 0, left: 0, width: vw, height: top },
    { top: bottom, left: 0, width: vw, height: vh - bottom },
    { top, left: 0, width: left, height: bottom - top },
    { top, left: right, width: vw - right, height: bottom - top },
  ];
  return (
    <>
      {panels.map((style, i) => (
        <div key={i} className="tour-shade" style={style} />
      ))}
    </>
  );
}

interface Layout {
  hole: Box | null;
  card: CSSProperties;
  sheet: boolean;
  arrow: { x: number; y: number; rotate: number } | null;
}

/** Where the card and arrow go: below, above, beside, or a bottom sheet on phones. */
function place({ hole, vw, vh, cardH }: Geometry): Layout {
  const sheet = vw <= MOBILE;
  if (sheet) {
    const sheetTop = vh - cardH - 12;
    const card: CSSProperties = { left: 12, right: 12, bottom: 12 };
    const arrow =
      hole && hole.top + hole.height < sheetTop - 40
        ? { x: clamp(hole.left + hole.width / 2, 28, vw - 28), y: Math.min(sheetTop - 22, hole.top + hole.height + 24), rotate: 0 }
        : null;
    return { hole, card, sheet, arrow };
  }
  const w = Math.min(CARD_W, vw - 2 * EDGE);
  if (!hole) return { hole, sheet, arrow: null, card: { width: w, left: (vw - w) / 2, top: Math.max(EDGE, (vh - cardH) / 2) } };
  const cx = hole.left + hole.width / 2;
  const cy = hole.top + hole.height / 2;
  const bottom = hole.top + hole.height;
  const right = hole.left + hole.width;
  const left = clamp(cx - w / 2, EDGE, vw - w - EDGE);
  const top = clamp(cy - cardH / 2, EDGE, vh - cardH - EDGE);
  if (bottom + GAP + cardH <= vh - EDGE) {
    return { hole, sheet, card: { width: w, left, top: bottom + GAP }, arrow: { x: clamp(cx, left + 24, left + w - 24), y: bottom + GAP / 2, rotate: 0 } };
  }
  if (hole.top - GAP - cardH >= EDGE) {
    return {
      hole,
      sheet,
      card: { width: w, left, top: hole.top - GAP - cardH },
      arrow: { x: clamp(cx, left + 24, left + w - 24), y: hole.top - GAP / 2, rotate: 180 },
    };
  }
  if (right + GAP + w <= vw - EDGE) {
    return { hole, sheet, card: { width: w, left: right + GAP, top }, arrow: { x: right + GAP / 2, y: clamp(cy, top + 24, top + cardH - 24), rotate: -90 } };
  }
  if (hole.left - GAP - w >= EDGE) {
    return {
      hole,
      sheet,
      card: { width: w, left: hole.left - GAP - w, top },
      arrow: { x: hole.left - GAP / 2, y: clamp(cy, top + 24, top + cardH - 24), rotate: 90 },
    };
  }
  // No room beside a very large element: dock in the corner, without an arrow.
  return { hole, sheet, arrow: null, card: { width: w, right: EDGE + 8, bottom: EDGE + 8 } };
}
