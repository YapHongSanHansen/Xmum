"use client";
// Simulated Orbyte hub frame (PRD §21). The store persists to localStorage, so
// the shell renders only on the client to avoid a hydration mismatch.
import { useSyncExternalStore } from "react";
import { X } from "lucide-react";
import { cx } from "@/components/ui";
import { useKutip } from "@/lib/store";
import TodayPage from "@/components/pages/today";
import BookingsPage from "@/components/pages/bookings";
import InboxPage from "@/components/pages/inbox";
import LogPage from "@/components/pages/log";
import ConnectPage from "@/components/pages/connect";
import GuidePage from "@/components/pages/guide";
import ModulePage from "@/components/pages/module";
import { Header } from "./header";
import { Sidebar } from "./sidebar";

const noopSubscribe = () => () => {};

/** false during SSR and hydration, true once running in the browser. */
function useMounted() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

export default function Shell() {
  const mounted = useMounted();
  if (!mounted) {
    return (
      <div className="grid h-screen place-items-center bg-slate-50 text-sm text-slate-400" aria-busy="true">
        Loading Kutip…
      </div>
    );
  }
  return (
    <div className="flex h-screen min-w-[1180px] flex-col bg-slate-50">
      <Header />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main className="min-w-0 flex-1 overflow-y-auto">
          <Toast />
          <div className="mx-auto max-w-6xl px-6 py-6">
            <CurrentPage />
          </div>
        </main>
      </div>
    </div>
  );
}

function CurrentPage() {
  const page = useKutip((s) => s.page);
  switch (page) {
    case "today":
      return <TodayPage />;
    case "bookings":
      return <BookingsPage />;
    case "inbox":
      return <InboxPage />;
    case "log":
      return <LogPage />;
    case "connect":
      return <ConnectPage />;
    case "guide":
      return <GuidePage />;
    case "module":
      return <ModulePage />;
    default:
      return <TodayPage />;
  }
}

function Toast() {
  const toast = useKutip((s) => s.toast);
  const clearToast = useKutip((s) => s.clearToast);
  if (!toast) return null;
  const error = toast.kind === "error";
  return (
    <div
      role={error ? "alert" : "status"}
      className={cx(
        "sticky top-0 z-20 flex items-start justify-between gap-3 border-b px-6 py-2.5 text-sm",
        error ? "border-rose-200 bg-rose-50 text-rose-900" : "border-sky-200 bg-sky-50 text-sky-900",
      )}
    >
      <div>
        <span className="font-semibold">{error ? "Not allowed: " : "Note: "}</span>
        {toast.text}
      </div>
      <button
        type="button"
        onClick={clearToast}
        aria-label="Dismiss"
        className={cx("rounded p-0.5", error ? "text-rose-700 hover:bg-rose-100" : "text-sky-700 hover:bg-sky-100")}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
