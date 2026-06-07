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

/**
 * Strip a leading "Organizational:"/"Organisational:" (or any "x:" prefix) so
 * that, e.g., "Organizational: Nurse" also matches a config entry of "Nurse".
 */
function shortRoleName(role: string): string {
  const idx = role.lastIndexOf(':');
  return (idx === -1 ? role : role.slice(idx + 1)).trim().toLowerCase();
}

function normaliseList(names: string[]): string[] {
  return (names ?? []).map((n) => String(n).trim().toLowerCase()).filter(Boolean);
}

/**
 * Returns true if any of the user's roles matches any configured name. Matching
 * is lenient: a configured name matches if it equals the full role name OR the
 * role name with its organisational prefix stripped (and vice-versa).
 */
function matchesAnyRole(userRoles: string[], configuredNames: string[]): boolean {
  const configured = normaliseList(configuredNames);
  const configuredShort = configured.map(shortRoleName);
  return userRoles.some((role) => {
    const short = shortRoleName(role);
    return configured.includes(role) || configured.includes(short) || configuredShort.includes(short);
  });
}

/**
 * True when the current user holds at least one of the cashier/front-desk roles
 * (Organisation Nurse, Cashier, Receptionist by default).
 */
export function isCashierUser(session: Session | null | undefined, cashierRoleNames: string[]): boolean {
  return matchesAnyRole(getUserRoleNames(session), cashierRoleNames);
}

/**
 * True when the current user holds a clinical provider role (Doctor, Pharmacist,
 * Laboratory by default) that must be blocked from registration/payment.
 */
export function isProviderUser(session: Session | null | undefined, providerRoleNames: string[]): boolean {
  return matchesAnyRole(getUserRoleNames(session), providerRoleNames);
}
