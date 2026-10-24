import test from 'node:test';
import assert from 'node:assert/strict';
import { cashWarning, creditCheck, chasePlan, bankMatch } from '../src/rules.js';
import { bankLines, invoices } from '../src/fixtures.js';
import { createDemo } from '../src/state.js';
import { createServer } from '../src/server.js';
import { once } from 'node:events';

test('R6 shows the RM2,000 payroll gap 11 days ahead', () => {
  assert.deepEqual(cashWarning(4300, 2100, 8400, '2026-10-20', '2026-10-31'),
    { rule:'R6', cash:4300, receipts:2100, obligation:8400, shortfall:2000, daysAhead:11, warning:true });
});

test('R4 holds only a late payer and calculates exposure', () => {
  const late = creditCheck('Hock Lee Catering', 2850, invoices);
  assert.equal(late.hold, true);
  assert.equal(late.totalExposure, 7600);
  assert.equal(creditCheck('Kafe Dua Beradik', 2850, invoices).hold, false);
});

test('chase plan suppresses active promises and ranks gap contribution', () => {
  const plan = chasePlan(invoices, 2000);
  assert.deepEqual(plan.map(x=>x.id), ['INV-0412','INV-0420']);
  assert.equal(plan[0].contribution, 2000);
});

test('only an exact synthetic bank credit is eligible', () => {
  assert.equal(bankMatch(invoices[0], bankLines[0]), true);
  assert.equal(bankMatch(invoices[0], { ...bankLines[0], amount: 3000 }), false);
  assert.equal(bankMatch(invoices[0], { ...bankLines[0], direction: 'DEBIT' }), false);
  assert.equal(bankMatch(invoices[0], { ...bankLines[0], payer: 'Another Business' }), false);
  assert.equal(bankMatch(invoices[0], { ...bankLines[0], date: '2026-10-27' }), false);
  assert.equal(bankMatch(invoices[0], { ...bankLines[0], reference: 'INV0398' }), false);
  assert.equal(bankMatch(invoices[0], { ...bankLines[0], reference: 'INV04120' }), false);
  assert.equal(bankMatch(invoices[0], { ...bankLines[0], payer: '' }), false);
  assert.equal(bankMatch({ ...invoices[0], claimedPaymentDate: null }, bankLines[0]), false);
});

test('owner decision is logged once, clerk view excludes cash and credit', () => {
  const demo = createDemo();
  const clerk = demo.view('clerk');
  assert.equal('warning' in clerk, false);
  assert.equal('credit' in clerk, false);
  assert.equal('contribution' in clerk.chase[0], false);
  assert.throws(()=>demo.decideCredit('clerk','deposit'), /Owner/);
  assert.equal(demo.decideCredit('owner','deposit').deposit, 1425);
  assert.throws(()=>demo.decideCredit('owner','deposit'), /already/);
  assert.equal(demo.view('owner').audit.length, 1);
  assert.equal(demo.view('clerk').audit.length, 0);
});

test('payment claim stays overdue until match and human approval', () => {
  const demo = createDemo();
  assert.equal(demo.view('clerk').invoices[0].status, 'OVERDUE');
  assert.throws(()=>demo.verifyPayment('clerk','INV-0398','BANK-01'), /matching/);
  assert.equal(demo.view('clerk').invoices[0].status, 'OVERDUE');
  assert.equal(demo.verifyPayment('clerk','INV-0412','BANK-01').status, 'PAID');
  assert.throws(()=>demo.verifyPayment('clerk','INV-0412','BANK-01'), /already/);
  assert.equal(demo.view('owner').audit[0].action, 'PAYMENT_APPROVED');
  assert.equal(demo.view('owner').warning.shortfall, 0);
  assert.equal(demo.view('owner').warning.cash, 7480);
  assert.ok(!demo.view('clerk').chase.some(x=>x.id==='INV-0412'));
});

test('HTTP clerk response excludes owner fields and clerk credit decision is rejected', async () => {
  const server = createServer().listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const clerk = await (await fetch(`${base}/api/view?role=clerk`)).json();
    assert.equal('warning' in clerk, false);
    assert.equal('credit' in clerk, false);
    assert.equal('contribution' in clerk.chase[0], false);
    const denied = await fetch(`${base}/api/credit`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ role: 'clerk', choice: 'deposit' }) });
    assert.equal(denied.status, 400);
    assert.match((await denied.json()).error, /Owner/);
    const owner = await (await fetch(`${base}/api/view?role=owner`)).json();
    assert.equal(owner.warning.shortfall, 2000);
    assert.equal(owner.bankEvidence[0].eligible, true);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
