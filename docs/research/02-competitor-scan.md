# Competitor scan: does Kutip + Bukti already exist?

**What this is.** A second multi-agent run (25 Oct 2026, 6 agents): 5 searchers (global AR tools, emerging-market micro apps, the Malaysian stack, payment-proof readers, and one adversarial searcher told to prove the idea is not new), then one analyst who built the feature matrix below. Raw findings: `data/competitor-findings-raw.json`.

**Feature keys used in the matrix:**
- F1 track unpaid invoices and send reminders
- F2 reminders over WhatsApp in BM / English / Chinese
- F3 cash-gap prioritisation (rank overdue invoices by how much each closes the next payroll/rent/supplier shortfall)
- F4 tiered approval (clerk sends gentle reminders, owner approves firm ones)
- F5 credit hold for customers 30+ days overdue
- F6 AI reads free-text replies and payment-slip screenshots (Manglish/BM/Chinese)
- F7 verify a claimed payment against the bank statement line before marking paid; allocate across invoices; flag short-pays
- F8 promise-to-pay tracking from free-text replies
- F9 roles/permissions and append-only activity log
- F10 priced for micro firms (below Bukku's RM65/month)

**Checked by hand after the run (25 Oct 2026):**
- **Paidnice** (paidnice.com/features): WhatsApp reminders with a pay link; "Paidnice reads every reply and drafts the next step for you to approve"; logs promised dates; "approve each action"; weekly cash forecast; credit scoring; "a credit stop" as an escalation option. Works only on Xero and QuickBooks. No slip reading or bank matching mentioned. Pricing not shown on the features page (the USD 69/month figure below comes from the agents and was not re-checked).
- **Peakflo** (peakflo.co/whatsapp-ai-agents): automatic WhatsApp due-date/overdue/escalation reminders; collects dispute and short-payment reasons; logs payment promises; customers can upload proof of payment in WhatsApp, but the page does not say the agent reads or verifies it; no approval step before sending; "40+ Languages & Dialects"; no mention of Malaysia; aimed at insurance carriers, logistics companies and finance teams.
- **Lejar.ai** (lejar.ai, Malaysia): AI-native accounting, DuitNow QR on invoice PDFs, bank statement import and reconciliation, from RM39/month (free tier available). No WhatsApp reminders and no reading of customer replies or payment slips.
- An extra web search found no Malaysian product combining all of this. Nearest: InvoChatng (Nigeria, WhatsApp invoice reminders) and ChatDaddy (Malaysian WhatsApp CRM, no collections features seen).

---


## 1. Short answer

**Mostly, in pieces.**

No single product does all of Kutip + Bukti for Malaysian micro B2B sellers. But most single features already exist in some product, spread across many tools and price levels. Two products are close: **Peakflo** (Singapore) and **Paidnice** (New Zealand, sold on the Xero Malaysia app store). Neither is built or priced for a 2-30 person Malaysian firm. Do not pitch "WhatsApp payment reminders" as new. The new part is smaller: cash-gap ranking (F3), plus reading Manglish/BM/Chinese replies and slips and checking them against the bank line (F6 + F7), at a micro price (F10).

## 2. Closest competitors

Legend: **Y** = yes, seen on a public page. **~** = partly. **N** = not seen on public pages (this does not prove the feature is missing). **?** = unclear.

| Product | Market | In Malaysia? | F1 | F2 | F3 | F4 | F5 | F6 | F7 | F8 | F9 | F10 | Price for a micro firm |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| [Peakflo](https://peakflo.co/whatsapp-ai-agents) | Singapore, SEA, India | ? (see note) | Y | ~ | N | N | Y | ~ | ~ | Y | Y | N | Custom quote only. Aimed at scale-ups and enterprise. |
| [Paidnice](https://www.paidnice.com/features) | NZ/AU, global | Yes ([Xero MY app store](https://apps.xero.com/my/app/paidnice)) | Y | ~ | ~ | ~ | ~ | ~ | ? | Y | ~ | N | From USD 69/month, about RM300 |
| [Seenn "Shira"](https://www.seenn.ai/) | Israel | ? | Y | ~ | N | ? | ? | ~ | ~ | ~ | ? | ? | Custom plans |
| [Bukku](https://www.bukku.my/pricing) | Malaysia | Yes | Y | ~ | N | N | ? | N | ~ | N | Y | benchmark | Grow RM65/month (auto reminders by email only) |
| [SQL Account](https://www.sql.com.my/accounting-software/features/) | Malaysia | Yes | Y | ~ | N | N | Y | ? | ~ | N | ~ | N | From RM79/month. WhatsApp reminders need the [Adaptis add-on](https://www.sql.com.my/adaptis/). |
| [AutoCount Cloud](https://www.autocountsoft.com/pro-cloud-acc.html) | Malaysia | Yes | ~ | ~ | N | N | ~ | N | ~ | N | Y | ~ | Lite RM70/month, or RM336/year |
| [Xero Malaysia](https://www.xero.com/my/pricing/) (+ [Saysimple](https://www.saysimple.com/integrations/xero)) | Global | Yes | Y | ~ | ~ | ? | ? | N | ~ | ? | ~ | ~ | Starter USD 14.50/month on promo to 31 Dec 2026 |
| [Zoho Books](https://www.zoho.com/books/pricing/) | Global | ? (MY pages 404) | Y | ~ | ~ | ~ | ? | N | ~ | ~ | ~ | Y | Free plan has reminders. Standard USD 10-12/month. |
| [Whautomate](https://whautomate.com/tools/whatsapp-invoice-generator) | Singapore / Malaysia | Yes | ~ | ~ | N | ? | N | ~ | ~ | ? | ~ | N | From about S$199/month ([pricing](https://whautomate.com/pricing)) |
| [EasySlip](https://easyslip.com/) | Thailand | No | N | N | N | N | N | ~ | ~ | N | ? | Y | From 99 THB/month (250 slip checks). Thai slips only. |

Notes on the table:
- **Peakflo in Malaysia.** One searcher saw Peakflo offer virtual-account collection in Malaysia. The other searchers found no Malaysia page, and the case study they saw names a Singapore customer. Treat it as possibly available.
- **Peakflo F7.** Peakflo does a 3-way match of remittance, invoice and bank statement ([source](https://peakflo.co/accounts-receivable-and-invoicing/automated-reconciliation-cash-application)), so it is very close to F7. It does not say that it reads a WhatsApp slip image and checks it against the bank line.
- **Xero F2.** An [RHB/Xero 2026 fact sheet](https://rhbfoundation.rhbgroup.com/-/media/Assets/Corporate-Website/Document/Supported-Doc/Xero--Fact-Sheet-(2026).pdf) says Xero can send reminders over WhatsApp. But Xero staff marked native WhatsApp sending as "not planned" on 17 June 2026 ([source](https://productideas.xero.com/forums/967130-contacts-documents/suggestions/46626529-contacts-send-invoices-and-statements-through-wh)). For now, treat it as an add-on only.
- **Zoho Books F8.** Zoho pauses reminders when someone types in an expected payment date by hand ([source](https://www.zoho.com/books/help/settings/reminders.html)). No AI does this.

## 3. Already done by others

Do not pitch these as new.

- **F1, track unpaid invoices and send reminders.** Very common. Bukku, Xero, Zoho Books (Free plan), SQL Account, HitPay ([source](https://hitpayapp.com/my/blog/invoicing-malaysia-business)) and Biztory ([source](https://biztory.com.my/full-set-accounting-2/manage-cashflow/)) all do it.
- **F2, WhatsApp reminders.**
  - Automatic WhatsApp reminders: Peakflo, Paidnice, Whautomate, and SQL Account through an add-on.
  - Manual one-click WhatsApp sharing: Bukku, AutoCount and Biztory.
  - Generic WhatsApp tools: WebWMS2U sends scheduled reminders from CSV ([source](https://www.webwms2u.com/blog/whatsapp-payment-reminders-malaysia/)), from RM49/month. [SleekFlow](https://sleekflow.io/pricing) and [WATI](https://www.wati.io/pricing/) also send WhatsApp messages.
  - Free "ledger + WhatsApp reminder" apps: India has [OkCredit](https://okcredit.in/payment-reminder-app) and Indonesia has [BukuWarung](https://bukuwarung.com/).
- **F5, credit hold.** SQL Account already blocks new delivery orders and invoices for overdue customers. Peakflo flags credit freezes. AutoCount asks for approval when a customer goes over the credit limit.
- **F7, bank reconciliation and splitting one payment across invoices.**
  - Bank reconciliation: SQL Account (20+ Malaysian banks, with FIFO knock-off across invoices), AutoCount, Bukku SmartRecon and Xero.
  - Short-pays and deductions: enterprise tools do this fully, for example [HighRadius](https://www.highradius.com/product/cash-application-automation/mid-market/), [Versapay](https://www.versapay.com/cash-application) and [Growfin](https://www.growfin.ai/).
- **F8, promise-to-pay tracking.** Paidnice holds reminders until the promised date. Peakflo logs promises from WhatsApp text. [Upflow](https://docs.upflow.io/en-us/core-entities/invoices/ai-suggested-promise-to-pay), [Tesorio](https://www.tesorio.com/) and Growfin do it over email.
- **F6, AI reads customer replies.** This exists in Paidnice, Peakflo, Seenn, Upflow and Tesorio. Most of them read email, not WhatsApp.
- **Slip reading (part of F6).** This exists in Thailand: EasySlip and [BigSeller Slip2GO](https://help.bigseller.pro/en_US/detailPage/3/1/9328/content). BigSeller even marks Paid, Partially Paid or Overpaid.
- **F9, roles and audit trail.** Bukku (Prime plan), AutoCount and Peakflo have this.

## 4. Still open

These were not found in any product checked for Malaysian micro or small firms.

| Gap | Confidence | Why |
|---|---|---|
| **F3: rank overdue invoices by how much each closes a named shortfall** ("short RM2,000 for payroll on 31 Oct, chase these 3") | Medium-high | All 5 searchers looked, and none found it. Some tools show the cash gap: [Float](https://floatapp.com/), [Agicap](https://agicap.com/en/products/account-receivable/), Tesorio, Xero and Zoho. None of them turns the gap into a ranked chase list. |
| **F6 for Malaysia: Manglish/BM/Chinese replies plus Malaysian slip screenshots** | Medium | No product names BM or Chinese. But Peakflo claims "40+ languages", so it may already handle them. No Malaysian DuitNow slip checker was found. |
| **F7 strict: never mark PAID from a slip, check the bank line, flag short-pays, for micro firms** | Medium | Peakflo and the enterprise tools do this for bigger firms. HitPay and [Curlec](https://curlec.com/payment-links/) only mark paid for money that goes through their own payment system. |
| **F4: clerk sends gentle reminders, owner approves firm ones** | Medium | Not found. Paidnice makes a person approve every message. This is easy for others to copy, so it is not a strong advantage. |
| **F10: WhatsApp + AI collections under RM65/month** | Medium-high | Every product with WhatsApp + AI costs RM299/month or more, or is quote-only. |
| **The full combination for Malaysian micro B2B sellers** | Medium-high | Not found. Peakflo is the nearest, but it targets bigger firms. |

Why confidence is only "medium":
- Every searcher ran out of search budget, at 6 to 17 searches each.
- Product Hunt, YC batches, e27, Vulcan Post, Tech in Asia and hackathon winners were not searched.
- Only one Malay query and one Chinese query ran.
- "Not found" means not seen on public pages. It does not mean the product lacks the feature.

## 5. How to sharpen the idea

1. **Lead with "Bukti" and the cash gap, not reminders.** Pitch the product as "tells you who to chase to make payroll, and proves the money really arrived". Reminders are only the delivery channel.
2. **Build a layer, not a new accounting app.** Read invoices from Bukku, SQL Account, AutoCount, Xero or CSV, and fit into Orbyte, the sponsor's hub. Sellers already have invoicing and reminders, so do not compete there.
3. **Check the slip habit first.** In India and Indonesia, payment links avoid slips entirely. HitPay and [Lejar.ai](https://lejar.ai/) put DuitNow QR on invoices. Ask 5-10 real Malaysian B2B sellers: "Do your customers pay by bank transfer and send a slip?" If they do, F6 and F7 matter. Malaysian slips have no bank-checkable QR like Thai slips, so checking against the bank statement line (F7) is the right design.
4. **Make Manglish/BM/Chinese the demo star.** Build a test set of 30-50 real replies ("dah bank in boss", "bayar separuh dulu", "下礼拜五才过数"). Show the accuracy. This is the clearest proof against Peakflo's generic "40+ languages".
5. **Drop or shrink the common parts, and price low.** Keep F5 and F9 small, because SQL Account and Bukku already have them. Target RM29-49/month. Plan for Meta WhatsApp fees and template rules. A G2 review, seen only in a search snippet, says WhatsApp Business messages are limited to a 24-hour window.

**If the team needs a fallback pivot:** build "Bukti" alone. It would be an add-on for Bukku, SQL Account or Xero users that reads WhatsApp slips and replies, matches them to bank lines, and flags short-pays.

## 6. Could not check

- **Peakflo:** Malaysia availability is unclear (sources conflict). Real price is unknown; TechJockey says "from $224", which is unverified. The G2 page returned 403.
- **Zoho Books:** every Malaysia page returned 404, so local availability and MYR price are unverified.
- **Bukku:** the help centre needs a login, so feature detail comes only from public pages.
- **Xero:** WhatsApp support is unclear (RHB fact sheet vs Xero staff statement).
- **Pages that failed:** CredFlow (India) returned 503. Khatabook and some Google Play pages would not load. SlipOK, G2, Billtrust and Esker were blocked.
- **Products not checked:** QuickBooks Malaysia, QNE, Deskera, iPay88, senangPay, toyyibPay, Revenue Monster, Stripe Malaysia, Interakt, DuitNow Request (PayNet page returned 403), Gaviti, Satago, InvoiceSherpa, FreshBooks and Wave.
- **Unclear features:** Seenn's GetApp page was seen only as a search snippet. Bayar Hutang and BakiMate have unclear home countries. Kippa's site did not load. Fidexa (Brazil, AI WhatsApp debt collection) was seen only in a search snippet.
- **Unchecked sources:** Malaysian startup news (e27, Vulcan Post) and local hackathon projects. Check these before claiming "new" in the pitch.