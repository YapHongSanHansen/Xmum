# Kachingg as an Orbyte module (simulated integration)

## Why

The Domain 2 brief asks teams to:

> "Show how the Orbyte approach makes the solution easier to learn, integrate, govern and reuse … Create your own synthetic data and interface or API assumptions … you do not need access to the live platform."

and states:

> "No dataset, mock API, sandbox, production access … is provided. Create your own synthetic data, interfaces, data structures and API assumptions."

Its good-to-have list includes: "Reusable building block: create a connector, module or API that other solutions could build on."

Orbyte has no public API. So Kachingg is built as an Orbyte module against **our own documented API assumptions** (this page), and runs against a **simulated Orbyte** that serves a synthetic workspace for the demo company, Lori Laju Logistics Sdn Bhd. Everything simulated is labelled "simulated" in the app and in every API response (`"simulated": true` in the body, `x-simulated: true` header).

Code: `web/src/orbyte/` (types, mock workspace, connector, mappers, demo replay), `web/src/app/api/orbyte-mock/v1/[resource]/route.ts` (simulated Orbyte), `web/src/app/api/kachingg/v1/*` (Kachingg's own API), and the Orbyte panel at the top of **Connect** (`web/src/components/connect/orbyte-panel.tsx`).

## What Kachingg reads from and writes to Orbyte

The object names follow Orbyte's navigation: Organization → Clients, Projects, Users, Wallet.

| Direction | Orbyte object | What Kachingg does with it |
|---|---|---|
| Reads | Clients | Customer name, contact person, WhatsApp, language. One Orbyte client per Kachingg customer, linked by `kachinggCustomerId` |
| Reads | Projects | Delivery jobs (DO number, route) behind each invoice, e.g. `DO-8812 Shah Alam → Bukit Raja` |
| Reads | Users | People and their Orbyte role, mapped to a Kachingg role |
| Reads | Wallet | Per-use credit balance (illustrative) |
| Writes | Audit trail | Every Kachingg activity-log line (`toOrbyteAudit`) |
| Writes | Approvals | Reminders, receipts, deductions, credit checks and hand-off questions waiting for a person (`pendingOrbyteApprovals`) |
| Writes | Wallet | Debits per invoice chased and per slip read (illustrative prices; not implemented as a write in the demo) |

**Sync from Orbyte** on Connect reads all four resources through `httpOrbyteConnector('/api/orbyte-mock/v1')` and dispatches the engine action `ORBYTE_SYNC` (Owner or Clerk). The engine logs it, e.g. `synced from Orbyte (simulated): 6 clients, 17 projects, 2 users`, at the demo-clock time. The sync changes no other state, so the seeded demo flow is unchanged.

## API assumptions

Money is integer sen; times are local Malaysia time strings (`2026-10-20T08:00`). Every simulated Orbyte response uses one envelope:

```json
{ "simulated": true, "data": "synthetic", "resource": "clients", "workspace": "Lori Laju Logistics Sdn Bhd", "result": [] }
```

Unknown resources return `404` with `{ "simulated": true, "error": "not_found", … }`.

### `GET /v1/clients` (simulated at `/api/orbyte-mock/v1/clients`)

```json
{
  "id": "ORB-CL-0001",
  "kachinggCustomerId": "c-megabina",
  "name": "Mega Bina Hardware Trading Sdn Bhd",
  "contactPerson": "Jessie",
  "whatsapp": "+60 12-000 0141",
  "language": "en",
  "tags": ["hardware", "credit 30d"]
}
```

### `GET /v1/projects`

```json
{
  "id": "ORB-PJ-0003",
  "clientId": "ORB-CL-0001",
  "name": "DO-8812 Shah Alam → Bukit Raja",
  "doNumber": "DO-8812",
  "status": "invoiced",
  "value": 310000,
  "invoiceNumber": "INV-2304"
}
```

`status` is `in_progress`, `completed` or `invoiced`. One project per seed delivery, plus two jobs not yet invoiced (`DO-8897`, `DO-8899`).

### `GET /v1/users`

```json
{ "id": "ORB-US-0001", "kachinggUserId": "u-owner", "name": "Lim Siew Lan", "orbyteRole": "Owner", "kachinggRole": "owner" }
```

### `GET /v1/wallet`

```json
{
  "balance": 1240,
  "unit": "credits",
  "transactions": [
    { "id": "ORB-WT-0001", "at": "2026-10-01T09:00", "description": "Monthly credit top-up (illustrative)", "credits": 1500 }
  ]
}
```

### Kachingg → Orbyte records

Approval request (`pendingOrbyteApprovals(state)`):

```json
{ "id": "ORB-AP-0003", "module": "kachingg", "kind": "reminder", "title": "Tier 2 reminder · INV-2268 · Syarikat Hup Seng Trading", "requiredRole": "Owner", "refs": ["INV-2268"] }
```

Audit event (`toOrbyteAudit(log, role)`):

```json
{ "id": "ORB-AU-0006", "at": "2026-10-20T08:00", "actor": "Nurul", "action": "approved Tier 1 INV-2304, sent", "refs": ["INV-2304"], "source": "kachingg" }
```

## Kachingg's own API (the reusable building block)

| Endpoint | Returns |
|---|---|
| `GET /api/kachingg/v1/manifest` | Module manifest: name, version, description, Orbyte objects it reads and writes, permissions per Orbyte role, events, webhook names |
| `GET /api/kachingg/v1/events` | Every `KachinggEvent` from replaying the full demo script on the seed with the pure engine. Deterministic; `"simulated": true`, `"data": "synthetic"` |

### Events

| Event | Emitted when | `data` |
|---|---|---|
| `gap.detected` | A scan first finds a bill the cash will not cover | `outflow`, `dueDate` (no amount) |
| `warning.raised` | An early warning is raised (R6) | `outflow`, `dueDate` (no amount) |
| `credit.held` | A credit booking is held for a check (R4) | `booking`, `client`, `route` |
| `credit.decided` | The Owner decides the credit check | `booking`, `decision`, `decidedBy` |
| `reminder.sent` | A reminder is approved and sent, or released after quiet hours (S1) | `invoice`, `tier`, `approvedBy` |
| `proof.verified` | A payment claim matches a bank line (M1) | `invoice`, `bankLine`, `amount` (receipt) |
| `receipt.approved` | A person approves the receipt | `invoice`, `receipt`, `amount`, `approvedBy` |
| `deduction.accepted` | The Owner accepts a deduction; a credit note is drafted | `invoice`, `creditNote`, `amount`, `decidedBy` |
| `claim.unverified` | A "paid" claim has no bank line; not marked paid | `invoice` |

```json
{ "id": "KE-0035", "type": "receipt.approved", "at": "2026-10-23T14:30", "refs": ["INV-2304", "RC-0001"], "data": { "invoice": "INV-2304", "receipt": "RC-0001", "amount": 277000, "approvedBy": "Nurul" } }
```

Events never carry the bank balance, payroll or gap amounts. The only amounts are invoice, receipt and credit-note amounts, which both roles already see.

## Role mapping

| Orbyte role | Kachingg role | Person (synthetic) |
|---|---|---|
| Owner | Owner | Lim Siew Lan |
| Finance clerk | Clerk | Nurul |

Permissions follow PRD §9.3. The Clerk never sees bank balance, payroll or gap amounts: on Connect the audit preview is redacted for the Clerk exactly as the activity log is, and the approvals preview carries no cash or gap figures.

## Simulated today vs a real Orbyte API

| | Today | With a real Orbyte API |
|---|---|---|
| Orbyte data | `/api/orbyte-mock/v1/*`, synthetic workspace in `web/src/orbyte/mock-data.ts` | Orbyte's API |
| Connector | `httpOrbyteConnector('/api/orbyte-mock/v1')` | `httpOrbyteConnector('<orbyte base URL>', { headers: { Authorization: … } })`, the key kept server-side |
| Field shapes | Our assumptions (`web/src/orbyte/types.ts`) | Adjust the types and the mapping if Orbyte's shapes differ |
| Audit trail, approvals | Previewed on Connect (`toOrbyteAudit`, `pendingOrbyteApprovals`) | Posted to Orbyte's audit and approvals APIs or webhooks |
| Events | Replay of the demo script | Emitted live as the engine logs each action |
| Roles | Mapped from the mock users | Mapped from Orbyte's org structure |

The engine, rules and UI do not change: only the connector's base URL and auth.

## Privacy

All data on this page and behind these endpoints is synthetic: fictional companies, people and `+60 12-000 0xxx` numbers; no real banks, receipts or customers. No secrets are used.

In a real deployment under Malaysia's PDPA 2010 (as amended in 2024), the SME is the data user and Kachingg acts as its processor. Kachingg would read only the client fields it needs to follow up invoices the customer has received, keep role-based access so a Clerk never sees cash figures, honour each contact's opt-out, and send Orbyte only audit lines and approval requests, never bank balances or payroll figures in events.
