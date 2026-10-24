"use client";
// Orbyte Connect view (PRD FR-O2, FR-O3): the data sources Kutip reads, what
// each provides, the CSV imports and owner balance entry (FR-A1, FR-A4, FR-A5),
// and the Orbyte platform pieces it reuses.
import type { ComponentType, ReactNode } from "react";
import { ArrowRight, Contact, FileSpreadsheet, Landmark, Lock, MessageCircle, ShieldCheck, Webhook } from "lucide-react";
import { Badge, Button, Card, CardHeader, PageTitle, cx, tbl } from "@/components/ui";
import { BalanceEntry } from "@/components/connect/balance-entry";
import { BankImport } from "@/components/connect/bank-import";
import { InvoiceImport } from "@/components/connect/invoice-import";
import { fmtDateTime, fmtRM, type Lang } from "@/engine/model";
import { visibleBankLines } from "@/engine/rules";
import { DEMO_START } from "@/engine/seed";
import { useKutip } from "@/lib/store";

type Icon = ComponentType<{ className?: string }>;

const LANG_LABEL: Record<Lang, string> = { en: "EN", bm: "BM", zh: "ZH" };

const ENDPOINTS: [string, string, string][] = [
  ["POST", "/receivables/invoices", "Import or upsert invoices from an accounting partner"],
  ["GET", "/receivables/chase-plan?date=", "Ranked chase plan for a day, with rule IDs and reasons"],
  ["POST", "/receivables/approvals", "Approve a reminder (tier rules and roles enforced)"],
  ["POST", "/receivables/credit-checks", "Raise or decide a credit check on a booking"],
  ["POST", "/proofs", "Submit an inbound reply or slip for Bukti to read"],
  ["POST", "/proofs/{id}/decision", "Approve a receipt, accept or reject a deduction"],
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
  "The SME is the data user under PDPA 2010 (as amended in 2024); Kutip on Orbyte acts as its processor.",
  "Contact data is used only to follow up invoices the customer has received, with a notice line on invoices.",
  "Role-based access: clerk and sales never see cash figures; opt-out per contact is honoured.",
  "Bukti keeps only the fields it needs, masks account numbers, and stores slip images encrypted with an owner-set retention limit.",
  "The AI provider must not train on customer data; in-region hosting is preferred and cross-border transfer is disclosed.",
];

export default function ConnectPage() {
  const s = useKutip((st) => st.state);
  const go = useKutip((st) => st.go);
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
  const seedImport = `Seed import, before ${fmtDateTime(DEMO_START)}`;

  return (
    <div>
      <PageTitle
        title="Connect"
        subtitle="Data sources Kutip reads through Orbyte. Every source in this demo is simulated with synthetic data."
        right={<Badge tone="amber">Simulated</Badge>}
      />

      <div className="grid grid-cols-2 gap-4">
        <SourceCard
          icon={FileSpreadsheet}
          title="Accounting partner"
          via="Orbyte Connect · CSV import"
          provides="Invoices, delivery orders, payroll total"
          last={seedImport}
        >
          <Stat label="Invoices" value={s.invoices.length} />
          <Stat label="Open invoices" value={openInvoices} />
          <Stat
            label="Salary outflow"
            value={salaries ? (owner ? `${fmtRM(salaries.amount)} · present` : "present") : "missing"}
            hint={owner ? undefined : "amount: Owner only"}
          />
        </SourceCard>

        <SourceCard
          icon={Landmark}
          title="Bank statement"
          via="CSV upload (fictional bank)"
          provides="Credit lines for payment matching (M1)"
          last={lastLine ? `Last line ${fmtDateTime(lastLine)}` : "No lines yet"}
        >
          <Stat label="Lines visible now" value={lines.length} />
          <Stat label="Matched" value={lines.filter((b) => b.matchedInvoiceId).length} />
          <Stat
            label="Opening balance"
            value={owner ? `entered ${fmtDateTime(s.bankBalance.enteredAt)}` : "hidden"}
            hint={owner ? `by ${s.bankBalance.enteredBy}` : "Owner only"}
          />
        </SourceCard>

        <SourceCard
          icon={MessageCircle}
          title="WhatsApp"
          via="wa.me click-to-send (no API) · simulated inbox"
          provides="Outbound reminders; inbound replies and slips for Bukti"
          last={lastMsg ? `Last message ${fmtDateTime(lastMsg)}` : "No messages yet"}
        >
          <Stat label="Messages arrived" value={arrived.length} />
          <Stat label="Read by Bukti" value={arrived.filter((m) => s.extractions[m.id]).length} />
          <Stat label="Sending" value="opens WhatsApp prefilled" />
        </SourceCard>

        <SourceCard
          icon={Contact}
          title="Orbyte clients records"
          via="Shared Orbyte data"
          provides="Customer names, contact person, WhatsApp, language"
          last={seedImport}
        >
          <Stat label="Customers" value={s.customers.length} />
          <Stat label="Languages" value={langs} />
          <Stat label="Used by" value="templates (R5), matching (M1)" />
        </SourceCard>
      </div>

      <h2 className="mb-3 mt-8 text-[15px] font-semibold tracking-[-0.01em] text-ink">Import data</h2>
      <div className="space-y-4">
        <InvoiceImport />
        {/* FR-A4 / FR-B5: the Clerk never sees the balance form or its value. */}
        {owner ? (
          <div className="grid grid-cols-5 items-start gap-4">
            <div className="col-span-3">
              <BankImport />
            </div>
            <div className="col-span-2">
              <BalanceEntry />
            </div>
          </div>
        ) : (
          <BankImport />
        )}
      </div>

      <h2 className="mb-3 mt-8 text-[15px] font-semibold tracking-[-0.01em] text-ink">Reused from Orbyte</h2>
      <div className="grid grid-cols-3 gap-4">
        <ReuseCard title="Roles" source="Orbyte org structure">
          Kutip&apos;s permissions follow the hub roles: {s.users.map((u) => `${u.name} (${u.role === "owner" ? "Owner" : "Clerk"})`).join(", ")}. The
          header switcher is labelled &ldquo;Orbyte role&rdquo;.
        </ReuseCard>
        <ReuseCard
          title="Approvals inbox"
          source="Orbyte approvals"
          action={
            <Button size="sm" variant="secondary" onClick={() => go("approvals")}>
              Open approvals
            </Button>
          }
        >
          Firm reminders, credit checks, receipts and deductions wait for a person to decide, in one place, by role. Nothing is sent or marked paid on its own.
        </ReuseCard>
        <ReuseCard
          title="Audit trail"
          source="Orbyte audit trail"
          action={
            <Button size="sm" variant="secondary" onClick={() => go("log")}>
              Open activity log
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Button>
          }
        >
          The Kutip activity log is the audit trail: {s.log.length} append-only {s.log.length === 1 ? "entry" : "entries"} so far, each with actor, rule and demo time.
        </ReuseCard>
      </div>

      <div className="mt-8 grid grid-cols-5 gap-4">
        <Card className="col-span-3">
          <CardHeader
            kicker="Illustrative"
            title="Kutip API"
            right={
              <Badge tone="violet">
                <Webhook className="h-3 w-3" aria-hidden />
                not live
              </Badge>
            }
          />
          <div className={tbl.wrap}>
            <table className={tbl.table}>
              <tbody>
                {ENDPOINTS.map(([method, path, what]) => (
                  <tr key={path} className={tbl.row}>
                    <td className={cx(tbl.td, "w-14")}>
                      <span className={method === "GET" ? "font-mono text-[11px] font-semibold text-sky-700" : "font-mono text-[11px] font-semibold text-emerald-700"}>
                        {method}
                      </span>
                    </td>
                    <td className={cx(tbl.td, "font-mono text-xs text-ink")}>{path}</td>
                    <td className={cx(tbl.td, "text-xs text-ink2")}>{what}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-hairline px-4 py-3">
            <div className="eyebrow">Webhooks</div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {WEBHOOKS.map((w) => (
                <code key={w} className="inline-flex h-5 items-center rounded-[2px] border border-line bg-canvas px-1.5 font-mono text-[11px] text-ink">
                  {w}
                </code>
              ))}
            </div>
          </div>
        </Card>

        <Card className="col-span-2">
          <CardHeader
            kicker="Real deployment"
            title="PDPA and data handling"
            right={
              <Badge tone="emerald">
                <ShieldCheck className="h-3 w-3" aria-hidden />
                PDPA 2010
              </Badge>
            }
          />
          <ul className="space-y-2 px-4 py-3 text-xs leading-relaxed text-ink2">
            {PDPA.map((p) => (
              <li key={p} className="flex gap-2">
                <Lock className="mt-0.5 h-3 w-3 shrink-0 text-ink3" aria-hidden />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

function SourceCard({
  icon: IconCmp,
  title,
  via,
  provides,
  last,
  children,
}: {
  icon: Icon;
  title: string;
  via: string;
  provides: string;
  last: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <div className="flex items-start gap-3 border-b border-hairline px-4 py-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center border border-line bg-canvas text-navy">
          <IconCmp className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-ink">{title}</span>
            <Badge tone="amber">simulated</Badge>
          </div>
          <div className="text-xs text-ink2">{via}</div>
        </div>
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
          <span className="h-1.5 w-1.5 bg-emerald-500" aria-hidden />
          connected
        </span>
      </div>
      <div className="px-4 py-3">
        <div className="mb-3 text-xs text-ink2">
          <span className="font-medium text-ink">Provides:</span> {provides}
        </div>
        <div className="grid grid-cols-3 gap-3">{children}</div>
        <div className="mt-3 border-t border-hairline pt-2 font-mono text-[11px] text-ink2">{last}</div>
      </div>
    </Card>
  );
}

function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="min-w-0">
      <div className="font-mono text-[11px] text-ink2">{label}</div>
      <div className={cx("text-sm font-semibold break-words text-ink", typeof value === "number" && "num")} title={typeof value === "string" ? value : undefined}>
        {value}
      </div>
      {hint && <div className="text-[11px] text-ink2">{hint}</div>}
    </div>
  );
}

function ReuseCard({ title, source, children, action }: { title: string; source: string; children: ReactNode; action?: ReactNode }) {
  return (
    <Card className="flex flex-col">
      <CardHeader kicker={source} title={title} />
      <div className="flex-1 px-4 py-3 text-xs leading-relaxed text-ink2">{children}</div>
      {action && <div className="px-4 pb-3">{action}</div>}
    </Card>
  );
}
