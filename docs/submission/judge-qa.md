# Likely judge questions

Short, honest answers. If a judge asks something not covered here, answer from `docs/PRD.md` or say "we don't know yet". Do not guess numbers.

---

### 1. Isn't this just a chatbot on WhatsApp?

No. Nobody chats with Kachingg. It is a daily scan, a ranked list, approval cards and a cash meter. Three of its four jobs use no AI. AI is used in one place: reading customer replies and slips. It never writes or sends a message to a customer. Reminders come from fixed templates, and a person presses send.

### 2. What if the AI reads a message wrong?

A misread can delay a match, but it cannot mark an invoice paid. Four safeguards:
- **Verbatim gate:** every field must quote the customer's exact words, or it is dropped.
- **Bank-line match (rule M1):** a message only opens a claim. PAID needs a bank line with the same amount, within 3 days, naming the payer or the invoice, plus a person's approval.
- **Hand-off (rule M4):** confidence below 0.85, an unclear date or an unmatched amount goes to a person with one question, such as "Which Friday? 23 Oct / 30 Oct".
- **Cached fallback:** if the AI call fails or times out, the demo continues on saved readings, labelled "Cached result".

### 3. What if a customer lies and says they paid?

Then nothing changes. In the demo, Kilang says "Dah settle la semalam" ("already settled yesterday") with no slip. There is no bank line, so the invoice is not marked paid. Kachingg drafts a polite Malay reply asking for the slip or reference, and the clerk sends it. A fake slip has the same result: no matching bank line, no PAID.

### 4. Is the AI in the demo live?

Not yet. The live call to Claude is built: a server route, structured JSON output and a schema check, with the key kept on the server. It has not yet been run against the API. The demo currently uses hand-written cached readings for the three seeded messages, and the UI labels each one "Cached result". The fallback is the tested path. We will run the live call before the final and record the result.

### 5. Reminders already exist. Why would reminders make customers pay?

We don't claim they do. No source we found shows that reminders speed up payment. So the promise rests on two things that work even if a customer never pays: the **early warning** (the owner gets 10+ days to act before payroll) and the **credit check** (the amount a late payer owes stops growing). Reminders are the delivery channel, not the promise.

### 6. Who are your competitors?

Payment-reminder tools exist. Paidnice and Peakflo do AI collections over WhatsApp, but are built for bigger firms or Xero and QuickBooks users. Paidnice is reported at about RM300/month (USD 69; a figure from our research run that we have not re-checked), and Peakflo is quote-only. Bukku, SQL Account and AutoCount have reminders, bank reconciliation and credit limits. Our desk scan did not find, for Malaysian micro firms: ranking who to chase by a named shortfall, or checking a WhatsApp slip against the bank line before marking paid. "Not found" means not seen on public pages. Sources are in `docs/research/02-competitor-scan.md`.

### 7. SQL Account already blocks orders for overdue customers. What's new about your credit check?

Fair point; it is not a world first. Our version is for sellers whose orders arrive on WhatsApp and who don't run those systems. It also ties the decision to the live cash gap and shows the total owed if the order is accepted.

### 8. How does this fit Orbyte?

Kachingg is a module inside the Orbyte hub. Orbyte has no native accounting, so invoices and the payroll total come from accounting partners through Orbyte Connect (a CSV in the demo). It reuses Orbyte's roles, approvals inbox, client records and audit trail. It adds finance and sales, not another HR or admin feature. It also fits Orbyte's credit wallet. Orbyte's own platform page uses "Follows up the right invoice" as an example of AI with business context. We are not saying it is on Orbyte's roadmap; we built what the site describes.

### 9. Can it serve many SMEs, not just one haulage firm?

Yes, by design. The rules (forecast, ranking, credit check, matching) are not specific to haulage. A sector pack would change the reminder templates and thresholds, not the rules: transport, printing and packaging, catering supply, wholesale. Only the haulage pack exists today. Any B2B seller with credit invoices, a bank account and WhatsApp customers can use it.

### 10. Why haulage?

Transport and logistics has the longest SME payment delays in the Experian 2025 data: 76 days, against an SME average of 64. Per-trip invoices also create many payment slips, which is where Bukti helps. The product itself is not specific to haulage.

### 11. Who pays, and how much?

The SME pays from Orbyte's credit wallet. There is no per-seat fee. Illustrative prices: the first 10 open invoices are free, then RM0.50 each; RM1.50 per invoice chased in a month; RM0.30 per message or slip read; RM0.50 per credit check. An assumed typical month (40 open invoices, 15 chased, 40 messages read, 4 credit checks) costs about RM51.50. That is under Bukku Grow at RM65/month, which sends email reminders only. These prices are illustrative and not tested with buyers.

### 12. How do people stay in control?

Two roles in the demo, simulated as Orbyte roles. The **Owner** decides credit checks, approves firm reminders and accepts or rejects deductions. The **Clerk** sends gentle reminders, approves exact payment matches and answers hand-off questions. The Clerk never sees the bank balance, payroll or gap amounts, only "gap: yes/no". Role checks run in the rules engine, not only in the screen. Every action goes into an append-only activity log with its time, actor and rule.

### 13. How do you handle PDPA?

The demo uses synthetic data only. In a real deployment, the SME is the data user under PDPA 2010 (as amended in 2024), and Orbyte/Kachingg is its processor. Contact data is used only to follow up invoices, with opt-out per contact. Bukti keeps only the fields it needs, masks account numbers and encrypts slip images for a period the owner sets. The AI provider must not train on customer data, cross-border processing is disclosed, and in-region hosting is preferred. Breach-notification steps follow the 2024 amendments.

### 14. What is real and what is simulated?

- **Real and working:** the rules engine (forecast, ranking, credit check, matching, hand-offs), role checks, approvals, the activity log and the full 8-step demo, all on synthetic data. Engine tests pin every demo number.
- **Simulated:** the Orbyte hub frame, login and roles, WhatsApp (wa.me click-to-send and a simulated inbox), the bank statement (CSV lines), billing (illustrative prices, nothing charged).
- **Not yet done:** a live AI run against the API, and interviews with real users.

### 15. Have you talked to real SME owners?

Not yet, and we say so in the proposal. Before the final round we will interview 5-10 Malaysian B2B sellers. We will ask how late customers pay, how they chase and how long it takes, whether customers pay by transfer and send slips, and why they keep giving credit to late payers. We will also time 2-3 first-time users on "approve a reminder" and "approve a payment match", with a target of under 10 minutes to learn.

### 16. How will you prove the accuracy?

Two ways. Rules are deterministic: the same data and clock always give the same result, and tests pin every number in the demo. For the AI, we will score Bukti on a synthetic test set of 30-50 Manglish, BM and Chinese replies, with a target of 95% or more exact match on the amount. We have no accuracy score yet, so we do not claim one.

### 17. What if customers pay by DuitNow QR and send no slip?

Then Bukti has fewer slips to read, and narrows to replies and promises ("bayar separuh dulu", "下礼拜五才过数"). The early warning, credit check and chase plan still work. This is one of the first questions in our interviews.

### 18. What's next?

Run the live AI and record the result; interview sellers; score Bukti on the test set; add Sales and Accountant roles and CSV export. Roadmap: the official WhatsApp Business Platform, bank feeds through Connect partners, sector packs and a BM interface. Out of scope by design: Kachingg moves no money, files nothing with the government, gives no legal or financial advice and never recommends a lender.
