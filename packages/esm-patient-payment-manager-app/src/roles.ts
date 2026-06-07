import { type Session } from '@openmrs/esm-framework';

/**
 * Extract role display/name strings from a session, normalised to lowercase.
 */
export function getUserRoleNames(session: Session | null | undefined): string[] {
  const roles = (session?.user?.roles ?? []) as Array<{ display?: string; name?: string }>;
  return roles
    .map((r) =>
      String(r.display ?? r.name ?? '')
        .trim()
        .toLowerCase(),
    )
    .filter(Boolean);
}

function normaliseList(names: string[]): string[] {
  return (names ?? []).map((n) => String(n).trim().toLowerCase()).filter(Boolean);
}

/**
 * True when the current user holds at least one of the cashier/front-desk roles
 * (Organisation Nurse, Cashier, Receptionist by default).
 */
export function isCashierUser(session: Session | null | undefined, cashierRoleNames: string[]): boolean {
  const userRoles = getUserRoleNames(session);
  const allowed = normaliseList(cashierRoleNames);
  return userRoles.some((role) => allowed.includes(role));
}

/**
 * True when the current user holds a clinical provider role (Doctor, Pharmacist,
 * Laboratory by default) that must be blocked from registration/payment.
 */
export function isProviderUser(session: Session | null | undefined, providerRoleNames: string[]): boolean {
  const userRoles = getUserRoleNames(session);
  const blocked = normaliseList(providerRoleNames);
  return userRoles.some((role) => blocked.includes(role));
}
