"use client";
// Kutip's page navigation. Light Ledger frame: the active item carries a navy rule.
// Below the lg breakpoint the same items render as one sideways-scrolling strip
// under the header.
import type { ComponentType, ReactNode } from "react";
import { BookOpen, ClipboardCheck, Coins, Inbox, LayoutDashboard, Plug, ScrollText, Truck } from "lucide-react";
import { cx } from "@/components/ui";
import { useKutip, type Page } from "@/lib/store";
import { inboxCount } from "./counts";
import { approvalsCount } from "@/components/pages/approvals";

type Icon = ComponentType<{ className?: string }>;

/** Accessible name of both navigation landmarks (sidebar and phone strip). */
const NAV_LABEL = "Kutip";

interface NavItem {
  key: Page;
  label: string;
  icon: Icon;
  right?: ReactNode;
}

/** Square mono count, e.g. pending approvals or unread messages. */
function Count({ n, tone }: { n: number; tone: "navy" | "amber" }) {
  return (
    <span
      className={cx(
        "inline-flex h-[18px] min-w-[18px] items-center justify-center px-1 font-mono text-[11px] font-medium tabular-nums",
        tone === "navy" ? "bg-navy text-white" : "bg-amber-100 text-amber-800",
      )}
    >
      {n}
    </span>
  );
}

function useNav() {
  const count = useKutip((s) => inboxCount(s.state));
  const approvals = useKutip((s) => approvalsCount(s.state));
  const pages: NavItem[] = [
    { key: "today", label: "Today", icon: LayoutDashboard },
    { key: "bookings", label: "Bookings", icon: Truck },
    { key: "inbox", label: "Inbox (Bukti)", icon: Inbox, right: count > 0 ? <Count n={count} tone="amber" /> : null },
    { key: "approvals", label: "Approvals", icon: ClipboardCheck, right: approvals > 0 ? <Count n={approvals} tone="navy" /> : null },
    { key: "log", label: "Activity log", icon: ScrollText },
    { key: "connect", label: "Connect", icon: Plug },
    { key: "usage", label: "Usage & credits", icon: Coins },
  ];
  const guide: NavItem = { key: "guide", label: "Demo guide", icon: BookOpen };
  return { pages, guide };
}

export function Sidebar() {
  const { pages, guide } = useNav();
  return (
    <nav className="hidden w-52 shrink-0 flex-col border-r border-line bg-surface lg:flex" aria-label={NAV_LABEL}>
      <div className="flex-1 space-y-0.5 overflow-y-auto px-2 py-4">
        {pages.map((it) => (
          <Item key={it.key} item={it} />
        ))}
      </div>
      <div className="border-t border-hairline px-2 py-2">
        <Item item={guide} />
      </div>
    </nav>
  );
}

/** Phone and tablet: the same pages as one scrolling strip. */
export function ModuleStrip() {
  const { pages, guide } = useNav();
  const page = useKutip((s) => s.page);
  const go = useKutip((s) => s.go);
  return (
    <nav className="shrink-0 border-b border-line bg-surface lg:hidden" aria-label={NAV_LABEL}>
      <div className="flex gap-5 overflow-x-auto px-4 [scrollbar-width:none]">
        {[...pages, guide].map((it) => {
          const active = page === it.key;
          return (
            <button
              key={it.key}
              type="button"
              onClick={() => go(it.key)}
              aria-current={active ? "page" : undefined}
              className={cx(
                "relative inline-flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap text-[13px] transition-colors",
                active ? "font-medium text-ink" : "text-ink2 hover:text-ink",
              )}
            >
              {it.label}
              {it.right}
              {active && <span className="absolute inset-x-0 bottom-0 h-[2px] bg-navy" aria-hidden />}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function Item({ item }: { item: NavItem }) {
  const page = useKutip((s) => s.page);
  const go = useKutip((s) => s.go);
  const { key, icon: IconCmp, label, right } = item;
  const active = page === key;
  return (
    <button
      type="button"
      onClick={() => go(key)}
      aria-current={active ? "page" : undefined}
      className={cx(
        "relative flex h-9 w-full items-center gap-2.5 px-3 text-left text-[13px] transition-colors",
        active ? "bg-canvas font-medium text-ink" : "text-ink2 hover:bg-canvas hover:text-ink",
      )}
    >
      {/* Navy active rule (Ledger tab line, turned vertical). */}
      {active && <span className="absolute inset-y-1.5 left-0 w-[2px] bg-navy" aria-hidden />}
      <IconCmp className={cx("h-4 w-4 shrink-0", active ? "text-navy" : "text-ink2")} />
      <span className="flex-1 truncate">{label}</span>
      {right}
    </button>
  );
}
