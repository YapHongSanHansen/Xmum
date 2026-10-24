# ChadBuddy architecture

As cloned on 2026-10-22 (commit 42dd717, 114 commits, 15–23 Aug 2026). About 28k lines of TypeScript plus a 500-line Rust shell.

## 1. The four processes

```
┌───────────────────────┐    GramJS (MTProto)    ┌──────────────┐
│  Telegram account     │◄──────────────────────►│  bridge/     │  bun run bridge
│  (stands in for WA)   │                        │  main.ts     │  long-lived socket
└───────────────────────┘                        └──────┬───────┘
                                                        │ ConvexHttpClient (mutations)
                                                        │ ConvexClient.onUpdate(outbox.pending)
                                                        ▼
┌──────────────┐  OpenAI chat/completions  ┌─────────────────────────────┐
│  OpenAI API  │◄─────────────────────────►│  convex/   (Convex backend) │  bunx convex dev
│  JSON schema │                           │  schema · ingest · agent    │  cloud or docker
└──────────────┘                           │  verbatim · outbox · crons  │
                                           └──────────────┬──────────────┘
                                                          │ ConvexClient.onUpdate (10 queries)
                                                          ▼
┌──────────────┐  beforeDevCommand   ┌──────────────┐   ┌─────────────────────────────┐
│ src-tauri/   │────────────────────►│  server.ts   │──►│  src/main.ts + index.html   │
│ Rust overlay │  loads :4321        │  Bun.serve   │   │  the island / dashboard     │
└──────────────┘                     └──────────────┘   └─────────────────────────────┘
```

`scripts/dev.ts` starts convex watch, the bridge and the Tauri window together with prefixed output and one Ctrl+C. `bun run dev --web` swaps Tauri for a browser tab.

| Process | File | Why it exists |
|---|---|---|
| Bridge | `bridge/main.ts` | Convex actions time out at 10 min and cannot hold sockets. Something local must sit on the Telegram wire. It moves messages in and out and does nothing else. |
| Backend | `convex/*` | All state, all scoring, the AI pass, citation minting, crons. Reactive queries push changes to subscribers. |
| Web server | `server.ts` | Serves `index.html` and bundles `src/main.ts` to `/app.js` on every request (no cache, re-bundle in ms). Bakes the Convex URL in as `__CONVEX_URL__`. |
| Shell | `src-tauri/` | Transparent, undecorated, always-on-top window over the desktop. Only Rust logic is click-through: the page reports the island's rectangle, a polling thread flips `set_ignore_cursor_events` at the boundary. |

## 2. Data flow: message in → recommendation → approved send

```
1. Telegram message
      │  source.onMessage (bridge/telegram/source.ts)
      ▼
2. ingest.ingestBatch (≤200 per call, 1 s mutation budget)
      │  dedupes on (clientId, sourceId); mints externalId "C-058" from a per-client
      │  counter INSIDE the transaction, so citation keys are unique and never reused
      ▼
3. messages table  ──► threads.list (query, 120-day window)  ──► page re-renders
      │
      │  cron "agent pass" every 15 min, 10-min per-client debounce
      ▼
4. agent.analyzeAll (Node action)
      │  renders thread as "[C-058] client: text", calls OpenAI with strict JSON schema:
      │  ideas[] { rank, title, why, draft, intent: send|hold|blocked|note, claims[] }
      │  every claim = { statement, sourceId, quote }
      ▼
5. verbatim.gate
      │  quote must appear character-for-character in that message's stored text
      │  (whitespace normalised, case-sensitive, empty quotes refused)
      │  failed claims → `rejected` table with reason; ideas with no surviving claims die
      ▼
6. ideas table ──► threads.ideas ──► UI shows draft + cite chips (click = scroll to source)
      │
      │  advisor edits draft, presses "Send as me"
      ▼
7. outbox.queueSend (state: queued)  ← the ONLY path to a send; refuses seed clients
      │  bridge subscribes to outbox.pending
      ▼
8. bridge: source.sendMessage → outbox.markSent / markFailed
      │
      ▼
9. outbox.history ──► src/autopilot.ts ledger ("every action, with its receipt")
```

The design principle that holds it together: **nothing on screen is invented**. Displayed numbers are measured from messages, quotes are verbatim or discarded, and the rejection count is itself shown so the AI's fabrication rate is visible.

## 3. Backend modules (convex/)

| Module | Role |
|---|---|
| `schema.ts` | 22 tables. Core: `chats` (everything the account sees), `clients` (promoted chats, key + seq counter), `messages` (externalId, sender, ts, text, via), `ideas`, `rejected`, `outbox`. Peripheral: `calendarAuth`, `events`, `tasks`, `taskSuggestions`, `proposals`, `emotions`, `keypoints`, `digests`, `notes`, `clientStages`, `marketEvents`, `holdings`, `phoneCalls`, `ringing`, `presenceSent`, `pairing`. |
| `ingest.ts` | Only writer of messages. `upsertChats`, `pickClients` (promote chat → client), `ingestBatch`, `ingestVoice`, `ingestEmail`, `setPairing`. |
| `verbatim.ts` | The gate. Pure function, mirrored from `src/ledger.ts findVerbatim`. 15 tests in `bridge/agent/*.test.ts`, including one that asserts the gate cannot tell whether a real quote *supports* a claim. |
| `agent.ts` | The AI pass (Node runtime). Provider-agnostic via `AGENT_BASE_URL`/`AGENT_MODEL`. `AUTO_SEND` env flag exists and is off. |
| `agentData.ts` | Internal queries that shape a thread for the agent. |
| `outbox.ts` | The approval seam: queue, pending, markSent, markFailed, history. |
| `threads.ts`, `chats.ts` | Read models for the page: `threads.list` returns the exact `SeedThread` shape so seed and live are interchangeable. |
| `seed.ts` | Loads hand-written threads *keeping* their citation ids (the one exception to "mint in DB"). Also demo mutations (`demoWork`, `demoStory`). |
| `crons.ts` | agent pass 15 min, task suggestions 30 min, calendar sync 5 min, presence 1 min, news 1 h, email 10 min. |
| `suggestions.ts`, `stages.ts`, `emotions.ts` | Further AI passes that all go through the same gate. |
| `calendar.ts`, `http.ts`, `presenceLive.ts`, `scheduling.ts` | Google Calendar OAuth + push + mirror; "in a meeting until" auto-replies; meeting-time proposals parsed from chat. |
| `email.ts`, `emailIngest.ts`, `emailCapture.ts` | Gmail SMTP send, IMAP poll, email-address extraction from chat. |
| `news.ts`, `holdings.ts`, `calls.ts`, `voice.ts` | Market news sweep, CSV portfolio import, Telegram call events, voice-note transcription. |

## 4. Frontend (src/, index.html)

No framework for the shell. `src/main.ts` builds HTML strings and swaps `innerHTML` per `render()`. React is pulled in only for the chart components (`src/charts/`, `funnel.tsx`).

- **Island state machine**: one element, five states (`idle · alert · call · peek · open`), grown in CSS. Open state carries pages: `home | clients | agenda | calendar | desk | assist | queue kinds`.
- **View model**: `src/derive.ts` computes every number from the threads (`signals.ts` measures latency / initiations / questions / length; `score.ts` is a provisional composite; `ledger.ts` tracks promises with the verbatim gate; `book.ts` stages).
- **Seed vs live seam**: `src/live.ts`. Browser = seed (`data/threads/*`, frozen `NOW` of 2026-08-17 in `data/clock.ts`); Tauri = live; `?live` / `?seed` override. Live mode subscribes to ten Convex queries and reassigns exported `let` bindings (`clients`, `ideas`, `tasks`…), so every consumer updates through ES live bindings without main.ts knowing. If Convex is unreachable, everything degrades to the seed.
- **Side stores**: `tasks.ts`, `suggest.ts`, `proposals.ts`, `emotions.ts`, `autopilot.ts` (the action ledger), `daysource.ts` (seed calendar or Google), `presence.ts`, `desk.ts` (news impact), `shell.ts` (Tauri IPC for hot-rect, quit, open external).
- `index.html` is 2.3k lines of CSS (Rosé Pine Moon tokens, "lit frame" design system) plus the island skeleton.

## 5. Data and tests

- `data/threads/client-{a,b,c,d}.ts`: 222 hand-written messages, four decay patterns (healthy, obvious decay, silent churn, advisor-caused). `data/fixtures.ts` is the test oracle and is never imported by the engine.
- `scripts/verify-seed.ts` measures the four signals; `scripts/verify-ui.ts` fails the build if a hand-cited id does not resolve.
- `bun run check` (frontend tsc), `check:backend`, `test:backend`, `convex/tsconfig.json` typecheck before deploy.

## 6. Configuration and deployment model

- `.env.local` (gitignored): `CONVEX_DEPLOYMENT` or `CONVEX_SELF_HOSTED_URL`+admin key, `TELEGRAM_API_ID/HASH`, optional `CONVEX_URL` page override.
- `scripts/convex-url.ts` exposes two resolvers in opposite precedence: `convexUrl()` (writers: self-hosted first, so real chats never go to a shared deployment) and `browserConvexUrl()` (page: `CONVEX_URL` first). The bridge refuses to start if it would write to a deployment that is not its own.
- Per-deployment env vars: `OPENAI_API_KEY`, `AGENT_MODEL`, `AUTO_SEND`, Google OAuth, Gmail, `PHONE_WEBHOOK_TOKEN`. Everything degrades honestly when unset.
- One Convex deployment per developer; a designated one for demo day (`TEAMWORK.md`).
- `docker-compose.yml` runs a self-hosted Convex on loopback for real data.

## 7. What is load-bearing vs. decorative (for the Domain 2 rebuild)

Load-bearing and reusable as infrastructure: bridge + `Source` interface, `ingest` with DB-minted citation ids, `verbatim` gate + `rejected`, `outbox` seam, `seed` loader, `convex-url`/`dev` scripts, `server`/`build`, CSS tokens.

Product-specific and removable: Tauri shell, island state machine, decay signals/score, ledger-of-promises semantics, calendar/presence/scheduling, email, news/holdings/stages, emotions/keypoints (and the Python sidecar), the advisor seed data, all of `src/main.ts`.
