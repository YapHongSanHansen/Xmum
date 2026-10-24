# Kachingg — Product Requirements Document

| | |
|---|---|
| Product | **Kachingg** (the sound of the till when you get paid; formerly Kutip), with **Bukti** ("proof") as its AI reader |
| Hackathon | XMUM, Domain 2: Orbyte Smart SME Challenge — Less Busywork, Better Business |
| Version | 0.2, 25 Oct 2026: demo business switched to a haulage firm (section 14); tech stack decided (section 20) |
| Status | Draft, reviewed once by a builder. Section 18 lists open decisions the team must make; section 18a lists calls made during review, for the team to check |
| Related | Brief: [`domain-2/brief.md`](domain-2/brief.md) (source of truth: [`Domain-2-brief.pdf`](domain-2/Domain-2-brief.pdf)) · Idea and example screens: [`idea/kutip-bukti.md`](idea/kutip-bukti.md) · Evidence: [`research/01-pain-research-shortlist.md`](research/01-pain-research-shortlist.md) · Competitors: [`research/02-competitor-scan.md`](research/02-competitor-scan.md) |

---

## 1. Summary

Malaysian micro and small B2B sellers deliver goods on credit, get paid 60-90 days late, and still have to pay salary, rent and suppliers on fixed dates. A customer can always choose not to pay, so Kachingg does not promise to make customers pay. It promises what the owner controls:

> **Never be surprised on payroll day, and stop giving credit to customers who don't pay.**

Kachingg does four jobs:

1. **Early warning.** Every morning it compares cash in the bank plus expected receipts with the bills due soon, and warns the owner at least 10 days before a shortfall.
2. **Credit check.** When a customer who is already 30+ days late orders again on credit, the owner decides before the goods leave.
3. **Chase plan.** It ranks overdue invoices by how much each one closes the next shortfall, and prepares WhatsApp reminders in the customer's language for a person to approve and send.
4. **Bukti.** AI reads customer replies and payment-slip screenshots ("dah bank in boss"). An invoice is marked paid **only when a matching bank-statement line exists**.

Rules make every decision. AI is used in one place only: reading unstructured messages and slips. People approve every consequential action, and every step is written to an append-only activity log.

## 2. Problem

### 2.1 Problem statement

The owner of a small B2B business:
- does not know until payroll day that cash will be short;
- keeps giving goods on credit to customers who already pay late;
- chases customers by hand on WhatsApp, at random or from memory;
- matches "dah bank in" screenshots to the bank app and invoices by hand, sometimes chasing customers who already paid.

### 2.2 Evidence (summary)

| Evidence | Source |
|---|---|
| SME payment delays average 64 days vs 58 for large firms; transport/logistics 76 days (Experian does not say whether SMEs are the payer or payee) | [Experian, 21 May 2025](https://www.experian.com.my/2025/05/21/experian-malaysias-state-of-credit-2025-reveals-sme-resilience-but-cash-flow-strains-persist/) |
| Bank Negara names "slower customer payments" as one of three drivers of working-capital need | [The Star, 30 Jul 2026](https://www.thestar.com.my/business/business-news/2026/07/30/facilitating-access-to-sme-financing) |
| Owners already pay for reminders: Bukku Grow RM65/month (email only) | [Bukku pricing](https://www.bukku.my/pricing) |

The evidence is real but thin: no source measures owner chasing time, and no source shows reminders shorten collection. See section 17 (validation) and `research/01-pain-research-shortlist.md`.

### 2.3 What the owner can and cannot control

| Cannot control | Can control | Kachingg module |
|---|---|---|
| Whether a customer pays | Whether to keep giving that customer credit | Credit check |
| When a customer's accounts team pays | Knowing early, with time to act | Early warning |
| | Which customers to spend chasing time on | Chase plan |
| | Correct records | Bukti |

## 3. Goals, non-goals and anti-goals

### Goals

| ID | Goal |
|---|---|
| G1 | The owner learns about a cash shortfall at least 10 days before the bill is due |
| G2 | No new credit order from a customer 30+ days overdue goes ahead without an explicit owner decision |
| G3 | Chasing effort goes first to the invoices that best close the next shortfall |
| G4 | No invoice is ever marked paid without a matching bank line |
| G5 | A first-time clerk can do their daily tasks without formal training (target: under 10 minutes to learn) |
| G6 | The preliminary demo shows the full journey (trigger → data → decision → approval → outcome + log) live, and meets every Domain 2 requirement (section 15) |

### Non-goals (out of scope)

- Making customers pay, or guaranteeing faster collection.
- Processing payments of any kind. Pay links, if shown, are simulated.
- Submitting statutory filings (e.g. e-invoices to MyInvois, tax returns).
- Legal or financial advice: no letters of demand, no legal wording, no lender or financing recommendations.
- Replacing the business's accounting software. Kachingg is a layer that reads from it.
- HR, payroll processing, leave or claims (Orbyte already has these). Kachingg only reads a payroll *date and total* as an outflow.
- Reading WhatsApp group chats, or integrating the official WhatsApp Business Platform in the preliminary round.

### Anti-goals (failure even if it technically works)

- AI writes or sends messages to customers on its own.
- An invoice is marked paid because a slip or message *says* so.
- The product looks or behaves like a chatbot.
- A decision appears without a visible reason.
- Customers get spammed: messages outside quiet hours, or more than one reminder in 5 days.
- The clerk can see the owner's bank balance or payroll total.

## 4. Users

| Persona | Who | Needs | Example (synthetic) |
|---|---|---|---|
| **Owner** | Runs the business, signs off on money decisions | Know early, decide on credit, approve firm messages | Lim Siew Lan, owner of Lori Laju Logistics |
| **Clerk** | Admin or account clerk, issues invoices, records payments | A clear daily to-do list, quick approvals, no guessing | Nurul |
| **Sales** (P1) | Takes orders from customers | Know if a customer is on hold before promising credit | — |
| **External accountant** (P1) | Prepares the books monthly | Read-only aging report and activity log | — |
| **Customer** (indirect) | The business's B2B customer | Polite, correct reminders in their language; never chased after paying | Mega Bina Hardware Trading, Syarikat Hup Seng Trading |

**Target segment:** Malaysian B2B sellers with about 2-30 staff that sell on 30-90 day credit and chase payment on WhatsApp: small transport and logistics operators, wholesale and trading, printing and packaging, food and catering supply, B2B services.

**Demo business:** Lori Laju Logistics Sdn Bhd, a fictional 12-person haulage firm in Klang with 6 lorries. Chosen because transport/logistics has the longest SME payment delays in the Experian data (76 days) and the widest SME-vs-corporate gap; per-trip invoices mean many payment slips; and logistics is reported to be one of the sponsor's client sectors.

## 5. User stories

| ID | As a… | I want… | So that… | Priority |
|---|---|---|---|---|
| US-1 | Owner | a warning 10+ days before cash falls short of a bill | I can act before payroll day | P0 |
| US-2 | Owner | to decide before a late payer gets more goods on credit | the amount they owe stops growing | P0 |
| US-3 | Owner / Clerk | today's chase list, ranked, with a reason on each row | we chase the right customers first | P0 |
| US-4 | Clerk | to approve and send gentle reminders in one tap, in the customer's language | chasing takes minutes, not evenings | P0 |
| US-5 | Owner | to approve every firm reminder before it is sent | long-standing customers are not upset | P0 |
| US-6 | Clerk | customer replies and slips read for me, with the exact words shown | I don't retype amounts and dates | P0 |
| US-7 | Owner | an invoice marked paid only when the money is in the bank | records are true and nobody is chased by mistake | P0 |
| US-8 | Clerk | unclear messages handed to me with a specific question | I fix exceptions instead of everything | P0 |
| US-9 | Owner | a log of who did what, when and why | I can trust and check the system | P0 |
| US-10 | Owner | reminders to pause when a customer promises a date or says they paid | we don't nag people who responded | P0 |
| US-11 | Clerk | one payment split across several invoices, with short-payments flagged | part-payments and deductions don't slip | P1 |
| US-12 | Owner | to accept or reject a customer's deduction with the delivery proof attached | disputes are decided on evidence | P1 |
| US-13 | Sales | to see whether a customer is on hold | I don't promise credit we won't give | P1 |
| US-14 | Accountant | to export the aging report and activity log | month-end is faster | P1 |
| US-15 | Owner | to set templates, quiet hours and thresholds | it fits how my business works | P1 |

## 6. Scope by phase

| Phase | When | Scope |
|---|---|---|
| **P0** | Preliminary round | The full journey working live on synthetic data: setup/import, cash scan and early warning, credit check, chase plan with approvals and wa.me or simulated send, Bukti reading the three seeded replies (one with a slip, read by a live AI call; the other two may use cached results) with the bank check, single-invoice receipts with a stated deduction, hand-off cards, activity log, Owner and Clerk roles, demo clock. Must-haves explained in the proposal |
| **P1** | Final round | All six Domain 2 must-haves fully built: multi-invoice allocation, Sales and Accountant roles, settings, CSV export, accuracy report on the test set, in-app PDPA notes, Orbyte Connect adapter interface, owner validation interviews |
| **P2** | Roadmap (slides only) | Official WhatsApp Business Platform, bank feeds through payment/banking partners, Bukti reading *order* messages to trigger the credit check, sector packs, optional financing-partner hand-off (owner-initiated, no recommendation), mobile app, BM user interface |

## 7. Functional requirements

Priority: **P0** = preliminary demo; **P1** = final round; **P2** = roadmap.

### 7A. Setup and data

| ID | Requirement | Priority | Acceptance criteria |
|---|---|---|---|
| FR-A1 | Import invoices from CSV (number, customer, amount, issue date, due date, terms, status) | P0 | Importing the seed CSV creates every invoice; invalid rows are listed with a reason and not imported |
| FR-A2 | Customer profiles: name, contact person, WhatsApp number, language (BM/EN/ZH), quiet hours, notes | P0 | Each seeded customer shows its language and number; the language drives template choice |
| FR-A3 | Recurring outflows: label, amount, due date, recurrence (monthly) | P0 | Salaries RM24,500 on the 31st and the 5 Nov diesel fleet-card bill appear in the cash scan |
| FR-A4 | Owner enters today's bank balance | P0 | Only the Owner can enter or see it; the value and who entered it are logged |
| FR-A5 | Import a bank statement CSV (date, amount, description) | P0 | Lines appear for matching; the clerk sees credits only, never the balance |
| FR-A6 | "Orbyte Connect" adapter interface for accounting partners, simulated with CSV | P1 | A documented interface (`InvoiceSource`) with a CSV implementation; the UI labels the source |
| FR-A7 | Reset demo data to the seed | P0 | One action restores the seed and the demo clock; logged |

### 7B. Cash scan and early warning

| ID | Requirement | Priority | Acceptance criteria |
|---|---|---|---|
| FR-B1 | Daily scan at 08:00 (local time) and a manual "Run scan" button | P0 | Running the scan on the seed at the demo clock produces the gap list and chase plan |
| FR-B2 | Forecast per outflow date (rule F1, section 8) | P0 | Seed on Tue 20 Oct: 31 Oct salaries short RM2,000; 5 Nov diesel short RM13,200 |
| FR-B3 | Early-warning card (rule R6) with a neutral checklist of owner levers | P0 | Card appears for the 31 Oct shortfall; options are listed, chosen options are logged; no lender is named or recommended |
| FR-B4 | Cash-gap meter per upcoming outflow (red/green), recomputed whenever a receipt is approved (rule F1) | P0 | When the clerk approves the verified RM2,770 receipt for INV-2304 (not before), 31 Oct turns green with "+RM770" |
| FR-B5 | Clerk sees only "gap: yes/no", never amounts of balance, payroll or gap | P0 | Logged in as Clerk, no balance, payroll or gap figure is visible anywhere |

### 7C. Chase plan and reminders

| ID | Requirement | Priority | Acceptance criteria |
|---|---|---|---|
| FR-C1 | Tier each overdue invoice (rule R1) | P0 | Seed: Mega Bina → Tier 1; Kilang Perabot Jaya → Tier 1; Hup Seng → Tier 2 |
| FR-C2 | Suppress reminders (rule R2) | P0 | Pelita Frozen Foods is shown as skipped with "R2: promise 30 Oct not reached" |
| FR-C3 | Rank by expected cash before the shortfall (rule R3) | P0 | Mega Bina ranks first with the reason "closes the salary gap" |
| FR-C4 | Every row shows its rule ID and a one-line reason | P0 | No row in the plan lacks a rule ID |
| FR-C5 | Fixed templates per tier per language, merge fields only (rule R5) | P0 | Tier 1 EN/BM and Tier 2 ZH templates render with invoice number, amount and due date; no AI-generated text |
| FR-C6 | Approval by tier: Clerk or Owner may approve Tier 0/1; Owner only for Tier 2; Owner decides Tier 3 | P0 | As Clerk, the Tier 2 card shows no approve button |
| FR-C7 | Send by wa.me link (opens WhatsApp with the text prefilled; a person presses send) or simulated send. Because every phone number in the demo is fictional, the P0 link carries no number (`https://wa.me/?text=…`): WhatsApp asks which chat to use. Reminders approved inside the customer's quiet hours are QUEUED and released when quiet hours end (rule S1) | P0 | Approving at 08:00 opens a correct `https://wa.me/<number>?text=<encoded>` link, or marks the reminder "sent (simulated)"; approving at 22:00 marks it "queued until 08:00"; all are logged |
| FR-C8 | Approval card shows: invoice, amount, days late, past reminders and replies, payment pattern, message preview, rule, and gap impact (rule G1). The Clerk sees "helps cover the next bill: yes/no" instead of amounts | P0 | The Owner's Hup Seng card shows "If paid by 30 Oct: 31 Oct salaries short RM2,000 → covered; 5 Nov diesel short RM13,200 → RM6,350". The Clerk's Mega Bina card shows "helps cover the next bill: yes" and no amounts of balance, salaries or gap |
| FR-C9 | Card actions: approve & send, edit text, snooze to date, mark disputed, "I'll call instead" | P0 (approve, edit, snooze) / P1 (rest) | Each action is logged with the actor |

### 7D. Credit check

| ID | Requirement | Priority | Acceptance criteria |
|---|---|---|---|
| FR-D1 | Trigger on a new credit order or invoice draft for a customer with any invoice overdue ≥ threshold (rule R4) | P0 | The Clerk enters a new Hup Seng booking (Klang → Johor Bahru, 1 lorry, RM2,400, 60-day credit) and an owner card is raised |
| FR-D2 | Card shows: the new order, what is already owed and how late, any promise, and the total owed if accepted | P0 | Card shows RM6,850 owed, 46 days late, promise 30 Oct, total RM9,250 |
| FR-D3 | Owner options: accept on credit / ask a deposit (percentage) / cash on delivery / call first | P0 | The chosen option is stored on the order and logged; the order stays "on hold" until decided |
| FR-D4 | Threshold is configurable (default 30 days) | P1 | Changing it to 14 days changes which customers trigger the check |

### 7E. Bukti (reading replies and slips)

| ID | Requirement | Priority | Acceptance criteria |
|---|---|---|---|
| FR-E1 | Simulated collections inbox: inbound text plus optional image, linked to a customer by WhatsApp number | P0 | The seeded Mega Bina message and slip appear in the inbox |
| FR-E2 | AI extraction to structured fields: intent, amount, invoice reference, bank reference, payment date, promised date, deduction amount and reason; each with a confidence and the quoted source words | P0 | The demo message yields amount 2,770.00, invoice INV-2304, reference INV2304, deduction 330.00 with reason "2 pallet tiles pecah at Bukit Raja", each with a quote |
| FR-E3 | Verbatim gate: a field from text is shown only if its quote is an exact substring of the message (after whitespace normalisation); otherwise it is dropped and sent to a human | P0 | A unit test with a fabricated quote shows the field is rejected |
| FR-E4 | Bank verification (rule M1): VERIFIED only when a bank line matches | P0 | With the bank line present, status is VERIFIED; with it removed, status stays CLAIM and no PAID is proposed |
| FR-E5 | Allocation (rule M2): single invoice with or without a stated deduction (P0); combinations across several invoices (P1) | P0 / P1 | RM2,770 + stated deduction RM330 = INV-2304 RM3,100 → exact match with deduction; a payment equal to two invoices is split across both (P1) |
| FR-E6 | Deductions linked to a delivery (rule M3), owner accepts or rejects | P0 | "Deduct RM330 for the 2 pallet tiles pecah at Bukit Raja" links to DO-8812 (destination Bukit Raja); only the Owner can accept; accepting marks INV-2304 PAID and drafts credit note CN-0057 (not submitted) |
| FR-E7 | Hand-off (rule M4): low confidence or unmatched items go to a "Needs a human" queue with a specific question | P0 | "下礼拜五才过数" on Tue 20 Oct produces a card asking "Which Friday? 23 Oct / 30 Oct" |
| FR-E8 | Pause reminders (rule M5) for invoices with a claim, promise or dispute | P0 | After the Hup Seng promise is confirmed, no Hup Seng reminder appears until 31 Oct |
| FR-E9 | Promise tracking: promised date stored; a follow-up appears the day after it passes | P0 | Promise 30 Oct → follow-up appears on 31 Oct if unpaid |
| FR-E10 | Claim with no slip and no bank line: not marked paid; a templated reply asking for the slip or reference is drafted for approval | P0 | Kilang Perabot Jaya's "Dah settle la semalam" produces the BM draft reply and no PAID proposal |
| FR-E11 | Cached extraction fallback if the AI call fails or exceeds the timeout | P0 | With the AI key removed, the demo still completes using cached results, and the UI says "cached result" |
| FR-E12 | Approval of receipts: the Clerk may approve a VERIFIED receipt whose slip amount equals the bank line; anything that changes what a customer owes (accepting a deduction, writing off) needs the Owner | P0 | As Clerk, approving the RM2,770 receipt marks INV-2304 PART_PAID with "RM330 deduction under review"; as Owner, accepting the deduction marks it PAID; both are logged |

### 7F. Roles and permissions (simulated)

| ID | Requirement | Priority | Acceptance criteria |
|---|---|---|---|
| FR-F1 | Role switcher (Owner, Clerk; Sales and Accountant in P1); no real login needed | P0 | Switching role changes what is visible and which buttons appear |
| FR-F2 | Permission matrix as in section 9.3 | P0 (Owner/Clerk) / P1 (all) | Every row of the matrix has a test |

### 7G. Activity log

| ID | Requirement | Priority | Acceptance criteria |
|---|---|---|---|
| FR-G1 | Append-only log; no edit or delete in the UI or API | P0 | No endpoint or button modifies past entries |
| FR-G2 | Each entry: timestamp (demo clock), actor (user name / SYSTEM / rule ID / AI / INBOUND / BANK), action, references (invoice, customer, message), and for AI entries the model version and confidence | P0 | Running the section 13 script produces the entries in section 13a, in the same order with the same actors and actions (timestamps come from the demo clock) |
| FR-G3 | Filter by customer or invoice | P1 | Filtering by INV-2304 shows only its entries |
| FR-G4 | Export log and aging report as CSV | P1 | Export opens in a spreadsheet with all columns |

### 7H. Settings and demo controls

| ID | Requirement | Priority | Acceptance criteria |
|---|---|---|---|
| FR-H1 | Demo clock: a **frozen** "now" (default Tue 20 Oct 2026, 08:00, Asia/Kuala_Lumpur) that moves only through an "advance to" control. Every action is stamped with the current demo time. Advancing runs the 08:00 scan once for each day boundary crossed, in order. Seeded inbound messages and bank lines become visible once "now" passes their timestamp | P0 | From 21 Oct 10:20, advancing to Fri 23 Oct 14:30 runs the 22 and 23 Oct scans, then shows the 14:25 bank line and the 14:30 Mega Bina reply |
| FR-H2 | Templates, quiet hours, tier day-gates and the credit threshold are editable by the Owner | P1 | Edits take effect on the next scan and are logged |

## 8. Business rules

All rules are deterministic, given the data and the clock. Amounts are in MYR. Dates are in Asia/Kuala_Lumpur.

**F1 Forecast.** For each outflow date *d* within the horizon (30 days):
`forecast(d) = cash + Σ expected inflows due on or before d − Σ outflows due on or before d`.
- *cash* (P0) = the latest owner-entered bank balance + the receipts approved by a person after that entry. (P1: computed from bank lines directly.)
- *Expected inflows* are invoices not yet overdue, due on or before *d*, not PAID and without a VERIFIED claim, whose customer has an on-time rate of at least 80% over at least 3 past invoices. Promises are **not** counted as expected inflows.
- A shortfall exists when `forecast(d) < 0`; the gap is `−forecast(d)`.

Seed check (Tue 20 Oct): 9,800 + 12,700 − 24,500 = −2,000 (31 Oct); 9,800 + 12,700 − 24,500 − 11,200 = −13,200 (5 Nov). After the RM2,770 receipt for INV-2304 is approved on 23 Oct: 12,570 + 12,700 − 24,500 = +770 (31 Oct); −10,430 (5 Nov).

**G1 Gap impact and pay-by date.** For an invoice on an approval card: *pay-by* = the day before the earliest shortfall date, but no earlier than today + 3 days. The gap-impact line shows, for the earliest and the next shortfall date in the horizon, the gap before → after if only this invoice is paid by the pay-by date (everything else as in F1). The pay-by date is also the `pay_by` merge field in templates. The Clerk sees only "helps cover the next bill: yes/no".
Seed check (Hup Seng, 20 Oct): pay-by 30 Oct; 31 Oct −2,000 → covered (+4,850); 5 Nov −13,200 → −6,350.

**R1 Tier.** Tiers: 0 courtesy (allowed from D-3), 1 nudge (from D+1), 2 firm (from D+14), 3 owner escalation (from D+30). The sequence for one invoice is fixed: **Tier 1, Tier 1 again, Tier 2, Tier 3** (Tier 0 first if the invoice is not yet due). Each step needs (a) the previous reminder unanswered for 7+ days and (b) the day gate for that tier. If the day gate is not reached, the invoice waits at its current step. Tier 3 never sends a message: it creates an owner card (call / stop credit / refer to own lawyer), with no legal text generated.
Seed check: Mega Bina (18 days late, no reminders yet) → Tier 1. Hup Seng (45 days late, Tier 1 on 22 Sep and Tier 1 again on 30 Sep, both unanswered) → Tier 2. Kilang Perabot Jaya (8 days, none) → Tier 1.

**R2 Suppress.** No reminder is proposed if any of: the invoice is disputed; a promised date has not passed; a payment or claim was logged in the last 2 days; the customer was sent any reminder in the last 5 days. The row still appears, greyed, with the reason. (Quiet hours do **not** suppress; see S1.)

**S1 Send window.** Quiet hours (default: from 21:00 until 08:00 local, so 08:00 itself is not quiet; editable per customer in P1) never remove a reminder from the plan or block approval. A reminder approved inside quiet hours becomes QUEUED and is released (wa.me link enabled, or simulated send) when quiet hours end.

**R3 Priority.** For each remindable overdue invoice: `expected = amount × p`, where *p* is the share of the customer's past invoices paid within N days of a reminder at this tier, and N = days until the next shortfall date. If the customer has fewer than 3 data points, p = 0.5. Rank by `expected`, highest first. Mark the smallest leading set whose cumulative `expected` covers the next gap as "closes the gap". Ties break by days overdue, then amount.
Seed check (20 Oct, N = 11): Mega Bina 3,100 × 0.9 = 2,790 (closes the RM2,000 gap alone); Kilang Perabot Jaya 4,200 × 0.6 = 2,520; Hup Seng 6,850 × 0.3 = 2,055.

**R4 Credit check.** When a new credit order or invoice draft is created for a customer who has any invoice overdue ≥ threshold (default 30 days), set the order to ON HOLD and raise an owner card (FR-D2, FR-D3). Cash on delivery and fully prepaid orders are not checked.

**R5 Templates.** Messages come only from fixed templates per tier and language (BM, EN, ZH), filled with merge fields (customer contact name, invoice number, amount, due date, days overdue, `pay_by` from G1, sender name). The sender may edit before sending; the edit is logged. Because a wa.me link cannot attach a file, Tier 2 templates **offer** a statement ("reply if you need a statement") instead of saying one is attached; generating a statement PDF for the sender to attach is P1.

**R6 Early warning.** When F1 shows a shortfall for an outflow due within 14 days, raise one owner card per outflow (re-raised only if the gap grows by more than 10%). In the seed this raises the 31 Oct salaries card on 20 Oct, and the 5 Nov diesel card on 22 Oct. The card lists a neutral checklist of the owner's own levers: ask a regular customer to pay early; ask a supplier to move a bill date; hold new credit for late payers; "talk to my bank myself". It never names, ranks or recommends a lender or financial product.

**M1 Verify.** A slip or message only creates a CLAIM. A claim becomes VERIFIED only when a bank line exists with an equal amount, within 3 days of the claimed payment date, and a payer-name match (normalised, case-insensitive, at least one significant word of the customer name, or the invoice number in the description). Nothing becomes PAID without VERIFIED.

**M2 Allocate.** Try in order: an exact single-invoice match (amount, or amount + stated deduction, equals the invoice) (P0); an exact combination of up to 5 open invoices, oldest first (P1); otherwise flag the difference for a person.

**M3 Deductions.** A stated deduction is linked to an invoice when its reason text matches a delivery reference, destination or item on that invoice. Only the Owner can accept or reject it; accepting marks the invoice PAID and drafts a credit note for the accounting system (never submitted).

**M4 Hand-off.** Any extracted field below 0.85 confidence, any quote that fails the verbatim gate, any ambiguous date, and any unmatched amount goes to the "Needs a human" queue with one specific question.

**M5 Pause.** Reminders pause for an invoice with an open claim, a confirmed promise (until the day after the promised date), or a dispute.

## 9. Data, integrations and permissions

### 9.1 Entities (minimum fields)

| Entity | Fields |
|---|---|
| Customer | id, name, contact_name, whatsapp, language (bm/en/zh), quiet_hours (default 21:00-08:00), notes |
| Invoice | id, number, customer_id, amount_sen, issue_date, due_date, terms_days, status (open / part_paid / paid / disputed), source, delivery (DO number, route, destination) |
| PaymentHistory | invoice_id, due_date, paid_date, last_reminder_tier, last_reminder_date (null if paid without a reminder). R3 uses `paid_date − last_reminder_date` per tier; F1 uses `paid_date ≤ due_date` for the on-time rate |
| Outflow | id, label, amount_sen, due_date, recurrence |
| CashPosition | date, bank_balance_sen, entered_by |
| BankLine | id, date, amount_sen, description, matched_invoice_ids |
| Order | id, customer_id, amount_sen, payment_type (credit / cod / prepaid), status (on_hold / accepted / deposit_requested / cod / cancelled), decided_by |
| Reminder | id, invoice_id, tier, template_id, language, text, status (proposed / approved / queued / sent / skipped), rule_id, reason, approved_by, sent_at |
| InboundMessage | id, customer_id, text, attachments, received_at |
| Extraction | message_id, intent, fields [{name, value, quote, confidence}], model, cached |
| Claim | id, message_id, amount_sen, status (claim / verified / rejected), bank_line_id |
| Promise | id, invoice_id, promised_date, source_message_id, status (open / kept / broken) |
| HandoffItem | id, type, question, options, resolved_by, resolution |
| ActivityLog | id, ts, actor, action, rule_id, refs, model, confidence |
| User | id, name, role (owner / clerk / sales / accountant) |

Store money as integer sen. Store times in UTC and display in Asia/Kuala_Lumpur.

### 9.2 Integration assumptions (the brief allows the team's own assumptions)

- **Orbyte Connect** (simulated): invoices and payroll totals come from an accounting partner through Connect. In P0 a CSV stands in for Connect.
- **WhatsApp** (P0): outbound via wa.me click-to-send or simulated; inbound via a simulated inbox. P2: the official WhatsApp Business Platform (needs Meta business verification, approved templates and per-message fees).
- **Bank** (P0): bank statement CSV. P2: payments/banking partner feed through Connect.
- **AI** (P0): one vision-capable LLM call per inbound message, returning JSON that matches a fixed schema; a cached result per seeded message for fallback.

Illustrative API: `POST /receivables/invoices`, `GET /receivables/chase-plan?date=`, `POST /receivables/approvals`, `POST /receivables/credit-checks`, `POST /proofs`, `POST /proofs/{id}/decision`. Webhooks: `invoice.overdue`, `gap.detected`, `gap.warning`, `credit.check_raised`, `chase.approved`, `proof.verified`, `shortpay.detected`, `promise.due`.

### 9.3 Permission matrix

| Capability | Owner | Clerk | Sales (P1) | Accountant (P1) |
|---|---|---|---|---|
| See bank balance, payroll total, gap amounts | ✓ | — ("gap: yes/no" only) | — | — |
| See invoices and aging | ✓ | ✓ | own customers, status only | ✓ read-only |
| Import invoices, record orders | ✓ | ✓ | — | — |
| Approve Tier 0/1 reminders | ✓ | ✓ | — | — |
| Approve Tier 2, decide Tier 3 | ✓ | — | — | — |
| Decide credit checks | ✓ | — | — | — |
| Approve zero-difference VERIFIED matches | ✓ | ✓ | — | — |
| Accept or reject deductions, write off, mark paid without a bank line | ✓ | — | — | — |
| Resolve hand-off questions (dates, which invoice) | ✓ | ✓ | — | — |
| Edit templates and settings | ✓ | — | — | — |
| View and export the activity log | ✓ | view | — | ✓ |

## 10. Non-functional requirements

| ID | Requirement | Target |
|---|---|---|
| NFR-1 | Explainability | Every automated decision shows a rule ID and a one-line reason |
| NFR-2 | Determinism | The same data and clock always produce the same plan; covered by tests on the seed |
| NFR-3 | AI containment | AI output never changes money state directly; the verbatim gate and the 0.85 confidence threshold are enforced in the rules engine, never in the AI step. In P0 the engine runs in the browser with the demo state; with the P1 backend it runs on the server |
| NFR-4 | Accuracy | ≥ 95% exact-match on the amount field across the synthetic test set; zero invoices PAID without a bank line (by construction and by test) |
| NFR-5 | Performance | Scan under 2 s for 500 invoices; AI extraction under 10 s, otherwise the cached fallback is used |
| NFR-6 | Learnability | Two or three first-time users complete "approve a gentle reminder" and "approve a payment match" in under 10 minutes without help |
| NFR-7 | Privacy (PDPA) | Synthetic data only; account numbers masked on extraction; role-based visibility; documented retention; an AI provider that does not train on customer data; disclosure of cross-border processing (section 12) |
| NFR-8 | Security | No secrets in the repo; keys come from environment variables; the repo is public |
| NFR-9 | Language | Outbound templates in BM, EN and ZH; UI in English for P0 |
| NFR-10 | Demo reliability | Runs with no network except the AI call; demo reset in one action; cached fallback |
| NFR-11 | Auditability | The log is append-only and complete for every state change |

## 11. Success metrics

**Product (after launch, to validate with real owners):**
- Payroll shortfalls warned ≥ 10 days ahead: 100%.
- New credit orders from customers ≥ 30 days late that reached the owner before goods left: 100%.
- Overdue invoices with no next action: 0.
- Customers chased after already paying: 0.
- Clerk time on payment matching: measured before and after in interviews (estimate: about 10 hours/month saved at roughly 120 slips/month; not claimed until measured).
- Days from due date to first reminder: 1.

**Preliminary demo:** the eight-step script in section 13 runs end to end live, at least once without the cached fallback.

## 12. Privacy and compliance (real deployment)

- The SME is the data user under PDPA 2010 (as amended in 2024); Kachingg/Orbyte is its processor.
- Purpose limitation: contact data is used only to follow up invoices the customer has received; a notice line goes on invoices.
- Role-based access as in section 9.3; clerk and sales never see cash figures.
- Opt-out per contact is honoured.
- Extraction keeps only needed fields; account numbers are masked; slip images are encrypted with a retention limit set by the owner.
- The AI provider must not train on customer data; cross-border transfer is disclosed if the model is hosted outside Malaysia, and in-region hosting is preferred.
- Readiness for breach notification under the 2024 amendments.
- Demo slips use a clearly fictional bank name and layout, never copies of real Malaysian bank receipts.

## 13. Preliminary demo script (about 3-4 minutes)

Starting state: seed loaded, clock Tue 20 Oct 2026 08:00. Seeded inbound messages appear in the inbox once the demo clock passes their timestamp.

1. **Run scan** (Owner). The early-warning card shows "Short RM2,000 for salaries in 11 days" with the owner's options; pick "ask supplier to move the 5 Nov bill". *(FR-B1–B3)*
2. **Chase plan.** Ranked list with rule IDs; Pelita Frozen Foods shown as skipped. As Clerk, approve the gentle reminders. *(FR-C1–C4, C6)*
3. **Approve the firm reminder** to Hup Seng in Chinese (Owner); WhatsApp opens prefilled, or the send is simulated. *(FR-C5–C8)*
4. **Advance to Tue 20 Oct 11:05.** Hup Seng's reply arrives; the "Which Friday?" hand-off appears; the Clerk picks 30 Oct and Hup Seng's reminders pause. *(FR-E2, E3, E7, E8, E9)*
5. **Advance to Wed 21 Oct 10:20. Credit check.** As Clerk, enter a new Hup Seng booking (Klang → Johor Bahru, RM2,400, 60-day credit). Switch to Owner: the card shows RM6,850 owed, 46 days late, promise 30 Oct, RM9,250 total; choose "ask 50% deposit". *(FR-D1–D3)*
6. **Advance to Fri 23 Oct 14:30.** The 22 and 23 Oct scans run; a second early-warning card (5 Nov diesel, raised on 22 Oct) is now visible. The 14:25 bank line and the Mega Bina reply and slip arrive; a **live** AI call shows the fields with their exact words and confidence, including the RM330 deduction linked to DO-8812. The bank line matches (VERIFIED); as Clerk, approve the RM2,770 receipt; only then does the 31 Oct meter turn green. As Owner, accept the deduction; INV-2304 is PAID and credit note CN-0057 is drafted. *(FR-H1, FR-E1–E6, E12, FR-B4)*
7. **Advance to 15:00.** Kilang Perabot Jaya says "Dah settle la semalam" with no slip and no bank line: not marked paid, and a BM reply asking for the slip is drafted; the Clerk sends it. *(FR-E10)*
8. **Activity log.** Every step, with actor and rule. *(FR-G1–G2)*

**P0 definition of done:** all P0 acceptance criteria pass; steps 1-8 run on a fresh clone from the README instructions; the repo is public and matches the demo.

### 13a. Expected activity log for the demo script

Timestamps come from the frozen demo clock, so every action in a step carries that step's time.

As built (pinned in `web/src/engine/demo-script.test.ts`): the 21, 22 and 23 Oct scans each log the full scan summary, one R2 "skipped" line per promised invoice (INV-2268, INV-2296) and "no new reminders today", instead of the single line in row 14; row 5 reads "ask the diesel supplier to move the 5 Nov bill"; row 12 ends "for INV-2268". Everything else matches the table below in order.

| # | Demo time | Actor | Action |
|---|---|---|---|
| 1 | 20 Oct 08:00 | SYSTEM | scan: 4 overdue; 31 Oct salaries short RM2,000; 5 Nov diesel short RM13,200 |
| 2 | 20 Oct 08:00 | R6 | early warning raised: 31 Oct salaries short RM2,000 |
| 3 | 20 Oct 08:00 | R2 | skipped INV-2296: promise 30 Oct not reached |
| 4 | 20 Oct 08:00 | R3 | chase plan: 1 INV-2304 (closes the gap), 2 INV-2310, 3 INV-2268 |
| 5 | 20 Oct 08:00 | Lim Siew Lan | early-warning option chosen: ask supplier to move the 5 Nov bill |
| 6 | 20 Oct 08:00 | Nurul | approved Tier 1 INV-2304, sent |
| 7 | 20 Oct 08:00 | Nurul | approved Tier 1 INV-2310, sent |
| 8 | 20 Oct 08:00 | Lim Siew Lan | approved Tier 2 INV-2268, sent |
| 9 | 20 Oct 11:05 | INBOUND | Syarikat Hup Seng Trading message (received 11:02) |
| 10 | 20 Oct 11:05 | AI | promise to pay; date ambiguous (23 Oct or 30 Oct) |
| 11 | 20 Oct 11:05 | M4 | hand-off raised: which Friday? |
| 12 | 20 Oct 11:05 | Nurul | confirmed promise date 30 Oct |
| 13 | 20 Oct 11:05 | M5 | reminders paused for INV-2268 until 31 Oct |
| 14 | 21 Oct 08:00 | SYSTEM | scan: no new reminders (R2) |
| 15 | 21 Oct 10:20 | Nurul | entered booking: Syarikat Hup Seng Trading, RM2,400, credit |
| 16 | 21 Oct 10:20 | R4 | credit check raised: INV-2268 46 days late, total RM9,250 |
| 17 | 21 Oct 10:20 | Lim Siew Lan | credit decision: ask 50% deposit |
| 18 | 22 Oct 08:00 | SYSTEM | scan |
| 19 | 22 Oct 08:00 | R6 | early warning raised: 5 Nov diesel short RM13,200 |
| 20 | 23 Oct 08:00 | SYSTEM | scan |
| 21 | 23 Oct 14:30 | BANK | line 23/10 DUITNOW CR 2,770.00 MEGA BINA HARDW INV2304 (14:25) |
| 22 | 23 Oct 14:30 | INBOUND | Mega Bina Hardware Trading message + slip |
| 23 | 23 Oct 14:30 | AI | amount RM2,770.00, invoice INV-2304, deduction RM330.00 (with confidences) |
| 24 | 23 Oct 14:30 | M1 | claim VERIFIED against bank line |
| 25 | 23 Oct 14:30 | M3 | deduction linked to DO-8812 (Bukit Raja) |
| 26 | 23 Oct 14:30 | Nurul | approved receipt RM2,770: INV-2304 PART_PAID, RM330 under review |
| 27 | 23 Oct 14:30 | SYSTEM | 31 Oct salaries: covered (+RM770) |
| 28 | 23 Oct 14:30 | Lim Siew Lan | accepted RM330 deduction: INV-2304 PAID, credit note CN-0057 drafted |
| 29 | 23 Oct 15:00 | INBOUND | Kilang Perabot Jaya message |
| 30 | 23 Oct 15:00 | AI | says paid; no slip |
| 31 | 23 Oct 15:00 | M1 | no bank line: claim not verified, not marked paid |
| 32 | 23 Oct 15:00 | Nurul | sent templated reply asking for the slip |

## 14. Synthetic data specification

All names, numbers, banks and messages are fictional. No real bank names or receipt layouts are used.

- **Business:** Lori Laju Logistics Sdn Bhd (Klang, 12 staff, 6 lorries; lorry haulage for hardware, furniture and food distributors). Users: Lim Siew Lan (Owner), Nurul (Clerk).
- **Bank balance** on 20 Oct: RM9,800 (entered by the Owner).
- **Outflows:** salaries, drivers and staff, RM24,500 (monthly, 31st); diesel fleet-card bill RM11,200 (5 Nov).
- **Overdue invoices** (as of 20 Oct):

| Customer | Invoice | Amount | Due | Late | Delivery | History |
|---|---|---|---|---|---|---|
| Mega Bina Hardware Trading Sdn Bhd (contact Jessie, EN) | INV-2304 | RM3,100 | 2 Oct | 18 days | DO-8812, 12 Sep, Shah Alam → Bukit Raja | no reminders yet; pays within 11 days of a Tier 1 nudge about 90% of the time |
| Syarikat Hup Seng Trading (contact 李老板, ZH) | INV-2268 | RM6,850 | 5 Sep | 45 days | DO-8744, 6 Aug, Klang → Ipoh | Tier 1 reminders on 22 Sep and 30 Sep, no reply; pays within 11 days of a Tier 2 reminder about 30% of the time |
| Kilang Perabot Jaya Sdn Bhd (contact Encik Razak, BM) | INV-2310 | RM4,200 | 12 Oct | 8 days | DO-8820, 12 Sep, Muar → Port Klang | no reminders yet; about 60% at Tier 1 |
| Pelita Frozen Foods Sdn Bhd (contact Puan Rosnah, BM) | INV-2296 | RM1,900 | 28 Sep | 22 days | DO-8801, 29 Aug, Klang → Seremban | promised to pay on 30 Oct |

- **Expected inflows** from on-time customers, totalling RM12,700 due before 31 Oct: Kedai Elektrik Sinar Sdn Bhd RM7,500 due 27 Oct, and Gudang Sejuk Prima Sdn Bhd RM5,200 due 29 Oct (both with an on-time rate ≥ 80%).
- **Current invoices:** about 15 open invoices in total: the 4 overdue above, the 2 expected ones, and the rest not yet due until after 31 Oct.
- **Payment history:** separately, at least 10 paid past invoices per main customer (about 40-60 rows in total), each with its last reminder tier and date, so the rates above can be expressed.
- **Inbound messages:**
  - Tue 20 Oct 11:02, Hup Seng: "老板，那张发票我们下礼拜五才过数，sorry ah" → promise, date ambiguous (23 Oct or 30 Oct); the clerk confirms 30 Oct. (The card quotes "下礼拜五才过数", which must be an exact substring for the verbatim gate.)
  - Fri 23 Oct 14:30, Mega Bina (Jessie): "Hi kak, payment for INV-2304 done ya. Bank in RM2,770 just now, deduct RM330 for the 2 pallet tiles pecah at Bukit Raja. Slip attached" + a slip image from a fictional bank ("Bank Cempaka") showing RM2,770.00, reference "INV2304".
  - Fri 23 Oct 15:00, Kilang Perabot Jaya (Encik Razak): "Dah settle la semalam" with no slip.
- **Bank CSV:** includes `23/10/2026 14:25, 2770.00, DUITNOW CR MEGA BINA HARDW INV2304` (visible once the demo clock passes 14:25 on 23 Oct); no line for Kilang Perabot Jaya.
- **New booking** (Wed 21 Oct 10:20): Hup Seng, Klang → Johor Bahru, 1 lorry, RM2,400, 60-day credit.
- **Test set (P1, start in P0):** 30-50 synthetic Manglish/BM/Chinese replies with expected fields ("dah bank in boss", "bayar separuh dulu", "hujung bulan depan", "下礼拜五才过数"), plus 5 slips in 3 fictional bank layouts.

## 15. Domain 2 requirement traceability

| Domain 2 requirement | Covered by |
|---|---|
| Journey: trigger | FR-B1 (08:00 scan), FR-D1 (new order), FR-E1 (inbound reply) |
| Journey: connected data | FR-A1–A5, FR-A6 (Connect adapter) |
| Journey: decision logic (rules, AI only where it adds value) | Section 8 rules; AI only in FR-E2 |
| Journey: human approval by the right role | FR-C6, FR-D3, FR-E12, section 9.3 |
| Journey: visible outcome + activity log | FR-B4, FR-G1–G2 |
| Must-have 1: one clear SME problem | Section 2 |
| Must-have 2: core automated journey | Section 13 |
| Must-have 3: accuracy and ease of learning | FR-C4, FR-E3, FR-E4, NFR-1, NFR-4, NFR-6 |
| Must-have 4: people stay in control | FR-F1–F2, FR-C6, FR-D3, FR-G1 |
| Must-have 5: Orbyte fit and reuse | FR-A6, section 9.2, `idea/kutip-bukti.md` section 11 |
| Must-have 6: business benefit and SDG | Section 11; SDG 8.2, 8.3, SDG 9 |
| Good-to-have: automatic triggers | FR-B1, FR-D1, FR-E1 |
| Good-to-have: explainable decisions and hand-off | FR-C4, FR-E7 |
| Good-to-have: reusable building block | Section 9.2 API and webhooks |
| Good-to-have: business model | `idea/kutip-bukti.md` section 11 (Orbyte credit wallet) |
| Good-to-have: real-world validation | Section 17 |
| Rule: not Orbyte HR/admin | Section 3 non-goals |
| Rule: synthetic data, PDPA | Sections 12 and 14 |
| Out of scope: payments, filings, legal/financial advice | Section 3 non-goals; R1 Tier 3; R6 |
| Prelim: most important feature live, GitHub repo | Section 13 |

## 16. Risks and mitigations

| Risk | Mitigation |
|---|---|
| A customer can always choose not to pay; no proof that reminders speed collection | The promise rests on early warning and the credit check, which work even when a customer never pays |
| Customers may pay by DuitNow QR or payment link and send no slip | Validate first (section 17); if slips are rare, Bukti focuses on replies and promises |
| AI misreads a slip | M1, M4, the verbatim gate and the cached fallback |
| WhatsApp API access | wa.me click-to-send and a simulated inbox in P0 |
| Judges say "Bukku/Paidnice already do reminders" | Positioning in `research/02-competitor-scan.md`: early warning, credit check and bank-verified slips for micro firms, inside Orbyte |
| Owners won't type invoices | CSV/Sheet import; the Connect adapter in P1 |
| Credit check is overridden to keep a customer | Allowed; the decision and total owed are logged |
| Live demo network failure | Cached extraction; everything else runs locally |

## 17. Assumptions and validation plan

**Assumptions:** invoices exist in a spreadsheet or accounting tool; customers' WhatsApp numbers are known; the owner can enter a bank balance daily or upload a statement; B2B customers often pay by bank transfer and send a slip.

**Validation (before the final round):** interview 5-10 Malaysian B2B sellers. Ask: how many customers pay late, and how late; how they chase now and how long it takes; whether customers pay by transfer and send slips; whether they keep giving credit to late payers, and why; whether they would let a clerk send gentle reminders. Record the answers in the repo.

## 18. Open decisions (team)

1. Team size, skills and the preliminary deadline: these decide how much of Bukti is live.
2. ~~Tech stack~~ decided (section 20).
3. ~~LLM~~ decided for the demo (section 20); production hosting region still open.
4. ~~Demo sector~~ decided: haulage firm (section 14).
5. Sponsor company name (Alpha Red Pro vs Alpha Red Solutions): confirm on Discord.
6. Final product name.
7. The default credit-check threshold (30 days) and whether deposit percentages are fixed or free.

## 18a. Calls made during review (25 Oct 2026), for the team to check

A builder read this PRD cold and found places where rules, demo steps and tests disagreed. These were settled as follows. They are the reviewer's and author's calls, not team decisions; change any of them freely.

| # | Issue | Call |
|---|---|---|
| 1 | Quiet hours before 09:00 would have blocked the 08:00 demo | Quiet hours no longer suppress the plan; they only hold the send (new rule S1). Default changed to 21:00-08:00 |
| 2 | Clock behaviour unclear; the log could not be reproduced | Frozen demo clock; actions stamped with demo time; one scan per day crossed; seeded items appear by timestamp (FR-H1). Exact expected log added (13a) |
| 3 | No rule produced the card's gap impact or the pay-by date | New rule G1; the firm-reminder card now shows both the 31 Oct and 5 Nov impacts; the Clerk sees yes/no only |
| 4 | Unclear when the meter turns green and how cash changes | F1 `cash` = entered balance + invoices PAID since; the meter turns green on PAID, not on VERIFIED |
| 5 | 15 invoices could not express the payment rates | About 15 current invoices plus 10+ historical paid invoices per main customer; PaymentHistory now stores reminder dates |
| 6 | R1 sequence order ambiguous | Fixed sequence: Tier 1, Tier 1 again, Tier 2, Tier 3 |
| 7 | "Statement attached" impossible via a wa.me link | Tier 2 offers a statement on request; statement PDF is P1 |
| 8 | Smaller mismatches | P0 Bukti reads all three seeded replies (one live, others may be cached); the 5 Nov early warning on 22 Oct is now in the script; advancing runs one scan per day crossed |

## 19. Glossary

| Term | Meaning |
|---|---|
| Kachingg | The product; named for the sound of the till when you get paid (formerly Kutip) |
| Bukti | The AI reader of replies and slips; Malay for "proof" |
| On credit | Goods delivered now, paid later (e.g. 30-day terms) |
| Overdue / D+n | n days after the invoice due date |
| Tier | Reminder strength: 0 courtesy, 1 nudge, 2 firm, 3 owner escalation |
| Cash gap / shortfall | How much cash is missing for a bill on its due date |
| Claim / VERIFIED | A customer says they paid / a matching bank line confirms it |
| Hand-off | An item the system will not guess, sent to a person with one question |
| wa.me link | A WhatsApp link that opens a chat with the text prefilled; a person presses send |
| DuitNow | Malaysia's instant transfer and QR payment network |
| COD | Cash on delivery |
| Orbyte Connect | Orbyte's integration gateway to partner services |
| PDPA | Malaysia's Personal Data Protection Act 2010 |

## 20. Tech stack (decided 25 Oct 2026)

Chosen for a working demo inside the preliminary deadline, a link judges can open with nothing to install, and a clean path to a real backend later.

| Layer | Choice | Notes |
|---|---|---|
| App | Next.js 16 (App Router) + React 19 + TypeScript | One deployable unit; route handlers expose the API sketch in section 9.2 |
| UI | Tailwind CSS 4 + shadcn/ui-style components | |
| State (P0) | Client-side store (Zustand) persisted to `localStorage`, reset from the seed | No account or database needed for the demo; every state change goes through the engine and the activity log |
| Rules engine | Pure TypeScript module (`web/src/engine`), no framework imports | Deterministic; unit-tested against every seed check in sections 8 and 14 (Vitest) |
| AI | Claude Opus 5.5 (`claude-opus-5-5`) via the official `@anthropic-ai/sdk`, image + text input, structured JSON output validated with Zod | Server-side route only; the key stays in `ANTHROPIC_API_KEY`; cached extractions for every seeded message are the fallback (FR-E11) |
| Tests | Vitest (engine), Playwright (demo script smoke test, P1) | |
| Deploy | Vercel | |
| P1 backend | A hosted database (e.g. Convex or Postgres) behind the same engine | Replaces the client store; engine unchanged |

**Declaration (handbook 8.4):** the README must list every major tool, API and AI tool used, including AI coding assistants and AI-assisted research.

## 21. Orbyte hub frame (simulated)

Kachingg is demoed as a module inside a simulated Orbyte hub, to show "fit the hub" (brief section 6) and "Orbyte fit and reuse" (must-have 5). The frame is the team's own design, not a copy of Orbyte's screens (the brief allows this), and is labelled as a simulation.

| ID | Requirement | Priority | Acceptance criteria |
|---|---|---|---|
| FR-O1 | Hub shell: workspace header (company name, signed-in user and role), a module sidebar listing Orbyte's existing modules (People: eLeave, eClaim, eOT, Attendance; Work; eSign; Hiring; Connect) as present but not part of this demo, and **Kachingg** as the new module | P0 | Kachingg is the active module; other modules show a "part of Orbyte, not in this demo" state; the frame says "simulated" |
| FR-O2 | Connect page: the data sources Kachingg uses, each with status and what it provides: accounting partner (invoices, payroll total; simulated by CSV), bank statement (credits; CSV), WhatsApp (wa.me click-to-send; simulated inbox), clients records (shared Orbyte data) | P0 | Each source shows "simulated" and the last import time on the demo clock |
| FR-O3 | Shared platform pieces are visibly reused: roles from Orbyte's org structure, approvals in an approvals inbox, and the activity log as Orbyte's audit trail | P0 | The role switcher is labelled as Orbyte roles; approvals show in one inbox |
| FR-O4 | Billing preview: per-use credits in Orbyte's credit-wallet model (invoice chased, slip read), with illustrative prices only | P1 | Shows a month's illustrative usage; no real payment |

## 22. Known limitations of the P0 build (25 Oct 2026)

Found by the engine test suite and left for P1.

| # | Limitation | Plan |
|---|---|---|
| 1 | Tier 0 courtesy reminders (D-3) are not proposed; the chase plan lists overdue invoices only | Add Tier 0 rows outside the R3 ranking (they are already F1 inflows) |
| 2 | ~~An unverified "already paid" claim pauses reminders until the Owner marks it paid; there is no expiry~~ | **Done:** the Owner can "Reject claim" (`REJECT_CLAIM`, Owner only, logged) on the hand-off card or, after the slip request is sent, in the Inbox's "Says paid, not in the bank" list; reminders resume. No automatic expiry yet |
| 3 | A verified but unapproved receipt on a not-yet-due invoice counts as neither cash nor inflow, so the forecast dips until it is approved | Count verified receipts as pending inflows |
| 4 | Reset is not written to the activity log | Intentional for the demo, so the log starts at the 08:00 scan |
| 5 | A reminder released after quiet hours keeps its approval time | Store the release time separately |
| 6 | The live AI call has not been exercised against the API in this build (no key on the build machine); the cached results are the tested path | Run the three seeded messages live once a key is set, and record the result |
| 7 | ~~No screens for invoice CSV import (FR-A1), owner bank-balance entry (FR-A4) or bank CSV import (FR-A5)~~ | **Done** on the Connect page: invoice and bank CSV imports with a preview and invalid rows listed with line and reason (Owner and Clerk; the Clerk's bank preview shows credit lines only), and the Owner-only balance entry, all logged. The demo still starts from the seed. Bank debits are stored but do not move cash: P0 cash is the entered balance (F1) |
| 8 | ~~Snooze, mark disputed and "I'll call instead" on the approval card (FR-C9) are not built~~ | **Done:** all three are in the drawer and the engine, with the approve tier rules (Tier 2 Owner only) and logged with the actor. Snooze skips the row until the date; a call counts as contact for 5 days (R2). Un-disputing an invoice is not built yet |
