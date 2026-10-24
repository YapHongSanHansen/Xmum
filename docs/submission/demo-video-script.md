# Demo video script

Two cuts: a 3-minute walkthrough and a 30-second teaser. Both follow the in-app **Demo guide** (sidebar → Demo guide), which has the same 8 steps and ticks each one off from the demo state. Every number below comes from the seed and is pinned by the engine's demo-script test. If the screen shows a different number, stop and fix the build before recording.

All names, numbers, banks and messages are fictional.

## Before you record

1. Open the deployed app (or `pnpm build && pnpm exec next start` in `web/`). Use a 1440 × 900 or larger window, browser zoom at 100%.
2. Press **Reset demo** in the header (it asks for a second click; there are no pop-up dialogs). The clock must read **Tue 20 Oct 2026, 08:00**.
3. Start as **Lim Siew Lan · Owner** (role switcher, top right). Dismiss the welcome card on Today, then open **Demo guide**.
4. Check the AI badge in the Inbox. It reads either **"Live · <model>"** or **"Cached result · <reason>"**. Say what it actually shows. Do not call a cached reading "live". At the time of writing, the live call has not been run against the API, so expect "Cached result".
5. Narrate slowly. About 430 words fit in 3 minutes.

**Role switches.** Owner for step 1 → Clerk for step 2 → Owner for step 3 → Clerk for step 4 and the first half of step 5 → Owner to decide the credit check and to watch the meter in step 6 → Clerk to approve the receipt → Owner to accept the deduction → Clerk for step 7 → Owner for step 8. The guide's "Act as Owner / Act as Clerk" buttons do the switch.

**The point to show on camera:** the Clerk never sees cash or gap figures. In Clerk view the gap shows only as yes/no, and the bank balance, salary total and gap amounts are hidden everywhere.

---

## 3-minute cut

| Time | Role | On screen | Say |
|---|---|---|---|
| 0:00-0:12 | — | Today page, Orbyte frame. Point at "Simulated hub · synthetic data" | "Small firms that sell on credit get paid in 60 or 90 days, but salaries are due every 31st. This is Kachingg, a module inside the Orbyte hub. The haulage firm and all its data are fictional." |
| 0:12-0:35 | Owner | **Step 1.** Press **Run 08:00 scan**. Early-warning card appears. Tick "ask the diesel supplier to move the 5 Nov bill" | "Tuesday, 20 October, 8am. The scan compares cash plus expected payments with the bills ahead. 31 October salaries: short RM2,000. 5 November diesel: short RM13,200. That's an early warning, 11 days ahead. Kachingg lists the owner's own options. It never recommends a lender." |
| 0:35-0:58 | Clerk | **Step 2.** Act as Clerk. Chase plan. Point at rule IDs, then at "gap: yes" with no amounts. Approve Tier 1 for INV-2304 and INV-2310 | "Now I'm Nurul, the clerk. The chase plan is ranked: one, Mega Bina INV-2304, which closes the gap; two, Kilang INV-2310; three, Hup Seng INV-2268, a firm Tier 2. Pelita is skipped: they promised 30 October. Every row shows its rule. Notice the clerk sees no cash figures, only whether there's a gap. I approve the two gentle reminders." |
| 0:58-1:15 | Owner | **Step 3.** Act as Owner. Open Hup Seng's card. Point at the gap impact, then approve & send (wa.me or simulated) | "Firm reminders need the owner. Hup Seng's card shows the impact: if they pay by 30 October, 31 October is covered, plus RM4,850, and 5 November drops from RM13,200 short to RM6,350. The message is a fixed Chinese template. A person presses send." |
| 1:15-1:35 | Clerk | **Step 4.** Act as Clerk. **Advance to 20 Oct 11:05**. Inbox (Bukti): Hup Seng's reply. Point at the quoted words, then the hand-off. Pick 30 Oct | "11:05. Hup Seng replies: '下礼拜五才过数', pay next Friday. Bukti shows the exact words. But which Friday? It won't guess. It hands off: 'Which Friday?' I pick 30 October, and Hup Seng's reminders pause." |
| 1:35-1:58 | Clerk → Owner | **Step 5.** **Advance to 21 Oct 10:20**. Bookings: enter Hup Seng, Klang → Johor Bahru, RM2,400, 60-day credit. It goes on hold. Act as Owner. Choose "Ask 50% deposit" | "Next day, Hup Seng books another lorry, RM2,400 on credit. Kachingg holds it for the owner. The credit check: RM6,850 already owed, 46 days late, total RM9,250 if accepted. The owner asks for a 50% deposit." |
| 1:58-2:15 | Owner | **Step 6a.** **Advance to 23 Oct 14:30**. Today: point at the second early warning (5 Nov diesel, raised 22 Oct). Inbox: Mega Bina message and slip. Point at the AI badge, the quotes and confidences | "Friday. The 22 October scan raised a second warning, for 5 November diesel. Now Mega Bina writes: paid RM2,770, minus RM330 for broken tiles. Bukti reads the message and slip, with the exact words for each field. [Say "live" or "cached" to match the badge.]" |
| 2:15-2:40 | Owner → Clerk → Owner | **Step 6b.** Point at the bank check (M1 matched) and DO-8812 (M3). Show the 31 Oct meter still red. Act as Clerk: approve the RM2,770 receipt. Act as Owner: meter green "+RM770". Accept the RM330 deduction | "The rules check the bank: a matching line, so the claim is verified. The deduction links to delivery DO-8812. The meter stays red until a person approves. The clerk approves the receipt. Now 31 October is covered, plus RM770. Only the owner can accept the deduction: INV-2304 is paid, and credit note CN-0057 is drafted." |
| 2:40-2:52 | Clerk | **Step 7.** Act as Clerk. **Advance to 15:00**. Kilang: "Dah settle la semalam". Send the BM reply | "Kilang says 'Dah settle la semalam', already paid. No slip, no bank line, so it is not marked paid. Kachingg drafts a polite Malay reply asking for the slip, and the clerk sends it." |
| 2:52-3:00 | Owner | **Step 8.** Act as Owner. Activity log. Scroll once | "Every step is in the activity log: who, when and which rule. Kachingg: never be surprised on payroll day." |

---

## 30-second cut

| Time | On screen | Say |
|---|---|---|
| 0:00-0:05 | Today, Orbyte frame | "Small firms get paid in 60 days. Salaries are due every 31st." |
| 0:05-0:12 | Owner: early-warning card after the 20 Oct 08:00 scan | "Kachingg warns 11 days ahead: 31 October salaries short RM2,000." |
| 0:12-0:18 | Owner: credit check card (21 Oct 10:20) | "A late payer orders again. RM9,250 would be owed. The owner asks for a 50% deposit." |
| 0:18-0:25 | Inbox: Mega Bina, bank line matched; Clerk approves; Owner view shows "covered +RM770" | "AI reads 'paid RM2,770'. The bank confirms it. Only after the clerk approves does 31 October turn green." |
| 0:25-0:30 | Kilang hand-off, then the activity log | "'Dah settle la semalam'? No bank line, so not marked paid. Every step logged. Kachingg, for Orbyte." |

## After recording

- Watch it once with the sound off: every number in the table above should be readable on screen.
- Check the length limit in the submission portal before exporting (not yet confirmed; see `README.md`).
- Put the video link in `docs/submission/README.md`.
