// CSV imports on the Connect page (PRD FR-A1, FR-A5). Pure: (text, state) →
// preview. The reducer parses the same text again on import, so the preview and
// the import can never disagree and the UI cannot slip a bad row past a check.
import { addDays, dayOf, fmtDate, normInvoiceRef, type BankLine, type Customer, type Role, type State } from "./model";

export interface InvalidRow {
  /** Line number in the file; the header is line 1. */
  line: number;
  reason: string;
}

/* ---------- CSV basics ---------- */

interface CsvLine {
  line: number;
  cells: string[];
  raw: string;
}

/** Splits one CSV line, honouring double quotes ("3,100.00") and "" escapes. */
function splitLine(text: string): string[] {
  const cells: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      cells.push(cell.trim());
      cell = "";
    } else cell += ch;
  }
  cells.push(cell.trim());
  return cells;
}

function readCsv(text: string): { header: string[]; rows: CsvLine[] } | null {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/);
  const first = lines.findIndex((l) => l.trim() !== "");
  if (first === -1) return null;
  const header = splitLine(lines[first]).map(headerKey);
  const rows = lines
    .map((raw, i) => ({ line: i + 1, raw, cells: splitLine(raw) }))
    .slice(first + 1)
    .filter((r) => r.raw.trim() !== "");
  return { header, rows };
}

const headerKey = (h: string) => h.toLowerCase().replace(/[_\-.]+/g, " ").replace(/\s+/g, " ").trim();

/** Finds each column by its name or a common alias; reports the ones missing. */
function columns<K extends string>(header: string[], spec: Record<K, string[]>, required: readonly NoInfer<K>[]) {
  const at = {} as Record<K, number>;
  for (const k of Object.keys(spec) as K[]) at[k] = header.findIndex((h) => spec[k].includes(h));
  const missing = required.filter((k) => at[k] === -1).map((k) => spec[k][0]);
  return { at, missing };
}

/* ---------- field parsers ---------- */

/** "2026-10-20" or "20/10/2026" (Malaysian day-first). Rejects impossible dates. */
export function parseDate(v: string): string | null {
  let y: number, m: number, d: number;
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(v);
  const dmy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(v);
  if (iso) [y, m, d] = [+iso[1], +iso[2], +iso[3]];
  else if (dmy) [d, m, y] = [+dmy[1], +dmy[2], +dmy[3]];
  else return null;
  const date = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  // Round-trip through the calendar: 31/02 or month 13 comes back different.
  return m >= 1 && m <= 12 && d >= 1 && addDays(date, 0) === date ? date : null;
}

/** "RM3,100.00", "3100", "-850.5" → sen. Null if it is not a plain amount. */
export function parseAmount(v: string): number | null {
  const t = v.replace(/^RM\s*/i, "").replace(/[\s,]/g, "").replace(/^([-+])RM/i, "$1");
  if (!/^[-+]?\d+(\.\d{1,2})?$/.test(t)) return null;
  return Math.round(parseFloat(t) * 100);
}

/** "30", "30 days", "Net 30" → 30. */
function parseTerms(v: string): number | null {
  const m = /^(?:net\s*)?(\d{1,3})(?:\s*days?)?$/i.exec(v);
  return m ? +m[1] : null;
}

const NAME_SUFFIX = /\s+(SDN\s+BHD|BHD|ENTERPRISE)$/;
const normName = (n: string) => n.toUpperCase().replace(/[^A-Z0-9\s]/g, " ").replace(/\s+/g, " ").trim().replace(NAME_SUFFIX, "");

/** Customers come from the customer records (FR-A2); an invoice must name one of them. */
export function findCustomer(s: State, name: string): Customer | null {
  const key = normName(name);
  return s.customers.find((c) => c.id === name || normName(c.name) === key) ?? null;
}

/* ---------- FR-A1 invoices ---------- */

export interface InvoiceRow {
  line: number;
  number: string;
  customerId: string;
  customerName: string;
  amount: number;
  issueDate: string;
  dueDate: string;
  termsDays: number;
  status: "open" | "disputed";
  delivery: { doNumber: string; route: string; destination: string };
}

export interface InvoiceInvalid extends InvalidRow {
  number: string;
  raw: string;
}

export interface InvoiceImport {
  rows: InvoiceRow[];
  invalid: InvoiceInvalid[];
  /** A problem with the whole file (empty, or a required column missing). */
  error: string | null;
}

const INVOICE_COLUMNS = {
  number: ["number", "invoice", "invoice number", "invoice no", "no"],
  customer: ["customer", "customer name"],
  amount: ["amount", "amount (rm)", "total"],
  issue: ["issue date", "issued", "invoice date"],
  due: ["due date", "due"],
  terms: ["terms", "terms (days)", "terms days", "payment terms"],
  status: ["status"],
  doNumber: ["do number", "do", "delivery order"],
  route: ["route"],
  destination: ["destination"],
};

const INVOICE_REQUIRED = ["number", "customer", "amount", "issue", "due", "terms", "status"] as const;

/** Reads an invoice CSV against the current state. Nothing changes until IMPORT_INVOICES. */
export function parseInvoiceCsv(text: string, s: State): InvoiceImport {
  const csv = readCsv(text);
  if (!csv) return { rows: [], invalid: [], error: "The file is empty." };
  const { at, missing } = columns(csv.header, INVOICE_COLUMNS, INVOICE_REQUIRED);
  if (missing.length) return { rows: [], invalid: [], error: `Missing column${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}.` };

  const existing = new Set(s.invoices.map((i) => normInvoiceRef(i.number)));
  const seen = new Map<string, number>();
  const rows: InvoiceRow[] = [];
  const invalid: InvoiceInvalid[] = [];

  for (const r of csv.rows) {
    const cell = (k: keyof typeof INVOICE_COLUMNS) => (at[k] === -1 ? "" : (r.cells[at[k]] ?? ""));
    const problems: string[] = [];
    for (const k of INVOICE_REQUIRED) if (!cell(k)) problems.push(`missing ${INVOICE_COLUMNS[k][0]}`);

    const number = cell("number");
    const key = normInvoiceRef(number);
    if (number && existing.has(key)) problems.push(`duplicate: ${number} already exists`);
    else if (number && seen.has(key)) problems.push(`duplicate: ${number} is also on line ${seen.get(key)}`);
    if (number && !seen.has(key)) seen.set(key, r.line);

    const customer = cell("customer") ? findCustomer(s, cell("customer")) : null;
    if (cell("customer") && !customer) problems.push(`unknown customer "${cell("customer")}" (add them to your customer list first)`);

    const amount = cell("amount") ? parseAmount(cell("amount")) : null;
    if (cell("amount") && amount === null) problems.push(`bad amount "${cell("amount")}"`);
    else if (amount !== null && amount <= 0) problems.push("amount must be more than zero");

    const issueDate = cell("issue") ? parseDate(cell("issue")) : null;
    if (cell("issue") && !issueDate) problems.push(`bad issue date "${cell("issue")}" (use YYYY-MM-DD or DD/MM/YYYY)`);
    const dueDate = cell("due") ? parseDate(cell("due")) : null;
    if (cell("due") && !dueDate) problems.push(`bad due date "${cell("due")}" (use YYYY-MM-DD or DD/MM/YYYY)`);
    if (issueDate && issueDate > dayOf(s.now)) problems.push(`issue date is after today (${fmtDate(dayOf(s.now))})`);
    if (issueDate && dueDate && dueDate < issueDate) problems.push("due date is before the issue date");

    const termsDays = cell("terms") ? parseTerms(cell("terms")) : null;
    if (cell("terms") && termsDays === null) problems.push(`bad terms "${cell("terms")}" (use days, e.g. 30)`);

    const status = cell("status").toLowerCase().replace(/[\s-]+/g, "_");
    if (status === "paid") problems.push("already paid: Kachingg imports unpaid invoices only");
    else if (status === "part_paid") problems.push("part_paid needs the amount already paid, which this file does not carry");
    else if (status && status !== "open" && status !== "disputed") problems.push(`unknown status "${cell("status")}" (use open or disputed)`);

    if (problems.length) {
      invalid.push({ line: r.line, number, raw: r.raw, reason: problems.join("; ") });
      continue;
    }
    rows.push({
      line: r.line,
      number,
      customerId: customer!.id,
      customerName: customer!.name,
      amount: amount!,
      issueDate: issueDate!,
      dueDate: dueDate!,
      termsDays: termsDays!,
      status: status as InvoiceRow["status"],
      delivery: { doNumber: cell("doNumber"), route: cell("route"), destination: cell("destination") },
    });
  }
  return { rows, invalid, error: null };
}

/* ---------- FR-A5 bank transactions (CSV export from online banking) ---------- */

export interface BankRow {
  line: number;
  at: string;
  amount: number;
  description: string;
}

export interface BankInvalid extends InvalidRow {
  /** The amount read as a debit: hidden from the Clerk with the other debits. */
  debit: boolean;
}

export interface BankImport {
  credits: BankRow[];
  debits: BankRow[];
  invalid: BankInvalid[];
  /** The file had a balance column; it is never read or stored (FR-B5). */
  balanceIgnored: boolean;
  error: string | null;
}

const BANK_COLUMNS = {
  date: ["date", "value date", "transaction date", "posting date"],
  amount: ["amount", "amount (rm)"],
  description: ["description", "details", "narration", "reference"],
};

export const sameLine = (a: { at: string; amount: number; description: string }, b: { at: string; amount: number; description: string }) =>
  dayOf(a.at) === dayOf(b.at) && a.amount === b.amount && a.description.toUpperCase() === b.description.toUpperCase();

/**
 * Reads a bank transaction CSV export (date, amount, description; credits positive,
 * debits negative). Only the three columns are read: a balance column, if any,
 * is ignored and never stored.
 */
export function parseBankCsv(text: string, s: State): BankImport {
  const empty = { credits: [], debits: [], invalid: [], balanceIgnored: false };
  const csv = readCsv(text);
  if (!csv) return { ...empty, error: "The file is empty." };
  const { at, missing } = columns(csv.header, BANK_COLUMNS, ["date", "amount", "description"]);
  if (missing.length) return { ...empty, error: `Missing column${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}.` };

  const known: { at: string; amount: number; description: string; line?: number }[] = [...s.bankLines, ...s.bankDebits];
  const credits: BankRow[] = [];
  const debits: BankRow[] = [];
  const invalid: BankInvalid[] = [];

  for (const r of csv.rows) {
    const cell = (k: keyof typeof BANK_COLUMNS) => r.cells[at[k]] ?? "";
    const problems: string[] = [];
    for (const k of ["date", "amount", "description"] as const) if (!cell(k)) problems.push(`missing ${k}`);

    // An optional time after the date ("2026-10-20 14:25") keeps the line's order.
    const [datePart, timePart] = cell("date").split(/\s+/);
    const date = datePart ? parseDate(datePart) : null;
    const time = timePart && /^\d{2}:\d{2}$/.test(timePart) ? timePart : "00:00";
    if (cell("date") && (!date || (timePart && time !== timePart))) problems.push(`bad date "${cell("date")}" (use YYYY-MM-DD or DD/MM/YYYY)`);
    const ts = date ? `${date}T${time}` : "";
    if (date && ts > s.now) problems.push(`dated after the demo clock (${fmtDate(dayOf(s.now))})`);

    const amount = cell("amount") ? parseAmount(cell("amount")) : null;
    if (cell("amount") && amount === null) problems.push("bad amount (use a number, debits negative)");
    else if (amount === 0) problems.push("amount is zero");

    const row = { line: r.line, at: ts, amount: amount ?? 0, description: cell("description").replace(/\s+/g, " ") };
    if (!problems.length) {
      const dup = known.find((k) => sameLine(k, row));
      if (dup) problems.push(dup.line ? `duplicate of line ${dup.line}` : "duplicate of a line already imported");
    }

    if (problems.length) {
      invalid.push({ line: r.line, reason: problems.join("; "), debit: amount !== null && amount < 0 });
      continue;
    }
    known.push(row);
    (row.amount > 0 ? credits : debits).push(row);
  }
  return { credits, debits, invalid, balanceIgnored: csv.header.includes("balance"), error: null };
}

/** What a role may see of a bank import. The Clerk gets credit lines only (FR-A5, FR-B5). */
export interface BankPreview {
  credits: BankRow[];
  debits: BankRow[];
  invalid: BankInvalid[];
  /** Debit lines (valid or not) left out of this view. */
  hiddenDebits: number;
  balanceIgnored: boolean;
  error: string | null;
}

export function bankPreviewFor(p: BankImport, role: Role): BankPreview {
  if (role === "owner") return { ...p, hiddenDebits: 0 };
  const invalid = p.invalid.filter((r) => !r.debit);
  return {
    credits: p.credits,
    debits: [],
    invalid,
    hiddenDebits: p.debits.length + (p.invalid.length - invalid.length),
    // Whether a balance column existed is itself not shown to the Clerk.
    balanceIgnored: false,
    error: p.error,
  };
}

/** Rows ready for state, ids assigned by the reducer. */
export const toBankLine = (r: BankRow, id: string): BankLine => ({
  id,
  at: r.at,
  amount: r.amount,
  description: r.description,
  matchedInvoiceId: null,
  source: "csv",
});

/* ---------- synthetic samples for "Load sample" ---------- */

/** Fictional invoices for seeded customers; lines 5 and 6 are invalid on purpose. */
export const SAMPLE_INVOICE_CSV = [
  "number,customer,amount,issue date,due date,terms,status,do number,route,destination",
  "INV-2365,Kedai Elektrik Sinar Sdn Bhd,\"2,850.00\",2026-10-20,2026-12-04,45,open,DO-8897,Klang → Kajang,Kajang",
  "INV-2366,Gudang Sejuk Prima,1980.50,20/10/2026,19/12/2026,60 days,open,DO-8899,Port Klang → Rawang,Rawang",
  "INV-2367,Pelita Frozen Foods Sdn Bhd,1450,2026-10-20,2026-12-19,Net 60,open,DO-8901,Klang → Seremban,Seremban",
  "INV-2304,Mega Bina Hardware Trading Sdn Bhd,3100,2026-09-12,2026-10-02,20,open,DO-8812,Shah Alam → Bukit Raja,Bukit Raja",
  "INV-2368,Syarikat Bintang Timur,2400,2026-10-20,31/11/2026,30,open,,,",
].join("\n");

/** A fictional Bank Cempaka export: two credits, one debit, one bad amount (line 5), and a balance column that is ignored. */
export const SAMPLE_BANK_CSV = [
  "date,description,amount,balance",
  "2026-10-19 09:12,IBG CR TOKO SERI ANGGERIK,\"1,500.00\",\"8,300.00\"",
  "2026-10-19 11:40,DUITNOW CR KEDAI RUNCIT AMANI 1019,640.00,\"8,940.00\"",
  "2026-10-19 15:05,FLEET CARD AUTODEBIT CEMPAKA,-860.00,\"8,080.00\"",
  "2026-10-19 16:30,DUITNOW CR KEDAI MAKAN SURIA,4O0.00,\"8,480.00\"",
].join("\n");
