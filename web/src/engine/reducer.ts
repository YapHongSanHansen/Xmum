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
  | { type: "DECIDE_DEDUCTION"; receiptId: string; decision: "accepted" | "rejected" };

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
  if (ex.amount !== null && ex.amount_source === "text" && !quoteIsVerbatim(ex.amount_quote, m.text)) {
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
    const cands = ex.promised_date_candidates;
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
  }
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
          inv.status = "paid";
          log(s, "USER", me(s), `accepted ${fmtRM(cn.amount)} deduction: ${inv.number} PAID, credit note ${cn.id} drafted (not submitted)`, { refs: [inv.id, cn.id] });
        } else {
          log(s, "USER", me(s), `rejected ${fmtRM(ded.amount)} deduction: still owed on ${inv.number}`, { refs: [inv.id] });
        }
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
