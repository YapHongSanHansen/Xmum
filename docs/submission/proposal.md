# Kachingg: never be surprised on payroll day

*A cash-collection module for the Orbyte hub. XMUM Hackathon, Domain 2. Preliminary proposal.*

**In short.** Small Malaysian firms that sell on credit get paid late, then find out on payroll day that cash is short. Kachingg warns the owner 10+ days before a shortfall, holds new credit for customers who already pay late, and ranks who to chase first. Its AI reader, Bukti, reads customers' "dah bank in boss" replies, but an invoice is marked paid only when the money is in the bank statement and a person approves.

All data is synthetic. Lori Laju Logistics and every customer, bank and message are fictional.

## 1. Problem

**One SME problem (must-have 1).** Malaysian micro and small B2B sellers deliver on credit. A customer agrees to 30 days and pays after 60 or 90, while salaries, rent and suppliers fall due on fixed dates.

- SME payment delays average **64 days** (58 for large firms), and **76 days in transport and logistics** ([Experian, 2025](https://www.experian.com.my/2025/05/21/experian-malaysias-state-of-credit-2025-reveals-sme-resilience-but-cash-flow-strains-persist/)). Experian does not say whether the SME is the payer or the payee.
- Bank Negara names "slower customer payments" as one of three drivers of working-capital need ([The Star, 30 Jul 2026](https://www.thestar.com.my/business/business-news/2026/07/30/facilitating-access-to-sme-financing)).

So the owner learns on payroll day that cash is short, keeps giving credit to late payers and chases on WhatsApp from memory. The clerk matches payment screenshots by hand.

A customer can always choose not to pay. Kachingg focuses on what the owner **can** control: knowing early, deciding on credit, choosing whom to chase, and keeping records true.

**Users:** owners and clerks of B2B sellers with 2-30 staff. Demo business: Lori Laju Logistics, a 12-person haulage firm (transport has the longest delays).

**Evidence limits.** No source measures chasing time or shows that reminders speed up payment. We have **not yet interviewed real users** (plan in section 3).

## 2. Approach

| Job | What it does |
|---|---|
| **Early warning** | Each morning, compares cash plus expected payments with bills due in 14 days. The Owner picks from neutral options; no lender is named |
| **Credit check** | Holds a new credit order from a customer 30+ days late until the Owner decides: accept, deposit, cash on delivery or call first |
| **Chase plan** | Ranks overdue invoices by how much each closes the next shortfall. Fixed reminder templates in BM, English and 中文 |
| **Bukti** | AI reads replies and slips; rules check them against the bank statement. AI never decides money |

**Core journey (must-have 2).** *Trigger:* the 08:00 scan, a new credit booking or a customer reply. *Connected data:* invoices and payroll total through Orbyte Connect (CSV in the demo), bank lines and payment history. *Decision:* numbered rules; AI only reads messages. *Approval:* by role. *Outcome:* reminder sent, invoice updated, cash meter changed, log entry.

In the demo, the 20 Oct scan shows 31 Oct salaries short RM2,000. On 23 Oct a RM2,770 payment matches a bank line, the Clerk approves it, and 31 Oct shows "covered +RM770".

**Accuracy and ease of learning (must-have 3).** Every decision shows its rule ID and a reason. The same data always gives the same plan, and engine tests pin every demo number. AI fields show the customer's exact words, and AI never writes customer messages. Users learn one red/green meter, one approval card per action and an in-app 8-step Demo guide. Target: a new clerk learns daily tasks in under 10 minutes.

**People stay in control (must-have 4).** The Owner decides credit, firm reminders and deductions. The Clerk sends gentle reminders, approves exact matches and answers hand-off questions, but never sees bank balance, payroll or gap amounts. An append-only log records each action's time, actor and rule. Roles are simulated.

**Hardest risk: the AI misreads a reply or slip.** "下礼拜五才过数" means "will pay next Friday", but which Friday? Four safeguards:

1. **Verbatim gate:** a field is shown only if its quote appears word for word in the message.
2. **Bank-line match:** a message only opens a claim. PAID needs an equal bank line and a person's approval.
3. **Hand-off:** low confidence, an ambiguous date or an unmatched amount goes to a person with one question ("Which Friday? 23 Oct / 30 Oct").
4. **Cached fallback:** if the AI call fails, saved readings labelled "Cached result" are used.

*Status:* the live Claude call is built but **not yet run against the API**. The demo uses hand-written cached readings for its three messages, labelled in the UI; the fallback is the tested path. If interviews show customers rarely send slips, Bukti narrows to replies and promises.

**Orbyte fit and reuse (must-have 5).** Kachingg is a module inside Orbyte. Invoices come from accounting partners through Orbyte Connect. It reuses Orbyte's roles, approvals inbox, client records and audit trail, and adds finance, not HR or admin. The rules are not specific to haulage: a sector pack would change templates and thresholds, not the rules. A planned event API (`gap.detected`, `proof.verified`) would let other modules build on it.

**PDPA in a real deployment.** The SME is the data user under PDPA 2010 (amended 2024); Orbyte/Kachingg is its processor. Contact data is used only to follow up invoices, with opt-out per contact. Bukti keeps only needed fields, masks account numbers and encrypts slips for an owner-set period. The AI provider must not train on the data; cross-border processing is disclosed.

**Business model.** Orbyte's credit wallet, no per-seat fee. Illustrative prices: first 10 open invoices free, then RM0.50 each; RM1.50 per invoice chased in a month; RM0.30 per message or slip read; RM0.50 per credit check. An assumed month (40 open, 15 chased, 40 read, 4 checks) costs about RM51.50, under Bukku Grow's RM65/month for email reminders only.

**Out of scope:** real payments, statutory filings, legal or financial advice, lender recommendations.

## 3. Expected outcome

**Business benefit (must-have 6).** Targets, not measured results:

| Measure | Target | Assumption |
|---|---|---|
| Shortfalls warned ahead | 100%, at least 10 days before the bill | Data kept current |
| Invoices marked paid without a bank line | 0 | Enforced by rule and test |
| Credit orders from 30+ day late payers seen by the owner first | 100% | Orders entered in Kachingg |
| Clerk time per slip matched | About 5 minutes saved | Estimate: 10 hours/month at about 120 slips/month |
| Bukti amount accuracy | 95% or more | Synthetic test set; no score claimed yet |

In the demo, a RM2,400 booking from a customer already owing RM6,850 is held for a 50% deposit instead of raising the total to RM9,250.

**SDG.** 8.3: steadier cash flow helps micro and small firms grow. 8.2: bank-checked collections through technology a micro firm can afford. SDG 9 is related.

**Validation plan.** Before the final: interview 5-10 Malaysian B2B sellers (how late they are paid, how they chase, whether customers send slips); time 2-3 first-time users; score Bukti on a synthetic test set; run the live AI once and record the result.
