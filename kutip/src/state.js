import { bankLines, demoDate, expectedReceipts, invoices, newOrder, openingCash, payroll } from './fixtures.js';
import { bankMatch, cashWarning, chasePlan, creditCheck } from './rules.js';

export function createDemo() {
  const state = { invoices: structuredClone(invoices), creditDecision: null, audit: [], usedBankLines: new Set() };
  const log = (actor, action, detail) => state.audit.push({ at: new Date().toISOString(), actor, action, detail });
  function view(role) {
    if (!['owner', 'clerk'].includes(role)) throw new Error('Choose a demo role');
    const verifiedCredits = bankLines.filter(x => state.usedBankLines.has(x.id)).reduce((sum, x) => sum + x.amount, 0);
    const warning = cashWarning(openingCash + verifiedCredits, expectedReceipts, payroll.amount, demoDate, payroll.due);
    const common = { role, demoDate, invoices: state.invoices, chase: chasePlan(state.invoices, warning.shortfall), audit: role === 'clerk' ? state.audit.filter(x => x.action === 'PAYMENT_APPROVED') : state.audit, bankEvidence: bankLines.map(x => ({ ...x, used: state.usedBankLines.has(x.id), eligible: !state.usedBankLines.has(x.id) && bankMatch(state.invoices[0], x) })) };
    if (role === 'clerk') return { ...common, chase: common.chase.map(({ contribution, ...invoice }) => invoice) };
    return { ...common, warning, credit: creditCheck(newOrder.customer, newOrder.amount, state.invoices), order: newOrder, creditDecision: state.creditDecision };
  }
  function decideCredit(role, choice) {
    if (role !== 'owner') throw new Error('Owner approval required');
    if (state.creditDecision) throw new Error('Credit decision already recorded');
    if (!['accept', 'deposit', 'cod', 'call'].includes(choice)) throw new Error('Invalid credit choice');
    const deposit = choice === 'deposit' ? newOrder.amount / 2 : 0;
    state.creditDecision = { choice, deposit, actor: role };
    log(role, 'CREDIT_DECISION', `${choice.toUpperCase()} for ${newOrder.customer}; deposit RM${deposit.toFixed(2)}`);
    return state.creditDecision;
  }
  function verifyPayment(role, invoiceId, bankLineId) {
    if (!['owner', 'clerk'].includes(role)) throw new Error('Human approval required');
    const invoice = state.invoices.find(x => x.id === invoiceId);
    if (!invoice) throw new Error('Unknown invoice');
    if (invoice.status === 'PAID') throw new Error('Invoice already paid');
    const line = bankLines.find(x => x.id === bankLineId);
    if (!bankMatch(invoice, line) || state.usedBankLines.has(bankLineId)) throw new Error('No eligible matching bank credit');
    invoice.status = 'PAID';
    state.usedBankLines.add(bankLineId);
    log(role, 'PAYMENT_APPROVED', `${invoiceId} matched to ${bankLineId}; reminders stopped`);
    return invoice;
  }
  return { view, decideCredit, verifyPayment };
}
