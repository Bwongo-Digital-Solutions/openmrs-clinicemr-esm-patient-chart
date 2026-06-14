/**
 * Local (localStorage-backed) bill store. The billing/cashier backend OMOD is
 * NOT installed on the server, so bills and payments are persisted locally and
 * shared across tabs/windows via the storage event. This lets the whole
 * payment workflow (consultation gate, order payment requests, pending queue,
 * receive payment) function without a backend.
 */

import { useCallback, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'clinicemr.paymentManager.bills';
const MAX_BILLS = 500;

export type LocalBillStatus = 'PENDING' | 'PAID';

export interface LocalLineItem {
  name: string;
  price: number;
  quantity: number;
}

export type ClientType = 'PRIVATE' | 'CORPORATE';

export interface LocalBill {
  uuid: string;
  /** Human-readable receipt/invoice number, assigned when the bill is paid. */
  receiptNumber?: string;
  patientUuid: string;
  patientName: string;
  /** User uuid of the cashier/clerk who created the bill. */
  cashierUuid: string;
  cashierName?: string;
  /** User uuid of the clinician who requested the order (to notify on payment). */
  requestedByUuid?: string;
  requestedByName?: string;
  status: LocalBillStatus;
  lineItems: LocalLineItem[];
  paymentMethod?: string;
  /** Private (self-paying) or Corporate (insurance). */
  clientType?: ClientType;
  /** Insurance provider name when clientType is CORPORATE. */
  insuranceProvider?: string;
  amountTendered?: number;
  amountPaid?: number;
  createdAt: number;
  paidAt?: number;
}

type Listener = () => void;

const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((l) => l());
}

function readBills(): LocalBill[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeBills(bills: LocalBill[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(bills.slice(0, MAX_BILLS)));
  } catch {
    /* ignore quota errors */
  }
  emit();
}

function generateUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `bill-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Generates a human-readable receipt/invoice number, e.g. RCPT-20260614-4821. */
export function generateReceiptNumber(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const seq = Math.floor(Math.random() * 9000 + 1000);
  return `RCPT-${y}${m}${d}-${seq}`;
}

export function billTotal(bill: Pick<LocalBill, 'lineItems'>): number {
  return bill.lineItems.reduce((sum, li) => sum + (li.price ?? 0) * (li.quantity ?? 1), 0);
}

export interface CreateLocalBillArgs {
  patientUuid: string;
  patientName?: string;
  cashierUuid: string;
  cashierName?: string;
  requestedByUuid?: string;
  requestedByName?: string;
  lineItems: LocalLineItem[];
  status?: LocalBillStatus;
  paymentMethod?: string;
  clientType?: ClientType;
  insuranceProvider?: string;
  amountTendered?: number;
}

export function createLocalBill(args: CreateLocalBillArgs): LocalBill {
  const bills = readBills();
  const status = args.status ?? 'PENDING';
  const bill: LocalBill = {
    uuid: generateUuid(),
    receiptNumber: status === 'PAID' ? generateReceiptNumber() : undefined,
    patientUuid: args.patientUuid,
    patientName: args.patientName ?? '',
    cashierUuid: args.cashierUuid,
    cashierName: args.cashierName,
    requestedByUuid: args.requestedByUuid,
    requestedByName: args.requestedByName,
    status,
    lineItems: args.lineItems,
    paymentMethod: args.paymentMethod,
    clientType: args.clientType,
    insuranceProvider: args.insuranceProvider,
    amountTendered: args.amountTendered,
    amountPaid: status === 'PAID' ? billTotal({ lineItems: args.lineItems }) : 0,
    createdAt: Date.now(),
    paidAt: status === 'PAID' ? Date.now() : undefined,
  };
  bills.unshift(bill);
  writeBills(bills);
  return bill;
}

export interface PayLocalBillArgs {
  paymentMethod: string;
  amountTendered: number;
  clientType?: ClientType;
  insuranceProvider?: string;
}

/** Marks a bill PAID and returns the updated bill (or null if not found). */
export function payLocalBill(
  billUuid: string,
  { paymentMethod, amountTendered, clientType, insuranceProvider }: PayLocalBillArgs,
): LocalBill | null {
  const bills = readBills();
  const idx = bills.findIndex((b) => b.uuid === billUuid);
  if (idx === -1) return null;
  const updated: LocalBill = {
    ...bills[idx],
    status: 'PAID',
    receiptNumber: bills[idx].receiptNumber ?? generateReceiptNumber(),
    paymentMethod,
    clientType: clientType ?? bills[idx].clientType,
    insuranceProvider: insuranceProvider ?? bills[idx].insuranceProvider,
    amountTendered,
    amountPaid: billTotal(bills[idx]),
    paidAt: Date.now(),
  };
  bills[idx] = updated;
  writeBills(bills);
  return updated;
}

export function getBills(): LocalBill[] {
  return readBills();
}

export function getBillsByStatus(status: LocalBillStatus): LocalBill[] {
  return readBills().filter((b) => b.status === status);
}

export function getBillsForPatient(patientUuid: string): LocalBill[] {
  return readBills().filter((b) => b.patientUuid === patientUuid);
}

/** Total amount already paid for a patient across all their bills. */
export function getAmountPaidForPatient(patientUuid: string): number {
  return getBillsForPatient(patientUuid)
    .filter((b) => b.status === 'PAID')
    .reduce((sum, b) => sum + (b.amountPaid ?? billTotal(b)), 0);
}

export function clearAllBills(): void {
  writeBills([]);
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

/** Reactive hook returning bills filtered by status (defaults to all). */
export function useLocalBills(status?: LocalBillStatus) {
  const getSnapshot = useCallback(() => {
    const json = window.localStorage.getItem(STORAGE_KEY) ?? '[]';
    return json;
  }, []);
  const json = useSyncExternalStore(subscribe, getSnapshot, () => '[]');
  let bills: LocalBill[] = [];
  try {
    const parsed = JSON.parse(json);
    bills = Array.isArray(parsed) ? parsed : [];
  } catch {
    bills = [];
  }
  if (status) {
    bills = bills.filter((b) => b.status === status);
  }
  return { bills, mutate: emit };
}
