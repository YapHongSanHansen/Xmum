# Handoff: Kachingg (XMUM hackathon, Domain 2)

Written 25 Oct 2026, 02:50 MYT; updated 03:40 MYT. For the next agent or teammate continuing the build. Read this first, then `README.md`, `docs/domain-2/brief.md` and `docs/PRD.md`.

## 1. Where things stand

| | |
|---|---|
| **Deadline** | Preliminary submission **25 Oct 2026, 07:59 AM MYT** (from sdchack.my). The team must confirm the exact time and the **submission format and length limits** in the team portal or on Discord. Neither has been seen by the author |
| **Repo** | `github.com/YapHongSanHansen/Xmum` (public). `main` is what is deployed |
| **Product** | Kachingg, a cash-collection module inside a **simulated Orbyte hub**. Bukti is its AI reader. Demo business: Lori Laju Logistics (fictional haulage firm). Pitch: *"Never be surprised on payroll day, and stop giving credit to customers who don't pay."* |
| **App** | `web/`: Next.js 16 + React 19 + TypeScript + Tailwind 4 + Zustand (client store persisted to `localStorage`) + a pure TypeScript rules engine in `web/src/engine` + one server route `/api/extract` (Claude) |
| **Status (03:40)** | Section 2 work is merged, plus Ledger pass 2 and a sweep of the remaining files. 158 tests pass; tsc, eslint and `next build` are clean. A scripted browser walk of the 8-step Demo guide (headless Chrome, Owner and Clerk) passes 36 of 36 checks against the section 4 numbers, locally and on the live URL: no Clerk-visible cash or gap figure on any page, no console errors, no browser dialogs, no page-level sideways scroll at 390px |
| **Hosting** | Live on Vercel: **https://kachingg-app.vercel.app** (project `kutip`, scope **`ckayzs-projects`**; never use `predictefys-projects`). `web/vercel.json` pins the Next.js framework (the project was created with the 'Other' preset, which served 404). Deploy with `cd web && vercel deploy --prod --scope ckayzs-projects`. Replit: not tested; whether the judges require it is still unconfirmed |

## 1a. Decisions after 03:40 (user)

- ~~No Orbyte or other company names in the app.~~ **Reversed by the user at 04:55:** Kachingg must integrate Orbyte. Orbyte has no public API, so the integration is built against our own documented API assumptions (`docs/orbyte-integration.md`) with a simulated Orbyte: `web/src/orbyte/` (connector, synthetic workspace), `/api/orbyte-mock/v1/{clients,projects,users,wallet}`, Kachingg's own API `/api/kachingg/v1/{manifest,events}`, and a "Sync from Orbyte" panel on Connect. Orbyte appears as text labels marked "simulated" (header chip, roles, approvals, audit trail, Wallet); no Orbyte logo and no fake other-module menus. Competitor names stay out of the app.
- **Fewer words.** A simplify pass cut helper sentences, mono eyebrows and nested cards on every page; details sit in tooltips or `<details>`. Rule IDs stay on every decision (NFR-1). After it, the browser walk still passes 36 of 36 locally and on the live URL.
- 05:10: the team's redesign (`ecff584`) plus the Orbyte layer pass the walk 36 of 36; 182 tests.
- The browser walk scripts live outside the repo (the agent's scratchpad); they drive headless Chrome with `playwright-core`. The nav landmark is now `nav[aria-label="Kachingg"]`.

## 2. Builder work (done, merged 25 Oct 03:10–03:30)

All four items below were rebuilt in a fresh clone and merged into `main`. Builder A's role choices: invoice and bank imports are Owner or Clerk (the Clerk sees credit lines only); bank balance and reject claim are Owner only; snooze, dispute and call follow the approve tier rules. The seed state `version` is now 2.

| Builder | Scope | Files |
|---|---|---|
| A · data and actions | FR-A1 invoice CSV import, FR-A4 owner bank-balance entry, FR-A5 bank CSV import (pure parsers in the engine, preview tables on Connect); FR-C9 snooze / mark disputed / "I'll call instead" on the approval drawer; Owner "reject claim" on an unverified claim; all role-checked, logged, tested | `web/src/engine/**`, `pages/connect.tsx`, `today/approval-panel.tsx`, `inbox/handoff-queue.tsx` |
| B · Bukti accuracy | 40-message synthetic Manglish/BM/Chinese test set, `extractMessage(msg)` refactor, eval runner `pnpm eval:bukti` (prints per-field accuracy; exits cleanly without a key; never fabricate a score); NFR-4 target ≥95% on amount | `web/eval/**`, `web/src/lib/extract-server.ts`, `web/src/app/api/extract/route.ts`, `web/package.json` scripts |
| C · submission pack | `proposal.md` (~2 pages), `pitch-deck.md`, `demo-video-script.md` (3 min + 30 s), `judge-qa.md`, checklist `README.md` | `docs/submission/**` |
| D · first-time judge view | Dismissible welcome card on Today for a cold visitor; "Usage & credits" page (FR-O4, Orbyte credit wallet, illustrative prices) | `pages/today.tsx`, `shell/**`, `lib/store.ts`, `pages/usage.tsx`, `welcome/**` |

**UI restyle ("Ledger" design, requested by the user):** follow the team's Soapay UI. Pass 1 is done and committed with this handoff: `globals.css` (tokens: IBM Plex Sans/Mono, navy `#1e3a5f`, 2px corners, hairline borders, no shadows, Ledger status colours mapped onto Tailwind `emerald/amber/rose/sky`), `layout.tsx` (Plex fonts), `components/ui.tsx` (Button, Card, Badge as square-dot pill, RuleTag, PageTitle with mono eyebrow, `NavyPanel` / `NavyRow`). **Pass 2 is not started:**
- light 52px top bar or light sidebar with a navy active rule instead of the dark sidebar; **(done: pass 2 and the sweep are merged)**
- Today's cash position as a navy panel with mono rows, and big mono figures for the gap;
- chase plan, bank feed and log as Ledger tables (30px header row, 38px rows, hairline dividers, mono numbers, right-aligned amounts);
- remove leftover `bg-emerald-600` primary buttons (primary is navy) and any `rounded-full`, `shadow` or slate-heavy styling.

Reference on the author's machine: `~/Documents/GitHub/soapay/packages/ui/src/styles.css` and screenshots in `docs/demo-screens/` of that repo, which is private, so don't copy its files or screenshots into this public repo. Keep the Kachingg and Orbyte names; do not use Soapay's logo or name.

## 3. Next steps, in order

1. ✅ **Pull and check.** `git pull`, then in `web/`: `pnpm install && pnpm test && pnpm exec tsc --noEmit && pnpm exec eslint src && pnpm build`. Everything must be green before anything else.
2. ✅ **Finish or redo** any section-2 builder work that is missing (check `git log` and the file list above).
3. ✅ **Ledger pass 2** (section 2).
4. ✅ **Verify in a browser.** Run `pnpm build && pnpm exec next start -p 3210` and walk the in-app **Demo guide** (8 steps) as Owner and Clerk. Check the numbers below. The Clerk must never see a cash or gap figure anywhere (FR-B5), and there must be no browser dialogs.
5. ✅ (Vercel) **Deploy.** Replit is primary if the judges require it; Vercel is the backup: `cd web && vercel deploy --prod --scope ckayzs-projects`. Open the live link and run the guide once.
6. **Live AI, once.** Set `ANTHROPIC_API_KEY` (Vercel: `vercel env add ANTHROPIC_API_KEY production --scope ckayzs-projects`; Replit: Secrets), then read the three seeded messages. If the result is not "Live · …", read the reason label. Replit's managed Anthropic integration needs a **paid** Replit plan and lists only up to `claude-opus-5`, so there also set `KACHINGG_AI_MODEL=claude-opus-5` and expose `ANTHROPIC_API_KEY` / `ANTHROPIC_BASE_URL`. Never put a key in the repo or in chat.
7. **Submission.** Fit `docs/submission/proposal.md` to the real length limit; record the 3-minute video from `demo-video-script.md`; fill the links in `docs/submission/README.md`; confirm the GitHub repo matches the demo.
8. ✅ **README screenshots** (`docs/screens/`) of the restyled app (optional, if time allows).

## 4. Numbers the demo must show (seed, PRD §14)

| Moment | Expected |
|---|---|
| 20 Oct 08:00 scan | 31 Oct salaries **short RM2,000**; 5 Nov diesel **short RM13,200**; early warning raised |
| Chase plan | 1 Mega Bina INV-2304 T1 (closes the gap) · 2 Kilang INV-2310 T1 · 3 Hup Seng INV-2268 T2 · Pelita INV-2296 skipped (promise 30 Oct) |
| Hup Seng card (Owner) | If paid by 30 Oct: 31 Oct covered (+RM4,850); 5 Nov RM13,200 → RM6,350 |
| 20 Oct 11:05 | Hup Seng "下礼拜五才过数" → hand-off "Which Friday?" → 30 Oct |
| 21 Oct 10:20 | Booking RM2,400 on credit → credit check: RM6,850 · 46 days late · total RM9,250 → ask 50% deposit |
| 22 Oct | Second early warning (5 Nov diesel) |
| 23 Oct 14:30 | Mega Bina RM2,770 + RM330 deduction, bank line matched (M1), DO-8812 linked (M3); meter stays red until the **Clerk approves** the receipt, then 31 Oct **covered +RM770**; Owner accepts deduction → INV-2304 PAID, CN-0057 |
| 23 Oct 15:00 | Kilang "Dah settle la semalam" → not marked paid, BM reply asking for slip |
| Log | Matches PRD §13a; pinned in `web/src/engine/demo-script.test.ts` |

## 5. Rules that must not break

- **AI never decides money.** It only extracts fields. An invoice is PAID only with a matching bank line plus a person's approval. The verbatim gate drops any quote not found in the message.
- **People stay in control.** Every consequential action is role-checked in `web/src/engine/reducer.ts` and logged. The Clerk never sees bank balance, salary or gap amounts.
- **Out of scope:** no real payments, no statutory filings, no legal or financial advice, no lender recommendations.
- **Synthetic data only.** No real people, phone numbers, banks or receipts. The slip is from the fictional "Bank Cempaka" and is watermarked.
- **No browser dialogs** (`alert`, `confirm`, `prompt`). Reset uses an inline second click.
- **No pre-existing project code.** Don't copy from ChadBuddy, which was built before the hackathon and would need prior declaration. Declare every tool and AI in the README table (handbook 8.4).
- **Secrets:** keys only in environment variables. `.env*` and `.vercel` are gitignored.
- **Replit Agent:** don't let it restructure `web/`, upgrade dependencies, or push to GitHub without review. GitHub must match the demo.
- Keep `pnpm test` green; the demo-script test is the contract.

## 6. Map of the code

| Path | What |
|---|---|
| `web/src/engine/model.ts` | Types, time and money helpers (money in sen, local MYT strings) |
| `web/src/engine/seed.ts` | Synthetic seed + `DEMO_STOPS` for the clock |
| `web/src/engine/rules.ts` | F1 forecast, G1 gap impact, R1–R6, S1, verbatim gate, M1–M3 helpers |
| `web/src/engine/reducer.ts` | `apply(state, action)`: role checks, state changes, activity log |
| `web/src/engine/*.test.ts`, `web/eval/*.test.ts` | 158 tests (rules, reducer, demo script, imports, card actions, review fixes, eval scorer) |
| `web/src/lib/store.ts` | Zustand store (persist key `kachingg-demo-v1`) |
| `web/src/lib/extract-server.ts` | Claude call: `claude-opus-5-5` (override `KACHINGG_AI_MODEL`; the old `KUTIP_AI_MODEL` is still read), structured JSON output, effort low, 9 s timeout, cached fallback with a reason |
| `web/src/components/shell/` | Simulated Orbyte frame (header, demo clock, role switcher, sidebar) |
| `web/src/components/pages/` | Today, Bookings, Inbox (Bukti), Approvals, Activity log, Connect, Demo guide, Module, Usage |
| `.replit` | Replit run and deploy config (untested on Replit) |
| `docs/PRD.md` | Spec; §22 lists known P0 limitations |

## 7. Open questions only the team can answer

1. The exact submission time, the required items (proposal, video, slides) and their length limits.
2. What "must use Replit" means (build, host, or AI), and whether Replit offers credits.
3. Whether the sponsor is Alpha Red **Solutions** (brief, website judges list) or Alpha Red **Pro** (Orbyte site footer).
4. Interviews with 5–10 real B2B sellers (not done; the proposal says so honestly).
