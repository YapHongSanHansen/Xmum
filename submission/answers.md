# SDC 2026 submission answers

Source text for the two official forms. `build_pdfs.py` writes each `### key` block below into the matching box of the official template, checks the word limits, and saves the filled PDFs in this folder.

- Anything containing **TODO** is printed in red in the PDF, so missing details are easy to spot.
- Tables: one row per line, cells separated by ` | `.
- Checkboxes: `[x]` ticked, `[ ]` not ticked. Yes/No questions: `Yes`, `No` or `TODO`.
- Light formatting works: `**bold**`, and lines starting with `- ` become bullets.

Rebuild after editing (needs Python 3 with PyMuPDF: `pip install pymupdf`):

```bash
python submission/build_pdfs.py --team "YourTeamName"
```

---

## Shared team details

### team_name
Taygood

### project_name
Kutip: cash-collection assistant for the Orbyte hub

### leader_name
Hansen Yap Hong San

### leader_contact
yaphongsan@gmail.com · Phone: TODO

### university
Taylor's University

### members
TODO: number of members

### live_url
Not yet deployed; runs locally from the repo (Vercel planned). TODO: add URL

### repo_url
https://github.com/YapHongSanHansen/Xmum (public)

### sign_date
25 October 2026

---

## Preliminary proposal (SDC2026_TeamName_Preliminary.pdf)

### prelim.domain
Domain 2: Orbyte Smart SME Challenge (Alpha Red Solutions)

### prelim.sdg
SDG 8: Decent Work and Economic Growth (targets 8.3 and 8.2)

### prelim.problem
> 2.1 The Problem Context. Maximum 250 words.

Malaysian micro and small businesses that sell to other businesses usually sell **on credit**: deliver now, get paid in 30 days. In practice they wait far longer. Experian reports SME payment delays of **64 days** on average (58 for large firms), and **76 days** in transport and logistics. Meanwhile salaries, rent and supplier bills fall due on fixed dates.

The owner of a 5-20 person firm (haulier, printer, wholesaler, catering supplier) carries this alone, mostly on WhatsApp and spreadsheets. The owner:
- finds out on payroll day that cash is short;
- keeps giving goods on credit to customers who already pay late, so the debt grows;
- chases customers at random, from memory, often late at night;
- matches "dah bank in boss" screenshots to the bank app by hand, and sometimes chases customers who have already paid.

**Why it matters.** Late payment is a cash-flow problem, not a profit problem, yet it is how otherwise healthy small firms miss salaries, pay their own suppliers late (passing the delay down the chain) or turn to costly short-term credit. Bank Negara names slower customer payments as one of three drivers of SME working-capital need. The burden falls on the businesses least able to absorb it, and on employees whose wages depend on it (SDG 8: decent work and the growth of micro and small enterprises). Existing reminder tools focus on chasing and target larger firms or specific accounting software; none warns the owner early or stops new credit to late payers.

### prelim.solution
> 2.2 The Proposed AI Solution. Maximum 300 words.

**Kutip** is a cash-collection module for the Orbyte business hub. It promises only what the owner controls: **never be surprised on payroll day, and stop giving credit to customers who don't pay.**

One journey, end to end:
- **Trigger:** an 08:00 daily scan, a new credit order, or a customer reply.
- **Connected data:** invoices, bills, bank balance and statement lines, payment history (CSV standing in for Orbyte Connect).
- **Decision:** deterministic rules, each with a visible ID, forecast the cash gap and warn 10+ days ahead, hold new credit for customers 30+ days late, and rank who to chase by how much each invoice closes the gap.
- **Human approval:** the clerk approves gentle reminders; the owner approves firm reminders, credit decisions and deductions.
- **Outcome:** a WhatsApp reminder from a fixed BM/English/Chinese template, an invoice verified, the cash meter updated, and an append-only activity log.

**AI is used in one place, where it adds value.** Bukti reads messy replies and payment slips ("Bank in RM2,770, deduct RM330 for the 2 pallet tiles pecah") into structured fields using Claude Opus 5.5, a vision-capable LLM returning schema-validated JSON. Every field must quote the customer's exact words or it is dropped; fields below 85% confidence go to a person with one question; nothing is marked paid unless a matching bank line exists. AI never decides anything about money and never writes to customers.

**Workshop skills we apply:** GenAI APIs (image input and structured output, with a cached fallback); database design (an entity model for invoices, claims, promises and the audit log, money stored as integer sen, ready to move from the browser store to a hosted database in Phase 2); and cloud deployment (the Next.js app and its server-side AI route deploy to Vercel, with the API key kept in environment variables).

### prelim.stack
> 3.1 Conceptual Tech Stack, block diagram, and sponsor-provided GenAI API or cloud platform. No word limit; must fit the box.

**Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, lucide-react.
**Data (Phase 1):** synthetic seed in a Zustand store persisted to the browser; money as integer sen. **Phase 2:** hosted database (Convex or Postgres) behind the same engine.
**Rules engine:** pure TypeScript, deterministic; 97 Vitest tests replay every rule and the full demo script.
**AI:** Claude Opus 5.5 via the Anthropic API (official SDK); image + text in, JSON out, validated with Zod; cached results as fallback.
**Messaging:** WhatsApp click-to-chat (wa.me) links; a person presses send. **Hosting:** Vercel (deployment planned; runs locally today). **Code:** public GitHub repo.

**Block diagram**
- Browser UI (simulated Orbyte hub, Owner/Clerk roles) → Rules engine (forecast, credit check, chase plan, bank match) → Human approval → Outcome + activity log
- Customer reply + slip → /api/extract (Next.js server route) → Anthropic API → validated fields with exact quotes → Rules engine
- Synthetic invoices, bank CSV, messages and slips → Rules engine (stand-in for Orbyte Connect)

**Sponsor-provided GenAI API or cloud platform:** No. We use the sponsor's Orbyte concept (shared hub, roles, Connect, audit trail) as the frame for the module, simulated inside our app. No sponsor API, credits or cloud are used.

### prelim.design
> 3.2 Design-Thinking & Deployment Strategy. Maximum 200 words.

**Empathise:** we researched Malaysian micro-SME pains (owner forums, Experian, Bank Negara, news) and found owners chasing payments on WhatsApp at night with payroll at risk.
**Define:** a customer can always refuse to pay, so we reframed the problem around what the owner controls: knowing early, the credit decision, who to chase, and correct records.
**Ideate:** we scored a shortlist of SME pains against the judging rubric and scanned competitors (Bukku, Paidnice, Peakflo) to find the gap: early warning and credit holds for micro firms that work on WhatsApp.
**Prototype:** a working module inside a simulated Orbyte hub, with synthetic data and a frozen demo clock so the whole journey runs live and repeatably.
**Test:** 97 automated tests replay every rule and the demo script; AI output is bounded by the exact-quote check and the bank match.
**Ready for Phase 2:** the app is one Next.js unit that deploys to Vercel. Next we interview 5-10 Malaysian B2B sellers, run timed first-use trials (goal: learned in under 10 minutes), measure extraction accuracy on 30-50 mixed-language messages, and move the engine onto a hosted database.

### prelim.sdg_target
**SDG 8.3:** promote policies that support productive activities, decent job creation and entrepreneurship, and encourage the formalisation and growth of micro-, small- and medium-sized enterprises, including through access to financial services.

**SDG 8.2:** achieve higher levels of economic productivity through technological upgrading and innovation.

Supporting: SDG 9.3 (small enterprises' integration into value chains).

### prelim.sdg_baseline
- Malaysian SMEs wait **64 days** on average to be paid (58 days for large firms); transport and logistics **76 days** [1].
- Warning before a payroll shortfall today: **0 days**; owners find out on payroll day [2].
- Matching payment slips by hand: about **5 minutes per slip**, so about **10 hours a month** at 120 slips (team estimate, to be measured in interviews).
- Invoices marked paid from a screenshot alone, without a bank check: not measured; we treat any above 0% as a risk.

[1] Experian Malaysia, State of Credit 2025, 21 May 2025. [2] Owner post, forum.lowyat.net/topic/5206091: "Always 30 days became 60/90/120 days."

### prelim.sdg_kpi
- Days of advance warning before a cash shortfall (days).
- Share of invoices marked paid without a matching bank line (%).
- Clerk time per payment slip matched (minutes per slip).
- Exact-match accuracy of the amount read from mixed-language replies (%).
- Time for a first-time user to learn the daily tasks (minutes).

### prelim.sdg_target2
- **100%** of cash shortfalls in our test scenarios warned **at least 10 days** ahead (baseline: 0 days).
- **0%** of invoices marked paid without a bank line (enforced by rule and by test).
- **70% less** clerk time per slip: from about 5 minutes to 1.5 minutes or less, in timed trials with 3 or more first-time users.
- **95% or higher** exact-match accuracy on amounts across a 30-50 message BM/English/Chinese test set.
- First-time users approve a reminder and a payment match in **under 10 minutes** without training.

### prelim.checklist
- [ ] All team members have completed the mandatory GenAI, Database, and Cloud Deployment upskilling workshops. (TODO: tick only if true)
- [x] The project concept addresses a verified real-world problem mapped directly to one or more UN SDGs.
- [x] The proposed solution targets a functional, deployed application rather than a theoretical business case study.
- [x] All fields in this template have been completed within the word limits stated.

### prelim.preexisting_yesno
No

### prelim.preexisting
None. All code, documents and research in this repository were created during the hackathon period (first commit 25 October 2026). No team member's earlier project code, design or research is used.

### prelim.thirdparty_yesno
Yes

### prelim.thirdparty
Next.js 16 and React 19 | Code (web framework and UI) | MIT
Tailwind CSS 4 and lucide-react | Code (styling and icons) | MIT; ISC
Zustand 5 and Zod 4 | Code (state store and schema validation) | MIT
Anthropic TypeScript SDK 1.3 | Code (API client) | Apache-2.0
Claude Opus 5.5 (Anthropic) | Model (pre-trained, called via API) | Anthropic Commercial Terms of Service

### prelim.employment_yesno
TODO

### prelim.employment
TODO: confirm whether any member has an employment, internship or consulting agreement that could claim this work. If none, write "Not applicable" and set the answer above to No.

---

## Technical tools declaration (SDC2026_TeamName_TechDeclaration.pdf)

### tech.architecture
> 2.1 System Architecture Overview. Maximum 200 words.

The user opens Kutip in a browser: a Next.js 16 / React 19 app shown as a module inside a simulated Orbyte hub, with Owner and Clerk roles. Synthetic data (invoices, outflows, bank-statement lines, customer messages and slip images) loads from a seed into a Zustand store kept in the browser.

Every state change goes through a pure TypeScript rules engine: cash forecast and early warning, credit check, chase-plan ranking, the exact-quote check, bank-line matching and approval rights. Each step is written to an append-only activity log.

When a customer reply arrives, the browser calls the app's server route /api/extract (local today; Vercel is the planned host). The route sends the message text and slip image to the Anthropic API (Claude Opus 5.5) and validates the JSON reply with Zod. On any error or timeout it returns a cached extraction labelled "cached result". The fields go back to the engine, which decides; the AI never changes money state.

Approved reminders open WhatsApp through wa.me click-to-chat links, so a person presses send. The preliminary build uses no database (a hosted one is planned for Phase 2). The API key exists only as a server environment variable.

### tech.libraries
TypeScript 5.9 | Language for the app, rules engine and tests | Apache-2.0
Next.js 16.4 and React 19.3 | Web framework, UI and the server route for the AI call | MIT
Tailwind CSS 4.3 and lucide-react 1.61 | Styling and icons | MIT; ISC
Zustand 5 and Zod 4.6 | Client state store; validation of the AI's JSON output | MIT
@anthropic-ai/sdk 1.3 | Client for the Anthropic API | Apache-2.0
Vitest 5.0 and ESLint 9 | Unit tests (97 passing) and linting | MIT

### tech.apis
Anthropic Messages API (Anthropic) | Bukti: reads a customer reply and slip image into structured fields with Claude Opus 5.5 | Paid, pay-as-you-go. Optional: cached results are used without a key
WhatsApp click-to-chat links, wa.me (Meta) | Opens WhatsApp with an approved reminder prefilled; a person presses send. A link, not an API call | Free
No other external APIs | Bank data, accounting data and Orbyte Connect are simulated with synthetic CSV data | Not applicable

### tech.cloud
Vercel (planned) | Will host the Next.js app and the /api/extract route, with the API key as an environment variable. Not yet deployed | Plan and region not yet selected
GitHub | Public code repository and commit history | Free
Anthropic API (cloud inference) | Runs Claude Opus 5.5 for Bukti | Pay-as-you-go; hosted by Anthropic outside Malaysia
Orbyte (Alpha Red Solutions) | Sponsor workspace: a synthetic Kutip client and project record; no runtime integration | Sponsor account; region not stated
No database or authentication service | Demo state lives in the browser and resets from the seed; roles are simulated | Not applicable

### tech.models
Claude Opus 5.5 (claude-opus-5-5) | Anthropic, via API | Pre-trained, used as-is with a prompt and JSON schema; no fine-tuning | Anthropic Commercial Terms of Service

### tech.datasets
Kutip demo seed (Lori Laju Logistics) | This repo: web/src/engine/seed.ts | Synthetic, team-created | Apache-2.0 (this repo) | N
Synthetic payment slip (fictional "Bank Cempaka") | This repo: web/public/slips/ | Synthetic, team-created | Apache-2.0 (this repo) | N
Cached AI extractions for the 3 demo messages | This repo: web/src/engine/cached.ts | Synthetic, team-created | Apache-2.0 (this repo) | N
Experian State of Credit 2025 (figures cited) | experian.com.my, 21 May 2025 | Public report; cited in docs only, not loaded in the app | Experian copyright | N

### tech.aitools_yesno
Yes

### tech.aitools
Claude Code (Anthropic) | Research, PRD, code, tests, docs, submission drafts | Major
OpenAI Codex desktop | Repository review; drafting the declaration | Minor

### tech.aireview
> Maximum 100 words.

Team members reviewed and adapted AI-generated code and documents before committing them. The rules engine is covered by 97 Vitest tests that replay every seed check and the full demo script, including the expected activity log. Research figures were spot-checked against their sources, with corrections marked in place. Inside the product, AI output is never trusted directly: each field must quote the customer's exact words, low-confidence items go to a person, and payments need a matching bank line.

### tech.sponsor_yesno
Yes

### tech.sponsor
Alpha Red Solutions | Orbyte briefing | Shaped our simulated hub frame
Alpha Red Solutions | Orbyte platform access (no API, credits or data provided) | Explored modules and roles; created a synthetic Kutip client and project record. The prototype calls no Orbyte API

### tech.sponsor_essential
> Maximum 100 words.

Not essential. The prototype runs fully without Orbyte: the hub frame, roles, approvals and Connect page are simulated inside our app, as the brief allows. Orbyte access only informed the design so that Kutip fits the hub. In a real deployment Kutip would use Orbyte Connect for accounting and bank data, Orbyte roles for permissions and the Orbyte audit trail; our planned invoice-source adapter is where that integration would go.

### tech.privacy
> 6.1 Data Handling & Privacy. Maximum 150 words.

No real user data is collected. The prototype uses synthetic data only: every business, person, invoice, bank line, message and slip is fictional, and slips use a made-up bank. Demo state is kept in the viewer's browser and cleared by Reset demo; we run no database. When Bukti reads a message, the synthetic text and slip image are sent to the Anthropic API over HTTPS; the key stays on the server.

For a real deployment under Malaysia's PDPA 2010 (as amended in 2024): the SME is the data user and Kutip/Orbyte its processor; contact data is used only to follow up invoices; clerks never see cash figures; extraction keeps only needed fields and masks account numbers; slip images are encrypted with an owner-set retention limit; the AI provider must not train on customer data; cross-border processing is disclosed, with in-region hosting preferred.

### tech.limitations
> 6.2 Known Limitations & Risks. Maximum 150 words.

- **Misreading:** the model may misread an amount or invoice number, or invent a quote. Mitigation: each field must quote the message exactly or it is dropped; fields under 0.85 confidence go to a person; nothing is marked paid without a matching bank line; AI never writes customer messages.
- **Ambiguous Manglish, BM and Chinese** (for example "next Friday"): handed to a person with one question instead of guessed.
- **Single provider, outages, rate limits, latency:** a 25-second timeout and cached extractions keep the demo working; the AI step sits behind one server route, so the provider can be swapped.
- **Unmeasured accuracy:** a 30-50 message test set with a 95% exact-amount target is planned; the live AI path is less tested than the cached path.
- **Data residency:** the provider is hosted outside Malaysia.

### tech.checklist
- [x] All APIs, cloud services, AI tools, models, and datasets used in the project are declared in this document.
- [x] All third-party code, datasets, and models are used in accordance with their licenses, and attribution is provided where required.
- [x] No API keys, passwords, or other credentials are exposed in the code repository, prototype, or this document.
- [x] Any use of generative-AI tools for development has been disclosed and reviewed by the team.
- [x] Any use of official SDC sponsor resources has been declared in Section 5.
- [ ] The prototype described here is accessible to judges through the links provided in Section 1. (TODO: tick once the live URL is in)
- [ ] All fields in this template have been completed within the word limits stated. (TODO: tick once every TODO is filled)

---

## Proof-of-use statements

### replit_pou
**Statement: Replit was not used.**

Our team did not use Replit to develop, host or run Kutip. We declare this rather than add a token integration (SDC Handbook 8.1.3 and 8.4).

- **Development:** code was written locally and shared through the public GitHub repository.
- **Hosting:** the app runs locally today; Vercel is the planned host for the Next.js app and its server-side AI route.
- **Secrets:** the only key (ANTHROPIC_API_KEY) is stored as a host environment variable and in a local .env.local file that git ignores. No secrets are in the repository.

If the organisers require Replit use for the final round, the repository can be imported into Replit (Create Repl → Import from GitHub) and run with `pnpm install` and `pnpm dev` in the web folder.

### runpod_pou
**Statement: RunPod was not used.**

Our team did not use RunPod. Kutip's only AI step reads one short message and one slip image per customer reply, so it calls a hosted model (Claude Opus 5.5 via the Anthropic API) rather than running a GPU model. The rules engine needs no GPU.

- **Why not self-host now:** the step is small and infrequent, and a hosted API gave us image input and structured output on day one.
- **Where RunPod would fit:** in a real deployment, Malaysian data-residency preferences (PDPA cross-border transfer) could justify an open-weight vision model on a GPU endpoint such as RunPod Serverless. The /api/extract route is the single place that would change.
