"use client";
// The team's own placeholder wordmark for the simulated hub. Not Orbyte's logo.

export function Wordmark({ dark = false }: { dark?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 select-none" aria-label="Orbyte (simulated)">
      <span className={dark ? "grid h-5 w-5 place-items-center border-2 border-white/80" : "grid h-5 w-5 place-items-center border-2 border-navy"}>
        <span className={dark ? "h-1.5 w-1.5 bg-white" : "h-1.5 w-1.5 bg-navy"} />
      </span>
      <span className={dark ? "text-[15px] font-semibold tracking-tight text-white" : "text-[15px] font-semibold tracking-tight text-ink"}>Orbyte</span>
    </span>
  );
}
