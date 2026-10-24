"use client";
// Usage & credits (PRD FR-O4): a billing preview in Orbyte's credit-wallet
// model. Prices are illustrative only and nothing is charged. Usage counts come
// from the demo state; the business's own cash figures stay off this page, so
// the Owner and the Clerk see the same view.
import { Info, Wallet } from "lucide-react";
import { Badge, Card, CardHeader, NavyPanel, NavyRow, PageTitle, cx, tbl } from "@/components/ui";
import { fmtDateTime, fmtRM, type State } from "@/engine/model";
import { useKutip } from "@/lib/store";

/** Illustrative: 1 Orbyte credit = RM0.10 (in sen). */
const CREDIT_SEN = 10;
const FREE_OPEN_INVOICES = 10;
/** Bukku Grow is RM65/month, email reminders only (PRD evidence table). */
const TARGET_SEN = 6500;

type UnitKey = "tracked" | "chased" | "reminders" | "reads" | "checks";

interface Unit {
  key: UnitKey;
  label: string;
  /** Credits per billable unit (illustrative). */
  credits: number;
  priceNote: string;
}

const UNITS: Unit[] = [
  { key: "tracked", label: "Open invoices tracked", credits: 5, priceNote: "per open invoice after the first 10, per month" },
  { key: "chased", label: "Invoices actively chased", credits: 15, priceNote: "per invoice with a reminder this month" },
  { key: "reminders", label: "Reminders sent", credits: 0, priceNote: "included in the invoice chased" },
  { key: "reads", label: "Messages and slips read by Bukti", credits: 3, priceNote: "per message read" },
  { key: "checks", label: "Credit checks run", credits: 5, priceNote: "per booking held by R4" },
];

/** A typical micro firm's month, used for the comparison (assumption, not data). */
const TYPICAL: Record<UnitKey, number> = { tracked: 40, chased: 15, reminders: 30, reads: 40, checks: 4 };

interface Line extends Unit {
  count: number;
  free: number;
  billable: number;
  total: number;
  detail: string;
}

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const inMonth = (ts: string, month: string) => ts.slice(0, 7) === month;
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function line(u: Unit, count: number, detail: string): Line {
  const free = u.key === "tracked" ? Math.min(count, FREE_OPEN_INVOICES) : 0;
  const billable = count - free;
  return { ...u, count, free, billable, total: billable * u.credits, detail };
}

/** This demo month's usage, counted from state (calendar month of the demo clock). */
export function monthUsage(s: State): Line[] {
  const month = s.now.slice(0, 7);
  const open = s.invoices.filter((i) => i.status !== "paid");
  const reminders = s.invoices.flatMap((i) => i.reminders.filter((r) => inMonth(r.at, month)).map((r) => ({ ...r, invoice: i.number })));
  const chased = [...new Set(reminders.map((r) => r.invoice))];
  const queued = reminders.filter((r) => r.status === "queued").length;
  const reads = Object.values(s.extractions).filter((x) => inMonth(x.at, month));
  const cached = reads.filter((x) => x.cached).length;
  const checks = s.bookings.filter((b) => b.checkInvoiceId !== null && inMonth(b.createdAt, month));

  return [
    line(UNITS[0], open.length, `first ${FREE_OPEN_INVOICES} free`),
    line(UNITS[1], chased.length, chased.length ? chased.join(", ") : "none yet"),
    line(UNITS[2], reminders.length, queued ? `${reminders.length - queued} sent, ${queued} queued for 08:00` : reminders.length ? "all sent" : "none yet"),
    line(UNITS[3], reads.length, reads.length ? `${reads.length - cached} live AI, ${cached} cached` : "none yet"),
    line(UNITS[4], checks.length, checks.length ? plural(checks.length, "booking") + " held" : "none yet"),
  ];
}

const typicalLines = UNITS.map((u) => line(u, TYPICAL[u.key], ""));
const totalCredits = (lines: Line[]) => lines.reduce((sum, l) => sum + l.total, 0);
const credits = (n: number) => `${n.toLocaleString("en-MY")} cr`;
const ringgit = (cr: number) => fmtRM(cr * CREDIT_SEN, { cents: true });

export default function UsagePage() {
  const state = useKutip((s) => s.state);
  const lines = monthUsage(state);
  const total = totalCredits(lines);
  const typical = totalCredits(typicalLines);
  const monthName = `${MONTH_NAMES[+state.now.slice(5, 7) - 1]} ${state.now.slice(0, 4)}`;

  return (
    <div className="space-y-5">
      <PageTitle
        title="Usage & credits"
        subtitle={`Orbyte credit wallet · ${monthName} so far, to ${fmtDateTime(state.now)}`}
        right={<Badge tone="amber">Illustrative pricing, not real</Badge>}
      />

      <div className="flex items-start gap-3 border border-line border-l-[3px] border-l-amber-800 bg-amber-50 px-4 py-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-800" aria-hidden />
        <p className="text-[13px] leading-relaxed text-amber-900">
          <span className="font-semibold">Illustrative pricing, not real.</span> No wallet is charged and no payment is taken. This shows how Kutip
          would fit Orbyte&apos;s pay-per-request credit wallet: no per-seat fee, the first {FREE_OPEN_INVOICES} open invoices tracked free, then
          a small credit per invoice chased and per slip read. Illustrative rate: 1 credit = {fmtRM(CREDIT_SEN, { cents: true })}.
        </p>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHeader kicker="This demo month" title={`Usage in ${monthName}`} right={<Wallet className="h-4 w-4 text-ink2" aria-hidden />} />
          <div className={tbl.wrap}>
          <table className={cx(tbl.table, "min-w-[620px]")}>
            <thead>
              <tr className={tbl.headRow}>
                <th className={tbl.th}>Unit</th>
                <th className={cx(tbl.th, "text-right")}>Used</th>
                <th className={cx(tbl.th, "text-right")}>Billable</th>
                <th className={tbl.th}>Price (illustrative)</th>
                <th className={cx(tbl.th, "text-right")}>Credits</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => (
                <tr key={l.key} className="border-b border-hairline align-top">
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-ink">{l.label}</div>
                    <div className="text-xs text-ink2">{l.detail}</div>
                  </td>
                  <td className="num px-3 py-2.5 text-right text-ink">{l.count}</td>
                  <td className="num px-3 py-2.5 text-right text-ink2">{l.credits === 0 ? "—" : l.billable}</td>
                  <td className="px-3 py-2.5">
                    <div className="text-ink">{l.credits === 0 ? "included" : <span className="num">{`${credits(l.credits)} (${ringgit(l.credits)})`}</span>}</div>
                    <div className="text-xs text-ink2">{l.priceNote}</div>
                  </td>
                  <td className={cx("num px-4 py-2.5 text-right", l.total ? "text-ink" : "text-ink2")}>{credits(l.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-canvas">
                <td className="px-4 py-3 font-semibold text-ink" colSpan={4}>
                  Monthly total so far
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="num font-semibold text-ink">{credits(total)}</div>
                  <div className="num text-xs text-navy">{ringgit(total)}</div>
                </td>
              </tr>
            </tfoot>
          </table>
          </div>
        </Card>

        <div className="space-y-3">
          <NavyPanel>
            <div className="font-mono text-xs font-medium text-navy-muted">Illustrative monthly cost</div>
            <NavyRow k="This demo month" v={ringgit(total)} />
            <NavyRow k="Typical micro firm (estimate)" v={ringgit(typical)} />
            <NavyRow k="Bukku Grow (email reminders only)" v={fmtRM(TARGET_SEN, { cents: true })} />
          </NavyPanel>
          <Card tone="good" className="px-4 py-3">
            <p className="text-[13px] font-medium leading-snug text-ink">
              Target: under RM65/month for a typical micro firm (Bukku Grow is RM65/month, email reminders only).
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-ink2">
              Typical micro firm assumed: {TYPICAL.tracked} open invoices, {TYPICAL.chased} chased, {TYPICAL.reads} messages read and{" "}
              {TYPICAL.checks} credit checks a month, at the prices in the table.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
