import {
  billTotal,
  clearAllBills,
  createLocalBill,
  getAmountPaidForPatient,
  getBillsByStatus,
  getBillsForPatient,
  payLocalBill,
} from './local-bill-store';

describe('local-bill-store', () => {
  beforeEach(() => {
    clearAllBills();
  });

  it('computes the total of a bill from its line items', () => {
    expect(
      billTotal({
        lineItems: [
          { name: 'Consultation', price: 10000, quantity: 1 },
          { name: 'Lab', price: 5000, quantity: 2 },
        ],
      }),
    ).toBe(20000);
  });

  it('creates a PENDING bill by default with zero amount paid', () => {
    const bill = createLocalBill({
      patientUuid: 'patient-1',
      patientName: 'Jane Doe',
      cashierUuid: 'cashier-1',
      lineItems: [{ name: 'Consultation', price: 10000, quantity: 1 }],
    });
    expect(bill.status).toBe('PENDING');
    expect(bill.amountPaid).toBe(0);
    expect(bill.orderId).toMatch(/^ORD-\d{4}$/);
    expect(getBillsByStatus('PENDING')).toHaveLength(1);
    expect(getBillsByStatus('PAID')).toHaveLength(0);
  });

  it('creates a PAID bill and records amount paid as the bill total', () => {
    const bill = createLocalBill({
      patientUuid: 'patient-1',
      cashierUuid: 'cashier-1',
      lineItems: [{ name: 'Consultation', price: 10000, quantity: 1 }],
      status: 'PAID',
      paymentMethod: 'Cash',
      amountTendered: 10000,
    });
    expect(bill.status).toBe('PAID');
    expect(bill.amountPaid).toBe(10000);
    expect(bill.paidAt).toEqual(expect.any(Number));
  });

  it('marks a pending bill as paid and notifies via amountPaid', () => {
    const bill = createLocalBill({
      patientUuid: 'patient-1',
      cashierUuid: 'cashier-1',
      lineItems: [{ name: 'Lab', price: 15000, quantity: 1 }],
    });
    const updated = payLocalBill(bill.uuid, { paymentMethod: 'Mobile Money', amountTendered: 20000 });
    expect(updated?.status).toBe('PAID');
    expect(updated?.paymentMethod).toBe('Mobile Money');
    expect(updated?.amountPaid).toBe(15000);
    expect(getBillsByStatus('PENDING')).toHaveLength(0);
    expect(getBillsByStatus('PAID')).toHaveLength(1);
  });

  it('returns null when paying a non-existent bill', () => {
    expect(payLocalBill('does-not-exist', { paymentMethod: 'Cash', amountTendered: 0 })).toBeNull();
  });

  it('assigns a receipt number when a bill is created PAID', () => {
    const bill = createLocalBill({
      patientUuid: 'patient-1',
      cashierUuid: 'c',
      lineItems: [{ name: 'A', price: 1000, quantity: 1 }],
      status: 'PAID',
    });
    expect(bill.receiptNumber).toMatch(/^RCPT-\d{8}-\d{4}$/);
  });

  it('assigns a receipt number and stores client type/insurer when a pending bill is paid', () => {
    const bill = createLocalBill({
      patientUuid: 'patient-1',
      cashierUuid: 'c',
      lineItems: [{ name: 'A', price: 1000, quantity: 1 }],
    });
    expect(bill.receiptNumber).toBeUndefined();
    const updated = payLocalBill(bill.uuid, {
      paymentMethod: 'Jubilee Insurance (Insurance)',
      amountTendered: 1000,
      clientType: 'CORPORATE',
      insuranceProvider: 'Jubilee Insurance',
    });
    expect(updated?.receiptNumber).toMatch(/^RCPT-\d{8}-\d{4}$/);
    expect(updated?.clientType).toBe('CORPORATE');
    expect(updated?.insuranceProvider).toBe('Jubilee Insurance');
  });

  it('sums only PAID bills when computing amount paid for a patient', () => {
    createLocalBill({
      patientUuid: 'patient-1',
      cashierUuid: 'c',
      lineItems: [{ name: 'A', price: 10000, quantity: 1 }],
      status: 'PAID',
    });
    createLocalBill({
      patientUuid: 'patient-1',
      cashierUuid: 'c',
      lineItems: [{ name: 'B', price: 5000, quantity: 1 }],
      status: 'PENDING',
    });
    createLocalBill({
      patientUuid: 'patient-2',
      cashierUuid: 'c',
      lineItems: [{ name: 'C', price: 7000, quantity: 1 }],
      status: 'PAID',
    });
    expect(getAmountPaidForPatient('patient-1')).toBe(10000);
    expect(getAmountPaidForPatient('patient-2')).toBe(7000);
    expect(getBillsForPatient('patient-1')).toHaveLength(2);
  });
});
