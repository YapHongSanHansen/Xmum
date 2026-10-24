# Kutip web app

The Kutip demo, shown inside a simulated Orbyte hub. See the [repository README](../README.md) for the product, and [`../docs/PRD.md`](../docs/PRD.md) for the spec.

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
| `src/components/shell/` | Simulated Orbyte hub frame: header, demo clock, role switcher, sidebar |
| `src/components/pages/` | Today, Bookings, Inbox (Bukti), Activity log, Connect, Demo guide |
| `public/slips/` | Synthetic payment slip from a fictional bank, watermarked as not real |

Set `ANTHROPIC_API_KEY` in `.env.local` for live AI reading; without it the three demo messages use hand-written fixtures, labelled "cached".
