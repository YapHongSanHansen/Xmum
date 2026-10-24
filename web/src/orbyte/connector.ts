// The Orbyte connector: Kutip's one seam to Orbyte. Today it reads the
// simulated Orbyte API (/api/orbyte-mock/v1); a real Orbyte API means a new
// base URL and an auth header, nothing else. The mapping helpers below are
// pure and deterministic: (Kutip state or log) → Orbyte-shaped records.
import { customerOf, fmtDate, fmtRM, type LogEntry, type Role, type State } from "../engine/model";
import { chasePlan } from "../engine/rules";
import { orbyteClientId, orbyteWorkspace } from "./mock-data";
import type {
  KutipEvent,
  KutipEventType,
  OrbyteApprovalRequest,
  OrbyteAuditEvent,
  OrbyteClient,
  OrbyteEnvelope,
  OrbyteProject,
  OrbyteSnapshot,
  OrbyteUser,
  OrbyteWallet,
} from "./types";

export interface OrbyteConnector {
  getClients(): Promise<OrbyteClient[]>;
  getProjects(): Promise<OrbyteProject[]>;
  getUsers(): Promise<OrbyteUser[]>;
  getWallet(): Promise<OrbyteWallet>;
}

/** Reads Orbyte over HTTP. Pass `headers` (e.g. Authorization) for a real Orbyte API. */
export function httpOrbyteConnector(
  baseUrl: string,
  opts: { headers?: Record<string, string>; fetchImpl?: typeof fetch } = {},
): OrbyteConnector {
  const base = baseUrl.replace(/\/+$/, "");
  const doFetch = opts.fetchImpl ?? fetch;
  async function get<T>(resource: string): Promise<T> {
    const res = await doFetch(`${base}/${resource}`, { headers: { accept: "application/json", ...opts.headers }, cache: "no-store" });
    if (!res.ok) throw new Error(`Orbyte ${resource}: HTTP ${res.status}`);
    const body = (await res.json()) as OrbyteEnvelope<T>;
    if (!body || typeof body !== "object" || !("result" in body)) throw new Error(`Orbyte ${resource}: unexpected response`);
    return body.result;
  }
  return {
    getClients: () => get<OrbyteClient[]>("clients"),
    getProjects: () => get<OrbyteProject[]>("projects"),
    getUsers: () => get<OrbyteUser[]>("users"),
    getWallet: () => get<OrbyteWallet>("wallet"),
  };
}

/** In-process connector over the same synthetic workspace (tests, scripts). */
export function localOrbyteConnector(): OrbyteConnector {
  const w = orbyteWorkspace();
  return {
    getClients: async () => w.clients,
    getProjects: async () => w.projects,
    getUsers: async () => w.users,
    getWallet: async () => w.wallet,
  };
}

export async function readOrbyte(c: OrbyteConnector): Promise<OrbyteSnapshot> {
  const [clients, projects, users, wallet] = await Promise.all([c.getClients(), c.getProjects(), c.getUsers(), c.getWallet()]);
  return { clients, projects, users, wallet };
}

/* ---------- Orbyte → Kutip ---------- */

export interface ClientRow {
  client: OrbyteClient;
  /** Kutip customer name, or null if the client has no Kutip customer. */
  kutipName: string | null;
  openInvoices: number;
}

/** Orbyte clients joined to Kutip customers, with each one's open invoice count. */
export function clientRows(s: State, clients: OrbyteClient[]): ClientRow[] {
  return clients.map((client) => {
    const c = s.customers.find((x) => x.id === client.kutipCustomerId);
    return {
      client,
      kutipName: c?.name ?? null,
      openInvoices: s.invoices.filter((i) => i.customerId === client.kutipCustomerId && i.status !== "paid").length,
    };
  });
}

/* ---------- Kutip → Orbyte ---------- */

/** FR-B5: the Clerk never sees cash or gap figures; same rule as the activity log page. */
const redactForClerk = (e: LogEntry) =>
  e.kind === "SYSTEM" || e.rule === "R6" ? e.text.replace(/[−+-]?RM[\d,.]+/g, "RM•••") : e.text;

/** Activity log → Orbyte audit trail. For the Clerk, cash and gap figures are redacted. */
export function toOrbyteAudit(log: LogEntry[], role: Role = "owner"): OrbyteAuditEvent[] {
  return log.map((e) => ({
    id: `ORB-AU-${String(e.seq).padStart(4, "0")}`,
    at: e.at,
    actor: e.actor,
    action: role === "clerk" ? redactForClerk(e) : e.text,
    refs: e.refs ?? [],
    source: "kutip",
  }));
}

/**
 * Activity log → KutipEvents, in log order. Deterministic: the same state
 * gives the same events. `data` carries no bank balance, payroll or gap
 * amounts; only invoice, receipt and credit-note amounts appear.
 */
export function toKutipEvents(s: State): KutipEvent[] {
  const out: KutipEvent[] = [];
  const openGaps = new Set<string>();
  let warningIx = 0;
  const invNo = (id: string | undefined) => s.invoices.find((i) => i.id === id)?.number ?? id ?? null;

  for (const e of s.log) {
    const base = `KE-${String(e.seq).padStart(4, "0")}`;
    let n = 0;
    const emit = (type: KutipEventType, refs: string[], data: KutipEvent["data"]) => {
      out.push({ id: n++ === 0 ? base : `${base}-${n}`, type, at: e.at, refs, data });
    };
    const refs = e.refs ?? [];

    if (e.kind === "SYSTEM") {
      for (const o of s.outflows) {
        const key = `${fmtDate(o.dueDate)} ${o.short}`;
        const short = (e.text.startsWith("scan:") && e.text.includes(`${key} short`)) || e.text.startsWith(`${key}: now short`);
        if (short && !openGaps.has(o.id)) {
          openGaps.add(o.id);
          emit("gap.detected", [o.id], { outflow: o.short, dueDate: o.dueDate });
        }
        if (e.text.startsWith(`${key}: covered`)) openGaps.delete(o.id);
      }
      continue;
    }
    if (e.rule === "R6") {
      const w = s.warnings[warningIx++];
      const o = w && s.outflows.find((x) => x.id === w.outflowId);
      emit("warning.raised", w ? [w.id, w.outflowId] : [], { outflow: o?.short ?? null, dueDate: o?.dueDate ?? null });
      continue;
    }
    if (e.rule === "R4") {
      const b = s.bookings.find((x) => x.id === refs[0]);
      emit("credit.held", refs, { booking: refs[0] ?? null, client: b ? orbyteClientId(b.customerId) : null, route: b?.route ?? null });
      continue;
    }
    if (e.rule === "S1" && e.text.startsWith("released queued")) {
      const m = /Tier (\d) reminder for (\S+)/.exec(e.text);
      emit("reminder.sent", refs, { invoice: m?.[2] ?? null, tier: m ? +m[1] : null, approvedBy: null });
      continue;
    }
    if (e.rule === "M1") {
      if (e.text.startsWith("claim VERIFIED")) {
        const r = s.receipts.find((x) => x.invoiceId === refs[0] && x.bankLineId === refs[1]);
        emit("proof.verified", refs, { invoice: invNo(refs[0]), bankLine: refs[1] ?? null, amount: r?.amount ?? null });
      } else if (e.text.startsWith("no bank line")) {
        emit("claim.unverified", refs, { invoice: invNo(refs[0]) });
      }
      continue;
    }
    if (e.kind !== "USER") continue;

    const sent = /^approved Tier (\d) (\S+), sent/.exec(e.text);
    if (sent) {
      emit("reminder.sent", refs, { invoice: sent[2], tier: +sent[1], approvedBy: e.actor });
    } else if (e.text.startsWith("credit decision:")) {
      emit("credit.decided", refs, { booking: refs[0] ?? null, decision: e.text.slice("credit decision: ".length), decidedBy: e.actor });
    } else if (e.text.startsWith("approved receipt")) {
      const r = s.receipts.find((x) => x.id === refs[1]);
      emit("receipt.approved", refs, { invoice: invNo(refs[0]), receipt: refs[1] ?? null, amount: r?.amount ?? null, approvedBy: e.actor });
    } else if (/^accepted .* deduction/.test(e.text)) {
      const cn = s.creditNotes.find((x) => x.id === refs[1]);
      emit("deduction.accepted", refs, { invoice: invNo(refs[0]), creditNote: refs[1] ?? null, amount: cn?.amount ?? null, decidedBy: e.actor });
    }
  }
  return out;
}

/** What Kutip would place in Orbyte's shared approvals inbox right now. No cash or gap figures. */
export function pendingOrbyteApprovals(s: State): OrbyteApprovalRequest[] {
  const out: OrbyteApprovalRequest[] = [];
  const add = (r: Omit<OrbyteApprovalRequest, "id" | "module">) => out.push({ id: `ORB-AP-${String(out.length + 1).padStart(4, "0")}`, module: "kutip", ...r });

  for (const row of chasePlan(s)) {
    if (row.state !== "remind" || row.tier === null || row.tier > 2) continue;
    add({
      kind: "reminder",
      title: `Tier ${row.tier} reminder · ${row.invoice.number} · ${customerOf(s, row.invoice.customerId).name}`,
      requiredRole: row.tier === 2 ? "Owner" : "Finance clerk",
      refs: [row.invoice.id],
    });
  }
  for (const r of s.receipts) {
    const inv = s.invoices.find((i) => i.id === r.invoiceId);
    if (!inv) continue;
    if (r.status === "proposed") {
      const owed = inv.amount - inv.paid;
      const exact = r.amount === owed || r.amount + (r.deduction?.amount ?? 0) === owed;
      add({ kind: "receipt", title: `Receipt ${fmtRM(r.amount)} · ${inv.number}`, requiredRole: exact ? "Finance clerk" : "Owner", refs: [inv.id, r.id] });
    } else if (r.deduction?.status === "pending") {
      add({ kind: "deduction", title: `Deduction ${fmtRM(r.deduction.amount)} · ${inv.number}`, requiredRole: "Owner", refs: [inv.id, r.id] });
    }
  }
  for (const b of s.bookings.filter((x) => x.status === "on_hold")) {
    add({ kind: "credit_check", title: `Credit check · ${customerOf(s, b.customerId).name} · ${b.route}`, requiredRole: "Owner", refs: [b.id] });
  }
  for (const h of s.handoffs.filter((x) => !x.resolved)) {
    add({ kind: "hand_off", title: h.question, requiredRole: "Finance clerk", refs: [h.id, ...(h.invoiceId ? [h.invoiceId] : [])] });
  }
  return out;
}
