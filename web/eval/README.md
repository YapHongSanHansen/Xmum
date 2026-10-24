# Bukti eval

Measures how well Bukti reads customers' WhatsApp payment replies (PRD FR-E2, NFR-4). It scores what the product would act on, not the raw model output: every live reading goes through the engine's own verbatim gate (`APPLY_EXTRACTION` in `src/engine/reducer.ts`) and 0.85 confidence threshold (`CONFIDENCE_MIN` in `src/engine/rules.ts`) before it is compared with the hand labels.

**No live score has been recorded yet.** The set and the scorer are tested; the model has not been run against them.

## The test set

`messages.ts`: 40 synthetic messages to Lori Laju Logistics. Every company, person, invoice number and bank is fictional; the only bank named is the demo's fictional Bank Cempaka. Each message has a stated "now" (when it arrived) and hand-labelled expected fields.

| Covers | Messages |
|---|---|
| Language | 10 Manglish, 10 Malay, 9 English, 7 Chinese, 4 code-switched |
| Intent | 14 paid in full, 11 promises to pay, 7 deductions or disputes, 3 part payments, 5 with no payment content |
| Amount formats | `RM2,770`, `2770`, `RM 2.7k`, `rm2770.00`, `RM1,250.50`, `RM3k`, `两千七百七十`, `三千块`, `seribu lima ratus ringgit` |
| Invoice refs | `INV-2412`, `INV2418`, `invoice 2415`, `Inv No. 2421`, `invois 2475`, `发票 2440`, `#2478` |
| Dates | "next Friday", 下礼拜五, "Jumaat depan" and "Isnin depan" (two candidates each), tomorrow, lusa, 明天, "on 30 Oct", 下个月五号, hujung bulan and "next week" (not one date, so not scored) |
| Hard cases | claims with no amount ("Dah bank in", 已经转了), several amounts in one message (invoice total, payment, deduction), a dispute with no payment, part payment with the balance promised |

b08 to b10 are the three seeded demo messages; b09 includes the Bank Cempaka slip image.

Expected values: `amount` and deduction amounts are in sen, the app's money unit. `invoiceRef` and the deduction `reason` are copied from the message (a test checks they are exact substrings). `promisedDates` lists every date the words could mean. `unscored` names a field a person could fairly label either way, such as the single invoice ref of a message that pays two invoices.

## Run it

```bash
cd web
ANTHROPIC_API_KEY=... pnpm eval:bukti     # live run; uses claude-opus-5-5 unless KUTIP_AI_MODEL is set
pnpm test                                 # includes eval/bukti.test.ts (the set and the scorer)
```

Needs Node 22.18 or later. The runner is plain Node with its native TypeScript support and a small resolve hook (`ts-resolve.mjs`) for the app's extensionless imports, so there is no extra dependency. It reads 4 messages at a time through `extractMessage()` in `src/lib/extract-server.ts`, the same call the app's `/api/extract` route makes, with the same 9 s timeout.

Without a key it prints `ANTHROPIC_API_KEY not set: live eval not run, no score reported.` and exits 0. It never falls back to the cached fixtures: a message whose call fails (timeout, API error, invalid output) is listed as "not scored" with the reason, and the figures say how many messages they cover.

## Reading the output

- **Per-field accuracy**: matches divided by scored fields, for intent, amount, invoice ref, deduction amount, deduction reason and promised date.
  - A field the model returned below 0.85 confidence is **held**: the product sends it to a person, so it never counts as a match, even when the value is right.
  - A field the verbatim gate dropped scores as the empty value the product is left with.
  - Invoice refs compare on their digits, so `INV-2412`, `inv 2412` and `#2412` agree.
  - A deduction reason matches when it contains the labelled words.
  - Promised dates compare as a set of candidates. The engine later widens a lone "next Friday" date to both Fridays (M4); the eval scores the model's own candidates, which is stricter.
- **Amount exact match**: the amount field's accuracy against the NFR-4 target of 95%, including messages where the right answer is "no amount".
- **Fields dropped by the verbatim gate**: each field whose quote was not in the message.
- **Mismatches and held fields**: every field that is not a match, with the expected and returned value.
