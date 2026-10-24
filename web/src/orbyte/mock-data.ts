// A synthetic Orbyte workspace for the demo company. Every name, number and
// amount is fictional; client fields come from Kachingg's seed so the two never
// drift apart. Served by the simulated Orbyte API (/api/orbyte-mock/v1).
import { rm } from "../engine/model";
import { seedState } from "../engine/seed";
import type { OrbyteClient, OrbyteProject, OrbyteSnapshot, OrbyteUser, OrbyteWallet } from "./types";

export const ORBYTE_WORKSPACE = "Lori Laju Logistics Sdn Bhd";

/** Explicit Orbyte client id ↔ Kachingg customer id mapping, with Orbyte tags. */
const CLIENT_MAP: [orbyteId: string, kachinggCustomerId: string, tags: string[]][] = [
  ["ORB-CL-0001", "c-megabina", ["hardware", "credit 30d"]],
  ["ORB-CL-0002", "c-hupseng", ["trading", "credit 30d"]],
  ["ORB-CL-0003", "c-kilang", ["furniture", "credit 30d"]],
  ["ORB-CL-0004", "c-pelita", ["cold chain", "credit 30d"]],
  ["ORB-CL-0005", "c-sinar", ["electrical", "credit 30d", "pays early"]],
  ["ORB-CL-0006", "c-gudang", ["cold chain", "credit 30d", "pays early"]],
  ["ORB-CL-0007", "c-tunas", ["packaging", "credit 30d", "pays early"]],
  ["ORB-CL-0008", "c-bayu", ["beverages", "credit 30d"]],
  ["ORB-CL-0009", "c-delima", ["plastics", "credit 30d", "pays early"]],
  ["ORB-CL-0010", "c-cahaya", ["paper", "credit 30d"]],
  ["ORB-CL-0011", "c-yongfa", ["building materials", "credit 30d", "pays early"]],
  ["ORB-CL-0012", "c-seri", ["textile", "credit 30d"]],
];

function buildClients(): OrbyteClient[] {
  const seed = seedState();
  return CLIENT_MAP.map(([id, kachinggCustomerId, tags]) => {
    const c = seed.customers.find((x) => x.id === kachinggCustomerId);
    if (!c) throw new Error(`Orbyte mock: no seed customer ${kachinggCustomerId}`);
    return { id, kachinggCustomerId, name: c.name, contactPerson: c.contact, whatsapp: c.whatsapp, language: c.lang, tags };
  });
}

export const orbyteClientId = (kachinggCustomerId: string) => CLIENT_MAP.find(([, k]) => k === kachinggCustomerId)?.[0] ?? null;

function buildProjects(): OrbyteProject[] {
  const seed = seedState();
  // One project per delivery job Kachingg has an invoice for…
  const invoiced: Omit<OrbyteProject, "id">[] = seed.invoices.map((inv) => ({
    clientId: orbyteClientId(inv.customerId)!,
    name: `${inv.delivery.doNumber} ${inv.delivery.route}`,
    doNumber: inv.delivery.doNumber,
    status: "invoiced",
    value: inv.amount,
    invoiceNumber: inv.number,
  }));
  // …plus jobs that are done or on the road but not yet invoiced (no Kachingg invoice).
  const extra: Omit<OrbyteProject, "id">[] = [
    { clientId: "ORB-CL-0005", name: "DO-8897 Klang → Kajang", doNumber: "DO-8897", status: "completed", value: rm(2800), invoiceNumber: null },
    { clientId: "ORB-CL-0003", name: "DO-8899 Muar → Port Klang", doNumber: "DO-8899", status: "in_progress", value: rm(4100), invoiceNumber: null },
    { clientId: "ORB-CL-0007", name: "DO-8901 Port Klang → Senai", doNumber: "DO-8901", status: "completed", value: rm(4650), invoiceNumber: null },
    { clientId: "ORB-CL-0011", name: "DO-8902 Klang → Seri Kembangan", doNumber: "DO-8902", status: "completed", value: rm(3150), invoiceNumber: null },
    { clientId: "ORB-CL-0009", name: "DO-8904 Klang → Prai", doNumber: "DO-8904", status: "in_progress", value: rm(5900), invoiceNumber: null },
    { clientId: "ORB-CL-0008", name: "DO-8905 Shah Alam → Kuantan", doNumber: "DO-8905", status: "in_progress", value: rm(2650), invoiceNumber: null },
    { clientId: "ORB-CL-0012", name: "DO-8907 Klang → Nilai", doNumber: "DO-8907", status: "in_progress", value: rm(1950), invoiceNumber: null },
  ];
  return [...invoiced, ...extra].map((p, i) => ({ id: `ORB-PJ-${String(i + 1).padStart(4, "0")}`, ...p }));
}

const USERS: OrbyteUser[] = [
  { id: "ORB-US-0001", kachinggUserId: "u-owner", name: "Lim Siew Lan", orbyteRole: "Owner", kachinggRole: "owner" },
  { id: "ORB-US-0002", kachinggUserId: "u-clerk", name: "Nurul", orbyteRole: "Finance clerk", kachinggRole: "clerk" },
];

const WALLET: OrbyteWallet = {
  balance: 1240,
  unit: "credits",
  transactions: [
    { id: "ORB-WT-0001", at: "2026-10-01T09:00", description: "Monthly credit top-up (illustrative)", credits: 1500 },
    { id: "ORB-WT-0002", at: "2026-10-12T18:00", description: "Kachingg · invoices chased (illustrative)", credits: -180 },
    { id: "ORB-WT-0003", at: "2026-10-19T18:00", description: "Kachingg · Bukti slip reads (illustrative)", credits: -80 },
  ],
};

/** A fresh copy of the whole synthetic workspace. */
export function orbyteWorkspace(): OrbyteSnapshot {
  return { clients: buildClients(), projects: buildProjects(), users: structuredClone(USERS), wallet: structuredClone(WALLET) };
}
