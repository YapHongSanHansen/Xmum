# Kutip + Bukti: idea brief

**Status:** idea brief from brainstorming on 25 Oct 2026. This is the team's current pick for Domain 2, but it is **not yet a build spec**. The open decisions at the end need answers before planning the build.

**Working names:** *Kutip* ("collect") is the product. *Bukti* ("proof") is its AI reader.

**Read with:** the brief in `../domain-2/brief.md` (text) or `../domain-2/Domain-2-brief.pdf` (source of truth), the evidence in `../research/01-pain-research-shortlist.md`, and the competitor scan in `../research/02-competitor-scan.md`.

---

## 1. The problem, in plain words

Small Malaysian B2B businesses sell **on credit**. A printing shop prints 500 cake boxes for a café, and the café says "I'll pay in 30 days". The café actually pays after 60 or 90 days. Meanwhile the shop must pay **staff salary on the 31st**, rent and its own suppliers, whether customers have paid or not.

So every month the owner chases customers by hand on WhatsApp ("boss, can pay already?"). That causes two headaches:

1. **"Who should I chase first?"** The owner has many unpaid invoices and chases randomly or from memory. Salary day arrives and there is not enough cash.
2. **"Did this customer really pay?"** The customer says "dah bank in boss" and sends a screenshot. The clerk opens the bank app, finds the money and matches it to the right invoice by hand. Sometimes the shop chases a customer who already paid, which is embarrassing. Sometimes a screenshot is wrong and nobody notices.

## 2. The idea

| Part | Job | Uses AI? |
|---|---|---|
| **Kutip** | Every morning, compare cash in the bank plus expected receipts with the bills due soon (payroll, rent, supplier). If there is a gap, rank overdue invoices by how much each one closes it, and prepare WhatsApp reminders in the customer's language. A clerk sends gentle ones; firm ones need the owner's approval. | No, rules only, so every decision can be explained in one line |
| **Bukti** | Read customer replies and payment-slip screenshots (Manglish, BM, Chinese), extract amount, invoice, reference and promised date, then check the bank statement. An invoice is marked paid **only if a matching bank line exists**. Unclear items go to a human. | Yes, for reading only. Rules decide everything about money |

**Pitch line:** *"Tells you who to chase to make payroll, and proves the money really arrived."* Do not pitch it as "WhatsApp payment reminders"; that already exists (see section 9).

## 3. Who it is for

- **Primary:** Malaysian micro and small B2B sellers (about 2-30 staff) that sell on 30-90 day credit and chase payment on WhatsApp. Examples: printing and packaging, food and catering supply, wholesale and trading, B2B services, small transport operators.
- **Not for:** firms that are paid upfront or mostly by payment link or DuitNow QR (fewer slips to read), and firms already on enterprise collections tools.

## 4. Why this pain (evidence)

| Evidence | Source |
|---|---|
| SME "payment delays" average 64 days, against 58 for large corporations; transport/logistics 76 days. Experian does not say whether SMEs are the payer or the payee. | [Experian, 21 May 2025](https://www.experian.com.my/2025/05/21/experian-malaysias-state-of-credit-2025-reveals-sme-resilience-but-cash-flow-strains-persist/) |
| Bank Negara names "slower customer payments" as one of three drivers of higher working-capital needs | [The Star, 30 Jul 2026](https://www.thestar.com.my/business/business-news/2026/07/30/facilitating-access-to-sme-financing) |
| Owner on Lowyat: "Always 30 days became 60/90/120 days" | [Lowyat forum](https://forum.lowyat.net/topic/5206091/all) |
| Bukku already sells automatic reminders (email only) at RM65/month, which shows owners pay for this | [Bukku pricing](https://www.bukku.my/pricing) |

**Team's "super pain" test** (the bar used to pick ideas): money, already spending, deadline or penalty, frequency.

| Test | Result |
|---|---|
| Money | Pass: cash locked for about two months |
| Already spending | Partial: financing and lawyers in bad cases; owner chasing time is not measured in any source |
| Deadline or penalty | Partial: no statutory late interest, but payroll and rent dates force it every month |
| Frequency | Pass: every credit invoice; chasing is weekly |

**Evidence is real but thin.** Every pain that survived the skeptic round scored only 2/4. No source shows that reminders make customers pay faster. Talking to 3-5 real owners is the biggest single improvement (the brief lists real-world validation as a bonus).

## 5. Example flow (all names and numbers fictional)

**CetakPantas Print**, a 4-person printing shop in Seri Kembangan. Owner: Mei Ling. Clerk: Aisyah.

**Step 0, setup (once).** Invoices come from Bukku, SQL Account, AutoCount or Xero through **Orbyte Connect**, or from a CSV. Bills the business must pay go in once as recurring items (payroll RM8,400 on the 31st, paper supplier).

**Step 1, Tue 20 Oct 08:00: the morning scan (owner's screen).**

```text
┌────────────────────────────────────────────────────────────────────┐
│ Kutip · CetakPantas Print        Owner: Mei Ling · Tue 20 Oct      │
├────────────────────────────────────────────────────────────────────┤
│ CASH GAP                                                           │
│ 31 Oct  Payroll         RM8,400   short RM2,000     ● RED          │
│ 05 Nov  Paper supplier  RM6,800   short RM8,800     ● RED          │
│ Bank RM4,300 + RM2,100 expected from customers who pay on time     │
├────────────────────────────────────────────────────────────────────┤
│ TODAY'S CHASE PLAN                                                 │
│ 1  Kafe Dua Beradik   INV-0412  RM3,180  18d late  gentle  [R3]    │
│    pays ~4 days after a nudge · closes the payroll gap             │
│ 2  Hock Lee Catering  INV-0398  RM4,750  41d late  FIRM    [R1]    │
│    2 reminders unanswered · needs your approval                    │
│ 3  Restoran Selera    INV-0420  RM860     5d late  gentle  [R1]    │
│ –  Tadika Bintang     INV-0405  RM1,240  skipped [R2]              │
│    promised to pay 30 Oct · no reminder until then                 │
└────────────────────────────────────────────────────────────────────┘
```

Every row shows the rule that produced it. The clerk sees the same list but only "gap: yes", without bank or payroll amounts. At 08:47 she approves the gentle reminders; a wa.me link opens WhatsApp with the text prefilled and she presses send.

**Step 2, 09:15: the owner approves the firm reminder.**

```text
┌────────────────────────────────────────────────────────────────────┐
│ APPROVE FIRM REMINDER · Hock Lee Catering          Owner only      │
├────────────────────────────────────────────────────────────────────┤
│ INV-0398 · RM4,750 · due 9 Sep · 41 days late                      │
│ Reminders: 28 Sep (no reply) · 6 Oct (no reply)                    │
│ Pays usually: 45–60 days · Language on file: 中文                  │
│ If paid by 30 Oct: 5 Nov gap drops RM8,800 → RM4,050               │
├────────────────────────────────────────────────────────────────────┤
│ 李老板您好，我是CetakPantas的美玲。INV-0398（RM4,750）             │
│ 已经逾期41天。麻烦在10月30日前安排付款，或回复付款日期。           │
│ 附上对账单，谢谢！                                                 │
├────────────────────────────────────────────────────────────────────┤
│ [ Approve & open WhatsApp ]  [ Edit ]  [ Snooze ]  [ I'll call ]   │
└────────────────────────────────────────────────────────────────────┘
```

**Step 3, Fri 23 Oct 14:30: a customer says "dah bank in" (Bukti).**

```text
┌────────────────────────────────────────────────────────────────────┐
│ BUKTI · new reply · Kafe Dua Beradik          Fri 23 Oct 14:30     │
├────────────────────────────────────────────────────────────────────┤
│ "Dah bank in boss, RM3,180 for the cake box invoice ya.            │
│  Slip attached"                              + slip.jpg            │
├────────────────────────────────────────────────────────────────────┤
│ AI READ (exact words shown for every field)                        │
│ Amount     RM3,180.00    "RM3,180"           98%                   │
│ Invoice    INV-0412      "cake box invoice"  91%                   │
│ Reference  INV0412       slip.jpg            95%                   │
├────────────────────────────────────────────────────────────────────┤
│ BANK CHECK  [M1]                                                   │
│ 23/10 DUITNOW CR 3,180.00 KAFE DUA BERADIK INV0412   ✓ match       │
├────────────────────────────────────────────────────────────────────┤
│ Proposed: INV-0412 → PAID · reminders stop                         │
│ [ Approve ]  [ Edit ]  [ Ask customer ]     clerk can approve      │
└────────────────────────────────────────────────────────────────────┘
```

The AI only reads. Rule M1 decides: the invoice is marked paid only if a matching bank line exists.

**Step 4: messages the system will not guess, handed to a human.**

```text
┌────────────────────────────────────────────────────────────────────┐
│ NEEDS A HUMAN · 2 items                                            │
├────────────────────────────────────────────────────────────────────┤
│ Hock Lee Catering · "下礼拜五才过数"   ("can pay next Friday")     │
│ AI: promise to pay · date unclear, 64%                             │
│ Which Friday?   ( ) Fri 23 Oct   (•) Fri 30 Oct                    │
│ → reminders pause until 31 Oct                                     │
├────────────────────────────────────────────────────────────────────┤
│ Restoran Selera · "Dah settle la semalam"                          │
│ AI: says paid · no slip · no bank line found  [M1]                 │
│ NOT marked paid. Draft reply:                                      │
│ "Terima kasih Puan Rosnah! Kami belum nampak dalam bank            │
│  lagi, boleh share slip atau no. rujukan?"                         │
│ [ Send reply ]  [ Mark paid anyway (owner) ]                       │
└────────────────────────────────────────────────────────────────────┘
```

**Step 5: the cash-gap meter updates.**

```text
┌────────────────────────────────────────────────────────────────────┐
│ CASH GAP · Fri 23 Oct                                              │
│ 31 Oct  Payroll         RM8,400   covered  +RM1,180  ● GREEN       │
│ 05 Nov  Paper supplier  RM6,800   short RM5,620      ● RED         │
│         Hock Lee promised RM4,750 on 30 Oct → would cut to RM870   │
└────────────────────────────────────────────────────────────────────┘
```

**Step 6: everything is in the activity log.**

```text
┌────────────────────────────────────────────────────────────────────┐
│ ACTIVITY LOG                                    append-only        │
├────────────────────────────────────────────────────────────────────┤
│ 20 Oct 08:00  SYSTEM  scan: 4 overdue, payroll gap RM2,000         │
│ 20 Oct 08:00  R2      skipped INV-0405: promise 30 Oct             │
│ 20 Oct 08:47  Aisyah  approved gentle reminder INV-0412, sent      │
│ 20 Oct 09:15  Mei Ling approved FIRM reminder INV-0398, sent       │
│ 20 Oct 11:02  AI      Hock Lee: promise, date unclear (64%)        │
│ 20 Oct 11:10  Aisyah  confirmed promise date 30 Oct                │
│ 23 Oct 14:30  AI      Kafe Dua Beradik: RM3,180, INV-0412 (98%)    │
│ 23 Oct 14:30  M1      bank line matched 23/10 DUITNOW CR 3,180     │
│ 23 Oct 14:41  Aisyah  approved INV-0412 → PAID                     │
│ 23 Oct 14:41  SYSTEM  payroll gap 31 Oct: covered                  │
└────────────────────────────────────────────────────────────────────┘
```

Summary of the journey:

```text
Orbyte Connect / CSV ─▶ 08:00 cash scan ─▶ chase plan (rules) ─▶ clerk/owner approve
  ─▶ wa.me send ─▶ reply + slip arrive ─▶ Bukti AI read ─▶ bank-line check (M1)
  ─▶ clerk approves ─▶ meter + activity log
```

## 6. Rules

These rules came out of the idea stage and are a starting point, not final.

**Kutip (chasing)**

| Rule | What it does |
|---|---|
| R1 Tier | D-3 courtesy, D+1 nudge, D+14 firm with statement attached, D+30 (or a firm reminder unanswered for 7 days) becomes an owner-only escalation card with no automatic message |
| R2 Suppress | Skip if the invoice is disputed, a promised date has not passed, a payment was logged in the last 2 days, it is quiet hours (before 9am or after 8pm), or the customer was messaged in the last 5 days |
| R3 Priority | Expected cash before the next shortfall date = amount × the customer's own historical rate of paying within N days at this tier (default 50% for new customers). Pick the smallest set that covers the gap |
| R4 Credit hold | A new credit order from a customer with an invoice 30+ days overdue raises an owner card: accept on credit / ask for cash on delivery / call first |
| R5 Templates | Language and template come from the customer profile. Fixed templates per tier per language, merge fields only. AI never writes messages to customers |

**Bukti (proof)**

| Rule | What it does |
|---|---|
| M1 Verify | A slip is only a *claim*. Status becomes VERIFIED only when a bank line with the same amount and a payer-name match exists within 3 days |
| M2 Allocate | Try an exact single-invoice match, then the oldest-first exact combination of up to 5 invoices, then flag the difference |
| M3 Deductions | A stated deduction ("deduct RM330 for 2 pallet pecah") is linked to an invoice when its reason matches a delivery or item |
| M4 Hand-off | Any field below 85% confidence, or any unmatched difference, goes to a human with a specific question |
| M5 Pause | Reminders pause automatically for any invoice in a claim, promise or dispute |

## 7. Where AI is used, and where it is not

| Step | Done by | Why |
|---|---|---|
| Find the cash gap | Rules | Plain arithmetic |
| Rank the chase list | Rules | The owner must see why; every row shows its rule |
| Write the reminder | Fixed templates (BM / EN / 中文) | Owner-approved wording; no AI-written text goes to customers |
| **Read replies and slips** | **AI (vision-capable LLM)** | Many slip layouts, mixed languages, relative dates ("hujung bulan depan", "下礼拜五") |
| Mark an invoice paid | Rules, only with a bank line | AI never decides money |
| Anything uncertain | A human | Clear hand-off of exceptions (a brief good-to-have) |

Every extracted field shows the exact words it came from. If the quote cannot be found in the message, the field is not shown. This is the `findVerbatim` gate from ChadBuddy (section 12).

## 8. Roles and permissions (simulated RBAC)

| Role | Can see | Can do | Cannot |
|---|---|---|---|
| Owner | Everything, including bank balance, payroll and the cash gap | Approve firm reminders and escalations, accept or reject deductions, credit holds, edit templates and tolerances | — |
| Clerk | Overdue list, replies, bank credits to match | Send gentle reminders, approve exact matches, confirm unclear dates, send templated replies | See the payroll total or bank balance (sees only "gap: yes/no"), send firm reminders, write off money |
| Sales | Own customers: paid / overdue / on hold | Read only | See cash figures |
| External accountant | Export of the aging report and activity log | Read only | Change anything |

## 9. Competitors and positioning

Full scan: `../research/02-competitor-scan.md`. Short version: **it mostly exists already, in pieces.**

| Product | Already does | Does not do |
|---|---|---|
| Paidnice (NZ; on the Xero Malaysia app store) | WhatsApp reminders with a pay link, AI reads replies and drafts the next step for approval, logs promised dates, weekly cash forecast, credit stop | Only Xero and QuickBooks; no slip reading; no bank matching; no ranking by payroll gap |
| Peakflo (Singapore) | WhatsApp reminders, collects dispute and short-pay reasons, logs promises, "40+ languages" | No stated slip reading or verification; no approval before sending; no mention of Malaysia; aimed at bigger firms |
| Lejar.ai (Malaysia) | AI accounting, DuitNow QR on invoices, bank reconciliation, from RM39/month | No WhatsApp reminders; no reading of replies or slips |
| Bukku, SQL Account, AutoCount (Malaysia) | Reminders (mostly email or add-ons), bank reconciliation, credit limits | No AI reading, no cash-gap ranking |

**Still open for Malaysian micro firms:**
1. Ranking who to chase by a named shortfall ("short RM2,000 for payroll, chase these 3"): not found anywhere.
2. Reading a WhatsApp slip and checking it against the bank line before marking paid, for micro firms: only enterprise tools do this.
3. Manglish / BM / Chinese named and tested.
4. A price under RM65/month: every WhatsApp + AI tool found costs about RM300+/month or is quote-only.

**Positioning slide:** "Paidnice and Peakflo prove businesses pay for AI collections. They serve Xero users and bigger firms at RM300+/month. Kutip brings it to the Malaysian micro seller inside Orbyte: it ranks who to chase to make payroll, reads 'dah bank in boss', and checks the bank before marking anything paid."

## 10. How it meets the Domain 2 requirements

**Must-haves**

| Must-have | How Kutip + Bukti covers it |
|---|---|
| 1. One clear SME problem | Customers pay late, cash runs short for payroll, and the owner chases by hand on WhatsApp |
| 2. Core automated journey | Scan → invoices + history → rank → approve → reply read → bank check → meter + log |
| 3. Accuracy and ease of learning | A rule ID on every decision; nothing marked PAID without a bank line; exact words shown for every AI field; red/green meter a clerk learns in minutes |
| 4. People stay in control | 4 roles; approvals for firm reminders, payment matches and deductions; append-only activity log |
| 5. Orbyte fit and reuse | Reuses Orbyte's clients records, roles, review-and-approval flows and audit trail; reads invoices through Orbyte Connect from accounting partners; sector packs (printing, catering, transport, wholesale); a small API (section 13) |
| 6. Business benefit and SDG | Cash freed, zero invoices without a next step, zero paid customers chased; SDG 8.3 (MSME cash flow) and 8.2 (productivity), SDG 9 (digital tools for small firms) |

**Rules and boundaries**

| Rule | Status |
|---|---|
| Genuine SME need (finance / sales) | Yes |
| Not Orbyte HR/admin | Yes. Orbyte's HR/admin modules are eLeave, eClaim, eOT, Attendance, Directory and Hiring; receivables is none of these |
| Fits the hub | Yes, through Connect, approvals, roles and the audit trail |
| Reusable for many SMEs | Yes, with sector and language packs |
| No real payments | Yes. Kutip moves no money; any pay link in the demo is simulated |
| No statutory filings | Yes. No e-invoice or tax submission; credit notes are only drafted for the SME's own accounting system |
| No legal or financial advice | Yes. No letters of demand or legal wording; "refer to your own lawyer" is a choice the owner makes; the cash gap is arithmetic on the owner's figures, not lending advice |
| Synthetic data only | Yes. Demo slips use **fictional bank names and layouts**, never copies of real Malaysian banks' receipts |
| PDPA explained | See below |

**PDPA (real deployment).** Customer contact names, phone numbers, payer names and partial account numbers are personal data under PDPA 2010 (as amended in 2024). The SME is the data user; Orbyte/Kutip is its processor. Principles: purpose limitation (used only to follow up invoices the customer received), a notice line on invoices, role-based access (clerk and sales cannot see cash figures), opt-out per contact, account numbers masked on extraction, slip images encrypted with a retention limit, an AI provider that does not train on customer data, disclosure of cross-border transfer if the model is hosted outside Malaysia, and breach-notification readiness under the 2024 amendments.

## 11. Orbyte facts (checked on orbyte.my, 25 Oct 2026)

- **Live modules:** eLeave, eClaim (expense claims with receipt capture), eOT, Attendance, Directory, Work (projects, tasks, daily status), Hiring (AI screening), eSign (built on Documenso), Connect (integration gateway: SSO, roles, access control, approval workflows across SaaS and payment services). Coming soon: Travel, Insights.
- **Shared platform:** org structure and roles, review and approval flows with audit trail, clients and projects, Microsoft/Google sign-in.
- **Via partners (expanding):** payroll, accounting and e-invoicing, payments and banking, logistics and marketing, insurance, POS and e-commerce. Orbyte has **no native invoicing or accounting**.
- **Pricing:** free to start, no per-seat fees, a single credit wallet, pay per request (eClaim and eOT per request, eSign per signed document).
- **Vision line to quote:** the platform page uses "Follows up the right invoice" as an example of AI with business context, and calls the Business Graph "a strategic direction, not a completed product". Say "you describe this, we build it". Do not say it is on Orbyte's roadmap.
- **Company name:** the website footer says Alpha Red **Pro** Sdn Bhd; the brief says Alpha Red **Solutions** Sdn Bhd. Confirm on the hackathon Discord.

**Business model:** fits the credit wallet. Free for up to 10 open invoices; then a small credit per invoice actively chased and per slip read. Target below Bukku Grow's RM65/month (the owner judge said they would pay RM30-40/month). Premium: bank-feed matching, multiple numbers, sector packs. Partner (roadmap): optional hand-off to invoice-financing partners through Connect, only when the owner asks, with no lender recommendation.

## 12. Reusing ChadBuddy

[ChadBuddy](https://github.com/POTATO0826/CHADBUDD) (the team's earlier build: Bun, TypeScript, Convex, Tauri) already has most of Bukti's trust machinery. ChadBuddy tracks promises the *advisor* broke; Bukti tracks promises the *customer* made.

| ChadBuddy piece | Reuse in Kutip + Bukti |
|---|---|
| `findVerbatim` in `src/ledger.ts`: a quote must be an exact substring of the message | Every field Bukti extracts shows the customer's exact words |
| "No number written by the model" gate | Amounts come only from the bank line and the invoice table, never from the AI |
| Promise ledger (open / settled) | Promise-to-pay tracker |
| Ranked, capped queue with a reason on each row | Kutip's chase plan with rule IDs |
| `convex/outbox.ts` + confirm before send | Clerk/owner approval before any reminder |
| Each client scored against their own baseline | "This customer usually pays 4 days after a nudge" (R3) |
| Telegram bridge | Replace with a simulated WhatsApp inbox and wa.me links for the demo |

## 13. Data and API sketch (team's own assumptions; the brief allows these)

**Entities:** `Invoice` (id, customer, amount, issued, due, terms, status open/part_paid/paid/disputed, source), `Customer` (name, contact, WhatsApp number, language, quiet hours, notes, payment pattern), `Outflow` (label, amount, due date, recurring), `CashPosition` (date, owner-entered bank balance, expected inflows), `Reminder` (invoice, tier, template, language, status proposed/approved/sent/skipped, rule id, approved by), `InboundMessage` (customer, text, attachments, received at), `Extraction` (message, intent, fields with value + quote + confidence, model version), `BankLine` (date, amount, description, matched invoices), `Promise` (invoice, promised date, source message, status), `ActivityLog` (timestamp, actor user/system/rule/AI, action, rule id, refs).

**API (illustrative):**
- `POST /receivables/invoices`: import invoices
- `GET /receivables/chase-plan?date=`: today's ranked plan with rule reasons
- `POST /receivables/approvals`: approve, edit, snooze or skip a reminder
- `POST /proofs`: image and/or text in, extraction plus match proposal out
- `POST /proofs/{id}/decision`: record the human decision
- Webhooks: `invoice.overdue`, `gap.detected`, `chase.approved`, `proof.verified`, `shortpay.detected`, `promise.due`

## 14. Measurable benefit (all estimates, to validate with owners)

| Measure | Estimate |
|---|---|
| Cash freed | On RM45,000/month of credit sales (synthetic), each day of faster collection frees about RM1,500 once; 5-7 days faster would free about RM7,500-10,500 once. Unproven: no source shows reminders shorten collection |
| Clerk time | About 10 hours/month saved at roughly 120 slips/month (assumption) |
| Measurable from day one | Overdue invoices with no next action: 0. First reminder sent the day after the due date. Payroll shortfall warned 10+ days ahead. Customers chased after already paying: 0. Field accuracy on a test set (target 95%+ on amount) |

## 15. Risks and fallbacks

| Risk | Fallback |
|---|---|
| No proof that reminders make customers pay faster | Lead with the cash-gap ranking, credit hold and visibility, not "reminders". Interview 3-5 owners |
| Customers may not send slips (they pay by DuitNow QR or payment link instead) | Validate first with 5-10 sellers. If slips are rare, Bukti shrinks to reading replies and promises |
| WhatsApp Business Platform needs Meta verification, template approval and per-message fees; group chats likely cannot be read | wa.me click-to-send (owner presses send, which also strengthens human control); clerk forwards slips; the demo uses a simulated inbox |
| AI misreads a slip | M1 (no PAID without a bank line), M4 (unsure fields go to a human), a cached extraction for the live demo |
| Owners will not type invoices | CSV or Google Sheet import, plus a 20-second manual form |
| No automatic bank feed for micro firms | Daily bank CSV upload, or the owner taps "seen in bank app" |
| Judges say "Bukku already sends reminders" | Positioning slide (section 9) |

## 16. Preliminary demo scope (about 3 minutes)

The brief needs the single most important feature working live and backed by the GitHub repo.

1. Load the CSV (about 15 invoices + 3 outflows) and press **Run 08:00 scan**. The meter shows "Short RM2,000 for payroll 31 Oct".
2. The ranked list appears with a reason on every row. Tadika is greyed out ("promise 30 Oct").
3. Switch role to Owner and approve the firm Chinese reminder. WhatsApp opens with the text prefilled, or the send is simulated.
4. A reply plus a slip arrive in the simulated inbox. A **live** AI call highlights the extracted fields with their exact words.
5. The bank line matches, the clerk approves, and the meter turns green.
6. Show the activity log: who, when and which rule.

**Build order:** (1) Kutip core, all rules and deterministic, must work live; (2) Bukti reading one reply and slip, with a cached result as fallback; (3) roadmap slide: credit hold, bank feeds, sector packs, and other modules on the same engine.

**Test set to build:** 30-50 synthetic Manglish/BM/Chinese replies ("dah bank in boss", "bayar separuh dulu", "下礼拜五才过数") with expected fields, to show accuracy against Peakflo's generic "40+ languages".

## 17. Open decisions (need the team)

1. Do Malaysian B2B customers really pay by bank transfer and send a slip? Ask 5-10 sellers before building Bukti.
2. Team size, skills and the preliminary deadline. These set how much of Bukti goes into the demo.
3. Tech stack: reuse ChadBuddy's (Bun + TypeScript + Convex) or something else? Not decided.
4. Demo sector: a printing shop is the current example; a wholesaler or logistics firm would have more slips.
5. Which LLM for slip reading, and where it is hosted (PDPA cross-border point).
6. Sponsor company name (Alpha Red Pro vs Solutions): confirm on Discord.
7. Final product name.

## 18. Other ideas considered

| Idea | Why not first |
|---|---|
| VO Catcher: WhatsApp site instructions turned into priced, signed variation orders for construction subcontractors | Most original and the best Orbyte fit (reuses Projects + eSign), but niche, needs construction knowledge, and no competitor scan yet. Best second choice |
| Pasar Radar: AI reads supplier price lists and builds the cheapest buy plan | Reliable AI demo, but small savings and owners stay loyal to their usual suppliers |
| SahBayar: storekeeper cannot release goods until the payment shows in the bank | Vivid demo, but soundboxes and payment links already solve most of it |
| ChadBuddy reshaped for Domain 2 | Strong build, but investment messages sit on the brief's "no financial advice" line, and it is narrow (advisors only) |
| Private AI platform ("Wix for company AI") | A separate startup idea, not a Domain 2 fit |

## Sources

- Domain 2 brief: `../domain-2/Domain-2-brief.pdf`
- [Experian Malaysia State of Credit 2025](https://www.experian.com.my/2025/05/21/experian-malaysias-state-of-credit-2025-reveals-sme-resilience-but-cash-flow-strains-persist/)
- [The Star, 30 Jul 2026: facilitating access to SME financing](https://www.thestar.com.my/business/business-news/2026/07/30/facilitating-access-to-sme-financing)
- [Lowyat forum thread](https://forum.lowyat.net/topic/5206091/all)
- [Bukku pricing](https://www.bukku.my/pricing)
- [Orbyte home](https://www.orbyte.my/) and [Orbyte platform](https://www.orbyte.my/platform.html)
- [Paidnice features](https://www.paidnice.com/features)
- [Peakflo WhatsApp AI agents](https://peakflo.co/whatsapp-ai-agents)
- [Lejar.ai](https://lejar.ai/)
- [ChadBuddy repo](https://github.com/POTATO0826/CHADBUDD)
