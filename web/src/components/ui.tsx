"use client";
import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";

export const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ");
/** Inline style that sets the stagger index read by `.k-rise`, `.k-grow-*` and `.k-pop`. */
export const stagger = (i: number, step?: string): CSSProperties =>
  ({ "--i": i, ...(step ? { "--k-step": step } : {}) }) as CSSProperties;
type Variant = "primary" | "secondary" | "ghost" | "danger";
export function Button({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md" }) {
  return <button type={type} className={cx("btn", `btn-${variant}`, `btn-${size}`, className)} {...props} />;
}
/** `rise` (a stagger index) makes the card fade and rise in on mount. */
export function Card({
  children,
  className,
  tone,
  rise,
  ...data
}: {
  children: ReactNode;
  className?: string;
  tone?: "warn" | "bad" | "good" | "ai";
  rise?: number;
} & { [attr: `data-${string}`]: string | undefined }) {
  return (
    <div
      {...data}
      className={cx("panel", tone && `panel-${tone}`, rise !== undefined && "k-rise", className)}
      style={rise !== undefined ? stagger(rise) : undefined}
    >
      {children}
    </div>
  );
}
export function CardHeader({ title, kicker, right }: { title: ReactNode; kicker?: ReactNode; right?: ReactNode }) {
  return (
    <div className="panel-header">
      <div className="min-w-0">
        {kicker && <div className="mb-1 text-xs text-ink2">{kicker}</div>}
        <h2 className="panel-title">{title}</h2>
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}
type Tone = "slate" | "emerald" | "amber" | "rose" | "sky" | "violet";
export function Badge({
  children,
  tone = "slate",
  className,
  pulse,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
  /** Soft pulsing dot, for "Live" states only. */
  pulse?: boolean;
}) {
  const tones: Record<Tone, string> = {
    slate: "bg-hairline text-ink2",
    emerald: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-800",
    rose: "bg-rose-100 text-rose-700",
    sky: "bg-sky-100 text-sky-700",
    violet: "bg-violet-100 text-violet-800",
  };
  return (
    <span
      className={cx(
        "inline-flex min-h-6 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium leading-tight",
        tones[tone],
        className,
      )}
    >
      <span className={cx("h-1.5 w-1.5 shrink-0 rounded-full bg-current", pulse && "k-pulse")} aria-hidden />
      {children}
    </span>
  );
}
export function RuleTag({ id }: { id: string }) {
  return (
    <span
      title={`Decision rule ${id}`}
      className="inline-flex h-5 items-center rounded-md border border-line px-1.5 font-mono text-[10px] text-ink2"
    >
      {id}
    </span>
  );
}
export function PageTitle({
  title,
  subtitle,
  right,
  eyebrow,
}: {
  title: string;
  subtitle?: ReactNode;
  right?: ReactNode;
  eyebrow?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div className="min-w-0">
        {eyebrow && <div className="mb-2 text-xs text-ink2">{eyebrow}</div>}
        <h1>{title}</h1>
        {subtitle && <p className="mt-2.5 max-w-2xl text-[13px] text-ink2">{subtitle}</p>}
      </div>
      {right && <div className="flex flex-wrap items-center gap-2">{right}</div>}
    </div>
  );
}
export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line-strong bg-white/40 px-5 py-10 text-center text-[13px] leading-relaxed text-ink2">
      {children}
    </div>
  );
}
export function NavyPanel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("flex flex-col gap-3 rounded-3xl bg-navy p-6 text-white", className)}>{children}</div>;
}
export function NavyRow({ k, v, total }: { k: ReactNode; v: ReactNode; total?: boolean }) {
  return (
    <div className={cx("flex justify-between gap-3 text-sm tabular-nums", total && "border-t border-white/20 pt-3 text-lg font-medium")}>
      <span className="text-navy-muted">{k}</span>
      <span>{v}</span>
    </div>
  );
}
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
  return <span className={cx("figure", `figure-${size}`, tones[tone], className)}>{children}</span>;
}
export function MetricRow({ items }: { items: { label: string; value: ReactNode; detail?: string }[] }) {
  return (
    <dl className="metric-row">
      {items.map((item, i) => (
        <div className="panel metric-tile k-rise" style={stagger(i)} key={item.label}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
          {item.detail && <p className="mt-2 text-xs text-ink2">{item.detail}</p>}
        </div>
      ))}
    </dl>
  );
}
export const tbl = {
  wrap: "relative overflow-x-auto rounded-b-3xl",
  table: "w-full border-collapse text-left text-[13px]",
  headRow: "h-11 border-b border-line bg-[#f0f1f4]/70",
  th: "whitespace-nowrap px-4 text-[11px] font-normal text-ink2 first:pl-6 last:pr-6",
  row: "h-16 border-b border-hairline last:border-b-0",
  td: "px-4 py-3 align-middle first:pl-6 last:pr-6",
};
