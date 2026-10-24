# Kutip pitch deck (slide by slide)

Eleven slides, about 5 minutes. Each slide has a title, 3-5 bullets and a speaker note. Every figure is either sourced in the repo's research docs or labelled as an estimate. All business names and data are fictional.

---

## Slide 1. Kutip: never be surprised on payroll day

- A cash-collection module for the Orbyte business hub
- Kutip ("collect") warns, holds credit and plans the chase
- Bukti ("proof") reads customers' payment replies, then checks the bank
- XMUM Hackathon, Domain 2: Orbyte Smart SME Challenge

**Speaker note.** "Kutip helps small businesses that sell on credit. It does not promise to make customers pay. It promises the owner will never be surprised on payroll day, and will stop giving credit to customers who don't pay."

---

## Slide 2. The problem: paid in 60-90 days, payroll every 31st

- Malaysian B2B sellers deliver on credit: "30 days" often becomes 60 or 90
- SME payment delays average 64 days, and 76 days in transport and logistics (Experian, 2025)
- Bank Negara names "slower customer payments" as a driver of working-capital need (The Star, Jul 2026)
- The owner finds out on payroll day, keeps giving credit to late payers, and chases from memory
- The clerk matches "dah bank in boss" screenshots to the bank app by hand

**Speaker note.** "Experian does not say whether the SME is the payer or the payee, so we use this as a sign of the pain, not a measure of it. Owner chasing time is not measured in any source we found. That is why we plan interviews before the final."

---

## Slide 3. The insight: focus on what the owner controls

- The owner cannot control whether a customer pays
- The owner can control: knowing early, deciding on credit, choosing whom to chase, keeping records true
- Every Kutip feature sits in the "can control" column
- So it still delivers value when a customer never pays

**Speaker note.** "No source shows that reminders make customers pay faster. So reminders are the delivery channel, not the promise. The promise rests on early warning and the credit check, which work even if a customer never pays."

---

## Slide 4. Four jobs

- **Early warning:** each morning, cash plus expected payments against bills due in 14 days; warns 10+ days ahead
- **Credit check:** holds a new credit order from a customer 30+ days late until the owner decides
- **Chase plan:** ranks overdue invoices by how much each closes the next shortfall; fixed templates in BM, English and 中文
- **Bukti:** AI reads replies and slips; nothing is marked paid without a matching bank line

**Speaker note.** "Three of the four jobs use no AI at all. They are plain rules, so every result can be explained in one line. AI is used in one place: reading messy messages like 'dah bank in boss' or '下礼拜五才过数'."

---

## Slide 5. The journey, in the demo

- **Trigger:** 20 Oct 08:00 scan finds 31 Oct salaries short RM2,000 and 5 Nov diesel short RM13,200
- **Data:** invoices, bills, bank balance, payment history (through Orbyte Connect; CSV in the demo)
- **Decision:** chase Mega Bina first (it closes the gap); skip Pelita (promised 30 Oct)
- **Approval:** Clerk sends gentle reminders; Owner approves the firm one to Hup Seng
- **Outcome:** 23 Oct, a bank-verified RM2,770 receipt approved by the Clerk; 31 Oct turns to "covered +RM770"; every step logged

**Speaker note.** "This is the journey the brief asks for: trigger, connected data, decision, human approval, visible outcome. The demo firm is Lori Laju Logistics, a fictional 12-person haulage company in Klang. We picked haulage because it has the longest delays in the Experian data and many per-trip payment slips."

---

## Slide 6. Bukti: AI reads, rules decide

- AI extracts fields only: amount, invoice, deduction, promised date
- Verbatim gate: every field shows the customer's exact words, or it is dropped
- Bank-line match: a slip only opens a claim; PAID needs an equal bank line and a person's approval
- Hand-off: low confidence or an unclear date goes to a person with one question ("Which Friday?")
- Cached fallback if the AI call fails, clearly labelled "Cached result"

**Speaker note.** "Our hardest risk is the AI misreading a message. These four safeguards mean a misread can delay a match, but cannot mark an invoice paid. To be clear about status: the live Claude call is built but has not yet been run against the API. Today's demo uses hand-written cached readings for the three seeded messages, and the UI says so."

---

## Slide 7. People stay in control

- **Owner:** decides credit checks, firm reminders and deductions; sees all cash figures
- **Clerk:** sends gentle reminders, approves exact payment matches, answers hand-off questions
- The Clerk never sees bank balance, payroll or gap amounts, only "gap: yes/no"
- Append-only activity log: time, actor (person, rule, AI, inbound, bank) and rule ID
- AI never sends or writes a customer message; a person presses send

**Speaker note.** "Roles are simulated as Orbyte roles, as the brief allows. Every consequential action is checked against the role in the rules engine, not just hidden in the screen. Sales and Accountant roles are planned for the final."

---

## Slide 8. Built for Orbyte, reusable for many SMEs

- A module inside the Orbyte hub, not a standalone app
- Invoices come from accounting partners through Orbyte Connect (Orbyte has no native accounting)
- Reuses Orbyte's roles, approvals inbox, client records and audit trail
- Adds finance and sales, not another HR or admin feature
- Sector packs (transport, printing, catering supply, wholesale) would change templates and thresholds; the rules stay the same

**Speaker note.** "Orbyte's own platform page uses 'Follows up the right invoice' as an example of AI working with business context. We are not saying it is on Orbyte's roadmap. We are saying the site describes it, and we built it. Our API design also includes events such as gap.detected and proof.verified, so other modules could build on Kutip. That API is designed, not built yet."

---

## Slide 9. Measurable benefit and SDG

- Shortfalls warned at least 10 days before the bill: target 100%
- Invoices marked paid without a bank line: target 0
- Clerk time: about 5 minutes saved per slip matched (estimate: 10 hours/month at about 120 slips/month)
- Bukti amount accuracy: target 95% or more on a synthetic test set
- SDG 8.3 (micro and small firms' growth) and 8.2 (productivity through technology); SDG 9 related

**Speaker note.** "All of these are targets or estimates, not measured results. The first two are enforced by rules and tests, so they hold by design. The time saving is an assumption we will measure in interviews. In the demo, the credit check turns a RM2,400 credit booking from a customer already owing RM6,850 into a 50% deposit request."

---

## Slide 10. Business model and competitors

- Orbyte credit wallet, no per-seat fee; first 10 open invoices free
- Illustrative prices: RM1.50 per invoice chased, RM0.30 per message or slip read, RM0.50 per credit check
- Assumed typical month: about RM51.50, under Bukku Grow's RM65/month (email reminders only)
- Paidnice and Peakflo show firms pay for AI collections, but serve bigger firms: about RM300/month (Paidnice, not re-checked) or quote-only (Peakflo)
- Not found elsewhere for micro firms: ranking the chase by a named shortfall, and checking WhatsApp slips against the bank line

**Speaker note.** "Prices are illustrative; nothing is charged in the demo. The competitor scan was a desk search, and 'not found' means not seen on public pages. Credit holds already exist in SQL Account and AutoCount for firms that use them. Ours is for sellers whose orders arrive on WhatsApp, and it is tied to the live cash gap."

---

## Slide 11. What is real today, and what is next

- **Real:** rules engine, roles, approvals, activity log and the full 8-step demo, running in the browser on synthetic data
- **Simulated:** the Orbyte hub frame, WhatsApp (wa.me links and a simulated inbox), the bank statement (CSV lines), login and roles
- **Not yet done:** live AI run against the API; interviews with real users
- **Next:** interview 5-10 Malaysian B2B sellers; score Bukti on a 30-50 message test set; test learnability with 2-3 first-time users
- **Roadmap:** official WhatsApp Business Platform, bank feeds through Connect partners, sector packs, BM interface

**Speaker note.** "We would rather be clear about what is simulated than overclaim. Out of scope by design: Kutip moves no money, files nothing with the government, gives no legal or financial advice, and never recommends a lender. Close: Kutip tells you who to chase first, and Bukti proves the money really arrived."
