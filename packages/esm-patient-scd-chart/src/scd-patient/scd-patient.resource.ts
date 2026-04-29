import { fhirBaseUrl, openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import useSWR from 'swr';
import type { ScdPatientGeneralInfo, DiagnosisKey } from './types';
import type { ScdConceptUuids } from '../config-schema';

// ── Person attribute type UUIDs ─────────────────────────────────────
const TELEPHONE_NUMBER_ATTRIBUTE_TYPE = '14d4f066-15f5-102d-96e4-000c29c2a5d7';

// ── Encounter representation ──────────────────────────────────────────
const ENC_REP =
  'custom:(uuid,obs:(uuid,concept:(uuid,display),value,groupMembers:(uuid,concept:(uuid,display),value)))';

// ── Concept → DiagnosisKey map ────────────────────────────────────────
const DIAGNOSIS_KEY_BY_CONCEPT_FIELD: Record<string, DiagnosisKey> = {
  diagnosisScdNonHU: 'scdNonHU',
  diagnosisScdOnHU: 'scdOnHU',
  diagnosisConditionalTCD: 'conditionalTCD',
  diagnosisAbnormalTCD: 'abnormalTCD',
  diagnosisStroke: 'stroke',
  diagnosisSplenomegaly: 'splenomegaly',
  diagnosisChronicSequestration: 'chronicSequestration',
  diagnosisOsteonecrosis: 'osteonecrosis',
  diagnosisOther: 'other',
};

const DIAGNOSIS_LABELS: Record<DiagnosisKey, string> = {
  scdNonHU: 'SCD non-HU',
  scdOnHU: 'SCD on HU',
  conditionalTCD: 'Conditional TCD',
  abnormalTCD: 'Abnormal TCD',
  stroke: 'Stroke',
  splenomegaly: 'Splenomegaly',
  chronicSequestration: 'Chronic Sequestration',
  osteonecrosis: 'Osteonecrosis',
  other: 'Other',
};

// ── Helpers ───────────────────────────────────────────────────────────
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(s: string): boolean {
  return UUID_RE.test(s);
}

function obs(conceptUuid: string, value: unknown) {
  return { concept: conceptUuid, value };
}

type ObsLike = ReturnType<typeof obs> | null;

function obsGroup(groupConceptUuid: string, members: Array<ObsLike>) {
  if (!isUuid(groupConceptUuid)) return null;
  const validMembers = members.filter((m): m is ReturnType<typeof obs> => m !== null && isUuid(m.concept));
  if (validMembers.length === 0) return null;
  return {
    concept: groupConceptUuid,
    groupMembers: validMembers,
  };
}

function dateObs(conceptUuid: string, value: string): ObsLike {
  return value && isUuid(conceptUuid) ? obs(conceptUuid, value) : null;
}

function textObs(conceptUuid: string, value: string): ObsLike {
  return value && isUuid(conceptUuid) ? obs(conceptUuid, value) : null;
}

function boolObs(conceptUuid: string, value: boolean): ObsLike {
  return isUuid(conceptUuid) ? obs(conceptUuid, value) : null;
}

// ── Build observation payload from form state ─────────────────────────
export function buildObsPayload(formData: ScdPatientGeneralInfo, c: ScdConceptUuids): Array<Record<string, unknown>> {
  const all: Array<Record<string, unknown> | null> = [];

  // Simple text / date obs
  // NOTE: address, deathDate and contactNumbers are now persisted on the Person record, not as obs
  if (c.comments) all.push(textObs(c.comments, formData.comments));
  if (c.siblingsData && formData.siblings.length > 0)
    all.push(textObs(c.siblingsData, JSON.stringify(formData.siblings)));
  if (c.dateOfScdDiagnosis) all.push(dateObs(c.dateOfScdDiagnosis, formData.dateOfScdDiagnosis));
  if (c.dateOfSsuuboCareEnrollment)
    all.push(dateObs(c.dateOfSsuuboCareEnrollment, formData.dateOfSsuuboCareEnrollment));
  if (c.pcvVaccinationDate) all.push(dateObs(c.pcvVaccinationDate, formData.pcvVaccinationDate));

  // Treatment groups
  if (c.hydroxyureaGroup && c.hydroxyureaEnabled) {
    const members: Array<ReturnType<typeof obs> | null> = [boolObs(c.hydroxyureaEnabled, formData.hydroxyureaEnabled)];
    if (formData.hydroxyureaEnabled) {
      if (c.hydroxyureaStartDate) members.push(dateObs(c.hydroxyureaStartDate, formData.hydroxyureaStartDate));
      if (c.hydroxyureaStopDate) members.push(dateObs(c.hydroxyureaStopDate, formData.hydroxyureaStopDate));
    }
    all.push(obsGroup(c.hydroxyureaGroup, members));
  }

  if (c.chronicTransfusionGroup && c.chronicTransfusionEnabled) {
    const members: Array<ReturnType<typeof obs> | null> = [
      boolObs(c.chronicTransfusionEnabled, formData.chronicTransfusionEnabled),
    ];
    if (formData.chronicTransfusionEnabled) {
      if (c.chronicTransfusionStartDate)
        members.push(dateObs(c.chronicTransfusionStartDate, formData.chronicTransfusionStartDate));
      if (c.chronicTransfusionStopDate)
        members.push(dateObs(c.chronicTransfusionStopDate, formData.chronicTransfusionStopDate));
    }
    all.push(obsGroup(c.chronicTransfusionGroup, members));
  }

  if (c.physiotherapyGroup && c.physiotherapyEnabled) {
    const members: Array<ReturnType<typeof obs> | null> = [
      boolObs(c.physiotherapyEnabled, formData.physiotherapyEnabled),
    ];
    if (formData.physiotherapyEnabled) {
      if (c.physiotherapyStartDate) members.push(dateObs(c.physiotherapyStartDate, formData.physiotherapyStartDate));
      if (c.physiotherapyStopDate) members.push(dateObs(c.physiotherapyStopDate, formData.physiotherapyStopDate));
    }
    all.push(obsGroup(c.physiotherapyGroup, members));
  }

  // Primary diagnosis groups
  if (c.diagnosisGroup) {
    for (const diag of formData.primaryDiagnoses) {
      const diagConceptField =
        `diagnosis${diag.key.charAt(0).toUpperCase()}${diag.key.slice(1)}` as keyof ScdConceptUuids;
      const diagConceptUuid = c[diagConceptField];
      if (!diagConceptUuid) continue;

      const members: Array<ReturnType<typeof obs> | null> = [
        // The per-diagnosis concept may be Date-type (stores the diagnosed date)
        // or Text-type (stores "true"/"false"). Use the date when available,
        // falling back to the string "true" for Text-type concepts.
        diag.diagnosedDate
          ? dateObs(diagConceptUuid as string, diag.diagnosedDate)
          : textObs(diagConceptUuid as string, 'true'),
      ];
      if (c.diagnosisDate && diag.diagnosedDate) members.push(dateObs(c.diagnosisDate, diag.diagnosedDate));
      if (diag.key === 'other' && c.diagnosisOtherDescription && diag.otherDescription)
        members.push(textObs(c.diagnosisOtherDescription, diag.otherDescription));

      all.push(obsGroup(c.diagnosisGroup, members));
    }
  }

  return all.filter(Boolean) as Array<Record<string, unknown>>;
}

// ── Save SCD encounter ────────────────────────────────────────────────
export async function saveScdEncounter(
  patientUuid: string,
  formData: ScdPatientGeneralInfo,
  encounterTypeUuid: string,
  conceptUuids: ScdConceptUuids,
  locationUuid?: string,
  existingEncounterUuid?: string,
) {
  const obsPayload = buildObsPayload(formData, conceptUuids);

  const payload: Record<string, unknown> = {
    patient: patientUuid,
    encounterType: encounterTypeUuid,
    encounterDatetime: new Date().toISOString(),
    obs: obsPayload,
  };
  if (locationUuid && isUuid(locationUuid)) payload.location = locationUuid;

  const createUrl = `${restBaseUrl}/encounter`;

  const headers = { 'Content-Type': 'application/json' };

  function isConceptNullError(err: unknown): boolean {
    const msg = ((err as Record<string, unknown>)?.responseBody as Record<string, unknown>)?.error as
      | Record<string, unknown>
      | undefined;
    const message = (msg?.message ?? '') as string;
    return message.includes('getConcept()');
  }

  if (existingEncounterUuid) {
    const updateUrl = `${restBaseUrl}/encounter/${existingEncounterUuid}`;
    try {
      // Fetch existing obs UUIDs to void them before adding new obs (prevents stale duplicates)
      const existingEnc = await openmrsFetch<{ obs: Array<{ uuid: string; voided?: boolean }> }>(
        `${restBaseUrl}/encounter/${existingEncounterUuid}?v=custom:(obs:(uuid,voided))`,
      );
      const existingObsUuids: string[] = (existingEnc.data?.obs ?? []).filter((o) => !o.voided).map((o) => o.uuid);

      // Void each existing obs
      await Promise.all(
        existingObsUuids.map((obsUuid) =>
          openmrsFetch(`${restBaseUrl}/obs/${obsUuid}`, { method: 'DELETE' }).catch(() => {
            /* non-fatal */
          }),
        ),
      );

      // Add fresh obs to the encounter
      try {
        return await openmrsFetch(updateUrl, { method: 'POST', headers, body: JSON.stringify({ obs: obsPayload }) });
      } catch (err) {
        if (isConceptNullError(err)) {
          return await openmrsFetch(updateUrl, { method: 'POST', headers, body: JSON.stringify({ obs: [] }) });
        }
        throw err;
      }
    } catch {
      // Encounter gone (deleted/voided) — fall through to create a fresh one
    }
  }

  try {
    return await openmrsFetch(createUrl, { method: 'POST', headers, body: JSON.stringify(payload) });
  } catch (err) {
    if (isConceptNullError(err)) {
      return await openmrsFetch(createUrl, { method: 'POST', headers, body: JSON.stringify({ ...payload, obs: [] }) });
    }
    throw err;
  }
}

// ── Save address + death date to person record ──────────────────────
export async function savePersonDetails(patientUuid: string, address: string, deathDate: string): Promise<void> {
  const headers = { 'Content-Type': 'application/json' };

  // 1. Sync dead / deathDate on the core person record (non-fatal: some OpenMRS configs
  //    reject partial person updates that lack required fields like names/gender)
  const personPayload: Record<string, unknown> = deathDate
    ? { dead: true, deathDate }
    : { dead: false, deathDate: null };
  await openmrsFetch(`${restBaseUrl}/person/${patientUuid}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(personPayload),
  }).catch(() => {
    /* non-fatal */
  });

  // 2. Sync address1 on the preferred person address
  const personRes = await openmrsFetch<{ addresses: Array<{ uuid: string; address1?: string; preferred?: boolean }> }>(
    `${restBaseUrl}/person/${patientUuid}?v=custom:(addresses:(uuid,address1,preferred))`,
  );
  const addresses =
    (personRes.data as unknown as { addresses: Array<{ uuid: string; address1?: string; preferred?: boolean }> })
      ?.addresses ?? [];
  const existing = addresses.find((a) => a.preferred) ?? addresses[0];

  if (existing?.uuid) {
    await openmrsFetch(`${restBaseUrl}/person/${patientUuid}/address/${existing.uuid}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ address1: address }),
    });
  } else if (address) {
    await openmrsFetch(`${restBaseUrl}/person/${patientUuid}/address`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ address1: address, preferred: true }),
    });
  }
}

// ── Save contact numbers as person attributes ─────────────────────────
// OpenMRS enforces one attribute per type per person, so all numbers are
// stored as a single JSON-serialised array in one Telephone Number attribute.
export async function saveContactNumbers(patientUuid: string, phoneNumbers: string[]): Promise<void> {
  const headers = { 'Content-Type': 'application/json' };
  const nonEmpty = phoneNumbers.filter(Boolean);
  const jsonValue = JSON.stringify(nonEmpty);

  const res = await openmrsFetch<{ results: Array<{ uuid: string; value: string; attributeType: { uuid: string } }> }>(
    `${restBaseUrl}/person/${patientUuid}/attribute?v=full`,
  );
  const allAttrs =
    (res.data as unknown as { results: Array<{ uuid: string; value: string; attributeType: { uuid: string } }> })
      ?.results ?? [];
  const existing = allAttrs.filter((a) => a.attributeType?.uuid === TELEPHONE_NUMBER_ATTRIBUTE_TYPE);

  if (existing.length > 0) {
    // Update the first attribute with the JSON array; void any extras
    await openmrsFetch(`${restBaseUrl}/person/${patientUuid}/attribute/${existing[0].uuid}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ value: jsonValue }),
    });
    await Promise.all(
      existing
        .slice(1)
        .map((attr) =>
          openmrsFetch(`${restBaseUrl}/person/${patientUuid}/attribute/${attr.uuid}`, { method: 'DELETE' }),
        ),
    );
  } else if (nonEmpty.length > 0) {
    await openmrsFetch(`${restBaseUrl}/person/${patientUuid}/attribute`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ attributeType: TELEPHONE_NUMBER_ATTRIBUTE_TYPE, value: jsonValue }),
    });
  }
}

// ── Load person-level fields (address, deathDate, phones) ─────────────
export function usePersonDetails(patientUuid: string) {
  const personUrl = patientUuid
    ? `${restBaseUrl}/person/${patientUuid}?v=custom:(dead,deathDate,addresses:(uuid,address1,preferred))`
    : null;
  const attrUrl = patientUuid ? `${restBaseUrl}/person/${patientUuid}/attribute?v=full` : null;

  const { data: pData, isLoading: pLoading } = useSWR<{
    data: {
      dead?: boolean;
      deathDate?: string;
      addresses?: Array<{ uuid: string; address1?: string; preferred?: boolean }>;
    };
  }>(personUrl, openmrsFetch);

  const { data: aData, isLoading: aLoading } = useSWR<{
    data: { results: Array<{ uuid: string; value: string; attributeType: { uuid: string } }> };
  }>(attrUrl, openmrsFetch);

  const person = pData?.data;
  const preferred = person?.addresses?.find((a) => a.preferred) ?? person?.addresses?.[0];
  const phoneAttr = aData?.data?.results?.find((a) => a.attributeType?.uuid === TELEPHONE_NUMBER_ATTRIBUTE_TYPE);
  let contactNumbers: string[] = [];
  if (phoneAttr?.value) {
    try {
      const parsed = JSON.parse(phoneAttr.value);
      contactNumbers = Array.isArray(parsed) ? parsed.filter(Boolean) : [phoneAttr.value].filter(Boolean);
    } catch {
      contactNumbers = phoneAttr.value ? [phoneAttr.value] : [];
    }
  }

  return {
    address: preferred?.address1 ?? '',
    deathDate: person?.deathDate ? String(person.deathDate).split('T')[0] : '',
    contactNumbers,
    isLoading: pLoading || aLoading,
  };
}

// ── Upload patient photo ──────────────────────────────────────────────
export async function uploadPatientPhoto(patientUuid: string, file: File): Promise<string> {
  const formPayload = new FormData();
  formPayload.append('patient', patientUuid);
  formPayload.append('file', file);
  formPayload.append('fileCaption', 'SCD patient photo');

  const response = await openmrsFetch<{ url: string }>(`${restBaseUrl}/attachment`, {
    method: 'POST',
    body: formPayload,
  });
  return response.data?.url ?? '';
}

// ── Fetch existing SCD encounter ─────────────────────────────────────
export function useScdEncounter(patientUuid: string, encounterTypeUuid: string) {
  const url =
    patientUuid && encounterTypeUuid
      ? `${restBaseUrl}/encounter?patient=${patientUuid}&encounterType=${encounterTypeUuid}&v=${ENC_REP}&limit=1&order=desc`
      : null;

  const { data, error, isLoading, mutate } = useSWR<{ data: { results: Array<OpenMrsEncounter> } }>(url, openmrsFetch);

  return {
    encounter: data?.data?.results?.[0] ?? null,
    isLoading,
    error,
    mutate,
  };
}

// ── Map encounter observations back to form state ─────────────────────
export function mapEncounterToFormData(
  encounter: OpenMrsEncounter,
  c: ScdConceptUuids,
): Partial<ScdPatientGeneralInfo> {
  if (!encounter) return {};

  const result: Partial<ScdPatientGeneralInfo> = {};
  const flatObs = encounter.obs ?? [];

  const conceptMap = buildConceptMap(c);

  for (const ob of flatObs) {
    const field = conceptMap[ob.concept?.uuid];
    if (!field) continue;

    switch (field) {
      case 'comments':
        result.comments = String(ob.value ?? '');
        break;
      case 'siblingsData':
        try {
          result.siblings = JSON.parse(String(ob.value));
        } catch {
          result.siblings = [];
        }
        break;
      case 'dateOfScdDiagnosis':
        result.dateOfScdDiagnosis = String(ob.value ?? '').split('T')[0];
        break;
      case 'dateOfSsuuboCareEnrollment':
        result.dateOfSsuuboCareEnrollment = String(ob.value ?? '').split('T')[0];
        break;
      case 'pcvVaccinationDate':
        result.pcvVaccinationDate = String(ob.value ?? '').split('T')[0];
        break;
      case 'hydroxyureaGroup':
        mapTreatmentGroup(ob, c, 'hydroxyurea', result);
        break;
      case 'chronicTransfusionGroup':
        mapTreatmentGroup(ob, c, 'chronicTransfusion', result);
        break;
      case 'physiotherapyGroup':
        mapTreatmentGroup(ob, c, 'physiotherapy', result);
        break;
      case 'diagnosisGroup':
        mapDiagnosisGroup(ob, c, result);
        break;
    }
  }

  return result;
}

// ── Internal helpers ──────────────────────────────────────────────────
function buildConceptMap(c: ScdConceptUuids): Record<string, string> {
  const map: Record<string, string> = {};
  for (const [field, uuid] of Object.entries(c)) {
    if (uuid && !map[uuid]) map[uuid] = field; // first-wins: preserves the more specific top-level field name
  }
  return map;
}

function mapTreatmentGroup(
  ob: OpenMrsObs,
  c: ScdConceptUuids,
  prefix: 'hydroxyurea' | 'chronicTransfusion' | 'physiotherapy',
  result: Partial<ScdPatientGeneralInfo>,
) {
  const enabledKey = `${prefix}Enabled` as keyof ScdPatientGeneralInfo;
  const startKey = `${prefix}StartDate` as keyof ScdPatientGeneralInfo;
  const stopKey = `${prefix}StopDate` as keyof ScdPatientGeneralInfo;
  const enabledConceptUuid = c[`${prefix}Enabled` as keyof ScdConceptUuids];
  const startConceptUuid = c[`${prefix}StartDate` as keyof ScdConceptUuids];
  const stopConceptUuid = c[`${prefix}StopDate` as keyof ScdConceptUuids];

  for (const member of ob.groupMembers ?? []) {
    if (member.concept?.uuid === enabledConceptUuid) {
      (result as Record<string, unknown>)[enabledKey as string] = String(member.value).toLowerCase() === 'true';
    } else if (member.concept?.uuid === startConceptUuid) {
      (result as Record<string, unknown>)[startKey as string] = String(member.value ?? '').split('T')[0];
    } else if (member.concept?.uuid === stopConceptUuid) {
      (result as Record<string, unknown>)[stopKey as string] = String(member.value ?? '').split('T')[0];
    }
  }
}

function mapDiagnosisGroup(ob: OpenMrsObs, c: ScdConceptUuids, result: Partial<ScdPatientGeneralInfo>) {
  if (!result.primaryDiagnoses) result.primaryDiagnoses = [];

  let diagKey: DiagnosisKey | null = null;
  let diagnosedDate = '';
  let otherDescription = '';

  for (const member of ob.groupMembers ?? []) {
    const conceptUuid = member.concept?.uuid;
    // Find which diagnosis concept field this matches
    for (const [field, key] of Object.entries(DIAGNOSIS_KEY_BY_CONCEPT_FIELD)) {
      if (c[field as keyof ScdConceptUuids] === conceptUuid) {
        diagKey = key;
        // The per-diagnosis concept may itself be Date-type and hold the diagnosed date
        const val = String(member.value ?? '');
        if (val && val !== 'true' && val !== 'false') {
          diagnosedDate = val.split('T')[0];
        }
        break;
      }
    }
    if (conceptUuid === c.diagnosisDate) {
      // Shared diagnosisDate concept takes precedence
      diagnosedDate = String(member.value ?? '').split('T')[0];
    }
    if (conceptUuid === c.diagnosisOtherDescription) {
      otherDescription = String(member.value ?? '');
    }
  }

  if (diagKey) {
    const existing = result.primaryDiagnoses.find((d) => d.key === diagKey);
    if (!existing) {
      result.primaryDiagnoses.push({
        key: diagKey,
        label: DIAGNOSIS_LABELS[diagKey],
        diagnosedDate,
        otherDescription,
      });
    }
  }
}

// ── Patient demographics ──────────────────────────────────────────────
interface FhirPatientName {
  text?: string;
  family?: string;
  given?: string[];
}

interface FhirPatient {
  id: string;
  name?: FhirPatientName[];
  birthDate?: string;
  gender?: string;
}

export function usePatientDemographics(patientUuid: string) {
  const url = patientUuid ? `${fhirBaseUrl}/Patient/${patientUuid}` : null;

  const { data, error, isLoading } = useSWR<{ data: FhirPatient }>(url, openmrsFetch);

  const raw = data?.data;
  const nameObj = raw?.name?.[0];
  const displayName = nameObj?.text ?? [nameObj?.given?.join(' '), nameObj?.family].filter(Boolean).join(' ') ?? '';

  return {
    patientName: displayName,
    patientDob: raw?.birthDate ?? '',
    isLoading,
    error,
  };
}

// ── Fetch emergency contact obs from the registration encounter ──────
export interface EmergencyContact {
  label: string;
  phone: string;
}

export function useEmergencyContacts(
  patientUuid: string,
  registrationEncounterTypeUuid: string,
  concepts: { parentGuardianPhone: string; spousePartnerPhone: string; emergencyContactPhone: string },
): { contacts: EmergencyContact[]; isLoading: boolean } {
  const OBS_REP = 'custom:(uuid,concept:(uuid),value)';
  const url =
    patientUuid && registrationEncounterTypeUuid
      ? `${restBaseUrl}/encounter?patient=${patientUuid}&encounterType=${registrationEncounterTypeUuid}&v=custom:(obs:(uuid,concept:(uuid),value))&limit=1&order=desc`
      : null;

  const { data, isLoading } = useSWR<{
    data: { results: Array<{ obs?: Array<{ concept?: { uuid: string }; value?: unknown }> }> };
  }>(url, openmrsFetch);

  const encounter = data?.data?.results?.[0];
  const obsArr = encounter?.obs ?? [];

  const labelMap: Record<string, string> = {};
  if (concepts.parentGuardianPhone) labelMap[concepts.parentGuardianPhone] = 'Parent/Guardian';
  if (concepts.spousePartnerPhone) labelMap[concepts.spousePartnerPhone] = 'Spouse/Partner';
  if (concepts.emergencyContactPhone) labelMap[concepts.emergencyContactPhone] = 'Emergency Contact';

  const contacts: EmergencyContact[] = [];
  for (const ob of obsArr) {
    const conceptUuid = ob.concept?.uuid;
    if (conceptUuid && labelMap[conceptUuid] && ob.value) {
      contacts.push({ label: labelMap[conceptUuid], phone: String(ob.value) });
    }
  }

  return { contacts, isLoading };
}

// ── OpenMRS encounter/obs types ───────────────────────────────────────
interface OpenMrsObs {
  uuid: string;
  concept?: { uuid: string; display?: string };
  value?: unknown;
  groupMembers?: Array<OpenMrsObs>;
}

interface OpenMrsEncounter {
  uuid: string;
  obs?: Array<OpenMrsObs>;
}
