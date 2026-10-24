"use client";
// Activity log (PRD FR-G1–G4): append-only, read-only view of state.log.
import { useMemo, useState } from "react";
import { ArrowDownUp, Download, Lock, Search, X } from "lucide-react";
import { Badge, Button, Card, Empty, PageTitle, RuleTag, cx, tbl } from "@/components/ui";
import { fmtDateTime, type ActorKind, type LogEntry } from "@/engine/model";
import { useKutip } from "@/lib/store";

const KINDS: ActorKind[] = ["SYSTEM", "RULE", "AI", "USER", "INBOUND", "BANK"];

const KIND_TONE: Record<ActorKind, "slate" | "sky" | "emerald" | "violet" | "amber"> = {
  SYSTEM: "slate",
  RULE: "slate",
  AI: "sky",
  USER: "emerald",
  INBOUND: "violet",
  BANK: "amber",
};

// Pressed filter chips: the kind's status colour, solid, white text (all AA).
const CHIP_ACTIVE: Record<ActorKind, string> = {
  SYSTEM: "border-ink2 bg-ink2 text-white",
  RULE: "border-ink bg-ink text-white",
  AI: "border-sky-700 bg-sky-700 text-white",
  USER: "border-emerald-700 bg-emerald-700 text-white",
  INBOUND: "border-navy bg-navy text-white",
  BANK: "border-amber-800 bg-amber-800 text-white",
};

const CHIP = "inline-flex h-7 items-center rounded-[2px] border px-2.5 font-mono text-[11px] font-medium tabular-nums transition-colors";
const CHIP_OFF = "border-line-strong bg-surface text-ink2 hover:bg-canvas hover:text-ink";

function ActorBadge({ e }: { e: LogEntry }) {
  if (e.kind === "RULE") return <RuleTag id={e.rule ?? e.actor} />;
  return <Badge tone={KIND_TONE[e.kind]}>{e.kind === "USER" ? e.actor : e.kind}</Badge>;
}

function matches(e: LogEntry, q: string): boolean {
  if (!q) return true;
  const hay = [e.text, e.actor, e.rule ?? "", ...(e.refs ?? [])].join(" ").toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((w) => hay.includes(w));
}

const csvCell = (v: string | number | undefined) => {
  const s = v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

function exportCsv(log: LogEntry[], now: string) {
  const header = ["seq", "demo_time", "kind", "actor", "rule", "action", "refs", "model", "confidence"];
  const rows = log.map((e) => [e.seq, e.at, e.kind, e.actor, e.rule, e.text, (e.refs ?? []).join(" "), e.model, e.confidence?.toFixed(2)]);
  // BOM so spreadsheets read the Chinese and Malay text as UTF-8.
  const body = "﻿" + [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([body], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `kutip-activity-log-${now.replace(/[:]/g, "")}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** FR-B5: the Clerk never sees cash or gap figures, so scan and R6 lines are redacted for that role. */
const redactForClerk = (e: LogEntry) =>
  e.kind === "SYSTEM" || e.rule === "R6" ? e.text.replace(/[−+-]?RM[\d,.]+/g, "RM•••") : e.text;

export default function LogPage() {
  const log = useKutip((s) => s.state.log);
  const now = useKutip((s) => s.state.now);
  const role = useKutip((s) => s.state.role);
  const [query, setQuery] = useState("");
  const [kinds, setKinds] = useState<ActorKind[]>([]);
  const [newestFirst, setNewestFirst] = useState(false);

  const counts = useMemo(() => {
    const c = Object.fromEntries(KINDS.map((k) => [k, 0])) as Record<ActorKind, number>;
    for (const e of log) c[e.kind] += 1;
    return c;
  }, [log]);

  const rows = useMemo(() => {
    const filtered = log.filter((e) => (kinds.length === 0 || kinds.includes(e.kind)) && matches(e, query.trim()));
    return newestFirst ? [...filtered].reverse() : filtered;
  }, [log, kinds, query, newestFirst]);

  const toggleKind = (k: ActorKind) => setKinds((ks) => (ks.includes(k) ? ks.filter((x) => x !== k) : [...ks, k]));
  const canExport = role === "owner";

  return (
    <div>
      <PageTitle
        title="Activity log"
        subtitle={
          <span className="inline-flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5" aria-hidden />
            Append-only: entries cannot be edited or deleted. Also serves as the Orbyte audit trail.
          </span>
        }
        right={
          <div className="flex flex-col items-end gap-1">
            <Button variant="secondary" size="sm" disabled={!canExport || log.length === 0} onClick={() => exportCsv(log, now)}>
              <Download className="h-3.5 w-3.5" aria-hidden />
              Export CSV ({log.length})
            </Button>
            {!canExport && <span className="text-[11px] text-ink2">Export: Owner only. Clerk can view.</span>}
          </div>
        }
      />

      <Card className="mb-4 px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink2" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search text or refs, e.g. INV-2304"
              aria-label="Search the activity log"
              className="h-8 w-full rounded-[2px] border border-line-strong bg-surface pl-8 pr-7 text-[13px] text-ink placeholder:text-ink3"
            />
            {query && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setQuery("")}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 text-ink2 hover:text-ink"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by actor kind">
            <button
              type="button"
              onClick={() => setKinds([])}
              aria-pressed={kinds.length === 0}
              className={cx(CHIP, kinds.length === 0 ? "border-navy bg-navy text-white" : CHIP_OFF)}
            >
              All · {log.length}
            </button>
            {KINDS.map((k) => {
              const on = kinds.includes(k);
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => toggleKind(k)}
                  aria-pressed={on}
                  className={cx(CHIP, on ? CHIP_ACTIVE[k] : CHIP_OFF)}
                >
                  {k} · {counts[k]}
                </button>
              );
            })}
          </div>
          <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setNewestFirst((v) => !v)}>
            <ArrowDownUp className="h-3.5 w-3.5" aria-hidden />
            {newestFirst ? "Newest first" : "Oldest first"}
          </Button>
        </div>
      </Card>

      {log.length === 0 ? (
        <Empty>No entries yet. Run the 08:00 scan to start the day.</Empty>
      ) : rows.length === 0 ? (
        <Empty>No entries match this filter. Clear the search or press &ldquo;All&rdquo; to see every entry.</Empty>
      ) : (
        <Card className={tbl.wrap}>
          <table className={cx(tbl.table, "min-w-[760px] table-fixed")}>
            <colgroup>
              <col className="w-14" />
              <col className="w-36" />
              <col className="w-36" />
              <col />
              <col className="w-52" />
            </colgroup>
            <thead>
              <tr className={tbl.headRow}>
                <th className={cx(tbl.th, "text-right")}>#</th>
                <th className={tbl.th}>Demo time</th>
                <th className={tbl.th}>Actor</th>
                <th className={tbl.th}>Action</th>
                <th className={tbl.th}>Refs · AI</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.seq} className={cx(tbl.row, "align-top transition-colors hover:bg-canvas/60")}>
                  <td className={cx(tbl.td, "num text-right text-xs text-ink2")}>{e.seq}</td>
                  <td className={cx(tbl.td, "num whitespace-nowrap text-xs text-ink")}>{fmtDateTime(e.at)}</td>
                  <td className={tbl.td}>
                    <ActorBadge e={e} />
                  </td>
                  <td className={cx(tbl.td, "break-words text-ink")}>{role === "clerk" ? redactForClerk(e) : e.text}</td>
                  <td className={tbl.td}>
                    <div className="flex flex-wrap gap-1">
                      {(e.refs ?? []).map((r) => (
                        <button
                          key={r}
                          type="button"
                          title={`Filter by ${r}`}
                          onClick={() => setQuery(r)}
                          className="inline-flex h-[18px] items-center border border-line px-1.5 font-mono text-[10px] text-ink2 hover:border-navy hover:text-navy"
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                    {e.kind === "AI" && (
                      <div className="mt-1 font-mono text-[10px] text-sky-700">
                        {e.model ?? "model n/a"}
                        {e.confidence !== undefined && <> · conf {e.confidence.toFixed(2)}</>}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      <p className="mt-3 text-[11px] text-ink2">
        Showing {rows.length} of {log.length} entries. Times are the frozen demo clock (Asia/Kuala_Lumpur).
      </p>
    </div>
  );
}
