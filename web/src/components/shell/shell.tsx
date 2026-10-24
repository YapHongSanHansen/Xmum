"use client";
// Kachingg app frame. The store persists to localStorage, so the shell renders
// only on the client to avoid a hydration mismatch.
import { useEffect, useSyncExternalStore } from "react";
import { X } from "lucide-react";
import { cx } from "@/components/ui";
import { useKachingg } from "@/lib/store";
import TodayPage from "@/components/pages/today";
import BookingsPage from "@/components/pages/bookings";
import InboxPage from "@/components/pages/inbox";
import LogPage from "@/components/pages/log";
import ConnectPage from "@/components/pages/connect";
import GuidePage from "@/components/pages/guide";
import ApprovalsPage from "@/components/pages/approvals";
import UsagePage from "@/components/pages/usage";
import { Header } from "./header";

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
  const page = useKachingg((s) => s.page);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [page]);
  if (!mounted) {
    return (
      <div className="grid h-screen place-items-center bg-canvas font-mono text-xs text-ink2" aria-busy="true">
        Loading Kachingg…
      </div>
    );
  }
  return (
    <div className="app-frame">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <Header />
      <div>
        <main id="main-content" className="min-w-0" tabIndex={-1}>
          <Toast />
          <div className="app-main">
            <CurrentPage />
          </div>
        </main>
      </div>
    </div>
  );
}

function CurrentPage() {
  const page = useKachingg((s) => s.page);
  switch (page) {
    case "today":
      return <TodayPage />;
    case "bookings":
      return <BookingsPage />;
    case "inbox":
      return <InboxPage />;
    case "log":
      return <LogPage />;
    case "usage":
      return <UsagePage />;
    case "connect":
      return <ConnectPage />;
    case "guide":
      return <GuidePage />;
    case "approvals":
      return <ApprovalsPage />;
    default:
      return <TodayPage />;
  }
}

function Toast() {
  const toast = useKachingg((s) => s.toast);
  const clearToast = useKachingg((s) => s.clearToast);
  if (!toast) return null;
  const error = toast.kind === "error";
  return (
    <div
      role={error ? "alert" : "status"}
      className={cx(
        "sticky top-0 z-20 flex items-start justify-between gap-3 border-b border-l-[3px] px-4 py-2.5 text-[13px] lg:px-8",
        error ? "border-rose-200 border-l-rose-700 bg-rose-50 text-rose-800" : "border-sky-200 border-l-sky-700 bg-sky-50 text-sky-800",
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
        className={cx("p-0.5", error ? "text-rose-700 hover:bg-rose-100" : "text-sky-700 hover:bg-sky-100")}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
