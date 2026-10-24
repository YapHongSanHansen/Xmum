"use client";
// One client store for the demo (PRD §20). Every change goes through the
// engine's apply(), so the UI can never bypass a rule or skip the log.
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { apply, type Action } from "@/engine/reducer";
import { seedState } from "@/engine/seed";
import type { State } from "@/engine/model";

export type Page = "today" | "bookings" | "inbox" | "log" | "usage" | "connect" | "guide" | "module" | "approvals";

interface Store {
  state: State;
  page: Page;
  moduleName: string | null;
  toast: { kind: "error" | "info"; text: string } | null;
  /** The judge welcome on Today was closed. Persisted; cleared by RESET. */
  welcomeDismissed: boolean;
  dispatch: (a: Action) => boolean;
  go: (page: Page, moduleName?: string) => void;
  clearToast: () => void;
  dismissWelcome: () => void;
}

export const useKutip = create<Store>()(
  persist(
    (set, get) => ({
      state: seedState(),
      page: "today",
      moduleName: null,
      toast: null,
      welcomeDismissed: false,
      dispatch: (a) => {
        const r = apply(get().state, a);
        if (r.error) {
          set({ toast: { kind: "error", text: r.error } });
          return false;
        }
        // A reset starts the demo over, so the welcome shows again.
        set(a.type === "RESET" ? { state: r.state, toast: null, welcomeDismissed: false } : { state: r.state, toast: null });
        return true;
      },
      go: (page, moduleName) => set({ page, moduleName: moduleName ?? null }),
      clearToast: () => set({ toast: null }),
      dismissWelcome: () => set({ welcomeDismissed: true }),
    }),
    {
      name: "kutip-demo-v1",
      partialize: (s) => ({ state: s.state, page: s.page, moduleName: s.moduleName, welcomeDismissed: s.welcomeDismissed }),
      // A stale or corrupt saved state falls back to the seed.
      merge: (persisted, current) => {
        const p = persisted as Partial<Store> | undefined;
        if (!p?.state || p.state.version !== seedState().version) return current;
        // Saved state from before welcomeDismissed existed loads with it unset.
        return {
          ...current,
          state: p.state,
          page: p.page ?? current.page,
          moduleName: p.moduleName ?? null,
          welcomeDismissed: p.welcomeDismissed === true,
        };
      },
    },
  ),
);
