# Kutip local demo

Requires Node.js 20 or newer. From this directory:

```powershell
node --test tests/*.test.js
node src/server.js
```

Open `http://127.0.0.1:4173` in a browser. The synthetic cash scan is fixed to 20 October 2026, so the warning stays 11 days before 31 October payroll regardless of the current date. The payment review represents a later event on 23 October.

1. See the RM2,000 payroll gap: RM4,300 cash + RM2,100 expected receipts − RM8,400 payroll.
2. Review Hock Lee Catering's RM2,850 credit order and RM4,750 overdue invoice. As Owner, choose **Ask 50% deposit** to record RM1,425.
3. Inspect the simplified chase priority list. It uses invoice value toward the cash gap and suppresses active promises. Payment probability, reminder tiers and recently expired promises remain planned.
4. Switch to Clerk. The cash and credit panels disappear. Approve the matching synthetic bank credit for INV-0412; the invoice becomes paid and drops from the chase plan. Switch back to Owner to see the verified RM3,180 credit close the payroll gap without counting it twice.
5. Inspect the timestamped activity record. **Reset demo** returns to the initial scenario.

This is an in-memory, single-user concept demo. Role selection simulates authorization; it is **not secure login**. The server omits owner-only cash, credit and audit details from clerk view responses, but a person can switch roles. Bank lines are synthetic and matching requires exact amount, payer, invoice reference and a date within three days of the payment claim. No AI model, accounting feed, WhatsApp messaging, real payments, or Orbyte API connection is active. Do not use real financial or customer data.
