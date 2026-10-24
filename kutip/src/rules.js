export function cashWarning(cash, receipts, obligation, today, due) {
  const shortfall = Math.max(0, obligation - cash - receipts);
  const daysAhead = Math.round((Date.parse(`${due}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000);
  return { rule: 'R6', cash, receipts, obligation, shortfall, daysAhead, warning: shortfall > 0 && daysAhead >= 0 && daysAhead <= 14 };
}

export function creditCheck(customer, orderAmount, invoiceList) {
  const late = invoiceList.filter(x => x.customer === customer && x.status !== 'PAID' && x.daysLate >= 30);
  const overdueAmount = late.reduce((sum, x) => sum + x.amount, 0);
  return { rule: 'R4', hold: late.length > 0, lateInvoices: late, orderAmount, overdueAmount, totalExposure: overdueAmount + orderAmount };
}

export function chasePlan(invoiceList, shortfall) {
  return invoiceList.filter(x => x.status === 'OVERDUE' && !x.disputed && !x.promise && !x.recentlyContacted)
    .map(x => ({ ...x, contribution: Math.min(x.amount, shortfall), rule: 'R1–R3' }))
    .sort((a, b) => b.contribution - a.contribution || b.daysLate - a.daysLate);
}

export function bankMatch(invoice, line) {
  if (!line || line.direction !== 'CREDIT' || line.amount !== invoice.amount) return false;
  const normalize = value => String(value || '').toUpperCase().replaceAll(/[^A-Z0-9]/g, '');
  if (!normalize(invoice.customer) || normalize(invoice.customer) !== normalize(line.payer)) return false;
  const reference = normalize(invoice.id);
  const referenceTokens = String(line.reference || '').toUpperCase().split(/[^A-Z0-9]+/).filter(Boolean);
  if (!reference || !referenceTokens.includes(reference)) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(invoice.claimedPaymentDate || '') || !/^\d{4}-\d{2}-\d{2}$/.test(line.date || '')) return false;
  const claimed = Date.parse(`${invoice.claimedPaymentDate}T00:00:00Z`);
  const paid = Date.parse(`${line.date}T00:00:00Z`);
  return Number.isFinite(claimed) && Number.isFinite(paid) && Math.abs(paid - claimed) <= 3 * 86400000;
}
