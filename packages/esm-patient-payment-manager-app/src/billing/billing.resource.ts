import useSWR from 'swr';
import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import type { Bill, BillableService, CashPoint, NewLineItem, PaymentMode } from './types';

const cashierBase = `${restBaseUrl}/cashier`;

const billableServiceRep =
  'custom:(uuid,name,shortName,serviceStatus,serviceType:(uuid,display),servicePrices:(uuid,name,price))';

const billRep =
  'custom:(uuid,display,status,receiptNumber,dateCreated,patient:(uuid,display),cashier:(uuid,display),' +
  'lineItems:(uuid,display,quantity,price,priceName,paymentStatus,item,billableService),' +
  'payments:(uuid,amount,amountTendered,instanceType:(uuid,name)))';

interface RestResults<T> {
  results: T[];
}

/**
 * All active billable services with their service prices.
 */
export function useBillableServices() {
  const url = `${cashierBase}/billableService?v=${encodeURIComponent(billableServiceRep)}`;
  const { data, error, isLoading, mutate } = useSWR<{ data: RestResults<BillableService> }>(url, openmrsFetch);
  const services = (data?.data?.results ?? []).filter(
    (s) => !s.serviceStatus || s.serviceStatus.toUpperCase() === 'ENABLED',
  );
  return { billableServices: services, error, isLoading, mutate };
}

/**
 * Available (non-retired) payment modes configured in the cashier module.
 */
export function usePaymentModes() {
  const url = `${cashierBase}/paymentMode?v=custom:(uuid,name,description,retired)`;
  const { data, error, isLoading } = useSWR<{ data: RestResults<PaymentMode> }>(url, openmrsFetch);
  const paymentModes = (data?.data?.results ?? []).filter((m) => !m.retired);
  return { paymentModes, error, isLoading };
}

/**
 * Cash points configured in the cashier module.
 */
export function useCashPoints() {
  const url = `${cashierBase}/cashPoint?v=custom:(uuid,name,retired)`;
  const { data, error, isLoading } = useSWR<{ data: RestResults<CashPoint> }>(url, openmrsFetch);
  const cashPoints = (data?.data?.results ?? []).filter((c) => !c.retired);
  return { cashPoints, error, isLoading };
}

/**
 * Resolve the provider record for a given user uuid (bills require a cashier=provider uuid).
 */
export function useProviderUuid(userUuid: string | undefined) {
  const url = userUuid ? `${restBaseUrl}/provider?user=${userUuid}&v=custom:(uuid,display)` : null;
  const { data, error, isLoading } = useSWR<{ data: RestResults<{ uuid: string; display: string }> }>(
    url,
    openmrsFetch,
  );
  return { providerUuid: data?.data?.results?.[0]?.uuid, error, isLoading };
}

/**
 * Bills filtered by status (defaults to PENDING) — used by the cashier queue.
 */
export function useBills(status: string = 'PENDING') {
  const url = `${cashierBase}/bill?status=${encodeURIComponent(status)}&v=${encodeURIComponent(billRep)}`;
  const { data, error, isLoading, mutate } = useSWR<{ data: RestResults<Bill> }>(url, openmrsFetch);
  return { bills: data?.data?.results ?? [], error, isLoading, mutate };
}

/**
 * Bills for a single patient.
 */
export function usePatientBills(patientUuid: string | undefined) {
  const url = patientUuid ? `${cashierBase}/bill?patientUuid=${patientUuid}&v=${encodeURIComponent(billRep)}` : null;
  const { data, error, isLoading, mutate } = useSWR<{ data: RestResults<Bill> }>(url, openmrsFetch);
  return { bills: data?.data?.results ?? [], error, isLoading, mutate };
}

interface CreateBillArgs {
  patientUuid: string;
  cashPointUuid: string;
  cashierUuid: string;
  lineItems: NewLineItem[];
  status?: 'PENDING' | 'PAID';
}

/**
 * Create a new (PENDING by default) bill with one or more line items.
 */
export async function createBill({
  patientUuid,
  cashPointUuid,
  cashierUuid,
  lineItems,
  status = 'PENDING',
}: CreateBillArgs) {
  const payload = {
    cashPoint: cashPointUuid,
    cashier: cashierUuid,
    patient: patientUuid,
    status,
    lineItems: lineItems.map((li, index) => ({
      billableService: li.billableServiceUuid,
      quantity: li.quantity ?? 1,
      price: li.price,
      priceName: li.priceName ?? 'Default',
      priceUuid: li.priceUuid,
      lineItemOrder: index,
      paymentStatus: status,
    })),
    payments: [],
  };

  return openmrsFetch<Bill>(`${cashierBase}/bill`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
  });
}

interface ProcessPaymentArgs {
  bill: Bill;
  paymentModeUuid: string;
  amountTendered: number;
}

/**
 * Record a payment against an existing bill and mark its line items + bill PAID.
 */
export async function processPayment({ bill, paymentModeUuid, amountTendered }: ProcessPaymentArgs) {
  const total = bill.lineItems.reduce((sum, li) => sum + li.price * (li.quantity ?? 1), 0);
  const payload = {
    cashPoint: typeof bill.cashPoint === 'string' ? bill.cashPoint : bill.cashPoint?.uuid,
    cashier: typeof bill.cashier === 'string' ? bill.cashier : bill.cashier?.uuid,
    patient: typeof bill.patient === 'string' ? bill.patient : bill.patient?.uuid,
    status: 'PAID',
    lineItems: bill.lineItems.map((li) => ({
      uuid: li.uuid,
      billableService: typeof li.billableService === 'string' ? li.billableService : li.billableService?.uuid,
      item: li.item,
      quantity: li.quantity ?? 1,
      price: li.price,
      priceName: li.priceName ?? 'Default',
      priceUuid: li.priceUuid,
      paymentStatus: 'PAID',
    })),
    payments: [
      ...(bill.payments ?? []),
      {
        instanceType: paymentModeUuid,
        amount: total,
        amountTendered,
      },
    ],
  };

  return openmrsFetch<Bill>(`${cashierBase}/bill/${bill.uuid}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
  });
}
