"use client";
// Shared UI primitives. Palette: slate for structure, emerald = Kutip / good,
// amber = needs attention, rose = shortfall or refusal, sky = AI.
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
    primary: "bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-emerald-300",
    secondary: "bg-white text-slate-800 ring-1 ring-slate-300 hover:bg-slate-50 disabled:text-slate-400",
    ghost: "text-slate-700 hover:bg-slate-100 disabled:text-slate-400",
    danger: "bg-rose-600 text-white hover:bg-rose-700 disabled:bg-rose-300",
  };
  return (
    <button
      className={cx(
        "inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors disabled:cursor-not-allowed",
        size === "sm" ? "h-7 px-2.5 text-xs" : "h-9 px-3.5 text-sm",
        styles[variant],
        className,
      )}
      {...props}
    />
  );
}

export function Card({ children, className, tone }: { children: ReactNode; className?: string; tone?: "warn" | "bad" | "good" | "ai" }) {
  const tones = {
    warn: "border-amber-300 bg-amber-50/60",
    bad: "border-rose-300 bg-rose-50/60",
    good: "border-emerald-300 bg-emerald-50/60",
    ai: "border-sky-300 bg-sky-50/60",
  };
  return <div className={cx("rounded-lg border bg-white shadow-sm", tone ? tones[tone] : "border-slate-200", className)}>{children}</div>;
}

export function CardHeader({ title, kicker, right }: { title: ReactNode; kicker?: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-200/80 px-4 py-3">
      <div>
        {kicker && <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{kicker}</div>}
        <div className="text-sm font-semibold text-slate-900">{title}</div>
      </div>
      {right}
    </div>
  );
}

export function Badge({ children, tone = "slate", className }: { children: ReactNode; tone?: "slate" | "emerald" | "amber" | "rose" | "sky" | "violet"; className?: string }) {
  const tones = {
    slate: "bg-slate-100 text-slate-700 ring-slate-200",
    emerald: "bg-emerald-100 text-emerald-800 ring-emerald-200",
    amber: "bg-amber-100 text-amber-800 ring-amber-200",
    rose: "bg-rose-100 text-rose-800 ring-rose-200",
    sky: "bg-sky-100 text-sky-800 ring-sky-200",
    violet: "bg-violet-100 text-violet-800 ring-violet-200",
  };
  return <span className={cx("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset", tones[tone], className)}>{children}</span>;
}

/** Rule ID chip, e.g. <RuleTag id="R3" />. Every automated decision shows one (NFR-1). */
export function RuleTag({ id }: { id: string }) {
  return <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-white">{id}</span>;
}

export function PageTitle({ title, subtitle, right }: { title: string; subtitle?: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">{children}</div>;
}
