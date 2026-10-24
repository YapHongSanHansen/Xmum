"use client";
import { useCountUp } from "@/lib/motion";

/**
 * A number that counts up to `value`. The real, final text is always in the
 * DOM (read by screen readers, copy and text checks) and sets the width, so
 * nothing shifts. While animating it is transparent and an aria-hidden
 * overlay paints the in-between figure through CSS generated content.
 */
export function CountUp({ value, format, duration }: { value: number; format: (v: number) => string; duration?: number }) {
  const shown = useCountUp(value, { duration });
  const final = format(value);
  const live = format(shown);
  const animating = live !== final;
  return (
    <span className="k-count" data-animating={animating || undefined}>
      <span className="k-count-final">{final}</span>
      {animating && <span className="k-count-live" aria-hidden data-v={live} />}
    </span>
  );
}
