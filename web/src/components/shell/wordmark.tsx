"use client";
// Kutip wordmark: the team's own square mark plus the product name.

export function Wordmark({ dark = false }: { dark?: boolean }) {
  return (
    <span className="inline-flex select-none items-center gap-2">
      <span
        className={
          dark
            ? "grid h-5 w-5 place-items-center bg-white text-[12px] font-semibold leading-none text-navy"
            : "grid h-5 w-5 place-items-center bg-navy text-[12px] font-semibold leading-none text-white"
        }
        aria-hidden
      >
        K
      </span>
      <span className={dark ? "text-[15px] font-semibold tracking-tight text-white" : "text-[15px] font-semibold tracking-tight text-ink"}>Kutip</span>
    </span>
  );
}
