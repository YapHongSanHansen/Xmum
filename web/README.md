# Kachingg web app

The Kachingg cash-collection demo, designed for the Orbyte business hub. See the [repository README](../README.md) for the product, and [`../docs/PRD.md`](../docs/PRD.md) for the spec.

```bash
pnpm install
pnpm test     # rules engine: PRD seed checks, permissions, clock, full demo script
pnpm dev      # http://localhost:3000
```

| Path | What it is |
|---|---|
| `src/engine/` | Pure TypeScript rules engine: model, synthetic seed, rules (F1, G1, R1–R6, S1, M1–M5), reducer that checks roles and writes the activity log, tests |
| `src/lib/store.ts` | Client store; every change goes through the engine |
| `src/lib/extract-server.ts`, `src/app/api/extract/route.ts` | Bukti's AI step: Claude Opus 5.5 reads a reply and slip into structured fields, with a cached fallback |
| `src/components/shell/` | Responsive app frame: top navigation, demo clock, role switcher |
| `src/components/pages/` | Overview, Bookings, Bukti inbox, Approvals, Activity log, Connect, Usage, Demo guide |
| `public/slips/` | Synthetic payment slip from a fictional bank, watermarked as not real |

Set `ANTHROPIC_API_KEY` in `.env.local` for live AI reading; without it the three demo messages use hand-written fixtures, labelled "cached".

## Frontend design

The interface uses a soft grey canvas, rounded panels, a dark active navigation tab, and blue, green, and pink data accents. The Overview pairs an interactive 30-day cash outlook with bill coverage, receivables ageing, inbox work, early warnings, and the collection plan. All other screens share the same controls, typography, and responsive layout.

The cash outlook is a read-only projection built in `src/lib/cash-outlook.ts`; it does not run a scan or mutate demo state. Exact values remain available in the selected-event description and accessible labels. Tests check its balances against the rules engine. Cash balances and forecasts render only for the Owner. The Clerk retains invoice and payment workflows with bill-gap indicators.

The app uses system fonts, so builds do not need to download font files. Navigation scrolls horizontally on smaller screens; wide data tables and the forecast scroll inside their own containers. Review drawers and slip dialogs contain keyboard focus, support Escape, and restore focus when closed.
