import { openmrsFetch, restBaseUrl, fhirBaseUrl } from '@openmrs/esm-framework';
import useSWR from 'swr';
import type { LabTest } from './types';

// ── Types ─────────────────────────────────────────────────────────────
interface SessionResponse {
  currentProvider?: { uuid: string };
  sessionLocation?: { uuid: string };
}

interface OrderPayload {
  action: 'NEW';
  patient: string;
  type: string;
  careSetting: string;
  orderer: string;
  encounter: string;
  concept: string;
  urgency: string;
}

// ── Get current session (provider + location) ─────────────────────────
export function useSession() {
  const { data, isLoading } = useSWR<{ data: SessionResponse }>(
    `${restBaseUrl}/session`,
    openmrsFetch,
  );

  return {
    providerUuid: data?.data?.currentProvider?.uuid ?? '',
    locationUuid: data?.data?.sessionLocation?.uuid ?? '',
    isLoading,
  };
}

// ── Patient demographics for display ──────────────────────────────────
interface FhirPatient {
  id: string;
  name?: Array<{ text?: string; given?: string[]; family?: string }>;
  birthDate?: string;
  gender?: string;
}

export function usePatientDemographics(patientUuid: string) {
  const url = patientUuid ? `${fhirBaseUrl}/Patient/${patientUuid}` : null;
  const { data, isLoading } = useSWR<{ data: FhirPatient }>(url, openmrsFetch);

  const raw = data?.data;
  const nameObj = raw?.name?.[0];
  const displayName =
    nameObj?.text ?? [nameObj?.given?.join(' '), nameObj?.family].filter(Boolean).join(' ') ?? '';

  return {
    patientName: displayName,
    patientDob: raw?.birthDate ?? '',
    patientGender: raw?.gender ?? '',
    isLoading,
  };
}

// ── Submit lab orders ─────────────────────────────────────────────────
export async function submitLabOrders(
  patientUuid: string,
  selectedTests: LabTest[],
  urgency: 'ROUTINE' | 'STAT',
  clinicalNote: string,
  encounterTypeUuid: string,
  orderTypeUuid: string,
  careSettingUuid: string,
  providerUuid: string,
  locationUuid: string,
): Promise<{ success: boolean; encounterUuid?: string; error?: string }> {
  if (!providerUuid) {
    return { success: false, error: 'No provider found in current session. Please log in as a provider.' };
  }

  if (selectedTests.length === 0) {
    return { success: false, error: 'No tests selected.' };
  }

  const headers = { 'Content-Type': 'application/json' };

  try {
    // 1. Create the encounter
    const encounterPayload: Record<string, unknown> = {
      patient: patientUuid,
      encounterType: encounterTypeUuid,
      encounterDatetime: new Date().toISOString(),
      encounterProviders: [{ provider: providerUuid, encounterRole: 'a0b03050-c99b-11e0-9572-0800200c9a66' }],
    };
    if (locationUuid) {
      encounterPayload.location = locationUuid;
    }
    // Add clinical note as obs if provided
    if (clinicalNote.trim()) {
      encounterPayload.obs = [
        {
          concept: '160632AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', // Free text general concept (clinical note)
          value: clinicalNote.trim(),
        },
      ];
    }

    const encounterRes = await openmrsFetch<{ uuid: string }>(`${restBaseUrl}/encounter`, {
      method: 'POST',
      headers,
      body: JSON.stringify(encounterPayload),
    });

    const encounterUuid = encounterRes.data?.uuid;
    if (!encounterUuid) {
      return { success: false, error: 'Failed to create encounter.' };
    }

    // 2. Create test orders for each selected test
    const orderPromises = selectedTests.map((test) => {
      const orderPayload: OrderPayload = {
        action: 'NEW',
        patient: patientUuid,
        type: 'testorder',
        careSetting: careSettingUuid,
        orderer: providerUuid,
        encounter: encounterUuid,
        concept: test.conceptUuid,
        urgency,
      };

      return openmrsFetch(`${restBaseUrl}/order`, {
        method: 'POST',
        headers,
        body: JSON.stringify(orderPayload),
      }).catch((err) => {
        // Log but don't fail all orders if one fails
        console.error(`Failed to create order for ${test.label}:`, err);
        return { error: true, test: test.label };
      });
    });

    const results = await Promise.allSettled(orderPromises);
    const failures = results.filter((r) => r.status === 'rejected');

    if (failures.length > 0 && failures.length === selectedTests.length) {
      return { success: false, error: 'All orders failed to submit.', encounterUuid };
    }

    return { success: true, encounterUuid };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}
