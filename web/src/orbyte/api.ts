// Response builders for the simulated Orbyte API and Kutip's own API. The
// route handlers in app/api only wrap these, so tests can call either.
import { replayDemo } from "./replay";
import { toKutipEvents } from "./connector";
import { ORBYTE_WORKSPACE, orbyteWorkspace } from "./mock-data";
import { KUTIP_EVENT_TYPES, type OrbyteEnvelope } from "./types";

export const SIMULATED_HEADERS = { "x-simulated": "true", "cache-control": "no-store" } as const;

export const ORBYTE_RESOURCES = ["clients", "projects", "users", "wallet"] as const;
export type OrbyteResource = (typeof ORBYTE_RESOURCES)[number];

export function orbyteMockResponse(resource: string): { status: number; body: OrbyteEnvelope<unknown> | Record<string, unknown> } {
  if (!(ORBYTE_RESOURCES as readonly string[]).includes(resource)) {
    return {
      status: 404,
      body: { simulated: true, error: "not_found", message: `Unknown Orbyte resource "${resource}"`, resources: ORBYTE_RESOURCES },
    };
  }
  const w = orbyteWorkspace();
  const result = w[resource as OrbyteResource];
  return { status: 200, body: { simulated: true, data: "synthetic", resource, workspace: ORBYTE_WORKSPACE, result } };
}

export const KUTIP_API_VERSION = "0.1.0";

export function kutipManifest() {
  return {
    simulated: true,
    data: "synthetic",
    name: "kutip",
    displayName: "Kutip",
    version: KUTIP_API_VERSION,
    description:
      "Cash-collection module for an Orbyte workspace: warns before payroll day, chases invoices in the customer's language, holds credit for late payers, and checks payment claims against the bank (Bukti). AI only extracts fields; people approve every money decision.",
    orbyte: {
      reads: [
        { object: "Organization.Clients", endpoint: "GET /v1/clients", use: "customer names, contact person, WhatsApp, language" },
        { object: "Organization.Projects", endpoint: "GET /v1/projects", use: "delivery jobs (DO number, route) behind each invoice" },
        { object: "Organization.Users", endpoint: "GET /v1/users", use: "people and their Orbyte role, mapped to a Kutip role" },
        { object: "Organization.Wallet", endpoint: "GET /v1/wallet", use: "per-use credits balance (illustrative)" },
      ],
      writes: [
        { object: "Approvals", use: "reminders, receipts, deductions, credit checks and hand-off questions waiting for a person" },
        { object: "Audit trail", use: "every Kutip activity-log line, with actor, rule and refs" },
        { object: "Wallet", use: "debits per invoice chased and per slip read (illustrative prices)" },
      ],
    },
    roles: [
      {
        orbyteRole: "Owner",
        kutipRole: "owner",
        permissions: [
          "see bank balance, payroll total and gap amounts",
          "approve Tier 0-2 reminders",
          "decide credit checks",
          "approve any receipt",
          "accept or reject deductions",
          "mark paid without a bank line",
          "enter the bank balance",
          "sync from Orbyte",
        ],
      },
      {
        orbyteRole: "Finance clerk",
        kutipRole: "clerk",
        permissions: [
          "see invoices and aging (no cash or gap figures)",
          "approve Tier 0-1 reminders",
          "approve zero-difference verified receipts",
          "resolve hand-off questions",
          "import invoices and bank credit lines",
          "sync from Orbyte",
        ],
      },
    ],
    events: KUTIP_EVENT_TYPES,
    webhooks: KUTIP_EVENT_TYPES.map((t) => `kutip.${t}`),
    endpoints: ["GET /api/kutip/v1/manifest", "GET /api/kutip/v1/events"],
  };
}

export function kutipEventsResponse() {
  const events = toKutipEvents(replayDemo());
  return {
    simulated: true,
    data: "synthetic",
    source: "PRD §13 demo script replayed on the seed with the Kutip engine",
    count: events.length,
    events,
  };
}
