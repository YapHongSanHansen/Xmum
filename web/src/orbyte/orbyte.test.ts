// Orbyte integration: connector mapping, events from the demo replay, the
// ORBYTE_SYNC action, and the simulated route handlers.
import { describe, expect, it } from "vitest";
import { GET as orbyteGET } from "../app/api/orbyte-mock/v1/[resource]/route";
import { GET as manifestGET } from "../app/api/kachingg/v1/manifest/route";
import { GET as eventsGET } from "../app/api/kachingg/v1/events/route";
import { fmtRM } from "../engine/model";
import { apply } from "../engine/reducer";
import { seedState } from "../engine/seed";
import { playDemo } from "../engine/testkit";
import { clientRows, httpOrbyteConnector, localOrbyteConnector, pendingOrbyteApprovals, readOrbyte, toKachinggEvents, toOrbyteAudit } from "./connector";
import { orbyteWorkspace } from "./mock-data";
import { replayDemo } from "./replay";
import { KACHINGG_EVENT_TYPES } from "./types";

const params = (resource: string) => ({ params: Promise.resolve({ resource }) });

describe("Orbyte mock workspace ↔ Kachingg seed", () => {
  const seed = seedState();
  const w = orbyteWorkspace();

  it("every seed customer has exactly one Orbyte client, and vice versa", () => {
    for (const c of seed.customers) {
      const matches = w.clients.filter((x) => x.kachinggCustomerId === c.id);
      expect(matches, c.id).toHaveLength(1);
      expect(matches[0]).toMatchObject({ name: c.name, whatsapp: c.whatsapp, language: c.lang, contactPerson: c.contact });
    }
    expect(w.clients).toHaveLength(seed.customers.length);
    expect(new Set(w.clients.map((c) => c.id)).size).toBe(w.clients.length);
    for (const cl of w.clients) expect(seed.customers.some((c) => c.id === cl.kachinggCustomerId)).toBe(true);
  });

  it("every seed delivery has an Orbyte project on the right client", () => {
    for (const inv of seed.invoices) {
      const p = w.projects.find((x) => x.doNumber === inv.delivery.doNumber);
      expect(p, inv.delivery.doNumber).toBeDefined();
      expect(w.clients.find((c) => c.id === p!.clientId)!.kachinggCustomerId).toBe(inv.customerId);
      expect(p!.invoiceNumber).toBe(inv.number);
    }
    expect(w.projects.find((p) => p.doNumber === "DO-8812")!.name).toBe("DO-8812 Shah Alam → Bukit Raja");
    expect(w.projects.filter((p) => p.invoiceNumber === null).length).toBeGreaterThanOrEqual(2);
  });

  it("maps Orbyte roles to Kachingg roles", () => {
    expect(w.users.map((u) => `${u.name}:${u.orbyteRole}→${u.kachinggRole}`)).toEqual(["Lim Siew Lan:Owner→owner", "Nurul:Finance clerk→clerk"]);
  });

  it("clientRows joins open invoice counts", () => {
    const rows = clientRows(seed, w.clients);
    const total = rows.reduce((n, r) => n + r.openInvoices, 0);
    expect(total).toBe(seed.invoices.filter((i) => i.status !== "paid").length);
    expect(rows.every((r) => r.kachinggName !== null)).toBe(true);
  });

  it("the HTTP connector reads the mock route handlers", async () => {
    const fetchImpl = (async (url: string) => orbyteGET(new Request(url), params(url.split("/").pop()!))) as unknown as typeof fetch;
    const snap = await readOrbyte(httpOrbyteConnector("http://orbyte.test/v1/", { fetchImpl }));
    expect(snap).toEqual(await readOrbyte(localOrbyteConnector()));
  });
});

describe("KachinggEvents from the replayed demo", () => {
  const final = replayDemo();
  const events = toKachinggEvents(final);

  it("the runtime replay matches the test-kit demo run", () => {
    expect(final.log).toEqual(playDemo().final.log);
  });

  it("contains the key events in demo order", () => {
    const types = events.map((e) => e.type);
    const order = ["gap.detected", "credit.held", "proof.verified", "receipt.approved", "deduction.accepted"];
    const idx = order.map((t) => types.indexOf(t as (typeof types)[number]));
    expect(idx.every((i) => i >= 0), JSON.stringify(types)).toBe(true);
    expect([...idx].sort((a, b) => a - b)).toEqual(idx);
    for (const t of ["warning.raised", "credit.decided", "reminder.sent", "claim.unverified"]) expect(types).toContain(t);
    expect(types.every((t) => (KACHINGG_EVENT_TYPES as readonly string[]).includes(t))).toBe(true);
  });

  it("is deterministic with unique ids", () => {
    expect(toKachinggEvents(replayDemo())).toEqual(events);
    expect(new Set(events.map((e) => e.id)).size).toBe(events.length);
  });

  it("carries receipt and credit-note amounts, never balance or gap amounts", () => {
    expect(events.find((e) => e.type === "receipt.approved")!.data).toMatchObject({ invoice: "INV-2304", amount: 277000 });
    expect(events.find((e) => e.type === "deduction.accepted")!.data).toMatchObject({ invoice: "INV-2304", creditNote: "CN-0057", amount: 33000 });
    const json = JSON.stringify(events);
    // Seed balance RM9,800, salaries RM24,500, diesel RM11,200; gaps RM2,000 / RM13,200; cover +RM770.
    for (const sen of [980000, 2450000, 1120000, 200000, 1320000, 77000]) expect(json).not.toMatch(new RegExp(`\\b${sen}\\b`));
    expect(json).not.toMatch(/RM/);
    for (const e of events.filter((x) => x.type === "gap.detected" || x.type === "warning.raised")) {
      expect(Object.keys(e.data).sort()).toEqual(["dueDate", "outflow"]);
    }
  });
});

describe("Kachingg → Orbyte audit and approvals", () => {
  const final = replayDemo();

  it("toOrbyteAudit maps every log line and redacts cash and gap figures for the Clerk", () => {
    const owner = toOrbyteAudit(final.log, "owner");
    const clerk = toOrbyteAudit(final.log, "clerk");
    expect(owner).toHaveLength(final.log.length);
    expect(owner.every((a) => a.source === "kachingg")).toBe(true);
    expect(owner.some((a) => a.action.includes(fmtRM(200000)))).toBe(true);
    const clerkText = clerk.map((a) => a.action).join("\n");
    for (const sen of [200000, 1320000, 77000]) expect(clerkText).not.toContain(fmtRM(sen));
    expect(clerkText).not.toContain("+RM770");
  });

  it("pendingOrbyteApprovals lists today's reminders after the scan, with the Owner on Tier 2", () => {
    const s = apply(seedState(), { type: "RUN_SCAN" }).state;
    const ap = pendingOrbyteApprovals(s);
    expect(ap.map((a) => `${a.kind}:${a.requiredRole}:${a.refs[0]}`)).toEqual([
      "reminder:Finance clerk:INV-2304",
      "reminder:Finance clerk:INV-2310",
      "reminder:Owner:INV-2268",
    ]);
    expect(JSON.stringify(ap)).not.toMatch(/RM/);
  });

  it("pendingOrbyteApprovals shows the proposed receipt and then the pending deduction", () => {
    const demo = playDemo();
    expect(pendingOrbyteApprovals(demo.verified).filter((a) => a.kind === "receipt").map((a) => a.requiredRole)).toEqual(["Finance clerk"]);
    expect(pendingOrbyteApprovals(demo.receiptApproved).filter((a) => a.kind === "deduction").map((a) => a.title)).toEqual(["Deduction RM330 · INV-2304"]);
    expect(pendingOrbyteApprovals(demo.deductionAccepted).filter((a) => a.kind === "deduction")).toEqual([]);
  });
});

describe("ORBYTE_SYNC", () => {
  const sync = { type: "ORBYTE_SYNC", clients: 6, projects: 17, users: 2 } as const;

  it("either role may sync; it is logged with the counts and the demo time", () => {
    for (const role of ["owner", "clerk"] as const) {
      const s = apply(seedState(), { type: "SET_ROLE", role }).state;
      const r = apply(s, sync);
      expect(r.error).toBeUndefined();
      const e = r.state.log.at(-1)!;
      expect(e).toMatchObject({ kind: "USER", at: s.now, actor: role === "owner" ? "Lim Siew Lan" : "Nurul" });
      expect(e.text).toBe("synced from Orbyte (simulated): 6 clients, 17 projects, 2 users");
      expect({ ...r.state, log: s.log }).toEqual(s);
    }
  });

  it("refuses an unknown role and bad counts", () => {
    const sales = { ...seedState(), role: "sales" as never };
    expect(apply(sales, sync).error).toBe("Your role cannot sync from Orbyte.");
    expect(apply(seedState(), { ...sync, clients: -1 }).error).toMatch(/whole numbers/);
    expect(apply(seedState(), { ...sync, users: 1.5 }).error).toMatch(/whole numbers/);
  });
});

describe("simulated route handlers", () => {
  it.each(["clients", "projects", "users", "wallet"])("GET /api/orbyte-mock/v1/%s is simulated", async (resource) => {
    const res = await orbyteGET(new Request(`http://x/api/orbyte-mock/v1/${resource}`), params(resource));
    expect(res.status).toBe(200);
    expect(res.headers.get("x-simulated")).toBe("true");
    const body = await res.json();
    expect(body).toMatchObject({ simulated: true, data: "synthetic", resource });
  });

  it("unknown resources are a JSON 404", async () => {
    const res = await orbyteGET(new Request("http://x/api/orbyte-mock/v1/payroll"), params("payroll"));
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ simulated: true, error: "not_found" });
  });

  it("manifest and events are simulated and synthetic", async () => {
    const m = await (await manifestGET()).json();
    expect(m).toMatchObject({ simulated: true, data: "synthetic", name: "kachingg" });
    expect(m.events).toEqual([...KACHINGG_EVENT_TYPES]);
    const res = await eventsGET();
    expect(res.headers.get("x-simulated")).toBe("true");
    const ev = await res.json();
    expect(ev).toMatchObject({ simulated: true, data: "synthetic" });
    expect(ev.count).toBe(ev.events.length);
    expect(ev.count).toBeGreaterThan(10);
  });
});
