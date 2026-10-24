"use client";
// One client store for the demo (PRD §20). Every change goes through the
// engine's apply(), so the UI can never bypass a rule or skip the log.
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { apply, type Action } from "@/engine/reducer";
import { seedState } from "@/engine/seed";
import type { State } from "@/engine/model";

export type Page = "today" | "bookings" | "inbox" | "log" | "connect" | "guide" | "module" | "approvals";

interface Store {
  state: State;
  page: Page;
  moduleName: string | null;
  toast: { kind: "error" | "info"; text: string } | null;
  dispatch: (a: Action) => boolean;
  go: (page: Page, moduleName?: string) => void;
  clearToast: () => void;
}

export const useKutip = create<Store>()(
  persist(
    (set, get) => ({
      state: seedState(),
      page: "today",
      moduleName: null,
      toast: null,
      dispatch: (a) => {
        const r = apply(get().state, a);
        if (r.error) {
          set({ toast: { kind: "error", text: r.error } });
          return false;
        }
        set({ state: r.state, toast: null });
        return true;
      },
      go: (page, moduleName) => set({ page, moduleName: moduleName ?? null }),
      clearToast: () => set({ toast: null }),
    }),
    {
      name: "kutip-demo-v1",
      partialize: (s) => ({ state: s.state, page: s.page, moduleName: s.moduleName }),
      // A stale or corrupt saved state falls back to the seed.
      merge: (persisted, current) => {
        const p = persisted as Partial<Store> | undefined;
        if (!p?.state || p.state.version !== seedState().version) return current;
        return { ...current, state: p.state, page: p.page ?? current.page, moduleName: p.moduleName ?? null };
      },
    },
  ),
);
