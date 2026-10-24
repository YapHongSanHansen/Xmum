"use client";
// Shared UI primitives in the team's "Ledger" style (see globals.css):
// navy accent, 2px corners, hairline borders, no shadows, mono numbers.
// Status colours: emerald = ready/good, amber = needs attention,
// rose = shortfall or refusal, sky = AI / received, violet = owner.
import type { ButtonHTMLAttributes, ReactNode } from "react";

export const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ");

type Variant = "primary" | "secondary" | "ghost" | "danger";

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md" }) {
  const styles: Record<Variant, string> = {
    primary: "border border-navy bg-navy text-white hover:border-navy-hover hover:bg-navy-hover",
    secondary: "border border-line-strong bg-white text-ink hover:bg-canvas",
    ghost: "border border-transparent text-navy hover:bg-canvas hover:text-ink",
    danger: "border border-rose-700 bg-white text-rose-700 hover:bg-rose-50",
  };
  return (
    <button
      className={cx(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[2px] font-medium leading-none transition-[background,border-color,color,transform] duration-100 active:scale-[0.985]",
        "disabled:cursor-not-allowed disabled:border-[#e6e8ec] disabled:bg-[#e6e8ec] disabled:text-ink3 disabled:active:scale-100",
        size === "sm" ? "h-7 px-2.5 text-xs" : "h-[34px] px-3.5 text-[13px]",
        styles[variant],
        className,
      )}
      {...props}
    />
  );
}

export function Card({ children, className, tone }: { children: ReactNode; className?: string; tone?: "warn" | "bad" | "good" | "ai" }) {
  // Ledger panels are flat: one border, white surface; tone adds a left rule only.
  const tones = {
    warn: "border-l-[3px] border-l-amber-800",
    bad: "border-l-[3px] border-l-rose-700",
    good: "border-l-[3px] border-l-emerald-700",
    ai: "border-l-[3px] border-l-sky-700",
  };
  return <div className={cx("border border-line bg-surface", tone && tones[tone], className)}>{children}</div>;
}

export function CardHeader({ title, kicker, right }: { title: ReactNode; kicker?: ReactNode; right?: ReactNode }) {
  // One short sans title per card. The optional kicker is a quiet sans line above it.
  return (
    <div className="flex items-start justify-between gap-3 border-b border-hairline px-5 py-4">
      <div className="min-w-0">
        {kicker && <div className="mb-0.5 text-xs text-ink2">{kicker}</div>}
        <div className="text-[14px] font-semibold tracking-[-0.005em] text-ink">{title}</div>
      </div>
      {right}
    </div>
  );
}

type Tone = "slate" | "emerald" | "amber" | "rose" | "sky" | "violet";

/** Ledger status pill: square dot, flat fill, 22px tall. Used sparingly. */
export function Badge({ children, tone = "slate", className }: { children: ReactNode; tone?: Tone; className?: string }) {
  const tones: Record<Tone, string> = {
    slate: "bg-hairline text-ink2",
    emerald: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-800",
    rose: "bg-rose-100 text-rose-700",
    sky: "bg-sky-100 text-sky-700",
    violet: "bg-navy-soft text-navy",
  };
  return (
    <span
      className={cx(
        "inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-[2px] px-2 text-[11px] font-medium",
        "before:block before:h-1.5 before:w-1.5 before:bg-current before:content-['']",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Rule ID chip, e.g. <RuleTag id="R3" />. Every automated decision shows one (NFR-1). */
export function RuleTag({ id }: { id: string }) {
  return (
    <span className="inline-flex h-[18px] items-center rounded-[2px] border border-line px-1.5 font-mono text-[10px] font-medium text-navy">
      {id}
    </span>
  );
}

/**
 * Page heading: just the title. `eyebrow` and `subtitle` stay optional for callers
 * and render as one quiet muted line; the header already shows workspace, clock and role.
 */
export function PageTitle({ title, subtitle, right, eyebrow }: { title: string; subtitle?: ReactNode; right?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
      <div className="min-w-0 max-w-[640px]">
        {eyebrow && <div className="mb-1 text-xs text-ink2">{eyebrow}</div>}
        <h1 className="text-[22px] font-semibold leading-[1.2] tracking-[-0.015em] text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-xs text-ink2 [text-wrap:pretty]">{subtitle}</p>}
      </div>
      {right && <div className="flex items-center gap-2">{right}</div>}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  // Empty states teach the next step, so the copy keeps AA contrast (ink2, not the disabled ink3).
  return <div className="border border-dashed border-line px-5 py-8 text-center text-[13px] text-ink2">{children}</div>;
}

/** Ledger navy summary panel: mono label/value rows on the accent colour. */
export function NavyPanel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("flex flex-col gap-3 bg-navy p-5 text-white", className)}>{children}</div>;
}

export function NavyRow({ k, v, total }: { k: ReactNode; v: ReactNode; total?: boolean }) {
  return (
    <div className={cx("flex justify-between gap-3 font-mono text-xs tabular-nums", total && "border-t border-white/20 pt-2 text-base font-medium")}>
      <span className="font-sans text-navy-muted">{k}</span>
      <span>{v}</span>
    </div>
  );
}

/** Big mono figure (Ledger "amount"): money that matters on a page. */
export function Figure({
  children,
  tone = "ink",
  size = "lg",
  className,
}: {
  children: ReactNode;
  tone?: "ink" | "bad" | "good" | "white";
  size?: "md" | "lg";
  className?: string;
}) {
  const tones = { ink: "text-ink", bad: "text-rose-700", good: "text-emerald-700", white: "text-white" };
  return (
    <span
      className={cx(
        "font-mono font-medium leading-none tracking-[-0.02em] tabular-nums",
        size === "lg" ? "text-[28px]" : "text-[20px]",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * Ledger table cells: 30px header row, 38px body rows, hairline dividers.
 * Put `num` (or `num text-right`) on cells that hold figures.
 */
export const tbl = {
  /** Wrapper that lets a wide table scroll sideways on a phone. */
  wrap: "overflow-x-auto",
  table: "w-full border-collapse text-left text-[13px]",
  headRow: "h-[30px] border-b border-line",
  th: "whitespace-nowrap px-3 align-middle text-xs font-normal text-ink2 first:pl-4 last:pr-4",
  row: "h-[38px] border-b border-hairline last:border-b-0",
  td: "px-3 py-2 align-middle first:pl-4 last:pr-4",
};
