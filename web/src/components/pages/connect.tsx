"use client";
// Connect (PRD FR-O2): the data sources Kutip reads and what each provides,
// the CSV imports and owner balance entry (FR-A1, FR-A4, FR-A5), Kutip's
// illustrative API, and data handling.
import type { ReactNode } from "react";
import { ChevronDown, Lock } from "lucide-react";
import { Badge, Card, CardHeader, PageTitle, cx, tbl } from "@/components/ui";
import { BalanceEntry } from "@/components/connect/balance-entry";
import { BankImport } from "@/components/connect/bank-import";
import { InvoiceImport } from "@/components/connect/invoice-import";
import { fmtDateTime, fmtRM, type Lang } from "@/engine/model";
import { visibleBankLines } from "@/engine/rules";
import { DEMO_START } from "@/engine/seed";
import { useKutip } from "@/lib/store";

const LANG_LABEL: Record<Lang, string> = { en: "EN", bm: "BM", zh: "ZH" };

const plural = (n: number, one: string) => `${n} ${n === 1 ? one : `${one}s`}`;

const ENDPOINTS: [string, string, string][] = [
  ["POST", "/receivables/invoices", "Import invoices"],
  ["GET", "/receivables/chase-plan?date=", "Chase plan for a day"],
  ["POST", "/receivables/approvals", "Approve a reminder"],
  ["POST", "/receivables/credit-checks", "Raise or decide a credit check"],
  ["POST", "/proofs", "Submit a reply or slip"],
  ["POST", "/proofs/{id}/decision", "Decide a receipt or deduction"],
];

const WEBHOOKS = [
  "invoice.overdue",
  "gap.detected",
  "gap.warning",
  "credit.check_raised",
  "chase.approved",
  "proof.verified",
  "shortpay.detected",
  "promise.due",
];

const PDPA = [
  "The SME is the data user under PDPA 2010 (as amended in 2024); Kutip acts as its processor.",
  "Contact data is used only to follow up invoices the customer has received, with a notice line on invoices.",
  "Role-based access: clerk and sales never see cash figures; opt-out per contact is honoured.",
  "Bukti keeps only the fields it needs, masks account numbers, and stores slip images encrypted with an owner-set retention limit.",
  "The AI provider must not train on customer data; in-region hosting is preferred and cross-border transfer is disclosed.",
];

export default function ConnectPage() {
  const s = useKutip((st) => st.state);
  const owner = s.role === "owner";

  const openInvoices = s.invoices.filter((i) => i.status !== "paid").length;
  const salaries = s.outflows.find((o) => o.short === "salaries");
  const lines = visibleBankLines(s);
  const lastLine = lines.reduce<string | null>((max, b) => (max === null || b.at > max ? b.at : max), null);
  const arrived = s.messages.filter((m) => m.receivedAt <= s.now);
  const lastMsg = arrived.reduce<string | null>((max, m) => (max === null || m.receivedAt > max ? m.receivedAt : max), null);
  const langs = (["bm", "en", "zh"] as Lang[])
    .map((l) => [l, s.customers.filter((c) => c.lang === l).length] as const)
    .filter(([, n]) => n > 0)
    .map(([l, n]) => `${n} ${LANG_LABEL[l]}`)
    .join(" · ");
  const seedImport = `Seed · before ${fmtDateTime(DEMO_START)}`;

  return (
    <div className="mx-auto max-w-[1100px]">
      <PageTitle title="Connect" />

      <Card>
        <CardHeader title="Data sources" />
        <ul className="divide-y divide-hairline">
          <Source
            name="Accounting software"
            provides="Invoices, delivery orders, payroll"
            last={seedImport}
            meta={
              <>
                {plural(s.invoices.length, "invoice")} · {openInvoices} open ·{" "}
                {salaries ? (owner ? `salaries ${fmtRM(salaries.amount)}` : "salaries on file") : "no salaries"}
              </>
            }
          />
          <Source
            name="Bank statement"
            provides="Credit lines for matching"
            last={lastLine ? `Last line ${fmtDateTime(lastLine)}` : "No lines yet"}
            meta={
              <>
                {plural(lines.length, "line")} · {lines.filter((b) => b.matchedInvoiceId).length} matched ·{" "}
                {owner ? `balance entered ${fmtDateTime(s.bankBalance.enteredAt)} by ${s.bankBalance.enteredBy}` : "balance: Owner only"}
              </>
            }
          />
          <Source
            name="WhatsApp"
            provides="Replies, slips, reminders"
            last={lastMsg ? `Last message ${fmtDateTime(lastMsg)}` : "No messages yet"}
            meta={
              <>
                {plural(arrived.length, "message")} · {arrived.filter((m) => s.extractions[m.id]).length} read by Bukti
              </>
            }
          />
          <Source
            name="Customer records"
            provides="Names, contacts, language"
            last={seedImport}
            meta={
              <>
                {plural(s.customers.length, "customer")} · {langs}
              </>
            }
          />
        </ul>
      </Card>

      <details className="group mt-8">
        <summary className="flex cursor-pointer list-none items-center gap-2 border-b border-line pb-3 text-[15px] font-semibold tracking-[-0.01em] text-ink [&::-webkit-details-marker]:hidden">
          <ChevronDown className="h-4 w-4 -rotate-90 text-ink2 transition-transform group-open:rotate-0" aria-hidden />
          Import data
        </summary>
        <div className="mt-4 space-y-6">
          <InvoiceImport />
          {/* FR-A4 / FR-B5: the Clerk never sees the balance form or its value. */}
          {owner ? (
            <div className="grid items-start gap-6 lg:grid-cols-5">
              <div className="min-w-0 lg:col-span-3">
                <BankImport />
              </div>
              <div className="min-w-0 lg:col-span-2">
                <BalanceEntry />
              </div>
            </div>
          ) : (
            <BankImport />
          )}
        </div>
      </details>

      <Card className="mt-8">
        <CardHeader title="API" right={<Badge tone="slate">Illustrative · not live</Badge>} />
        <div className={tbl.wrap}>
          <table className={cx(tbl.table, "min-w-[520px]")}>
            <tbody>
              {ENDPOINTS.map(([method, path, what]) => (
                <tr key={path} className={tbl.row}>
                  <td className={cx(tbl.td, "w-16 font-mono text-[11px] font-semibold", method === "GET" ? "text-sky-700" : "text-emerald-700")}>{method}</td>
                  <td className={cx(tbl.td, "font-mono text-xs text-ink")}>{path}</td>
                  <td className={cx(tbl.td, "text-xs text-ink2")}>{what}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 border-t border-hairline px-5 py-3">
          <span className="mr-1 text-xs text-ink2">Webhooks</span>
          {WEBHOOKS.map((w) => (
            <code key={w} className="inline-flex h-5 items-center rounded-[2px] border border-line px-1.5 font-mono text-[11px] text-ink">
              {w}
            </code>
          ))}
        </div>
      </Card>

      <details className="group mt-6">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-[13px] font-medium text-ink [&::-webkit-details-marker]:hidden">
          <ChevronDown className="h-4 w-4 -rotate-90 text-ink2 transition-transform group-open:rotate-0" aria-hidden />
          Data handling (PDPA 2010)
        </summary>
        <ul className="mt-3 space-y-2 pl-6 text-xs leading-relaxed text-ink2">
          {PDPA.map((p) => (
            <li key={p} className="flex gap-2">
              <Lock className="mt-0.5 h-3 w-3 shrink-0 text-ink2" aria-hidden />
              <span>{p}</span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}

function Source({ name, provides, meta, last }: { name: string; provides: string; meta: ReactNode; last: string }) {
  return (
    <li className="grid gap-x-6 gap-y-1 px-5 py-3.5 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_auto] sm:items-center">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-ink">{name}</span>
          <Badge tone="amber">Simulated</Badge>
        </div>
        <div className="mt-0.5 text-xs text-ink2">{provides}</div>
      </div>
      <div className="min-w-0 text-xs tabular-nums text-ink2">{meta}</div>
      <div className="font-mono text-[11px] text-ink2 sm:text-right">{last}</div>
    </li>
  );
}
