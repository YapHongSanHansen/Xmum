"use client";
// Module sidebar (PRD FR-O1): Orbyte's existing modules for context, Kutip as the new one.
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
} from "lucide-react";
import { cx } from "@/components/ui";
import { useKutip, type Page } from "@/lib/store";
import { inboxCount } from "./counts";
import { Wordmark } from "./wordmark";
import { approvalsCount } from "@/components/pages/approvals";

type Icon = ComponentType<{ className?: string }>;

const PEOPLE_CHILDREN = ["eLeave", "eClaim", "eOT", "Attendance"];

export function Sidebar() {
  const page = useKutip((s) => s.page);
  const moduleName = useKutip((s) => s.moduleName);
  const go = useKutip((s) => s.go);
  const count = useKutip((s) => inboxCount(s.state));
  const approvals = useKutip((s) => approvalsCount(s.state));

  const isModule = (name: string) => page === "module" && moduleName === name;
  const kutipPages: Page[] = ["today", "bookings", "inbox", "log"];
  const inKutip = kutipPages.includes(page);

  return (
    <nav className="flex w-60 shrink-0 flex-col bg-slate-900 text-slate-300" aria-label="Orbyte modules">
      <div className="flex h-12 items-center border-b border-white/5 px-4">
        <Wordmark dark />
        <span className="ml-2 rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">hub</span>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-3">
        <GroupLabel>Orbyte modules</GroupLabel>
        <Item icon={House} label="Home" active={isModule("Home")} onClick={() => go("module", "Home")} />
        <Item icon={Users} label="People" active={isModule("People")} onClick={() => go("module", "People")} />
        <div className="mb-1 ml-[22px] border-l border-white/10 pl-2">
          {PEOPLE_CHILDREN.map((name) => (
            <SubItem key={name} label={name} active={isModule(name)} onClick={() => go("module", name)} />
          ))}
        </div>
        <Item icon={Briefcase} label="Work" active={isModule("Work")} onClick={() => go("module", "Work")} />
        <Item icon={Signature} label="eSign" active={isModule("eSign")} onClick={() => go("module", "eSign")} />
        <Item icon={UserPlus} label="Hiring" active={isModule("Hiring")} onClick={() => go("module", "Hiring")} />
        <Item icon={Plug} label="Connect" active={page === "connect"} onClick={() => go("connect")} />
        <Item
          icon={ClipboardCheck}
          label="Approvals"
          active={page === "approvals"}
          onClick={() => go("approvals")}
          right={approvals > 0 ? <span className="min-w-5 rounded-full bg-sky-400 px-1.5 text-center text-[11px] font-semibold leading-5 text-slate-900">{approvals}</span> : null}
        />

        <div className="mt-5">
          <GroupLabel>New module</GroupLabel>
          <Item
            icon={Wallet}
            label="Kutip"
            active={inKutip}
            strong
            onClick={() => go("today")}
            right={<span className="rounded bg-emerald-400/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">new</span>}
          />
          <div className="ml-[22px] border-l border-emerald-400/30 pl-2">
            <SubItem icon={LayoutDashboard} label="Today" active={page === "today"} onClick={() => go("today")} />
            <SubItem icon={Truck} label="Bookings" active={page === "bookings"} onClick={() => go("bookings")} />
            <SubItem
              icon={Inbox}
              label="Inbox (Bukti)"
              active={page === "inbox"}
              onClick={() => go("inbox")}
              right={
                count > 0 ? (
                  <span className="min-w-5 rounded-full bg-amber-400 px-1.5 text-center text-[11px] font-semibold leading-5 text-slate-900">{count}</span>
                ) : null
              }
            />
            <SubItem icon={ScrollText} label="Activity log" active={page === "log"} onClick={() => go("log")} />
          </div>
        </div>
      </div>

      <div className="border-t border-white/5 p-2">
        <Item icon={BookOpen} label="Demo guide" active={page === "guide"} onClick={() => go("guide")} />
        <p className="px-2.5 pb-1 pt-2 text-[10px] leading-snug text-slate-500">Simulated Orbyte frame, the team&apos;s own design. All data is synthetic.</p>
      </div>
    </nav>
  );
}

function GroupLabel({ children }: { children: ReactNode }) {
  return <div className="px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">{children}</div>;
}

function Item({
  icon: IconCmp,
  label,
  active,
  onClick,
  right,
  strong,
}: {
  icon: Icon;
  label: string;
  active: boolean;
  onClick: () => void;
  right?: ReactNode;
  strong?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cx(
        "flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors",
        active ? "bg-white/10 text-white" : "hover:bg-white/5 hover:text-white",
        strong && "font-semibold",
      )}
    >
      <IconCmp className={cx("h-4 w-4 shrink-0", active ? "text-emerald-300" : "text-slate-400")} />
      <span className="flex-1 truncate">{label}</span>
      {right}
    </button>
  );
}

function SubItem({
  icon: IconCmp,
  label,
  active,
  onClick,
  right,
}: {
  icon?: Icon;
  label: string;
  active: boolean;
  onClick: () => void;
  right?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cx(
        "flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-[13px] transition-colors",
        active ? "bg-emerald-500/15 font-medium text-emerald-200" : "text-slate-400 hover:bg-white/5 hover:text-white",
      )}
    >
      {IconCmp && <IconCmp className="h-3.5 w-3.5 shrink-0" />}
      <span className="flex-1 truncate">{label}</span>
      {right}
    </button>
  );
}
