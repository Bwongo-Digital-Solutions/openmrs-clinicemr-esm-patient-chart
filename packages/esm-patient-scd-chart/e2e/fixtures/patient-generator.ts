import { APIRequestContext } from '@playwright/test';

const OPENMRS_ID_TYPE = '05a29f94-c0ed-11e2-94be-8c13b969e334';
const DEFAULT_LOCATION = '2be09613-c612-41af-8638-022609c38da8';

// LuhnMod30 — matches OpenMRS idgen LuhnMod30IdentifierValidator
const CHARSET = '0123456789ACDEFGHJKLMNPRTUVWXY'; // 30 chars
const N = 30;

/**
 * Compute the LuhnMod30 check character for a base identifier string.
 * Algorithm: scan right-to-left, alternate factor 2/1 starting with 2 at rightmost,
 * reduce addend via (floor(a/N) + a%N), sum, checkPos = (N - sum%N) % N.
 */
function luhnMod30CheckChar(base: string): string {
  let total = 0;
  for (let i = base.length - 1; i >= 0; i--) {
    const posFromRight = base.length - i; // 1-indexed from right
    const factor = posFromRight % 2 === 1 ? 2 : 1;
    const c = CHARSET.indexOf(base[i]);
    if (c === -1) throw new Error(`Invalid char '${base[i]}' for LuhnMod30`);
    let addend = factor * c;
    addend = Math.floor(addend / N) + (addend % N);
    total += addend;
  }
  const checkPos = (N - (total % N)) % N;
  return CHARSET[checkPos];
}

/**
 * Generate a valid OpenMRS ID starting in the "E2E" range (base "200000"+)
 * so it won't collide with idgen-issued identifiers (which start at "100000").
 */
// Seed from timestamp so each test run generates distinct identifiers.
// Range: 200000..2YYYYY in base-30 — never collides with idgen-issued IDs (starting at 100000).
let e2eSeq = Math.floor((Date.now() / 1000) % (N ** 5 - 1));
function generateOpenMrsId(): string {
  const num = 2 * N ** 5 + (e2eSeq++ % N ** 5);
  let base = '';
  let n = num;
  for (let i = 0; i < 6; i++) {
    base = CHARSET[n % N] + base;
    n = Math.floor(n / N);
  }
  return base + luhnMod30CheckChar(base);
}

interface PatientOptions {
  givenName?: string;
  familyName?: string;
  birthDate?: string;
  gender?: string;
}

export async function generateRandomPatient(api: APIRequestContext, options: PatientOptions = {}): Promise<any> {
  const timestamp = Date.now();
  const givenName = options.givenName || `E2ETest${timestamp}`;
  const familyName = options.familyName || `Patient`;
  const birthDate = options.birthDate || '2010-01-01';
  const gender = options.gender || 'M';
  const location = process.env.E2E_LOGIN_DEFAULT_LOCATION_UUID || DEFAULT_LOCATION;

  const identifier = generateOpenMrsId();

  const patientResponse = await api.post('patient', {
    data: {
      person: {
        names: [{ givenName, familyName, preferred: true }],
        gender,
        birthdate: birthDate,
        addresses: [{ address1: '', preferred: true }],
      },
      identifiers: [
        {
          identifier,
          identifierType: OPENMRS_ID_TYPE,
          location,
          preferred: true,
        },
      ],
    },
  });

  if (!patientResponse.ok()) {
    const text = await patientResponse.text();
    throw new Error(`Failed to create patient (HTTP ${patientResponse.status()}): ${text}`);
  }

  return patientResponse.json();
}

export async function deletePatient(api: APIRequestContext, patientUuid: string): Promise<void> {
  await api.delete(`patient/${patientUuid}`, { params: { purge: 'true' } });
}
