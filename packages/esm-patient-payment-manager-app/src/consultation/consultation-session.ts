/**
 * Tracks, per cashier user, that a consultation fee has been collected for the
 * patient they are *about* to register. Because payment happens before the
 * patient record exists, we hold an unconsumed "consultation paid" token in
 * localStorage. The registration page is gated on the presence of this token,
 * and the post-registration step consumes it (creating the patient's bill).
 */

const STORAGE_KEY = 'clinicemr.consultationPayment';
const TOKEN_TTL_MS = 1000 * 60 * 60; // 1 hour

export interface ConsultationToken {
  serviceUuid: string;
  serviceName: string;
  price: number;
  priceUuid?: string;
  priceName?: string;
  paymentModeUuid: string;
  amountTendered: number;
  createdAt: number;
}

interface StoreShape {
  [userUuid: string]: ConsultationToken;
}

function read(): StoreShape {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function write(store: StoreShape): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* ignore quota errors */
  }
}

export function setConsultationToken(userUuid: string, token: ConsultationToken): void {
  if (!userUuid) return;
  const store = read();
  store[userUuid] = token;
  write(store);
}

export function getConsultationToken(userUuid: string | undefined): ConsultationToken | null {
  if (!userUuid) return null;
  const token = read()[userUuid];
  if (!token) return null;
  if (Date.now() - token.createdAt > TOKEN_TTL_MS) {
    clearConsultationToken(userUuid);
    return null;
  }
  return token;
}

export function hasValidConsultationToken(userUuid: string | undefined): boolean {
  return getConsultationToken(userUuid) != null;
}

export function clearConsultationToken(userUuid: string | undefined): void {
  if (!userUuid) return;
  const store = read();
  delete store[userUuid];
  write(store);
}
