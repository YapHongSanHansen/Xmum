# Domain 2 build plan — rebuilding on ChadBuddy's bones

Written 2026-10-22. Submission closes **2026-10-25 23:59 MYT** (sdchack.my). Top 15 per domain go to the upgrade round (28–30 Oct) and the physical final (31 Oct–1 Nov).

## 1. Rules that decide how we can use ChadBuddy

Source: Terms & Conditions v2026-08-21 and Official Handbook v2026-08-17 (both at sdchack.my/legal).

| Rule | What it says | What it means for us |
|---|---|---|
| T&C 5.3.1, 5.3.3 | Projects substantially completed before the problem statement release (19 Oct) are not eligible. | ChadBuddy as a product (114 commits, 15–23 Aug 2026) cannot be the submission. |
| T&C 5.3.2 | Cannot submit a project previously submitted to another hackathon or competition. | If ChadBuddy was entered anywhere in August, its *product* is out; only supporting code can come along. |
| T&C 5.4.1–5.4.3 | Reasonable pre-existing code allowed only as **supporting components** (auth, utilities, DB connectors, UI components, logging, config). Core idea, implementation and major functionality must be built for this hackathon. No "minor cosmetic modification" reuse. | Keep the plumbing, rebuild the product. |
| T&C 5.4.4–5.4.5, Handbook 8.2.1, 8.4 | Pre-existing code must be declared (handbook says at registration, with organiser approval); non-disclosure is misconduct. | Email sdc.xmumhack@gmail.com and post on Discord **now** declaring the reused infrastructure and asking for approval. Repeat the declaration in the README and proposal. |
| T&C 5.5.2–5.5.3 | Repo must be created after 19 Oct. Recycling an older repo needs prior written approval. | **Create a brand-new GitHub repo.** Do not push the new product to POTATO0826/ChadBuddy. |
| T&C 5.5.4–5.5.5, 5.3.4 | Clear, traceable commit history reflecting real progress; organisers inspect creation dates and timestamps. | Commit in small, honest steps from today. |
| Handbook 8.5 | AI coding tools are allowed and encouraged; AI output during the hacking period is not "pre-existing". Team must be able to explain every major component. | Fine, but every teammate needs to be able to walk judges through the journey and the code. |
| Handbook 7.4.3 | Working prototype + live pitch + functional UI are all mandatory. | Web UI is the deliverable, not a desktop overlay. |
| T&C 6.2 | Deliverables may include GitHub repo, README, technical docs, slides, demo video, report, pitch deck. Exact list comes from the submission platform. | Check the sdchack.my submission form for the actual required fields and limits. |
| T&C 6.6 | Repository freeze after the deadline. | No commits after 25 Oct 23:59. |

## 2. What ChadBuddy actually is

Telegram bridge → Convex backend → AI pass that must cite verbatim message text → human-approved outbox → ledger. Built for financial advisors (relationship decay, holdings, market news, calendar, email, phone calls, Tauri overlay). About 28k lines, 5.8k of them in `src/main.ts`.

The reusable part is exactly the Domain 2 journey skeleton:

| Journey step (brief §3) | ChadBuddy piece that already does it |
|---|---|
| Trigger | `bridge/` live message ingest; `convex/crons.ts` schedules |
| Connected data | `convex/ingest.ts`, `convex/schema.ts` (chats, clients, messages with stable citation ids) |
| Decision logic | `convex/agent.ts` structured-output call + `convex/verbatim.ts` gate (claims without a real quote are discarded and counted in `rejected`) |
| Human approval | `convex/outbox.ts` seam: page can only queue, bridge delivers, nothing auto-sends |
| Visible outcome + activity log | outbox `history`, `src/autopilot.ts` ledger idea |

## 3. Keep / remove / add

### Keep (declare as pre-existing supporting components)
- `bridge/main.ts`, `bridge/telegram/*`, `bridge/types.ts` — message in/out (Telegram stands in for WhatsApp; say so openly).
- `convex/`: `schema.ts` (trimmed), `ingest.ts`, `verbatim.ts`, `outbox.ts`, `seed.ts`, `chats.ts`, `threads.ts`, the OpenAI JSON-schema + gate pattern from `agent.ts`.
- `scripts/convex-url.ts`, `scripts/dev.ts` (simplified), `server.ts`, `build.ts`, `assets/fonts.css`, the CSS design tokens from `index.html`.
- `bridge/agent/verbatim.test.ts`, `decay.test.ts` style tests.

### Remove
- `src-tauri/` (desktop overlay), `.lavish/`, `chadbuddy-flow.html`, `docs/`, `demo/`.
- Convex: `calendar.ts` + `CALENDAR.md` + Google routes in `http.ts`, `presenceLive.ts`, `scheduling.ts`, `emailCapture.ts`, `emailIngest.ts`, `voice.ts`, `calls.ts`, `news.ts`, `holdings.ts`, `emotions.ts`, `stages.ts`, `suggestions.ts` (or repurpose as the rule engine), `agentData.ts` (rewrite for new shapes).
- `bridge/emotion/` (Python LangExtract), `shared/holdingsCsv.ts`, `scripts/import-holdings.ts`, `scripts/verify-seed.ts`, `scripts/verify-ui.ts`.
- `src/` wholesale: the island/dashboard, charts, decay score, calendar, desk, news, stages. New UI is written fresh.
- `data/` financial-advisor seed threads, holdings, market, meetings. New synthetic SME data replaces them.
- `AGENTS.md` advisor persona, `TEAMWORK.md` (rewrite shorter), `README.md` (rewrite).

### Add (the actual submission)
- **Simulated tenant + roles**: `businesses`, `users` with role `owner | staff | viewer`, a role switcher in the UI (brief says login/RBAC may be simulated).
- **Commitment ledger**: `enquiries`, `quotes`, `invoices` (or one `commitments` table with `kind`), each row citing the message it came from.
- **Rule engine** (no AI): enquiry unanswered > SLA, quote sent with no reply > N days, payment promised/overdue > N days. Runs on ingest and on a cron. Every rule fires an `approvals` row, never a send.
- **AI only where it adds value**: extract structured facts from the thread (what was asked, amount quoted, date promised) and draft the follow-up in the owner's voice, every fact verbatim-cited through the existing gate.
- **Approval queue**: staff can propose/edit, owner must approve anything that quotes a price or chases money. Approve → outbox → bridge sends → `activityLog` row.
- **Append-only `activityLog`**: who, what, when, which message/rule caused it, outcome.
- **Fresh web UI** (mobile-first, owners live on phones): Queue · Contact thread with citations · Activity log · Rules/settings · Role switch.
- **Seed-mode demo** that runs in a browser with no Telegram, plus live mode for the "it really sent" moment.
- **README**: problem → approach → expected outcome with numbers, 5-step journey map, Orbyte fit (connector/module reuse), SDG 8.2/8.3, PDPA note, declarations (ChadBuddy infra, OpenAI, Convex, Telegram), hardest risk + fallback.

## 4. Recommended product (pick one, lock it, don't widen)

**Follow-up automation for WhatsApp-run SMEs: no enquiry, quote or payment gets forgotten.**

Malaysian micro businesses (renovation contractors, tuition centres, caterers, workshops, print shops) sell through WhatsApp. Enquiries arrive while the owner is on site, quotes go out by text and then go cold, deposits are promised and not chased. The brief lists this exact pain first ("chasing supplier orders, customer enquiries, quotations or payments").

Demo journey (one, end to end):
1. **Trigger**: customer message arrives ("ok can you send the quote for the 10ft cabinet?") or a quote passes 3 days with no reply.
2. **Connected data**: thread history, price list, open quotes/invoices for that contact, who on the team owns the contact.
3. **Decision**: rule says "quote stale 3 days"; AI drafts the follow-up quoting the customer's own words and the amount from the ledger, cited; missing information (no price agreed) is handed to a human instead of guessed.
4. **Approval**: staff sees the draft; because it contains a price, the owner must approve. One tap on the phone.
5. **Outcome**: bridge sends it, quote status moves to "followed up", activity log shows who approved what and when.

Measurable benefit to claim: first-reply time, quotes followed up within 3 days, owner hours per week spent chasing, errors avoided (wrong price, double follow-up).

Orbyte fit: a reusable "conversation → commitment" connector that any Orbyte module can consume; business model usage-based per conversation or per seat.

Alternatives considered: supplier order chasing (same mechanics, less universal), invoice reminders only (narrower, closer to the "real payments" boundary).

## 5. Three-day order of work

| Day | Goal |
|---|---|
| 22 Oct (tonight) | Declare pre-existing code to organisers. Create the new repo. Copy kept infrastructure in, delete the rest, get `bun run check` green on an empty product. |
| 23 Oct | Schema + synthetic SME data + rule engine + approval/outbox/activity log in Convex. Seed-mode UI showing the queue and the thread. |
| 24 Oct | AI draft with citations, owner/staff role switch, activity log page, live Telegram send. README and pitch outline. |
| 25 Oct | Polish, demo video, proposal/slides per the submission form, final commit before 23:59. |

Hardest risk to name in the proposal: the bridge depends on a personal Telegram session (WhatsApp Business API needs Meta approval). Fallback: seed mode demonstrates the full journey without a live socket, and the connector interface (`bridge/types.ts` `Source`) is the same one a WhatsApp adapter would implement.
