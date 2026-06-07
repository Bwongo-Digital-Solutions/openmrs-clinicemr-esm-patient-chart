/**
 * Local persistent record of patients each cashier has registered, so the
 * "My Registered Patients" list can show them. The cashier module REST
 * endpoint cannot list "encounters of type X created by user Y" server-side,
 * so we keep a per-user list of patient UUIDs in localStorage.
 */

const STORAGE_KEY = 'clinicemr.paymentManager.registeredPatients';
const MAX_ENTRIES_PER_USER = 200;

export interface RegisteredPatientEntry {
  patientUuid: string;
  registeredAt: string; // ISO timestamp
}

interface StoreShape {
  [userUuid: string]: RegisteredPatientEntry[];
}

function readStore(): StoreShape {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(store: StoreShape): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* ignore quota errors */
  }
}

export function addRegisteredPatient(userUuid: string, patientUuid: string): void {
  if (!userUuid || !patientUuid) return;
  const store = readStore();
  const existing = store[userUuid] ?? [];
  const filtered = existing.filter((e) => e.patientUuid !== patientUuid);
  filtered.unshift({ patientUuid, registeredAt: new Date().toISOString() });
  store[userUuid] = filtered.slice(0, MAX_ENTRIES_PER_USER);
  writeStore(store);
}

export function getRegisteredPatients(userUuid: string): RegisteredPatientEntry[] {
  if (!userUuid) return [];
  const store = readStore();
  return store[userUuid] ?? [];
}
