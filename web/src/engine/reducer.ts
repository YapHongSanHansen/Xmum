// Every state change goes through apply(): it checks the role, changes state,
// and writes the activity log (PRD FR-G1, FR-G2). Pure: (state, action) → state.
import {
  addDays,
  customerOf,
  dayOf,
  daysOverdue,
  fmtDate,
  fmtRM,
  invoiceOf,
  outstanding,
  timeOf,
  userOf,
  type ActorKind,
  type Booking,
  type Extraction,
  type Handoff,
  type Lang,
  type LogEntry,
  type Role,
  type State,
} from "./model";
import {
  CONFIDENCE_MIN,
  WARN_WITHIN_DAYS,
  HORIZON_DAYS,
  canApprove,
  chasePlan,
  creditExposure,
  findBankLine,
  forecast,
  RECENT_REMINDER_REASON,
  inQuietHours,
  linkDeduction,
  needsCreditCheck,
  quoteIsVerbatim,
  resolveInvoice,
  shortfalls,
} from "./rules";
import { parseBankCsv, parseDate, parseInvoiceCsv, toBankLine } from "./imports";
import { seedState } from "./seed";

export type CreditDecision = "accepted" | "deposit_requested" | "cod" | "call_first";

export type Action =
  | { type: "RESET" }
  | { type: "SET_ROLE"; role: Role }
  | { type: "RUN_SCAN" }
  | { type: "ADVANCE"; to: string }
  | { type: "CHOOSE_WARNING_OPTION"; warningId: string; option: string }
  | { type: "APPROVE_REMINDER"; invoiceId: string; text: string; edited: boolean }
  | { type: "ESCALATION_DECISION"; invoiceId: string; decision: string }
  | { type: "ENTER_BOOKING"; customerId: string; route: string; amount: number; terms: "credit" | "cod" | "prepaid"; creditDays: number }
  | { type: "DECIDE_CREDIT"; bookingId: string; decision: CreditDecision; depositPct?: number }
  | { type: "APPLY_EXTRACTION"; messageId: string; extraction: Extraction; model: string; cached: boolean }
  | { type: "RESOLVE_HANDOFF"; handoffId: string; option: string }
  | { type: "APPROVE_RECEIPT"; receiptId: string }
  | { type: "DECIDE_DEDUCTION"; receiptId: string; decision: "accepted" | "rejected" }
  | { type: "REJECT_CLAIM"; invoiceId: string }
  | { type: "IMPORT_INVOICES"; csv: string }
  | { type: "ENTER_BANK_BALANCE"; amount: number }
  | { type: "IMPORT_BANK_STATEMENT"; csv: string }
  | { type: "SNOOZE_REMINDER"; invoiceId: string; until: string }
  | { type: "MARK_DISPUTED"; invoiceId: string }
  | { type: "CALL_INSTEAD"; invoiceId: string };

export interface Result {
  state: State;
  error?: string;
}

class Refused extends Error {}
const refuse = (msg: string): never => {
  throw new Refused(msg);
};
const requireOwner = (s: State, what: string) => {
  if (s.role !== "owner") refuse(`Only the Owner can ${what}.`);
};
/** §9.3 rows open to more than the Owner. Sales and Accountant (P1) will be refused here. */
const requireRole = (s: State, roles: Role[], what: string) => {
  if (!roles.includes(s.role)) refuse(`Your role cannot ${what}.`);
};
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

function log(s: State, kind: ActorKind, actor: string, text: string, extra: Partial<LogEntry> = {}) {
  s.log.push({ seq: s.log.length + 1, at: s.now, kind, actor, text, ...extra });
}
const me = (s: State) => userOf(s, s.role).name;
const nextId = (s: State, key: string) => {
  s.counters[key] = (s.counters[key] ?? 0) + 1;
  return `${key}-${String(s.counters[key]).padStart(4, "0")}`;
};

export const warningOptions = (s: State, outflowId: string): string[] => {
  const later = s.outflows.filter((o) => o.id !== outflowId && o.dueDate > s.outflows.find((x) => x.id === outflowId)!.dueDate);
  return [
    "Ask a regular customer to pay early",
    later[0] ? `Ask the ${later[0].short} supplier to move the ${fmtDate(later[0].dueDate)} bill` : "Ask a supplier to move a bill date",
    "Hold new credit for customers 30+ days late",
    "Talk to my bank myself (note only)",
  ];
};

/* ---------- scan (08:00) ---------- */

/** S1: reminders approved during quiet hours go out once quiet hours end. */
function releaseQueued(s: State) {
  if (inQuietHours(s.now)) return;
  for (const inv of s.invoices) {
    for (const r of inv.reminders) {
      if (r.status === "queued") {
        r.status = "sent";
        log(s, "RULE", "S1", `released queued Tier ${r.tier} reminder for ${inv.number}`, { rule: "S1", refs: [inv.id] });
      }
    }
  }
}

function runScan(s: State) {
  const today = dayOf(s.now);
  if (s.scannedDays.includes(today)) return;
  s.scannedDays.push(today);

  releaseQueued(s);

  const fc = forecast(s);
  const overdue = s.invoices.filter((i) => i.status !== "paid" && daysOverdue(i, s.now) >= 1).length;
  const gaps = fc.filter((f) => f.forecast < 0).map((f) => `${fmtDate(f.dueDate)} ${f.short} short ${fmtRM(f.gap)}`);
  log(s, "SYSTEM", "SYSTEM", `scan: ${overdue} overdue; ${gaps.length ? gaps.join("; ") : "no shortfall in the next 30 days"}`);

  for (const f of fc) {
    if (f.forecast >= 0 || f.daysAway > WARN_WITHIN_DAYS) continue;
    const prev = s.warnings.filter((w) => w.outflowId === f.outflowId).at(-1);
    if (prev && f.gap <= prev.gap * 1.1) continue;
    s.warnings.push({ id: nextId(s, "W"), outflowId: f.outflowId, gap: f.gap, raisedAt: s.now, chosen: [] });
    log(s, "RULE", "R6", `early warning raised: ${fmtDate(f.dueDate)} ${f.short} short ${fmtRM(f.gap)}`, { rule: "R6" });
  }

  const plan = chasePlan(s);
  for (const row of plan) {
    // Rows skipped only because a reminder went out in the last 5 days are not logged (noise).
    if (row.state === "skipped" && !row.reason.startsWith(RECENT_REMINDER_REASON)) {
      log(s, "RULE", "R2", `skipped ${row.invoice.number}: ${row.reason}`, { rule: "R2", refs: [row.invoice.id] });
    }
  }
  const remind = plan.filter((r) => r.state === "remind");
  if (remind.length) {
    const list = remind.map((r) => `${r.rank} ${r.invoice.number}${r.closesGap && r.rank === 1 ? " (closes the gap)" : ""}`).join(", ");
    log(s, "RULE", "R3", `chase plan: ${list}`, { rule: "R3" });
  } else {
    log(s, "RULE", "R2", "no new reminders today", { rule: "R2" });
  }
}

/* ---------- clock ---------- */

function arrivals(s: State, from: string, to: string) {
  const events = [
    ...s.bankLines.filter((b) => b.at > from && b.at <= to).map((b) => ({ at: b.at, kind: "BANK" as const, b })),
    ...s.messages.filter((m) => m.receivedAt > from && m.receivedAt <= to).map((m) => ({ at: m.receivedAt, kind: "INBOUND" as const, m })),
  ].sort((a, b) => a.at.localeCompare(b.at));
  for (const e of events) {
    if (e.kind === "BANK") {
      const d = e.b.at;
      const amt = fmtRM(e.b.amount, { cents: true }).replace("RM", "");
      const desc = e.b.description.replace(/^(DUITNOW CR|IBG CR)\s*/, `$1 ${amt} `);
      log(s, "BANK", "BANK", `line ${d.slice(8, 10)}/${d.slice(5, 7)} ${desc} (${timeOf(d)})`, { refs: [e.b.id] });
    } else {
      const c = customerOf(s, e.m.customerId);
      log(s, "INBOUND", "INBOUND", `${c.name} message${e.m.image ? " + slip" : ""} (received ${timeOf(e.m.receivedAt)})`, { refs: [e.m.id] });
    }
  }
}

function advance(s: State, to: string) {
  if (to <= s.now) refuse("The demo clock only moves forward.");
  const start = s.now;
  let from = s.now;
  // One 08:00 scan per boundary crossed, including today's if "now" is still before 08:00.
  for (let d = dayOf(start); d <= dayOf(to); d = addDays(d, 1)) {
    const scanAt = `${d}T08:00`;
    if (scanAt <= start) continue;
    if (scanAt > to) break;
    s.now = scanAt;
    arrivals(s, from, scanAt);
    from = scanAt;
    releaseQueued(s);
    runScan(s);
  }
  s.now = to;
  arrivals(s, from, to);
}

/* ---------- Bukti ---------- */

const REPLY_ASK_SLIP: Record<Lang, (contact: string) => string> = {
  en: (c) => `Thank you ${c}! We can't see it in our bank yet. Can share the slip or transfer reference? Thank you!`,
  bm: (c) => `Terima kasih ${c}! Kami belum nampak dalam bank lagi, boleh share slip atau no. rujukan?`,
  zh: (c) => `${c}您好，谢谢！我们银行这边还没看到款项，麻烦发一下转账单或参考号码，谢谢！`,
};

const pct = (c: number) => c.toFixed(2);
const RELATIVE_WEEKDAY = /下礼拜|下星期|下周|next\s+(mon|tue|wed|thu|fri|sat|sun)|depan/i;

function applyExtraction(s: State, a: Extract<Action, { type: "APPLY_EXTRACTION" }>) {
  if (s.extractions[a.messageId]) return;
  const msg = s.messages.find((m) => m.id === a.messageId);
  if (!msg || msg.receivedAt > s.now) refuse("That message has not arrived yet.");
  const m = msg!;
  const c = customerOf(s, m.customerId);
  const ex: Extraction = { ...a.extraction, promised_date_candidates: [...a.extraction.promised_date_candidates] };

  // FR-E3 verbatim gate: a text field survives only if its quote is in the message.
  const rejected: string[] = [];
  const gateFields: string[] = [];
  const drop = (field: string, quote: string | null) => {
    rejected.push(`${field} (quote "${quote}")`);
    gateFields.push(field);
  };
  if (ex.amount !== null && ex.amount_source !== "image" && !quoteIsVerbatim(ex.amount_quote, m.text)) {
    drop("amount", ex.amount_quote);
    ex.amount = null;
  }
  if (ex.invoice_ref !== null && ex.invoice_ref_quote !== null && !quoteIsVerbatim(ex.invoice_ref_quote, m.text)) {
    drop("invoice", ex.invoice_ref_quote);
    ex.invoice_ref = null;
  }
  if (ex.deduction_amount !== null && !quoteIsVerbatim(ex.deduction_quote, m.text)) {
    drop("deduction", ex.deduction_quote);
    ex.deduction_amount = null;
    ex.deduction_reason = null;
  }
  if (ex.promised_date_candidates.length && !quoteIsVerbatim(ex.promised_date_quote, m.text)) {
    drop("promised date", ex.promised_date_quote);
    ex.promised_date_candidates = [];
  }
  s.extractions[m.id] = { messageId: m.id, extraction: ex, model: a.model, cached: a.cached, at: s.now, rejectedQuotes: rejected };

  // Any reply counts as an answer to the customer's open reminders (R1).
  for (const inv of s.invoices.filter((i) => i.customerId === c.id)) for (const r of inv.reminders) r.answered = true;

  const conf = Math.min(
    ...[ex.amount !== null ? ex.amount_confidence : 1, ex.invoice_ref !== null ? ex.invoice_ref_confidence : 1, ex.deduction_amount !== null ? ex.deduction_confidence : 1],
  );
  const inv = resolveInvoice(s, c.id, ex);
  const aiMeta = { model: a.model, refs: [m.id] };

  if (rejected.length) log(s, "RULE", "FR-E3", `verbatim gate dropped: ${rejected.join("; ")}`, { refs: [m.id] });

  // Promise to pay
  if (ex.intent === "promise_to_pay" || (ex.amount === null && ex.promised_date_candidates.length)) {
    const cands = [...ex.promised_date_candidates];
    // "Next Friday" / 下礼拜五 / "Jumaat depan" can mean this week or the next: never guess (M4).
    if (cands.length === 1 && RELATIVE_WEEKDAY.test(ex.promised_date_quote ?? "")) {
      const back = addDays(cands[0], -7);
      cands.push(back >= dayOf(s.now) ? back : addDays(cands[0], 7));
      cands.sort();
    }
    const ambiguous = cands.length !== 1 || ex.promised_date_confidence < CONFIDENCE_MIN;
    log(s, "AI", "AI", `promise to pay; ${cands.length === 0 ? "no date found" : ambiguous ? `date ambiguous (${cands.map(fmtDate).join(" or ")})` : `date ${fmtDate(cands[0])}`}`, { ...aiMeta, confidence: ex.promised_date_confidence });
    if (!inv) return handoffUnmatched(s, m.id, null, "Which invoice is this promise for?");
    if (ambiguous) {
      const q = ex.promised_date_quote ?? "";
      const question = /礼拜五|拜五|friday|jumaat/i.test(q) ? "Which Friday?" : "Which date did they promise?";
      addHandoff(s, { kind: "promise_date", messageId: m.id, invoiceId: inv.id, question, options: cands, draftReply: null });
      log(s, "RULE", "M4", `hand-off raised: ${question}`, { rule: "M4", refs: [inv.id] });
      return;
    }
    setPromise(s, inv.id, cands[0], m.id);
    return;
  }

  // Payment claim
  const parts: string[] = [];
  if (ex.amount !== null) parts.push(`amount ${fmtRM(Math.round(ex.amount * 100), { cents: true })} (${pct(ex.amount_confidence)})`);
  if (ex.invoice_ref !== null) parts.push(`invoice ${ex.invoice_ref} (${pct(ex.invoice_ref_confidence)})`);
  if (ex.deduction_amount !== null) parts.push(`deduction ${fmtRM(Math.round(ex.deduction_amount * 100), { cents: true })} (${pct(ex.deduction_confidence)})`);
  if (ex.intent === "other" && ex.amount === null) {
    log(s, "AI", "AI", "no payment or promise found", aiMeta);
    return handoffUnmatched(s, m.id, inv?.id ?? null, "What is this message about?");
  }
  log(s, "AI", "AI", parts.length ? parts.join(", ") : `says paid; ${ex.has_slip ? "slip unreadable" : "no slip"}`, { ...aiMeta, confidence: parts.length ? conf : undefined });
  if (!inv) return handoffUnmatched(s, m.id, null, "Which invoice is this payment for?");

  // M4: a field that failed the verbatim gate or sits below 0.85 confidence goes to a person.
  const lowConf = [
    ex.amount !== null && ex.amount_confidence < CONFIDENCE_MIN ? "amount" : null,
    ex.invoice_ref !== null && ex.invoice_ref_confidence < CONFIDENCE_MIN ? "invoice" : null,
    ex.deduction_amount !== null && ex.deduction_confidence < CONFIDENCE_MIN ? "deduction" : null,
  ].filter((f): f is string => f !== null);
  const payFields = gateFields.filter((f) => f !== "promised date");
  if (payFields.length || lowConf.length) {
    const why = [
      payFields.length ? `the quoted words for the ${payFields.join(" and ")} are not in the message` : null,
      lowConf.length ? `the ${lowConf.join(" and ")} ${lowConf.length > 1 ? "are" : "is"} below ${CONFIDENCE_MIN} confidence` : null,
    ].filter(Boolean);
    handoffUnmatched(s, m.id, inv.id, `Check what ${c.contact} said about ${inv.number}: ${why.join("; ")}.`);
  }

  const amount = ex.amount !== null ? Math.round(ex.amount * 100) : outstanding(inv);
  const line = findBankLine(s, amount, m.receivedAt, c, inv);
  inv.openClaimMessageId = m.id;
  if (!line) {
    log(s, "RULE", "M1", "no bank line: claim not verified, not marked paid", { rule: "M1", refs: [inv.id] });
    addHandoff(s, {
      kind: "claim_unverified",
      messageId: m.id,
      invoiceId: inv.id,
      question: `${c.contact} says ${inv.number} is paid, but no matching bank line exists.`,
      options: ["send_reply", "mark_paid_anyway"],
      draftReply: REPLY_ASK_SLIP[c.lang](c.contact),
    });
    return;
  }
  log(s, "RULE", "M1", "claim VERIFIED against bank line", { rule: "M1", refs: [inv.id, line.id] });

  const deduction = ex.deduction_amount !== null ? Math.round(ex.deduction_amount * 100) : 0;
  let linkedDo: string | null = null;
  if (deduction) {
    linkedDo = linkDeduction(ex.deduction_reason ?? "", inv);
    log(s, "RULE", "M3", linkedDo ? `deduction linked to ${linkedDo} (${inv.delivery.destination})` : "deduction not linked to any delivery", { rule: "M3", refs: [inv.id] });
  }
  const fits = amount === outstanding(inv) || amount + deduction === outstanding(inv);
  if (!fits) {
    handoffUnmatched(s, m.id, inv.id, `Payment ${fmtRM(amount)} does not match ${inv.number} (${fmtRM(outstanding(inv))} outstanding).`);
  }
  s.receipts.push({
    id: nextId(s, "RC"),
    messageId: m.id,
    invoiceId: inv.id,
    amount,
    bankLineId: line.id,
    status: "proposed",
    approvedBy: null,
    deduction: deduction
      ? { amount: deduction, reason: ex.deduction_reason ?? "", quote: ex.deduction_quote ?? "", linkedDo, status: "pending", decidedBy: null }
      : null,
  });
}

function addHandoff(s: State, h: Omit<Handoff, "id" | "resolved" | "resolvedBy">) {
  s.handoffs.push({ ...h, id: nextId(s, "H"), resolved: null, resolvedBy: null });
}

function handoffUnmatched(s: State, messageId: string, invoiceId: string | null, question: string) {
  addHandoff(s, { kind: "unmatched", messageId, invoiceId, question, options: ["dismiss"], draftReply: null });
  log(s, "RULE", "M4", `hand-off raised: ${question}`, { rule: "M4", refs: invoiceId ? [invoiceId] : [] });
}

function setPromise(s: State, invoiceId: string, date: string, messageId: string) {
  const inv = invoiceOf(s, invoiceId);
  inv.promise = { date, messageId };
  log(s, "RULE", "M5", `reminders paused for ${inv.number} until ${fmtDate(addDays(date, 1))}`, { rule: "M5", refs: [inv.id] });
}

function coverageChanges(s: State, before: ReturnType<typeof forecast>) {
  const after = forecast(s);
  for (const b of before) {
    const a = after.find((x) => x.outflowId === b.outflowId);
    if (a && b.forecast < 0 && a.forecast >= 0) {
      log(s, "SYSTEM", "SYSTEM", `${fmtDate(a.dueDate)} ${a.short}: covered (${fmtRM(a.forecast, { sign: true })})`);
    }
    // Only a lower bank balance (FR-A4) can open a new gap; a receipt never does.
    if (a && b.forecast >= 0 && a.forecast < 0) {
      log(s, "SYSTEM", "SYSTEM", `${fmtDate(a.dueDate)} ${a.short}: now short ${fmtRM(a.gap)}`);
    }
  }
}

/* ---------- FR-C9 card actions ---------- */

/** Snooze, dispute and "I'll call instead" follow the approve rules (FR-C6): Tier 0/1 either role, Tier 2 Owner only. */
function cardRow(s: State, invoiceId: string) {
  const row = chasePlan(s).find((r) => r.invoice.id === invoiceId);
  if (!row || row.state !== "remind" || row.tier === null || row.tier > 2) return refuse("This invoice has no reminder to act on right now.");
  if (!canApprove(row.tier, s.role)) refuse("Only the Owner can act on a firm (Tier 2) reminder.");
  return { tier: row.tier, inv: invoiceOf(s, invoiceId) };
}

/* ---------- apply ---------- */

export function apply(prev: State, action: Action): Result {
  if (action.type === "RESET") return { state: seedState() };
  const s: State = structuredClone(prev);
  try {
    switch (action.type) {
      case "SET_ROLE":
        s.role = action.role;
        break;

      case "RUN_SCAN":
        if (s.scannedDays.includes(dayOf(s.now))) refuse("Today's scan has already run.");
        runScan(s);
        break;

      case "ADVANCE":
        advance(s, action.to);
        break;

      case "CHOOSE_WARNING_OPTION": {
        requireOwner(s, "act on an early warning");
        const w = s.warnings.find((x) => x.id === action.warningId) ?? refuse("Unknown warning.");
        if (!w.chosen.includes(action.option)) {
          w.chosen.push(action.option);
          log(s, "USER", me(s), `early-warning option chosen: ${action.option.charAt(0).toLowerCase()}${action.option.slice(1)}`, { refs: [w.id] });
        }
        break;
      }

      case "APPROVE_REMINDER": {
        const row = chasePlan(s).find((r) => r.invoice.id === action.invoiceId);
        if (!row || row.state !== "remind" || row.tier === null || row.tier > 2) refuse("This invoice has no reminder to approve right now.");
        const tier = row!.tier!;
        if (!canApprove(tier, s.role)) refuse("Only the Owner can approve a firm (Tier 2) reminder.");
        const inv = invoiceOf(s, action.invoiceId);
        const queued = inQuietHours(s.now);
        inv.reminders.push({ tier, at: s.now, answered: false, by: me(s), text: action.text, status: queued ? "queued" : "sent" });
        log(s, "USER", me(s), `approved Tier ${tier} ${inv.number}, ${queued ? "queued until 08:00 (S1)" : "sent"}${action.edited ? " (text edited)" : ""}`, { refs: [inv.id] });
        break;
      }

      case "ESCALATION_DECISION": {
        requireOwner(s, "decide an escalation");
        const inv = invoiceOf(s, action.invoiceId);
        log(s, "USER", me(s), `escalation for ${inv.number}: ${action.decision}`, { refs: [inv.id] });
        break;
      }

      case "ENTER_BOOKING": {
        const c = customerOf(s, action.customerId);
        const hold = action.terms === "credit" && needsCreditCheck(s, c.id);
        const exp = creditExposure(s, c.id);
        const b: Booking = {
          id: nextId(s, "BK"),
          customerId: c.id,
          route: action.route,
          amount: action.amount,
          terms: action.terms,
          creditDays: action.creditDays,
          createdAt: s.now,
          createdBy: me(s),
          status: hold ? "on_hold" : "accepted",
          decidedBy: null,
          depositPct: null,
          checkInvoiceId: hold ? exp.worstInvoice!.id : null,
        };
        s.bookings.push(b);
        log(s, "USER", me(s), `entered booking: ${c.name}, ${fmtRM(b.amount)}, ${b.terms}`, { refs: [b.id] });
        if (hold) {
          log(s, "RULE", "R4", `credit check raised: ${exp.worstInvoice!.number} ${exp.worstDays} days late, total ${fmtRM(exp.owed + b.amount)}`, { rule: "R4", refs: [b.id] });
        }
        break;
      }

      case "DECIDE_CREDIT": {
        requireOwner(s, "decide a credit check");
        const b = s.bookings.find((x) => x.id === action.bookingId) ?? refuse("Unknown booking.");
        if (b.status !== "on_hold") refuse("This booking is not on hold.");
        b.status = action.decision;
        b.decidedBy = me(s);
        b.depositPct = action.decision === "deposit_requested" ? (action.depositPct ?? 50) : null;
        const words: Record<CreditDecision, string> = {
          accepted: "accept on credit",
          deposit_requested: `ask ${b.depositPct}% deposit`,
          cod: "cash on delivery",
          call_first: "call first",
        };
        log(s, "USER", me(s), `credit decision: ${words[action.decision]}`, { refs: [b.id] });
        break;
      }

      case "APPLY_EXTRACTION":
        applyExtraction(s, action);
        break;

      case "RESOLVE_HANDOFF": {
        const h = s.handoffs.find((x) => x.id === action.handoffId) ?? refuse("Unknown hand-off.");
        if (h.resolved) refuse("Already resolved.");
        if (h.kind === "promise_date") {
          // No candidates (e.g. the date failed the verbatim gate): the person types the date.
          const typedDate = h.options.length === 0 && /^\d{4}-\d{2}-\d{2}$/.test(action.option);
          if (!h.options.includes(action.option) && !typedDate) refuse("Pick one of the offered dates.");
          h.resolved = action.option;
          h.resolvedBy = me(s);
          log(s, "USER", me(s), `confirmed promise date ${fmtDate(action.option)} for ${invoiceOf(s, h.invoiceId!).number}`, { refs: [h.invoiceId!] });
          setPromise(s, h.invoiceId!, action.option, h.messageId);
        } else if (h.kind === "claim_unverified") {
          if (action.option === "mark_paid_anyway") {
            requireOwner(s, "mark an invoice paid without a bank line");
            const inv = invoiceOf(s, h.invoiceId!);
            inv.paid = inv.amount;
            inv.status = "paid";
            inv.openClaimMessageId = null;
            log(s, "USER", me(s), `marked ${inv.number} paid without a bank line (owner override)`, { refs: [inv.id] });
          } else {
            log(s, "USER", me(s), "sent templated reply asking for the slip", { refs: [h.messageId] });
          }
          h.resolved = action.option;
          h.resolvedBy = me(s);
        } else {
          h.resolved = action.option;
          h.resolvedBy = me(s);
          log(s, "USER", me(s), `resolved hand-off: ${h.question}`, { refs: [h.messageId] });
        }
        break;
      }

      case "APPROVE_RECEIPT": {
        const r = s.receipts.find((x) => x.id === action.receiptId) ?? refuse("Unknown receipt.");
        if (r.status !== "proposed") refuse("Already approved.");
        const inv = invoiceOf(s, r.invoiceId);
        const deduction = r.deduction?.amount ?? 0;
        const exact = r.amount === outstanding(inv) || r.amount + deduction === outstanding(inv);
        if (!exact) requireOwner(s, "approve a payment that does not match the invoice");
        const before = forecast(s);
        r.status = "approved";
        r.approvedBy = me(s);
        inv.paid += r.amount;
        s.approvedReceiptTotal += r.amount;
        s.bankLines.find((b) => b.id === r.bankLineId)!.matchedInvoiceId = inv.id;
        if (outstanding(inv) === 0) {
          inv.status = "paid";
          inv.openClaimMessageId = null;
        } else {
          inv.status = "part_paid";
          if (!r.deduction) inv.openClaimMessageId = null;
        }
        const tail = r.deduction && outstanding(inv) > 0 ? `, ${fmtRM(r.deduction.amount)} under review` : "";
        log(s, "USER", me(s), `approved receipt ${fmtRM(r.amount)}: ${inv.number} ${inv.status.toUpperCase()}${tail}`, { refs: [inv.id, r.id] });
        coverageChanges(s, before);
        break;
      }

      case "DECIDE_DEDUCTION": {
        requireOwner(s, "accept or reject a deduction");
        const r = s.receipts.find((x) => x.id === action.receiptId) ?? refuse("Unknown receipt.");
        const ded = r.deduction;
        if (!ded || ded.status !== "pending") return refuse("No pending deduction.");
        if (r.status !== "approved") refuse("Approve the receipt first.");
        const inv = invoiceOf(s, r.invoiceId);
        ded.status = action.decision;
        ded.decidedBy = me(s);
        inv.openClaimMessageId = null;
        if (action.decision === "accepted") {
          const cn = { id: nextId(s, "CN"), invoiceId: inv.id, amount: ded.amount, reason: ded.reason, at: s.now };
          s.creditNotes.push(cn);
          inv.amount -= ded.amount;
          inv.status = outstanding(inv) === 0 ? "paid" : "part_paid";
          log(s, "USER", me(s), `accepted ${fmtRM(cn.amount)} deduction: ${inv.number} ${inv.status.toUpperCase()}, credit note ${cn.id} drafted (not submitted)`, { refs: [inv.id, cn.id] });
        } else {
          log(s, "USER", me(s), `rejected ${fmtRM(ded.amount)} deduction: still owed on ${inv.number}`, { refs: [inv.id] });
        }
        break;
      }

      case "REJECT_CLAIM": {
        // PRD §22 row 2: an "already paid" claim with no bank line would otherwise pause reminders forever (M5).
        requireOwner(s, "reject a payment claim");
        const inv = s.invoices.find((i) => i.id === action.invoiceId) ?? refuse("Unknown invoice.");
        const messageId = inv.openClaimMessageId ?? refuse("This invoice has no open payment claim.");
        if (s.receipts.some((r) => r.invoiceId === inv.id && r.messageId === messageId)) {
          refuse("This claim matched a bank line; decide the receipt instead.");
        }
        inv.openClaimMessageId = null;
        for (const h of s.handoffs) {
          if (h.kind === "claim_unverified" && h.messageId === messageId && !h.resolved) {
            h.resolved = "reject_claim";
            h.resolvedBy = me(s);
          }
        }
        log(s, "USER", me(s), `rejected unverified claim on ${inv.number}: not in the bank, reminders resume (M5)`, { refs: [inv.id, messageId] });
        break;
      }

      case "IMPORT_INVOICES": {
        requireRole(s, ["owner", "clerk"], "import invoices");
        const p = parseInvoiceCsv(action.csv, s);
        if (p.error) refuse(p.error);
        if (!p.rows.length) refuse("No valid rows to import.");
        for (const r of p.rows) {
          s.invoices.push({
            id: r.number,
            number: r.number,
            customerId: r.customerId,
            amount: r.amount,
            paid: 0,
            issueDate: r.issueDate,
            dueDate: r.dueDate,
            termsDays: r.termsDays,
            status: r.status,
            delivery: { ...r.delivery, date: r.issueDate },
            reminders: [],
            promise: null,
            openClaimMessageId: null,
            snooze: null,
            calls: [],
          });
        }
        const skipped = p.invalid.length ? `; ${plural(p.invalid.length, "row")} not imported` : "";
        log(s, "USER", me(s), `imported ${plural(p.rows.length, "invoice")} from CSV: ${p.rows.map((r) => r.number).join(", ")}${skipped}`, {
          refs: p.rows.map((r) => r.number),
        });
        break;
      }

      case "ENTER_BANK_BALANCE": {
        requireOwner(s, "enter the bank balance");
        if (!Number.isInteger(action.amount) || action.amount < 0) refuse("Enter the balance as an amount of zero or more.");
        const before = forecast(s);
        s.bankBalance = { amount: action.amount, enteredAt: s.now, enteredBy: me(s) };
        // F1 (P0): cash = the latest entered balance + receipts approved after it.
        s.approvedReceiptTotal = 0;
        log(s, "USER", me(s), "entered today's bank balance (FR-A4)");
        // The figure sits on a SYSTEM line, which the activity log redacts for the Clerk (FR-B5).
        log(s, "SYSTEM", "SYSTEM", `bank balance ${fmtRM(action.amount, { cents: true })}, entered by ${me(s)}`);
        coverageChanges(s, before);
        break;
      }

      case "IMPORT_BANK_STATEMENT": {
        // Either role may import (§9.3: the Clerk approves VERIFIED matches); debits stay Owner only.
        requireRole(s, ["owner", "clerk"], "import a bank statement");
        const p = parseBankCsv(action.csv, s);
        if (p.error) refuse(p.error);
        if (!p.credits.length && !p.debits.length) refuse("No valid lines to import.");
        const credits = p.credits.map((r) => toBankLine(r, nextId(s, "BL")));
        s.bankLines.push(...credits);
        s.bankLines.sort((a, b) => a.at.localeCompare(b.at));
        s.bankDebits.push(...p.debits.map((r) => toBankLine(r, nextId(s, "BD"))));
        const debits = p.debits.length ? `, ${plural(p.debits.length, "debit line")} kept for the Owner` : "";
        const skipped = p.invalid.length ? `; ${plural(p.invalid.length, "row")} not imported` : "";
        log(s, "USER", me(s), `imported bank statement: ${plural(credits.length, "credit line")} for matching (M1)${debits}${skipped}`);
        for (const b of credits) {
          const amt = fmtRM(b.amount, { cents: true }).replace("RM", "");
          log(s, "BANK", "BANK", `line ${b.at.slice(8, 10)}/${b.at.slice(5, 7)} ${amt} ${b.description} (imported)`, { refs: [b.id] });
        }
        break;
      }

      case "SNOOZE_REMINDER": {
        const { tier, inv } = cardRow(s, action.invoiceId);
        const today = dayOf(s.now);
        if (parseDate(action.until) !== action.until || action.until <= today || action.until > addDays(today, HORIZON_DAYS)) {
          refuse(`Pick a snooze date after today and within ${HORIZON_DAYS} days.`);
        }
        inv.snooze = { until: action.until, by: me(s) };
        log(s, "USER", me(s), `snoozed Tier ${tier} ${inv.number} until ${fmtDate(action.until)}`, { refs: [inv.id] });
        break;
      }

      case "MARK_DISPUTED": {
        const { inv } = cardRow(s, action.invoiceId);
        inv.status = "disputed";
        log(s, "USER", me(s), `marked ${inv.number} disputed: reminders paused (M5)`, { refs: [inv.id] });
        break;
      }

      case "CALL_INSTEAD": {
        const { tier, inv } = cardRow(s, action.invoiceId);
        inv.calls.push({ at: s.now, by: me(s) });
        log(s, "USER", me(s), `will call instead of sending Tier ${tier} ${inv.number}: phone follow-up recorded`, { refs: [inv.id] });
        break;
      }
    }
  } catch (e) {
    if (e instanceof Refused) return { state: prev, error: e.message };
    throw e;
  }
  return { state: s };
}

/** Convenience for tests and scripts: apply a list of actions, fail on refusal. */
export function run(state: State, actions: Action[]): State {
  return actions.reduce((st, a) => {
    const r = apply(st, a);
    if (r.error) throw new Error(`${a.type}: ${r.error}`);
    return r.state;
  }, state);
}

export { shortfalls };
