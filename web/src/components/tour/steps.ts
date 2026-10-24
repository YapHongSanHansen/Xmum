// The "Start tour" walkthrough: one short step per element. Copy stays plain
// and short. Steps marked `ownerOnly` carry cash content and are never shown
// to the Clerk (their targets are Owner-only cards as well).
import type { Page } from "@/lib/store";

export interface TourStep {
  id: string;
  /** Page the target lives on; header targets leave the page as it is. */
  page?: Page;
  /** CSS selector of the element to focus; none = centred card. */
  target?: string;
  title: string;
  text: string;
  /** Shown instead of `text` once the interactive step is done. */
  doneText?: string;
  /** Interactive: Next unlocks when the user has run the daily scan. */
  waitForScan?: boolean;
  /** Cash content: skipped whenever the role is Clerk. */
  ownerOnly?: boolean;
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    page: "today",
    title: "Welcome to Kachingg",
    text: "Kachingg warns you before cash runs short, tells you who to chase, and checks who really paid.",
  },
  {
    id: "scan",
    page: "today",
    target: '[data-tour="scan"]',
    title: "Run daily scan",
    text: "Every morning Kachingg checks invoices and bills. Click Run daily scan.",
    doneText: "Scan done. Today's plan is ready. Press Next.",
    waitForScan: true,
  },
  {
    id: "cash-outlook",
    page: "today",
    target: '[data-tour="cash-outlook"]',
    title: "Cash outlook",
    text: "Your balance after each payment and bill. Pink bars mean not enough cash.",
    ownerOnly: true,
  },
  {
    id: "cash-available",
    page: "today",
    target: '[data-tour="cash-available"]',
    title: "Cash available and bills",
    text: "Each bill in the next 30 days: covered, or how much short. You see it days ahead, not on payday.",
    ownerOnly: true,
  },
  {
    id: "early-warning",
    page: "today",
    target: '[data-tour="early-warning"]',
    title: "Early warning",
    text: "Your options. Kachingg lists them, you decide. It never recommends a lender.",
    ownerOnly: true,
  },
  {
    id: "collection-plan",
    page: "today",
    target: "#collection-plan",
    title: "Collection plan",
    text: "Who to chase first, ranked by how much each payment closes the gap. Every row shows its rule.",
  },
  {
    id: "role",
    target: '[data-tour="role"]',
    title: "Owner and Clerk",
    text: "The Owner sees cash. The Clerk chases and approves, but never sees cash figures.",
  },
  {
    id: "inbox",
    target: '[data-tour="nav-inbox"]',
    title: "Bukti inbox",
    text: "AI reads WhatsApp replies and slips. Nothing is paid until the bank line matches and a person approves.",
  },
  {
    id: "connect",
    target: '[data-tour="nav-connect"]',
    title: "Connect",
    text: "Customers come from Orbyte; payments from your bank's alerts.",
  },
  {
    id: "activity",
    target: '[data-tour="nav-log"]',
    title: "Activity",
    text: "Every action is logged: who, when, which rule.",
  },
  {
    id: "guide",
    target: '[data-tour="guide"]',
    title: "The full story",
    text: "Want the full 3-minute story? Open the Guide.",
  },
];
