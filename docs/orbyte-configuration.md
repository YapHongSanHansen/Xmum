# Orbyte setup for Kutip

Verified on 25 October 2026 at [Orbyte](https://orbyte-xyz.alphareds.com/client).

Hosting: Vercel (confirmed by the team; deployment URL not yet supplied). Replit is declared as not used in the current project submission. The published official handbook sections 8.1.3 and 8.4 require disclosure of tools and services used; they do not mandate Replit. Any newer participant-specific instructions should also be checked.

| Item | Saved value |
|---|---|
| Existing organization | Taygood |
| Synthetic client | CetakPantas Print (Kutip demo) |
| Client status | Active |
| Linked project | Kutip — cash collection assistant |
| Project status | Active |

The project description identifies Kutip as a Malaysian SME cash collection assistant and describes cash warnings, credit checks, chase plans, and Bukti payment evidence review. The client record explicitly says the data is synthetic. Existing client records were not changed.

## Mock data entered directly in Orbyte

Four additional synthetic client records were created and verified after refresh:

| Mock customer | Invoice | Amount | Scenario |
|---|---|---:|---|
| Kafe Dua Beradik (Kutip mock) | INV-0412 | RM3,180 | Payment claim, synthetic matching bank credit, awaiting human review |
| Hock Lee Catering (Kutip mock) | INV-0398 | RM4,750 | 42 days late, active promise to pay 30 Oct |
| Restoran Selera (Kutip mock) | INV-0420 | RM860 | Gentle reminder draft in Bahasa Melayu |
| Tadika Bintang (Kutip mock) | INV-0405 | RM1,240 | Chinese payment promise; reminder suppression |

Six linked project records hold the mock cases: one for each invoice, Hock Lee's RM2,850 new credit order (RM7,600 total exposure; RM1,425 deposit option), and the CetakPantas payroll cash scenario (RM4,300 cash + RM2,100 expected receipts - RM8,400 payroll = RM2,000 gap). The cash case also includes the RM6,800 paper supplier obligation due 5 Nov.

The invoice amounts, states, replies, bank evidence and expected actions are stored in the supported client/project description fields. They are mock records, not entries in a native Orbyte receivables or banking ledger. There are five demo client records and seven linked project records in total, including the original Kutip project.

Orbyte currently exposes client and project records, task reports, project focus, and organization settings in this account. The Integrations screen says AI features are disabled because no Qwen API key is configured. I did not find native receivables, cash forecasting, credit decisions, or bank statement matching controls in the available screens. The saved project is a workspace record, **not** a working Kutip module.

The local `kutip/` demo runs the core workflow with synthetic data and no AI credentials. It is a standalone preview of the proposed module. Connecting it to Orbyte requires a supported integration surface and real authentication/permissions; neither is claimed here. Do not enter real customer, bank, or payment data into the demo.
