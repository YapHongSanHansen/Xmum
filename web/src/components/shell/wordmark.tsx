export function Wordmark({ dark = false }: { dark?: boolean }) {
  return (
    <span className="inline-flex select-none items-center gap-2.5">
      <span
        aria-hidden
        className="grid h-8 w-8 place-items-center rounded-[9px] border border-amber-300 bg-gradient-to-br from-[#ffc84b] to-[#ee8a0b] text-white shadow-[0_3px_8px_#ed9b2430]"
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
          <path d="M5 4h14v16H5V4Zm1 14L18 6M8 12l9 7" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      </span>
      <span className={`text-[27px] font-semibold tracking-[-.06em] ${dark ? "text-white" : "text-ink"}`}>kutip</span>
    </span>
  );
}
