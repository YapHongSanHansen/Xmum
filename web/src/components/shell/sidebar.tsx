"use client";
// Module sidebar (PRD FR-O1): Orbyte's existing modules for context, Kutip as the new one.
// Light Ledger frame: the active item carries a navy rule. Below the lg breakpoint the
// same items render as one sideways-scrolling strip under the header.
import type { ComponentType, ReactNode } from "react";
import {
  BookOpen,
  Briefcase,
  House,
  Inbox,
  LayoutDashboard,
  Plug,
  ScrollText,
  Signature,
  Truck,
  UserPlus,
  Users,
  Wallet,
  ClipboardCheck,
  Coins,
} from "lucide-react";
import { cx } from "@/components/ui";
import { useKutip, type Page } from "@/lib/store";
import { inboxCount } from "./counts";
import { approvalsCount } from "@/components/pages/approvals";

type Icon = ComponentType<{ className?: string }>;

const PEOPLE_CHILDREN = ["eLeave", "eClaim", "eOT", "Attendance"];

interface NavItem {
  key: string;
  label: string;
  icon?: Icon;
  active: boolean;
  onClick: () => void;
  right?: ReactNode;
  strong?: boolean;
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
  const page = useKutip((s) => s.page);
  const moduleName = useKutip((s) => s.moduleName);
  const go = useKutip((s) => s.go);
  const count = useKutip((s) => inboxCount(s.state));
  const approvals = useKutip((s) => approvalsCount(s.state));

  const isModule = (name: string) => page === "module" && moduleName === name;
  const kutipPages: Page[] = ["today", "bookings", "inbox", "log", "usage"];
  const mod = (name: string, icon?: Icon): NavItem => ({ key: name, label: name, icon, active: isModule(name), onClick: () => go("module", name) });

  return {
    home: mod("Home", House),
    people: mod("People", Users),
    peopleChildren: PEOPLE_CHILDREN.map((name) => mod(name)),
    rest: [
      mod("Work", Briefcase),
      mod("eSign", Signature),
      mod("Hiring", UserPlus),
      { key: "connect", label: "Connect", icon: Plug, active: page === "connect", onClick: () => go("connect") },
      {
        key: "approvals",
        label: "Approvals",
        icon: ClipboardCheck,
        active: page === "approvals",
        onClick: () => go("approvals"),
        right: approvals > 0 ? <Count n={approvals} tone="navy" /> : null,
      },
    ] as NavItem[],
    kutip: {
      key: "kutip",
      label: "Kutip",
      icon: Wallet,
      active: kutipPages.includes(page),
      strong: true,
      onClick: () => go("today"),
      right: <span className="inline-flex h-[18px] items-center bg-emerald-100 px-1.5 font-mono text-[10px] font-medium text-emerald-700">new</span>,
    } as NavItem,
    kutipChildren: [
      { key: "today", label: "Today", icon: LayoutDashboard, active: page === "today", onClick: () => go("today") },
      { key: "bookings", label: "Bookings", icon: Truck, active: page === "bookings", onClick: () => go("bookings") },
      {
        key: "inbox",
        label: "Inbox (Bukti)",
        icon: Inbox,
        active: page === "inbox",
        onClick: () => go("inbox"),
        right: count > 0 ? <Count n={count} tone="amber" /> : null,
      },
      { key: "log", label: "Activity log", icon: ScrollText, active: page === "log", onClick: () => go("log") },
      { key: "usage", label: "Usage & credits", icon: Coins, active: page === "usage", onClick: () => go("usage") },
    ] as NavItem[],
    guide: { key: "guide", label: "Demo guide", icon: BookOpen, active: page === "guide", onClick: () => go("guide") } as NavItem,
  };
}

export function Sidebar() {
  const nav = useNav();
  return (
    <nav className="hidden w-56 shrink-0 flex-col border-r border-line bg-surface lg:flex" aria-label="Orbyte modules">
      <div className="flex-1 overflow-y-auto px-2 py-4">
        <GroupLabel>Orbyte modules</GroupLabel>
        <Item item={nav.home} />
        <Item item={nav.people} />
        <div className="mb-1 ml-[19px] border-l border-line pl-1.5">
          {nav.peopleChildren.map((it) => (
            <Item key={it.key} item={it} sub />
          ))}
        </div>
        {nav.rest.map((it) => (
          <Item key={it.key} item={it} />
        ))}

        <div className="mt-5">
          <GroupLabel>New module</GroupLabel>
          <Item item={nav.kutip} />
          <div className="ml-[19px] border-l border-line pl-1.5">
            {nav.kutipChildren.map((it) => (
              <Item key={it.key} item={it} sub />
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-hairline p-2">
        <Item item={nav.guide} />
        <p className="px-2.5 pb-1 pt-2 text-[11px] leading-snug text-ink2">Simulated Orbyte frame, the team&apos;s own design. All data is synthetic.</p>
      </div>
    </nav>
  );
}

/** Phone and tablet: the same modules as one scrolling strip, Kutip first. */
export function ModuleStrip() {
  const nav = useNav();
  const items = [...nav.kutipChildren, nav.guide, ...nav.rest, nav.home, nav.people, ...nav.peopleChildren];
  return (
    <nav className="shrink-0 border-b border-line bg-surface lg:hidden" aria-label="Orbyte modules">
      <div className="flex gap-4 overflow-x-auto px-4 [scrollbar-width:none]">
        {items.map((it) => (
          <button
            key={it.key}
            type="button"
            onClick={it.onClick}
            aria-current={it.active ? "page" : undefined}
            className={cx(
              "relative inline-flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap text-[13px] transition-colors",
              it.active ? "font-medium text-ink" : "text-ink2 hover:text-ink",
            )}
          >
            {it.label}
            {it.right}
            {it.active && <span className="absolute inset-x-0 bottom-0 h-[2px] bg-navy" aria-hidden />}
          </button>
        ))}
      </div>
    </nav>
  );
}

function GroupLabel({ children }: { children: ReactNode }) {
  return <div className="px-2.5 pb-1.5 font-mono text-[11px] text-ink2">{children}</div>;
}

function Item({ item, sub = false }: { item: NavItem; sub?: boolean }) {
  const { icon: IconCmp, label, active, onClick, right, strong } = item;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cx(
        "relative flex w-full items-center text-left transition-colors",
        sub ? "h-7 gap-2 px-2 text-[13px]" : "h-8 gap-2.5 px-2.5 text-[13px]",
        strong ? "font-semibold text-ink hover:bg-canvas" : active ? "bg-canvas font-medium text-ink" : "text-ink2 hover:bg-canvas hover:text-ink",
      )}
    >
      {/* Navy active rule (Ledger tab line, turned vertical). The module heading only tints its icon. */}
      {active && !strong && <span className="absolute inset-y-1 left-0 w-[2px] bg-navy" aria-hidden />}
      {IconCmp && <IconCmp className={cx("shrink-0", sub ? "h-3.5 w-3.5" : "h-4 w-4", active ? "text-navy" : "text-ink2")} />}
      <span className="flex-1 truncate">{label}</span>
      {right}
    </button>
  );
}
