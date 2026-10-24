"use client";
// Small shared pieces for the Today page: tier badge, language labels, day text.
import type { Lang, Tier } from "@/engine/model";
import { Badge } from "@/components/ui";

export const LANG_LABEL: Record<Lang, string> = {
  en: "English",
  bm: "Bahasa Melayu",
  zh: "Chinese (中文)",
};

export const LANG_SHORT: Record<Lang, string> = { en: "EN", bm: "BM", zh: "ZH" };

const TIER_NAME: Record<Tier, string> = { 0: "courtesy", 1: "nudge", 2: "firm", 3: "owner call" };
const TIER_TONE = { 0: "sky", 1: "slate", 2: "amber", 3: "rose" } as const;

export function TierBadge({ tier }: { tier: Tier | null }) {
  if (tier === null) return <span className="text-xs text-slate-400">—</span>;
  return (
    <Badge tone={TIER_TONE[tier]}>
      T{tier} {TIER_NAME[tier]}
    </Badge>
  );
}

export const tierName = (tier: Tier) => TIER_NAME[tier];

/** "today", "tomorrow", "in 11 days", "3 days ago". */
export function daysAwayText(n: number): string {
  if (n === 0) return "today";
  if (n === 1) return "tomorrow";
  if (n > 1) return `in ${n} days`;
  return `${-n} days ago`;
}
