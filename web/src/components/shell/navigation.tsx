"use client";
import { useKachingg, type Page } from "@/lib/store";
import { inboxCount } from "./counts";
import { approvalsCount } from "@/components/pages/approvals";
const PAGES: { key: Page; label: string }[] = [
  { key: "today", label: "Overview" },
  { key: "bookings", label: "Bookings" },
  { key: "inbox", label: "Bukti inbox" },
  { key: "approvals", label: "Approvals" },
  { key: "log", label: "Activity" },
  { key: "connect", label: "Connect" },
  { key: "usage", label: "Usage" },
];
export function Navigation() {
  const page = useKachingg((s) => s.page);
  const go = useKachingg((s) => s.go);
  const inbox = useKachingg((s) => inboxCount(s.state));
  const approvals = useKachingg((s) => approvalsCount(s.state));
  return (
    <nav className="top-nav" aria-label="Kachingg">
      {PAGES.map(({ key, label }) => {
        const count = key === "inbox" ? inbox : key === "approvals" ? approvals : 0;
        return (
          <button
            type="button"
            key={key}
            onClick={() => go(key)}
            className="nav-item"
            data-active={page === key}
            data-tour={`nav-${key}`}
            aria-current={page === key ? "page" : undefined}
          >
            {label}
            {count > 0 && <span className="nav-count">{count}</span>}
          </button>
        );
      })}
    </nav>
  );
}
