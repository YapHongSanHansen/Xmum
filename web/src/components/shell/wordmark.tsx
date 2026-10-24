"use client";
// The team's own placeholder wordmark for the simulated hub. Not Orbyte's logo.

export function Wordmark({ dark = false }: { dark?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 select-none" aria-label="Orbyte (simulated)">
      <span
        className={
          dark
            ? "grid h-6 w-6 place-items-center rounded-full border-2 border-white/80"
            : "grid h-6 w-6 place-items-center rounded-full border-2 border-slate-900"
        }
      >
        <span className={dark ? "h-1.5 w-1.5 rounded-full bg-emerald-400" : "h-1.5 w-1.5 rounded-full bg-emerald-500"} />
      </span>
      <span className={dark ? "text-[15px] font-semibold tracking-tight text-white" : "text-[15px] font-semibold tracking-tight text-slate-900"}>
        Orbyte
      </span>
    </span>
  );
}
