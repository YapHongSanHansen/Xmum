import { useId } from "react";

// The Kachingg mark (docs/brand/kachingg-mark.svg) inline, so it scales with the
// text. The gradient id comes from useId so two marks on one page never clash.
export function Wordmark({ dark = false }: { dark?: boolean }) {
  const gradientId = `kachingg-mark-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <span className="inline-flex select-none items-center gap-2.5">
      <svg
        aria-hidden
        viewBox="0 0 64 64"
        className="h-8 w-8 shrink-0 drop-shadow-[0_3px_8px_#ed9b2430]"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffc84b" />
            <stop offset="1" stopColor="#ee8a0b" />
          </linearGradient>
        </defs>
        <rect width="64" height="64" rx="16" fill={`url(#${gradientId})`} />
        <circle cx="29" cy="35" r="16" fill="none" stroke="#fff" strokeWidth="4.5" />
        <path
          d="M24 26v18M24 35l9-9M27 33l7 11"
          fill="none"
          stroke="#fff"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M47 9v6M53.5 15.5l-4 4M57 23h-6" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" />
      </svg>
      <span className={`text-[27px] font-semibold tracking-[-.06em] ${dark ? "text-white" : "text-ink"}`}>kachingg</span>
    </span>
  );
}
