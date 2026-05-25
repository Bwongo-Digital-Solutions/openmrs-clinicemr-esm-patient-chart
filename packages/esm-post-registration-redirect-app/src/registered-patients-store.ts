/**
 * Local persistent record of patients each user has registered.
 *
 * The OpenMRS REST encounter search endpoint requires a `patient` parameter,
 * so we cannot list "all encounters of type X created by user Y" server-side.
 * As a pragmatic MVP we keep a per-user list of registered patient UUIDs in
 * localStorage and fetch each patient by UUID when rendering the list.
 *
 * Limitations: list is per-browser and per-device. Clearing site data wipes
 * it. Switching browsers shows different lists. Acceptable for a single-clerk
 * registration kiosk.
 */

const STORAGE_KEY = 'clinicemr.registeredPatients';
const MAX_ENTRIES_PER_USER = 200;

interface RegisteredPatientEntry {
  patientUuid: string;
  registeredAt: string; // ISO timestamp
}

interface StoreShape {
  // map: userUuid -> entries (most recent first)
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
    // ignore quota errors
  }
}

export function addRegisteredPatient(userUuid: string, patientUuid: string): void {
  if (!userUuid || !patientUuid) return;
  const store = readStore();
  const existing = store[userUuid] ?? [];
  // Move/insert this patient to the front, dedup
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
