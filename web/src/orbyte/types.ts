// Kachingg's assumptions about Orbyte's API (docs/orbyte-integration.md). Orbyte
// has no public API, so every shape here is the team's own assumption, served
// today by a simulated Orbyte (/api/orbyte-mock/v1) full of synthetic data.
// Money is integer sen, like the rest of Kachingg. Times are local MYT strings.
import type { Lang, Role } from "../engine/model";

/** Orbyte's role names for the two people in the demo workspace. */
export type OrbyteRole = "Owner" | "Finance clerk";

/** Organization → Clients. One per Kachingg customer. */
export interface OrbyteClient {
  /** e.g. "ORB-CL-0001" */
  id: string;
  /** Explicit link to Kachingg's customer record. */
  kachinggCustomerId: string;
  name: string;
  contactPerson: string;
  /** Fictional numbers (+60 12-000 0xxx). */
  whatsapp: string;
  language: Lang;
  tags: string[];
}

export type OrbyteProjectStatus = "in_progress" | "completed" | "invoiced";

/** Organization → Projects. For a haulage firm, one delivery job per project. */
export interface OrbyteProject {
  /** e.g. "ORB-PJ-0001" */
  id: string;
  clientId: string;
  /** e.g. "DO-8812 Shah Alam → Bukit Raja" */
  name: string;
  doNumber: string;
  status: OrbyteProjectStatus;
  /** Job value in sen. */
  value: number;
  /** The Kachingg invoice raised for this job, if any. */
  invoiceNumber: string | null;
}

/** Organization → Users, with the Kachingg role each Orbyte role maps to. */
export interface OrbyteUser {
  /** e.g. "ORB-US-0001" */
  id: string;
  kachinggUserId: string;
  name: string;
  orbyteRole: OrbyteRole;
  kachinggRole: Role;
}

export interface OrbyteWalletTransaction {
  id: string;
  at: string;
  description: string;
  /** Positive = top-up, negative = spent. */
  credits: number;
}

/** Organization → Wallet: Orbyte's per-use credits (illustrative). */
export interface OrbyteWallet {
  balance: number;
  unit: "credits";
  transactions: OrbyteWalletTransaction[];
}

export type OrbyteApprovalKind = "reminder" | "receipt" | "deduction" | "credit_check" | "hand_off";

/** A decision Kachingg would place in Orbyte's shared approvals inbox. */
export interface OrbyteApprovalRequest {
  id: string;
  module: "kachingg";
  kind: OrbyteApprovalKind;
  title: string;
  /** Lowest Orbyte role allowed to decide it ("Finance clerk" = either role). */
  requiredRole: OrbyteRole;
  refs: string[];
}

/** One Kachingg activity-log line, written to Orbyte's audit trail. */
export interface OrbyteAuditEvent {
  id: string;
  at: string;
  actor: string;
  action: string;
  refs: string[];
  source: "kachingg";
}

export const KACHINGG_EVENT_TYPES = [
  "gap.detected",
  "warning.raised",
  "credit.held",
  "credit.decided",
  "reminder.sent",
  "proof.verified",
  "receipt.approved",
  "deduction.accepted",
  "claim.unverified",
] as const;

export type KachinggEventType = (typeof KACHINGG_EVENT_TYPES)[number];

/**
 * An event Kachingg emits for Orbyte (or any other module) to consume. `data`
 * never carries bank balance, payroll or gap amounts; the only amounts are
 * invoice, receipt and credit-note amounts.
 */
export interface KachinggEvent {
  id: string;
  type: KachinggEventType;
  at: string;
  refs: string[];
  data: Record<string, string | number | boolean | null>;
}

/** Envelope every simulated Orbyte response uses. */
export interface OrbyteEnvelope<T> {
  simulated: true;
  data: "synthetic";
  resource: string;
  workspace: string;
  result: T;
}

export interface OrbyteSnapshot {
  clients: OrbyteClient[];
  projects: OrbyteProject[];
  users: OrbyteUser[];
  wallet: OrbyteWallet;
}
