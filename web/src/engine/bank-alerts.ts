// Bank credit alerts → bank lines for matching (M1). The owner forwards the
// bank's "you have received" alert emails once to a Kachingg address; each
// alert becomes one credit line. Simulated in the demo: there is no mailbox and
// a person pastes the alert text on Connect.
//
// Rules only, no AI: a reader for a few alert wordings (fictional "Bank Cempaka"
// formats). Debits and anything without an amount or a date are refused, and a
// balance figure in the alert is dropped before anything is read (FR-B5).
// A real deployment accepts alerts only from the bank's verified sender
// (SPF/DKIM), so a forged alert is rejected before it reaches this parser.
import { parseAmount, parseDate } from "./imports";
import { fmtDateTime } from "./model";

export interface AlertLine {
  /** Local time of the credit, "2026-10-23T14:25". */
  at: string;
  /** Sen, always positive. */
  amount: number;
  /** In the bank's own style, e.g. "DUITNOW CR MEGA BINA HARDW INV2304". */
  description: string;
  /** Payment rail as the alert names it, e.g. "DuitNow", "IBG". */
  rail: string;
  payer?: string;
  reference?: string;
}

export type AlertParse = { ok: true; line: AlertLine } | { ok: false; reason: string };

const fail = (reason: string): AlertParse => ({ ok: false, reason });

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** "Available balance: RM8,300.00", "Bal RM8,300": removed before any amount is read. */
const BALANCE = /\b(?:avail(?:able)?\.?\s*|ledger\s*|current\s*|a\/c\s*)?bal(?:ance)?\b[^\n;]*?(?:RM|MYR)\s*-?\d[\d,]*(?:\.\d{1,2})?/gi;

/** Money going out. Checked first: an alert that reads as a debit is never added. */
const DEBIT =
  /\b(?:debit(?:ed)?|withdrawal|withdrawn|money\s+out|you\s+have\s+(?:sent|paid|transferred)|transferred\s+to|paid\s+to|payment\s+to|purchase|spent|charged|auto-?debit)\b|\b(?:DUITNOW|IBG|IBFT|FPX|JOMPAY)\s+DR\b|-\s*(?:RM|MYR)\s*\d/i;

const CREDIT = /\b(?:received|credited|credit|money\s+in|incoming|deposit(?:ed)?|CR)\b/i;

const AMOUNT = /(?:RM|MYR)\s*(\d[\d,]*(?:\.\d{1,2})?)/i;

const RAILS: [RegExp, string, string][] = [
  [/\bduit\s?now\b/i, "DuitNow", "DUITNOW CR"],
  [/\bIBG\b|interbank\s+giro/i, "IBG", "IBG CR"],
  [/\bIBFT\b|instant\s+transfer/i, "Instant Transfer", "IBFT CR"],
  [/\bJomPAY\b/i, "JomPAY", "JOMPAY CR"],
  [/\bFPX\b/i, "FPX", "FPX CR"],
];

/** Text up to the end of its clause: a line break, ". ", ", ", ";", "·", "|", or a following field. */
function clause(after: string): string {
  const stop = /\n|[.,;·|](?:\s|$)|\s(?:on|at|via|dated|ref|reference|payment\s+details|recipient\s+reference)\b/i.exec(after);
  return (stop ? after.slice(0, stop.index) : after).trim().replace(/[.,;:]$/, "");
}

const PAYER_KEYS = /\b(?:sender(?:\s+name)?|payer|remitter|from\s+account\s+name)\s*[:\-]\s*|\bfrom\s+(?![:])/i;
const REF_KEYS = /\b(?:recipient\s+reference|payment\s+details|ref(?:erence)?(?:\s+no)?)\s*[:.\-]?\s*/i;

function readPayer(text: string): string | undefined {
  const m = PAYER_KEYS.exec(text);
  if (!m) return undefined;
  const name = clause(text.slice(m.index + m[0].length))
    .toUpperCase()
    .replace(/[^A-Z0-9&'\- ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40)
    .trim();
  // An account number ("1234 **** 5678") is not a payer name, and is never kept.
  return /[A-Z]{2}/.test(name) ? name : undefined;
}

function readReference(text: string): string | undefined {
  const m = REF_KEYS.exec(text);
  if (!m) return undefined;
  const ref = clause(text.slice(m.index + m[0].length))
    .toUpperCase()
    .replace(/[^A-Z0-9\-/ ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 30)
    .trim();
  return ref || undefined;
}

/** DD/MM/YYYY, YYYY-MM-DD or "23 Oct 2026"; the time ("14:25", "2:25 PM") is optional. */
function readDateTime(text: string): string | null {
  let date: string | null = null;
  const dmy = /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/.exec(text);
  const iso = /\b(\d{4})-(\d{2})-(\d{2})\b/.exec(text);
  const named = /\b(\d{1,2})[\s-]+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?[\s,-]+(\d{4})\b/i.exec(text);
  if (dmy) date = parseDate(`${dmy[1]}/${dmy[2]}/${dmy[3]}`);
  else if (iso) date = parseDate(`${iso[1]}-${iso[2]}-${iso[3]}`);
  else if (named) date = parseDate(`${named[1]}/${MONTHS.indexOf(named[2].toLowerCase()) + 1}/${named[3]}`);
  if (!date) return null;

  const t = /\b(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)?\b/i.exec(text);
  if (!t) return `${date}T00:00`;
  let h = +t[1];
  const min = +t[2];
  const ap = t[3]?.toLowerCase();
  if (ap === "pm" && h < 12) h += 12;
  if (ap === "am" && h === 12) h = 0;
  if (h > 23 || min > 59) return null;
  return `${date}T${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

/**
 * Reads one bank credit alert (email subject/body or app push text) into a
 * credit line. Pure. Refuses debits, and alerts with no amount, no date, or
 * nothing to match on (no payer name and no reference).
 */
export function parseBankAlert(text: string): AlertParse {
  const lined = text
    .replace(/^﻿/, "")
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .trim();
  if (!lined) return fail("The alert is empty.");
  // The balance is never read or stored: it goes before the amount is looked for.
  const body = lined.replace(BALANCE, " ");
  const flat = body.replace(/\s+/g, " ");

  if (DEBIT.test(flat)) return fail("This alert is for money going out (a debit). Only incoming credits are added.");
  if (!CREDIT.test(flat)) return fail("Not a credit alert: no “received”, “credited” or “money in” wording.");

  const a = AMOUNT.exec(flat);
  const amount = a ? parseAmount(a[1]) : null;
  if (amount === null) return fail("No amount found (expected RM or MYR and a number).");
  if (amount <= 0) return fail("The amount is zero.");

  const at = readDateTime(flat);
  if (!at) return fail("No date found (expected DD/MM/YYYY, YYYY-MM-DD or 23 Oct 2026).");

  const [, rail, code] = RAILS.find(([re]) => re.test(flat)) ?? [null, "Transfer", "TRANSFER CR"];
  const payer = readPayer(body);
  const reference = readReference(body);
  if (!payer && !reference) return fail("No payer name or reference found, so the line could not be matched (M1).");

  const description = [code, payer, reference?.replace(/\s+/g, " ")].filter(Boolean).join(" ");
  return { ok: true, line: { at, amount, description, rail, ...(payer && { payer }), ...(reference && { reference }) } };
}

/* ---------- simulated mailbox ---------- */

/** Simulated forwarding address shown on Connect. Not a real mailbox. */
export const ALERT_ADDRESS = "lorilaju@alerts.kachingg.app";

/**
 * A fictional Bank Cempaka DuitNow alert, timed at the demo clock. Its payer and
 * amount match no customer or open invoice, so adding it changes no demo number.
 */
export function sampleBankAlert(now: string): string {
  const [d, t] = [now.slice(0, 10), now.slice(11, 16)];
  const dmy = `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;
  return [
    "Subject: Bank Cempaka: Money received",
    "",
    `Bank Cempaka: You have received RM1,180.00 via DuitNow Transfer from RIMBA HIJAU NURSERY on ${dmy} ${t}. Ref: TRIP1023`,
    "",
    "This is a simulated alert for the Kachingg demo.",
  ].join("\n");
}

/** One-line summary for the activity log and the preview. */
export const alertSummary = (l: AlertLine) =>
  `${l.rail}${l.payer ? ` from ${l.payer}` : ""}${l.reference ? `, ref ${l.reference}` : ""} · ${fmtDateTime(l.at)}`;
