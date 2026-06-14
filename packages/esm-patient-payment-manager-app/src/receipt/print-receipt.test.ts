import { buildReceiptHtml } from './print-receipt';
import type { LocalBill } from '../billing/local-bill-store';

const baseBill: LocalBill = {
  uuid: 'bill-1',
  receiptNumber: 'RCPT-20260614-1234',
  patientUuid: 'patient-1',
  patientName: 'Jane Doe',
  cashierUuid: 'cashier-1',
  cashierName: 'Cash Ier',
  status: 'PAID',
  lineItems: [
    { name: 'Consultation', price: 10000, quantity: 1 },
    { name: 'Lab test', price: 5000, quantity: 2 },
  ],
  paymentMethod: 'Cash',
  clientType: 'PRIVATE',
  amountTendered: 25000,
  amountPaid: 20000,
  createdAt: Date.now(),
  paidAt: Date.now(),
};

describe('buildReceiptHtml', () => {
  it('renders a receipt with totals, tendered and change', () => {
    const html = buildReceiptHtml({ bill: baseBill, facility: { name: 'Kireka AHC' }, currency: 'UGX' });
    expect(html).toContain('PAYMENT RECEIPT');
    expect(html).toContain('Kireka AHC');
    expect(html).toContain('RCPT-20260614-1234');
    expect(html).toContain('Jane Doe');
    expect(html).toContain('Consultation');
    // Total = 10000 + 5000*2 = 20000
    expect(html).toContain('UGX 20,000');
    // Change = 25000 - 20000 = 5000
    expect(html).toContain('UGX 5,000');
  });

  it('renders an invoice without tendered/change and with the invoice notice', () => {
    const html = buildReceiptHtml({
      bill: { ...baseBill, status: 'PENDING' },
      facility: { name: 'Kireka AHC' },
      currency: 'UGX',
      documentType: 'INVOICE',
    });
    expect(html).toContain('INVOICE');
    expect(html).toContain('Please pay at the cashier');
    expect(html).not.toContain('Change');
  });

  it('shows the insurance payer for corporate clients', () => {
    const html = buildReceiptHtml({
      bill: { ...baseBill, clientType: 'CORPORATE', insuranceProvider: 'Jubilee Insurance' },
      facility: { name: 'Kireka AHC' },
      currency: 'UGX',
    });
    expect(html).toContain('Jubilee Insurance (Insurance)');
  });

  it('escapes HTML in user-provided values', () => {
    const html = buildReceiptHtml({
      bill: { ...baseBill, patientName: '<script>alert(1)</script>' },
      facility: { name: 'Kireka AHC' },
      currency: 'UGX',
    });
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
