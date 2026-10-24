# Submission pack: Kutip (XMUM Hackathon, Domain 2, preliminary round)

Deadline as last seen on sdchack.my: **25 Oct 2026, 07:59 AM MYT**. Confirm it in the portal (see "Unconfirmed" below).

## Checklist

| # | Item | Source in this repo | Status | Link |
|---|---|---|---|---|
| 1 | Proposal (about 2 pages; problem → approach → expected outcome) | [`proposal.md`](proposal.md) | Drafted. Fit to the real length limit and export to the required format (PDF?) | `TODO: proposal link or upload confirmation` |
| 2 | Demo video (3 minutes, plus an optional 30-second cut) | Script: [`demo-video-script.md`](demo-video-script.md) | Script ready. Not recorded | `TODO: video link` |
| 3 | Slides | Outline and speaker notes: [`pitch-deck.md`](pitch-deck.md) | Outline ready. Slides not built | `TODO: slides link` |
| 4 | GitHub repository (public, matches the demo) | This repo | Public. The deployed demo is built from `main` | https://github.com/YapHongSanHansen/Xmum |
| 5 | Live demo link | `web/` (Next.js app) | Deployed on Vercel from `main`; the 8-step Demo guide passes end to end on it (Owner and Clerk). Replit still to confirm if the judges require it | https://kutip-virid.vercel.app |
| — | Judge Q&A prep (internal, not submitted) | [`judge-qa.md`](judge-qa.md) | Ready | — |

### Before pressing submit

- [ ] Live demo opens in a private browser window, and the 8-step Demo guide runs once end to end.
- [ ] As Clerk, no bank balance, salary or gap amount is visible anywhere.
- [ ] The Inbox AI badge says what is true ("Live · …" or "Cached result"). The proposal, deck and video say the same thing. If the live AI has now been run, update the status line in `proposal.md`, slide 6 and slide 11 of `pitch-deck.md`, and question 4 of `judge-qa.md`.
- [ ] The repo's README declares every tool and AI used (handbook 8.4).
- [ ] No API keys or `.env` files in the repo.
- [ ] Every link in the table above is filled in and opens without a login.

## Honesty lines that must stay true

- Real-user interviews have **not** been done. The proposal says so and gives the validation plan.
- The live AI call is built but has **not** yet been run against the API. The demo runs on hand-written cached readings for the three seeded messages, labelled "Cached result" in the UI.
- Every statistic comes from `docs/research/` with its source. Benefit figures are targets or estimates with stated assumptions.
- All data is synthetic. Lori Laju Logistics and every customer, bank and message are fictional.

## Unconfirmed: check in the team portal or on Discord

| # | Question | Why it matters |
|---|---|---|
| 1 | The exact submission time (07:59 AM MYT on 25 Oct 2026?) and whether late uploads are accepted | Nobody on the team has seen it in the portal yet |
| 2 | Which items are required (proposal, video, slides, repo link, live link), and each one's **format and length limit** (pages or words for the proposal, minutes for the video, slide count, file type) | The rubric scores "follows the submission format and length limits" under Clarity (20%) |
| 3 | What "must use Replit" means: built on Replit, hosted on Replit, or using Replit's AI | Decides where the live demo link must point. The repo has a `.replit` file, untested on Replit |
| 4 | Whether Replit offers credits for the hackathon | Replit's managed Anthropic integration needs a paid plan |
| 5 | The sponsor's name: Alpha Red **Solutions** Sdn Bhd (Domain 2 brief) or Alpha Red **Pro** Sdn Bhd (Orbyte website footer) | Use the right name on the title slide and in the proposal. The submission docs avoid naming it until confirmed |
| 6 | Whether the video must be uploaded as a file or given as a link (YouTube, Google Drive) | Affects how the video link above is filled in |
