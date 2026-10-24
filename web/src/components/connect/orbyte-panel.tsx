"use client";
// Orbyte on Connect: Kutip reads the (simulated) Orbyte workspace through the
// connector and writes its audit trail and approvals back. Everything here is
// simulated and synthetic (docs/orbyte-integration.md). The Clerk sees no cash
// or gap figures: audit lines are redacted the same way as the activity log.
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, ExternalLink, RefreshCw } from "lucide-react";
import { Badge, Button, Card, CardHeader, MetricRow, cx, tbl } from "@/components/ui";
import { fmtDateTime, type Lang } from "@/engine/model";
import { clientRows, httpOrbyteConnector, pendingOrbyteApprovals, readOrbyte, toOrbyteAudit } from "@/orbyte/connector";
import type { OrbyteSnapshot } from "@/orbyte/types";
import { useKutip } from "@/lib/store";

const LANG_LABEL: Record<Lang, string> = { en: "EN", bm: "BM", zh: "ZH" };
const KUTIP_ROLE: Record<string, string> = { owner: "Owner", clerk: "Clerk" };

const API_LINKS: [string, string][] = [
  ["/api/orbyte-mock/v1/clients", "Orbyte clients (simulated)"],
  ["/api/orbyte-mock/v1/projects", "Orbyte projects (simulated)"],
  ["/api/orbyte-mock/v1/users", "Orbyte users (simulated)"],
  ["/api/orbyte-mock/v1/wallet", "Orbyte wallet (simulated)"],
  ["/api/kutip/v1/manifest", "Kutip module manifest"],
  ["/api/kutip/v1/events", "Kutip events (demo replay)"],
];

const SYNC_PREFIX = "synced from Orbyte";

export function OrbytePanel() {
  const s = useKutip((st) => st.state);
  const dispatch = useKutip((st) => st.dispatch);
  const connector = useMemo(() => httpOrbyteConnector("/api/orbyte-mock/v1"), []);
  const [snap, setSnap] = useState<OrbyteSnapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Show the workspace on arrival; "Sync from Orbyte" re-reads it and records the sync.
  useEffect(() => {
    let live = true;
    readOrbyte(connector)
      .then((x) => live && setSnap(x))
      .catch((e: unknown) => live && setError(`Could not reach Orbyte (simulated): ${e instanceof Error ? e.message : "unknown error"}`));
    return () => {
      live = false;
    };
  }, [connector]);

  const sync = async () => {
    setBusy(true);
    setError(null);
    try {
      const x = await readOrbyte(connector);
      setSnap(x);
      dispatch({ type: "ORBYTE_SYNC", clients: x.clients.length, projects: x.projects.length, users: x.users.length });
    } catch (e) {
      setError(`Could not reach Orbyte (simulated): ${e instanceof Error ? e.message : "unknown error"}`);
    } finally {
      setBusy(false);
    }
  };

  const lastSync = [...s.log].reverse().find((e) => e.text.startsWith(SYNC_PREFIX));
  const rows = snap ? clientRows(s, snap.clients) : [];
  const audit = toOrbyteAudit(s.log, s.role).slice(-5).reverse();
  const approvals = pendingOrbyteApprovals(s);

  return (
    <section aria-label="Orbyte" className="mb-8">
      <Card>
        <CardHeader
          kicker="Orbyte workspace"
          title={s.business.name}
          right={<Badge tone="emerald">Connected (simulated)</Badge>}
        />
        <div className="space-y-5 px-5 pb-5 sm:px-6">
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={sync} disabled={busy} aria-busy={busy}>
              <RefreshCw className={cx("h-4 w-4", busy && "animate-spin")} aria-hidden />
              {busy ? "Syncing…" : "Sync from Orbyte"}
            </Button>
            <span className="text-xs text-ink2" aria-live="polite">
              {lastSync ? `Last sync ${fmtDateTime(lastSync.at)} by ${lastSync.actor} · ${lastSync.text.replace(/^synced from Orbyte \(simulated\): /, "")}` : "Not synced yet"}
            </span>
          </div>
          {error && (
            <div role="alert" className="border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {error}
            </div>
          )}

          <MetricRow
            items={[
              { label: "Clients", value: snap ? snap.clients.length : "—" },
              { label: "Projects", value: snap ? snap.projects.length : "—" },
              { label: "Users", value: snap ? snap.users.length : "—" },
              { label: "Wallet credits", value: snap ? snap.wallet.balance.toLocaleString("en-MY") : "—", detail: "Illustrative" },
            ]}
          />
        </div>

        <div className="border-t border-line">
          <div className={tbl.wrap}>
            <table className={cx(tbl.table, "min-w-[560px]")}>
              <caption className="sr-only">Orbyte clients mapped to Kutip customers</caption>
              <thead>
                <tr className={tbl.headRow}>
                  <th className={tbl.th}>Orbyte client</th>
                  <th className={tbl.th}>Orbyte id</th>
                  <th className={tbl.th}>Language</th>
                  <th className={tbl.th}>Kutip customer</th>
                  <th className={cx(tbl.th, "text-right")}>Open invoices</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ client, kutipName, openInvoices }) => (
                  <tr key={client.id} className={cx(tbl.row, "h-12")}>
                    <td className={cx(tbl.td, "text-ink")}>{client.name}</td>
                    <td className={cx(tbl.td, "font-mono text-xs text-ink2")}>{client.id}</td>
                    <td className={cx(tbl.td, "text-xs text-ink2")}>{LANG_LABEL[client.language]}</td>
                    <td className={cx(tbl.td, "text-xs text-ink2")}>
                      {kutipName ? (
                        <span className="inline-flex items-center gap-1.5">
                          <ArrowRight className="h-3 w-3" aria-hidden />
                          <span className="font-mono">{client.kutipCustomerId}</span>
                        </span>
                      ) : (
                        "Not in Kutip"
                      )}
                    </td>
                    <td className={cx(tbl.td, "text-right font-mono tabular-nums")}>{openInvoices}</td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr className={tbl.row}>
                    <td colSpan={5} className={cx(tbl.td, "text-xs text-ink2")}>
                      {error ? "No Orbyte data." : "Loading Orbyte clients…"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      <div className="mt-4 grid items-start gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title="Roles from Orbyte" />
          <ul className="space-y-2 px-5 pb-5 text-[13px] sm:px-6">
            {(snap?.users ?? []).map((u) => (
              <li key={u.id} className="flex items-center justify-between gap-3">
                <span className="min-w-0">
                  <span className="text-ink">{u.orbyteRole}</span>
                  <ArrowRight className="mx-1.5 inline h-3 w-3 text-ink2" aria-label="maps to" />
                  <span className="text-ink">{KUTIP_ROLE[u.kutipRole]}</span>
                </span>
                <span className="truncate text-xs text-ink2">{u.name}</span>
              </li>
            ))}
            {!snap && <li className="text-xs text-ink2">{error ? "No Orbyte data." : "Loading…"}</li>}
          </ul>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Sent to Orbyte" right={<Badge>Simulated</Badge>} />
          <div className="grid gap-5 px-5 pb-5 sm:px-6 md:grid-cols-2">
            <div className="min-w-0">
              <h3 className="mb-2 text-xs font-medium text-ink2">Audit trail · latest {audit.length}</h3>
              {audit.length ? (
                <ol className="space-y-2">
                  {audit.map((a) => (
                    <li key={a.id} className="text-xs leading-relaxed">
                      <span className="font-mono text-[11px] text-ink2">{fmtDateTime(a.at)}</span> <span className="text-ink">{a.actor}</span>{" "}
                      <span className="break-words text-ink2">{a.action}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-xs text-ink2">Nothing yet.</p>
              )}
            </div>
            <div className="min-w-0">
              <h3 className="mb-2 text-xs font-medium text-ink2">Approvals inbox · {approvals.length} pending</h3>
              {approvals.length ? (
                <ul className="space-y-2">
                  {approvals.slice(0, 5).map((a) => (
                    <li key={a.id} className="flex items-start justify-between gap-3 text-xs leading-relaxed">
                      <span className="min-w-0 break-words text-ink">{a.title}</span>
                      <Badge tone={a.requiredRole === "Owner" ? "violet" : "sky"} className="shrink-0">
                        {a.requiredRole}
                      </Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-ink2">Nothing waiting.</p>
              )}
            </div>
          </div>
          <details className="border-t border-hairline px-5 py-3 sm:px-6">
            <summary className="cursor-pointer text-xs font-medium text-ink">View API</summary>
            <ul className="mt-3 space-y-1.5">
              {API_LINKS.map(([href, what]) => (
                <li key={href} className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="w-8 font-mono text-[11px] font-semibold text-sky-700">GET</span>
                  <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-mono text-ink underline-offset-2 hover:underline">
                    {href}
                    <ExternalLink className="h-3 w-3" aria-hidden />
                  </a>
                  <span className="text-ink2">{what}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] text-ink2">Synthetic data. Orbyte has no public API; these shapes are our assumptions.</p>
          </details>
        </Card>
      </div>
    </section>
  );
}
