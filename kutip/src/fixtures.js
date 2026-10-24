export const demoDate = '2026-10-20';
export const openingCash = 4300;
export const expectedReceipts = 2100;
export const payroll = { amount: 8400, due: '2026-10-31' };
export const invoices = [
  { id: 'INV-0412', customer: 'Kafe Dua Beradik', amount: 3180, daysLate: 12, language: 'BM', status: 'OVERDUE', claimedPaymentDate: '2026-10-23' },
  { id: 'INV-0398', customer: 'Hock Lee Catering', amount: 4750, daysLate: 42, language: 'English', status: 'OVERDUE', promise: '2026-10-30' },
  { id: 'INV-0420', customer: 'Restoran Selera', amount: 860, daysLate: 8, language: 'BM', status: 'OVERDUE' },
  { id: 'INV-0405', customer: 'Tadika Bintang', amount: 1240, daysLate: 21, language: 'Chinese', status: 'OVERDUE', promise: '2026-10-30' }
];
export const newOrder = { customer: 'Hock Lee Catering', amount: 2850, terms: '60-day credit', item: '300 food boxes' };
export const bankLines = [
  { id: 'BANK-01', date: '2026-10-23', amount: 3180, payer: 'Kafe Dua Beradik', reference: 'KAFE DUA BERADIK INV0412', direction: 'CREDIT' }
];
