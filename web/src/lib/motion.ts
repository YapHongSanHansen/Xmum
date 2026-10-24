"use client";
// Small motion hooks for the presentation layer only. Nothing here reads or
// changes engine state; every hook settles on the exact value it was given.
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReduced(onChange: () => void) {
  const mq = window.matchMedia(REDUCED_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

/** True when the visitor asked for reduced motion. False on the server. */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia(REDUCED_QUERY).matches,
    () => false,
  );
}

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Animates a number towards `target` with requestAnimationFrame (ease-out).
 * The first render (server and hydration) returns `target` so markup matches;
 * after mount it counts up from `from` (default 0), and on later changes it
 * animates from the value on screen to the new target. Under reduced motion it
 * always returns `target`. The last frame is exactly `target`.
 */
export function useCountUp(target: number, { duration = 700, from = 0 }: { duration?: number; from?: number } = {}): number {
  const reduced = usePrefersReducedMotion();
  const [display, setDisplay] = useState(target);
  const current = useRef(from);

  useEffect(() => {
    if (reduced) {
      current.current = target;
      return;
    }
    const start = current.current;
    if (start === target) {
      const id = requestAnimationFrame(() => setDisplay(target));
      return () => cancelAnimationFrame(id);
    }
    let raf = 0;
    let t0: number | null = null;
    const tick = (now: number) => {
      if (t0 === null) t0 = now;
      const t = Math.min(1, (now - t0) / duration);
      const v = t >= 1 ? target : start + (target - start) * easeOut(t);
      current.current = v;
      setDisplay(v);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, reduced]);

  return reduced ? target : display;
}

/** Last value seen per memory key, so a change made on another page still flashes on return. */
const MEMORY = new Map<string, unknown>();

/**
 * Returns a `key` and `className` that retrigger a one-shot animation
 * (`.k-flash` by default) whenever `value` changes. Put both on the element:
 * the new key remounts it so the animation plays again.
 *
 * `memory` remembers the last value across unmounts (module scope, client
 * only), so a value that changed while the component was off screen flashes
 * once when it comes back. `when(prev, next)` limits which changes flash.
 */
export function useFlashOnChange<T>(
  value: T,
  { className = "k-flash", memory, when }: { className?: string; memory?: string; when?: (prev: T, next: T) => boolean } = {},
): { key: string; className: string } {
  const [seen, setSeen] = useState(() => {
    const remembered = memory !== undefined && MEMORY.has(memory) ? (MEMORY.get(memory) as T) : value;
    const flash = !Object.is(remembered, value) && (when ? when(remembered, value) : true);
    return { value, count: flash ? 1 : 0 };
  });
  if (!Object.is(seen.value, value)) {
    const flash = when ? when(seen.value, value) : true;
    setSeen({ value, count: flash ? seen.count + 1 : seen.count });
  }
  useEffect(() => {
    if (memory !== undefined) MEMORY.set(memory, value);
  }, [memory, value]);
  return { key: String(seen.count), className: seen.count > 0 ? className : "" };
}
