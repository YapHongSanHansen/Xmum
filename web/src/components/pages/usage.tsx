"use client";
// Usage & credits (PRD FR-O4): a billing preview in a pay-per-use credit
// model. Prices are illustrative only and nothing is charged. Usage counts come
// from the demo state; the business's own cash figures stay off this page, so
// the Owner and the Clerk see the same view.
import { Badge, Card, CardHeader, Figure, PageTitle, cx, tbl } from "@/components/ui";
import { fmtRM, type State } from "@/engine/model";
import { useKutip } from "@/lib/store";

/** Illustrative: 1 credit = RM0.10 (in sen). */
const CREDIT_SEN = 10;
const FREE_OPEN_INVOICES = 10;
/** Price ceiling: RM65/month for a typical micro firm (PRD evidence table). */
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
  { key: "tracked", label: "Open invoices tracked", credits: 5, priceNote: "per invoice after 10" },
  { key: "chased", label: "Invoices chased", credits: 15, priceNote: "per invoice" },
  { key: "reminders", label: "Reminders sent", credits: 0, priceNote: "with invoice chased" },
  { key: "reads", label: "Bukti reads", credits: 3, priceNote: "per message" },
  { key: "checks", label: "Credit checks", credits: 5, priceNote: "per held booking" },
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

  const assumed = `Typical micro firm, assumed: ${TYPICAL.tracked} open invoices, ${TYPICAL.chased} chased, ${TYPICAL.reads} messages read, ${TYPICAL.checks} credit checks a month`;

  return (
    <div className="mx-auto max-w-[1100px]">
      <PageTitle title="Usage & credits" subtitle={`${monthName} so far`} right={<Badge tone="amber">Illustrative prices</Badge>} />

      <div className="space-y-6">
        <section className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4 border border-line bg-surface p-6">
          <div>
            <div className="text-[13px] text-ink2">This month</div>
            <div className="mt-2">
              <Figure>≈ {ringgit(total)}</Figure>
            </div>
            <div className="num mt-1.5 text-xs text-ink2">{credits(total)}</div>
          </div>
          <dl className="grid grid-cols-[auto_auto] gap-x-6 gap-y-1.5 text-[13px]">
            <dt className="text-ink2" title={assumed}>
              Typical micro firm
            </dt>
            <dd className="num text-right text-ink">≈ {ringgit(typical)}</dd>
            <dt className="text-ink2">Target</dt>
            <dd className="num text-right text-ink">under {fmtRM(TARGET_SEN)}/month</dd>
            <dt className="text-ink2">Rate</dt>
            <dd className="num text-right text-ink">1 cr = {fmtRM(CREDIT_SEN, { cents: true })}</dd>
          </dl>
        </section>

        <Card>
          <CardHeader title="Usage" right={<span className="text-xs text-ink2">Nothing is charged</span>} />
          <div className={tbl.wrap}>
            <table className={cx(tbl.table, "min-w-[560px]")}>
              <thead>
                <tr className={tbl.headRow}>
                  <th className={tbl.th}>Unit</th>
                  <th className={cx(tbl.th, "text-right")}>Used</th>
                  <th className={cx(tbl.th, "text-right")}>Billable</th>
                  <th className={tbl.th}>Price</th>
                  <th className={cx(tbl.th, "text-right")}>Credits</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => (
                  <tr key={l.key} className="border-b border-hairline align-top">
                    <td className="px-4 py-2.5">
                      <div className="text-ink">{l.label}</div>
                      <div className="text-xs text-ink2">{l.detail}</div>
                    </td>
                    <td className="num px-3 py-2.5 text-right text-ink">{l.count}</td>
                    <td className="num px-3 py-2.5 text-right text-ink2">{l.credits === 0 ? "—" : l.billable}</td>
                    <td className="px-3 py-2.5">
                      <div className="text-ink">{l.credits === 0 ? "included" : <span className="num">{credits(l.credits)}</span>}</div>
                      <div className="text-xs text-ink2">{l.priceNote}</div>
                    </td>
                    <td className={cx("num px-4 py-2.5 text-right", l.total ? "text-ink" : "text-ink2")}>{credits(l.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td className="px-4 py-3 font-medium text-ink" colSpan={4}>
                    Total
                  </td>
                  <td className="num px-4 py-3 text-right font-semibold text-ink">{credits(total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
