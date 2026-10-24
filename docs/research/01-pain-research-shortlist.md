# Pain research and idea shortlist

**What this is.** The final report of a multi-agent research run (24-25 Oct 2026, 35 agents). Seven researchers searched different sources for real pains of Malaysian micro/small businesses. A lead agent merged and ranked the pains. Two skeptics per pain tried to refute each one. Idea agents proposed 2 products per surviving pain, and three judges (an Alpha Red rubric judge, a Malaysian SME owner, a hackathon builder) scored them. An orchestrator agent wrote the report below.

Raw data: `data/pain-research-raw-by-angle.json` (all 57 raw pains with evidence) and `data/pains-verification-ideas-judges.json` (merged pains, skeptic verdicts, all 14 ideas, judge scores).

**Checked by hand after the run (25 Oct 2026):**
- Spot-checked and confirmed: Experian (SME payment delays 64 days, transport/logistics 76 days, payer/payee direction not stated); NST 10 Dec 2025 (sawi RM2.50-3 to RM6-7/kg); The Star 1 Oct 2026 (20% of SMEs cite rising supplier costs; survey commissioned by Airwallex, 415 respondents).
- Orbyte's public site was re-read: see the correction notes below.

> **Correction (25 Oct 2026).** The report says Orbyte's platform page lists "follow up unpaid invoices" as future direction or roadmap. That overstates it. The page uses "Follows up the right invoice" only as an *illustrative example* of AI acting on business context, and calls its Business Graph "a strategic direction, not a completed product". Collections and receivables are not listed as planned features. Orbyte has no native invoicing or accounting; those come through partners via Orbyte Connect. Pitch it as "your own site describes this, we build it", not "this is on your roadmap". Several agents and judges repeated the overstated claim; their scores for Kutip partly rest on it.

> **Note on scores.** The Alpha Red judge scored only 9 of the 14 ideas and emitted a placeholder row. All of the top 5 ideas received its score, so the shortlist ranking is unaffected. The averages for the 5 ideas it skipped come from two judges only.

> **Note on the company name.** Orbyte's website footer names **Alpha Red Pro Sdn Bhd**; the Domain 2 brief names **Alpha Red Solutions Sdn Bhd**. Not yet confirmed which is correct.

---


## 1. The short answer

1. **Kutip.** Every morning it ranks which unpaid customer invoices to chase first, so the owner can cover payroll and supplier bills that are due soon. It uses rules only.
2. **VO Catcher.** It turns "tambah 2 power point" WhatsApp instructions on a building site into priced, signed variation orders, so a subcontractor gets paid for the extra work.
3. **Bukti.** AI reads customers' payment slips and messy replies ("dah bank in boss", "bayar separuh dulu"). It matches each one to the bank statement and the invoices, so the ledger stays correct.
4. **Pasar Radar.** AI reads supplier price messages in BM, English or Chinese. Rules then build the cheapest buy plan for tomorrow, and the owner approves it.

---

## 2. The ideas, best first

### Idea 1: Kutip, the cash-gap collections planner

**One-liner:** It ranks overdue invoices by how much each one closes the next cash gap (payroll, rent, supplier bill). Then it prepares tiered WhatsApp reminders. A clerk sends gentle ones. The owner approves firm ones.

**The pain:** B2B suppliers deliver first and get paid much later, while salaries and rent are due every month. Owners chase payment by hand on WhatsApp and phone.
- Experian reports SME "payment delays" of 64 days on average, against 58 days for large firms. Transport/logistics averages 76 days. Note: Experian does not say if SMEs are the payer or the payee. https://www.experian.com.my/2025/05/21/experian-malaysias-state-of-credit-2025-reveals-sme-resilience-but-cash-flow-strains-persist/
- An owner wrote: "Always 30 days became 60/90/120 days." https://forum.lowyat.net/topic/5206091/all
- Bank Negara names "slower customer payments" as one of three causes of higher working-capital needs. https://www.thestar.com.my/business/business-news/2026/07/30/facilitating-access-to-sme-financing

**Super-pain test:**
- Money: **pass.** Cash is locked for about two months.
- Already spending: **partial.** Firms take financing and use lawyers in bad cases. Owner chasing time is not measured anywhere.
- Deadline or penalty: **partial.** There is no statutory late interest, but payroll and rent dates force the problem every month.
- Frequency: **pass.** Every credit invoice. Chasing happens every week.

**Demo journey (CetakPantas Print, Seri Kembangan, 4 staff):**
- **Trigger:** The 08:00 scan finds payroll of RM8,400 due 31 Oct and only RM4,300 in the bank.
- **Data:** It pulls 4 overdue invoices, each customer's payment history and the upcoming outflows.
- **Decision:** Rules rank Kafe Dua Beradik first. Its RM3,180 covers the RM2,000 payroll gap. Tadika is skipped because its promise date has not passed.
- **Approval:** The owner approves a firm reminder in Chinese to Hock Lee Catering (RM4,750, 41 days late).
- **Outcome + log:** The clerk records the RM3,180 payment. The gap meter turns green. Every step is logged with the person and the rule ID.

**Where AI helps:** Nowhere, by design. All of it is arithmetic and date rules, so every result is explainable in one line. It is not a chatbot: it is a scheduled engine, an approval queue and a cash meter.

**Measurable benefit (estimate):** Assume about RM45,000/month of credit sales. Cutting collection by 1 day frees about RM1,500 once. Cutting 5–7 days frees about RM7,500–10,500 once. Process metrics:
- overdue invoices with no next action: target 0
- first reminder sent on day D+1
- payroll shortfall warned at least 10 days ahead

**Orbyte fit:** Orbyte's own platform page lists "follow up unpaid invoices" as future direction (https://www.orbyte.my/platform.html), and Kutip delivers it. *[Correction 25 Oct 2026: overstated. The page uses "Follows up the right invoice" only as an illustrative example, not a roadmap item. See the correction note at the top.]* It reuses Orbyte's clients records, approval engine, roles and audit trail. It is a reusable "Receivables Follow-up" module with packs per sector.

**Hardest risk:** No source shows that reminders make customers pay faster. Bukku already sends email reminders at RM65/month (https://www.bukku.my/pricing).
**Fallback:** Lead the pitch with the cash-gap ranking and the credit-hold rule, not with "reminders". Send through wa.me click-to-send, so no WhatsApp API is needed. Interview 3–5 owners.

**Judge scores:** Alpha Red 7.78 / owner 8 / builder 8. Average 7.93, the highest.

---

### Idea 2: VO Catcher, site WhatsApp to signed variation orders

**One-liner:** AI finds the extra-work instructions in site chat and prices them from the BQ. The owner approves, and the main contractor e-signs before the claim cut-off.

**The pain:** Subcontractors do extra work on a WhatsApp instruction. At claim time the instruction is forgotten or denied. Late payment and stuck retention make it worse.
- Retention is "typically 5% to 10%" of contract value, "often equivalent to several months of operating cash flow" (an association estimate). https://www.malaysiasme.com.my/when-builders-went-bust-why-malaysia-had-to-fix-the-retention-sum-crisis/
- AIAC recorded 29 CIPAA cases in 2014 and 626 in 2024. The peak was 708 in 2017. https://www.scconline.com/blog/post/2026/10/23/aiac-asia-adr-week-2026-malaysias-construction-disputes-adjudication-framework/
- 48% of CIPAA claimants in 2014–2017 were subcontractors. https://www.aiac.world/wp-content/KLRCA-guides-and-special-reports/KLRCA-CIPAA-Report-2017/PDF.pdf

**Super-pain test:**
- Money: **pass.**
- Already spending: **partial.** AIAC adjudicator fees start at RM3,036 (http://www.aiac.world/Adjudication-Fee-Schedule). Lawyer costs are not measured.
- Deadline or penalty: **partial.** The claim cut-off is real. CIPAA's 10-day clock binds the payer, not our user.
- Frequency: **pass.** Monthly progress claims are the default under CIPAA s.36(3) when the contract is silent.

**Demo journey (Arus Cekap M&E, 9 staff, RM860,000 subcontract):**
- **Trigger:** The PM uploads the WhatsApp chat export.
- **Data:** BQ rates and the VO register are loaded.
- **Decision:** AI marks "tambah 2 power point each unit" as an instruction. Rules price 8 sockets × RM180 = RM1,440. "Crane datang pukul 7" is ignored as coordination.
- **Approval:** The PM fixes an unclear quantity. The owner approves RM8,450 in VOs.
- **Outcome + log:** A confirmation PDF goes out by eSign (mocked). The register shows RM6,240 signed. The log records the AI version and every human edit.

**Where AI helps:** It reads Manglish, BM and Chinese site slang ("tambah", "tukar", "先不要装"). It sorts instructions from chatter and matches loose wording to BQ lines. Rules do the pricing, and humans send. It is not a chatbot: it is a pipeline from messages to priced records to a signed PDF.

**Measurable benefit (estimate):** About 1% of contract value captured in one month (RM8,450 on RM860,000; this ratio is an assumption). Claim preparation drops from 3–5 hours to under 1 hour per project.

**Orbyte fit:** It reuses Orbyte eSign (Documenso), Projects and approvals. It becomes a reusable "change-request capture" module for printers, event vendors and installers.

**Hardest risk:** AI accuracy on mixed-language site chat. Also, there is no micro-only evidence, and homeowner renovation is outside CIPAA (s.3).
**Fallback:** Report precision and recall on a labelled test set of 60–80 messages. Keep cached outputs and keyword rules as backup, plus a manual "mark as instruction" button.

**Judge scores:** Alpha Red 7.68 / owner 8 / builder 7.5. Average 7.73.

---

### Idea 3: Bukti, payment-proof and promise reconciler

**One-liner:** AI reads slips and replies. Rules check the bank line and propose how to split the payment across invoices. The clerk or the owner approves.

**The pain:** This is the same late-payment pain as Kutip (P1), seen from the clerk's side. The clerk matches slips, part-payments and deductions by hand. Transport averages 76 days (Experian, link above). A regional survey found that manual follow-up leads to neglected follow-ups (regional data, not Malaysia-specific): https://blog.fundingsocieties.com/managing-receivables-an-asia-wide-problem-smes-turn-to-new-solutions/

**Super-pain test:** Same as Kutip. Money **pass**. Already spending **partial**. Deadline **partial**. Frequency **pass** (daily slips).

**Demo journey (Lori Laju Logistics, Klang, 14 staff):**
- **Trigger:** A customer writes "bank in RM7,420… deduct RM330 for 2 pallet tiles pecah" and attaches a slip.
- **Data:** It loads 3 open invoices (RM7,750), the DO records and the bank CSV.
- **Decision:** AI extracts the fields. Rule M1 marks the payment VERIFIED only because a matching bank line exists. The RM330 deduction is linked to DO-8812.
- **Approval:** The clerk approves the 2 full payments. The owner accepts the deduction after Ops attaches the delivery (POD) photo.
- **Outcome + log:** The ledger updates, reminders pause, and every step is logged with its confidence score.

**Where AI helps:** It reads many slip layouts and code-mixed dates such as "hujung bulan depan" and "下礼拜五". AI never decides money. It is not a chatbot: it is an inbox-to-ledger pipeline.

**Measurable benefit (estimate):** About 10 clerk-hours a month saved. RM1,500–3,000 a month of deductions surfaced for an owner decision. Zero customers chased after they have already paid.

**Orbyte fit:** It is the eClaim pattern (AI reading plus policy flags plus approval) applied to money coming in. It plugs into Kutip.

**Hardest risk:** Misreads, and getting slips in at all. No WhatsApp group access is assumed.
**Fallback:** No invoice is marked PAID without a bank line. Clerks forward slips to the system. A cached extraction is kept for the demo.

**Judge scores:** Alpha Red 7.5 / owner 7 / builder 8. The builder ranked it #1.

---

### Idea 4: Pasar Radar, supplier price inbox to buy plan

**One-liner:** AI turns 3 messy supplier price lists into one table. Rules pick the cheapest valid supplier per item, and the owner approves before any order goes out.

**The pain:** Input prices jump fast.
- Sawi went from RM2.50–3 to RM6–7/kg in two months. Kitchens buy only 1–2 days of stock. https://www.nst.com.my/amp/news/nation/2025/12/1333633/pricey-vegetables-force-restaurants-cut-back-purchases
- 20% of SMEs cite rising supplier costs, and they respond by "seeking alternative suppliers". https://www.thestar.com.my/business/business-news/2026/10/01/rising-costs-top-concern-for-malaysian-smes-as-growth-remains-priority

**Super-pain test:**
- Money: **pass.**
- Already spending: **partial.** It costs owner time. No paid tool for this was found.
- Deadline or penalty: **partial.** There is a nightly supplier cutoff.
- Frequency: **pass.** Daily.

**Demo journey (Dapur Kak Yati Catering, Shah Alam):**
- **Trigger:** Three supplier messages arrive before the 11pm cutoff.
- **Data:** Prices are normalised to RM/kg. It loads the 4-week price history and tomorrow's order.
- **Decision:** A spike flag fires on cili at RM18. Sawi and cili move to Kim Hin. Ayam stays locked with Pak Mat.
- **Approval:** The owner unticks one switch and approves.
- **Outcome + log:** Order messages go out in each supplier's language. The saving shows as RM15.80.

**Where AI helps:** It reads code-mixed messages, local pack units ("sepapan", "一盘") and different names for the same item (sawi = 菜心). It is not a chatbot: AI does extraction only, and the user sees a comparison grid.

**Measurable benefit (estimate):** About RM410 a month saved. Nightly comparison drops from 20–30 minutes to about 5.

**Orbyte fit:** Procurement is white space for Orbyte. The extraction schema also fits hardware shops, auto parts and manufacturers.

**Hardest risk:** Small savings, and owners loyal to their usual suppliers. The owner judge would untick most switches.
**Fallback:** Pitch spike detection and time saved. Keep the "only switch if the saving is RM5 or 5%" rule.

**Judge scores:** Alpha Red 7.75 / owner 6 / builder 7.5.

---

## 3. My recommendation

**Pick Kutip.** It has the strongest and most recent evidence, and it passes the money and frequency tests. It also delivers an item on Orbyte's own roadmap, and all three judges scored it 7.8 or higher. It works on data owners already have (an invoice list), which answers the owner judge's main concern. If the team wants one clear AI step, add Bukti's reading of customer replies as a stretch feature, so the reminder plan updates itself. VO Catcher is the best second choice if the team has someone who understands construction.

## 4. Pains we checked and dropped

- **P2: fake government orders and deposit scams.** Each firm is hit rarely. The money is lost in a bank app the product cannot touch. No evidence shows owners spending on a fix.
- **P3: fake payment screenshots.** Soundboxes (RM179+) and payment links (about RM1) already solve most of it. SahBayar (average 7.23) is the best backup idea from this pain.
- **P4 as "costing" (MarginGuard).** Recipe setup is too heavy for micro F&B. The headline SMEAM survey numbers are about wages, not input prices.
- **P5 retention tracker alone (HoldBack).** Bukku already handles retention invoices. Keep it as VO Catcher's roadmap.
- **P6: buyers demanding e-invoices from exempt suppliers.** Refuted. The free MyInvois portal fixes it, and payment delays are only warnings, not reported cases.
- **P7: statutory deadlines.** Mostly annual, and company secretaries already own them. Firms under RM3m are exempt from e-invoicing.
- **P8: manual books.** It is a real root cause, but the money link is indirect and cheap tools exist.
- **Payroll, EPF and minimum wage.** These overlap Orbyte's HR modules.
- **WhatsApp enquiry replies.** No Malaysian revenue evidence, and it risks being a reskinned chatbot.
- **Appointment no-shows.** The rates come from public hospitals only.
- **Inventory spoilage.** The evidence is old and comes mostly from vendors.

## 5. What we could not verify

- **Orbyte itself:**
  - The site says Orbyte belongs to Alpha Red **Pro** Sdn Bhd, not the sponsor Alpha Red **Solutions**. An SSM check is needed.
  - No RM prices, named partners, API or customer count are published.
  - We do not know whether eClaim's AI reader or Connect can really be reused.
- **Evidence gaps:**
  - No source gives micro-only data on late payment.
  - Owner chasing time is not measured anywhere.
  - No source shows that reminders shorten collection.
  - We do not know which side of the trade Experian's 64 days measures.
  - The SME Bank "70% with more than 6 months of reserves" figure is unverified.
- **Data access:**
  - No open-banking feed for micro firms in Malaysia was found.
  - The WhatsApp Business Platform needs Meta verification. Reading group chats is assumed impossible.
- **Blocked or uncounted sources:**
  - Several sources returned 403 errors (Malay Mail, theSun).
  - The search budget ran out during verification.
- **No owner interviews yet.** All ringgit benefits above are estimates on synthetic data. Run 3–5 owner interviews before the final.