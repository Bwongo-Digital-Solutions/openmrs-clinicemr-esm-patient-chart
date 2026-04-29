/**
 * DATABASE VERIFICATION TESTS
 *
 * These tests are distinct from the UI tests: after saving the SCD form they
 * query the OpenMRS REST API directly to assert that each obs concept exists
 * in the encounter.  A passing result here means the data is genuinely in the
 * database — not just shown in the React UI state.
 */

import { expect } from '@playwright/test';
import { test } from '../core/test';
import { ScdFormPage } from '../pages';
import { generateRandomPatient, deletePatient } from '../fixtures';

// ── Concept UUIDs (from config-core_demo.json) ───────────────────────────────
const C = {
  encounterType: 'dd528487-82a5-4082-9c72-ed246bd49591',

  // Key dates
  dateOfScdDiagnosis: '17741003-99bd-4f74-b4d0-2c3a7c414e66',
  dateOfSsuuboCareEnrollment: 'd26d168c-005e-4154-8869-303030ab18cf',
  pcvVaccinationDate: '23b3670b-80b0-4ac4-9f45-30327ae0b374',

  // Treatments — groups
  hydroxyureaGroup: '9dc5984f-7c81-4b44-b908-8e2ec9515ce7',
  hydroxyureaEnabled: '402f43ec-4199-400c-822b-7fe1487b95ba',
  hydroxyureaStartDate: '540749c2-4a22-4c7f-811e-f1fd2e1a8f83',

  chronicTransfusionGroup: 'a0137a53-8a50-4712-b554-b6858d71b875',
  chronicTransfusionEnabled: '68c75138-5c4c-4563-bdbd-0c5ce5ed17e2',
  chronicTransfusionStartDate: 'b2652b54-82be-4096-8da5-52983b94d1f7',

  physiotherapyGroup: '22f20a15-1a36-4047-a7af-28daabebd68f',
  physiotherapyEnabled: '5f4feff6-a645-4cac-b804-6fe01995883b',
  physiotherapyStartDate: 'bccceb29-650b-4689-8ac7-84f2c5a73669',

  // Diagnoses — group wrapper + individual type concepts
  diagnosisGroup: '901ec4d6-5394-43ee-9e58-fba0d39c794a',
  diagnosisDate: '17741003-99bd-4f74-b4d0-2c3a7c414e66',
  diagnosisScdNonHU: 'c9c97cab-863a-4ed9-8743-d576f38c5787',
  diagnosisScdOnHU: '2cbcab4d-6fce-4667-a8a5-229856fc0a3a',
  diagnosisConditionalTCD: '31626eb8-90ce-4a1f-a750-b239a3b2ed6c',
  diagnosisAbnormalTCD: '95f516a8-4c8c-4283-8120-8dddf4d05c9c',
  diagnosisStroke: 'b0a4b1b5-0315-4101-9d11-f9de6285f8cc',
  diagnosisSplenomegaly: '83c4a8d4-0d3f-4e7e-bc04-b7c8351c79e1',
  diagnosisChronicSequestration: '4c12e4df-9a3b-40d2-8911-ccec27598139',
  diagnosisOsteonecrosis: 'c07169b7-359e-4aa5-aa48-c144b4c2c0ec',
  diagnosisOther: '50fdee78-5351-45fd-8ec1-34d4004889a8',
  diagnosisOtherDescription: '088d837c-de84-4507-9956-ccef46405f63',
};

// ── Helpers ──────────────────────────────────────────────────────────────────
type ObsEntry = { concept: { uuid: string }; value: unknown; voided?: boolean; groupMembers?: ObsEntry[] };

function findObs(obs: ObsEntry[], conceptUuid: string): ObsEntry | undefined {
  return obs.find((o) => o.concept?.uuid === conceptUuid && !o.voided);
}

function findMember(group: ObsEntry, conceptUuid: string): ObsEntry | undefined {
  return (group.groupMembers ?? []).find((m) => m.concept?.uuid === conceptUuid && !m.voided);
}

// ── Fetch the SCD encounter obs directly from the DB ─────────────────────────
async function fetchEncounterObs(api: any, patientUuid: string): Promise<ObsEntry[]> {
  // v= describes each encounter object; the list wrapper {results:[]} is automatic
  const rep =
    'custom:(uuid,obs:(uuid,concept:(uuid,display),value,voided,' +
    'groupMembers:(uuid,concept:(uuid,display),value,voided)))';
  const res = await api.get(`encounter?patient=${patientUuid}&encounterType=${C.encounterType}&v=${rep}`);
  expect(res.ok(), `Encounter API call failed (${res.status()})`).toBeTruthy();
  const data = await res.json();
  // Take the most-recent encounter (last saved)
  const enc = (data.results as any[])[0];
  expect(enc, 'No encounter found in database').toBeTruthy();
  return enc.obs ?? [];
}

// ── Tests ────────────────────────────────────────────────────────────────────
test.describe('SCD Database Verification', () => {
  let patient: any;
  let scdFormPage: ScdFormPage;

  test.beforeEach(async ({ page, api }) => {
    patient = await generateRandomPatient(api);
    scdFormPage = new ScdFormPage(page);
  });

  test.afterEach(async ({ api }) => {
    if (patient?.uuid) await deletePatient(api, patient.uuid).catch(() => {});
  });

  // ── Key dates ──────────────────────────────────────────────────────────────
  test('key dates are saved to the database', async ({ page, api }) => {
    await scdFormPage.gotoPatientChart(patient.uuid);
    await scdFormPage.fillPersonalDetails({ address: 'DB-verify address' });
    await scdFormPage.fillKeyDates({
      scdDiagnosisDate: '2023-01-15',
      ssuuboEnrollmentDate: '2023-02-01',
      pcvVaccinationDate: '2023-01-20',
    });
    await scdFormPage.saveForm();
    await scdFormPage.waitForSaveSuccess();

    const obs = await fetchEncounterObs(api, patient.uuid);

    const scdDate = findObs(obs, C.dateOfScdDiagnosis);
    expect(scdDate, 'dateOfScdDiagnosis obs missing from database').toBeTruthy();
    expect(String(scdDate!.value)).toContain('2023-01-15');

    const enrollDate = findObs(obs, C.dateOfSsuuboCareEnrollment);
    expect(enrollDate, 'dateOfSsuuboCareEnrollment obs missing from database').toBeTruthy();
    expect(String(enrollDate!.value)).toContain('2023-02-01');

    const pcvDate = findObs(obs, C.pcvVaccinationDate);
    expect(pcvDate, 'pcvVaccinationDate obs missing from database').toBeTruthy();
    expect(String(pcvDate!.value)).toContain('2023-01-20');
  });

  // ── Treatments ─────────────────────────────────────────────────────────────
  test('treatments are saved to the database', async ({ page, api }) => {
    await scdFormPage.gotoPatientChart(patient.uuid);
    await scdFormPage.fillPersonalDetails({ address: 'DB-verify treatments' });
    await scdFormPage.enableTreatments({
      hydroxyurea: { startDate: '2023-03-01' },
      chronicTransfusion: { startDate: '2023-04-15' },
      physiotherapy: { startDate: '2023-05-10' },
    });
    await scdFormPage.saveForm();
    await scdFormPage.waitForSaveSuccess();

    const obs = await fetchEncounterObs(api, patient.uuid);

    // Hydroxyurea
    const huGroup = findObs(obs, C.hydroxyureaGroup);
    expect(huGroup, 'Hydroxyurea obs group missing from database').toBeTruthy();
    expect(findMember(huGroup!, C.hydroxyureaEnabled), 'Hydroxyurea enabled member missing').toBeTruthy();
    const huStart = findMember(huGroup!, C.hydroxyureaStartDate);
    expect(huStart, 'Hydroxyurea start date missing').toBeTruthy();
    expect(String(huStart!.value)).toContain('2023-03-01');

    // Chronic Transfusion
    const ctGroup = findObs(obs, C.chronicTransfusionGroup);
    expect(ctGroup, 'Chronic Transfusion obs group missing from database').toBeTruthy();
    expect(
      findMember(ctGroup!, C.chronicTransfusionEnabled),
      'Chronic Transfusion enabled member missing',
    ).toBeTruthy();
    const ctStart = findMember(ctGroup!, C.chronicTransfusionStartDate);
    expect(ctStart, 'Chronic Transfusion start date missing').toBeTruthy();
    expect(String(ctStart!.value)).toContain('2023-04-15');

    // Physiotherapy
    const ptGroup = findObs(obs, C.physiotherapyGroup);
    expect(ptGroup, 'Physiotherapy obs group missing from database').toBeTruthy();
    expect(findMember(ptGroup!, C.physiotherapyEnabled), 'Physiotherapy enabled member missing').toBeTruthy();
    const ptStart = findMember(ptGroup!, C.physiotherapyStartDate);
    expect(ptStart, 'Physiotherapy start date missing').toBeTruthy();
    expect(String(ptStart!.value)).toContain('2023-05-10');
  });

  // ── Primary diagnoses ──────────────────────────────────────────────────────
  test('all 9 primary diagnoses are saved to the database', async ({ page, api }) => {
    await scdFormPage.gotoPatientChart(patient.uuid);
    await scdFormPage.fillPersonalDetails({ address: 'DB-verify diagnoses' });

    const allDiagnoses = [
      { key: 'scdNonHU', diagnosedDate: '2022-01-01', conceptUuid: C.diagnosisScdNonHU, label: 'SCD non-HU' },
      { key: 'scdOnHU', diagnosedDate: '2022-02-01', conceptUuid: C.diagnosisScdOnHU, label: 'SCD on HU' },
      {
        key: 'conditionalTCD',
        diagnosedDate: '2022-03-01',
        conceptUuid: C.diagnosisConditionalTCD,
        label: 'Conditional TCD',
      },
      { key: 'abnormalTCD', diagnosedDate: '2022-04-01', conceptUuid: C.diagnosisAbnormalTCD, label: 'Abnormal TCD' },
      { key: 'stroke', diagnosedDate: '2022-05-01', conceptUuid: C.diagnosisStroke, label: 'Stroke' },
      { key: 'splenomegaly', diagnosedDate: '2022-06-01', conceptUuid: C.diagnosisSplenomegaly, label: 'Splenomegaly' },
      {
        key: 'chronicSequestration',
        diagnosedDate: '2022-07-01',
        conceptUuid: C.diagnosisChronicSequestration,
        label: 'Chronic Sequestration',
      },
      {
        key: 'osteonecrosis',
        diagnosedDate: '2022-08-01',
        conceptUuid: C.diagnosisOsteonecrosis,
        label: 'Osteonecrosis',
      },
      {
        key: 'other',
        diagnosedDate: '2022-09-01',
        conceptUuid: C.diagnosisOther,
        label: 'Other',
        otherDescription: 'Acute pain crisis',
      },
    ];

    for (const d of allDiagnoses) {
      await scdFormPage.addDiagnosis(d);
    }

    await scdFormPage.saveForm();
    await scdFormPage.waitForSaveSuccess();

    const obs = await fetchEncounterObs(api, patient.uuid);

    // All 9 diagnosisGroup wrappers must exist
    const diagGroups = obs.filter((o) => o.concept?.uuid === C.diagnosisGroup && !o.voided);
    expect(diagGroups.length, `Expected 9 diagnosisGroup obs, found ${diagGroups.length}`).toBe(9);

    // Each specific diagnosis type concept must appear in exactly one group
    for (const d of allDiagnoses) {
      const found = diagGroups.some((g) =>
        (g.groupMembers ?? []).some((m) => m.concept?.uuid === d.conceptUuid && !m.voided),
      );
      expect(found, `${d.label} (${d.conceptUuid}) not found in any diagnosisGroup in the database`).toBeTruthy();
    }

    // The "Other" group must also carry the description obs
    const otherGroup = diagGroups.find((g) =>
      (g.groupMembers ?? []).some((m) => m.concept?.uuid === C.diagnosisOther && !m.voided),
    );
    expect(otherGroup, 'Other diagnosis group not found').toBeTruthy();
    const descObs = findMember(otherGroup!, C.diagnosisOtherDescription);
    expect(descObs, 'Other diagnosis description obs missing').toBeTruthy();
    expect(String(descObs!.value)).toContain('Acute pain crisis');
  });

  // ── Full round-trip: save everything, reload page, verify DB + UI match ────
  test('all fields survive page reload and match database', async ({ page, api }) => {
    await scdFormPage.gotoPatientChart(patient.uuid);

    await scdFormPage.fillPersonalDetails({
      address: 'Roundtrip Address',
      comments: 'Roundtrip comment',
      contactNumbers: ['+256700999888'],
    });
    await scdFormPage.fillKeyDates({
      scdDiagnosisDate: '2021-05-20',
      ssuuboEnrollmentDate: '2021-06-01',
      pcvVaccinationDate: '2021-04-10',
    });
    await scdFormPage.enableTreatments({
      hydroxyurea: { startDate: '2022-01-15' },
      chronicTransfusion: { startDate: '2022-02-20' },
      physiotherapy: { startDate: '2022-03-01' },
    });
    await scdFormPage.addSibling({
      name: 'Bob Test',
      yearOfBirth: '2008',
      testedForScd: 'yes',
      testResult: 'positive',
    });
    await scdFormPage.addDiagnosis({ key: 'stroke', diagnosedDate: '2021-05-20' });
    await scdFormPage.addDiagnosis({ key: 'splenomegaly', diagnosedDate: '2021-06-15' });

    await scdFormPage.saveForm();
    await scdFormPage.waitForSaveSuccess();

    // ── Verify database directly ──────────────────────────────────────────────
    const obs = await fetchEncounterObs(api, patient.uuid);

    expect(findObs(obs, C.dateOfScdDiagnosis), 'SCD Diagnosis date missing in DB').toBeTruthy();
    expect(findObs(obs, C.dateOfSsuuboCareEnrollment), 'SSUUBO Enrollment date missing in DB').toBeTruthy();
    expect(findObs(obs, C.pcvVaccinationDate), 'PCV Vaccination date missing in DB').toBeTruthy();

    const huGroup = findObs(obs, C.hydroxyureaGroup);
    expect(huGroup, 'Hydroxyurea group missing in DB').toBeTruthy();
    expect(findMember(huGroup!, C.hydroxyureaEnabled), 'Hydroxyurea enabled missing in DB').toBeTruthy();
    expect(findMember(huGroup!, C.hydroxyureaStartDate), 'Hydroxyurea start date missing in DB').toBeTruthy();

    const ctGroup = findObs(obs, C.chronicTransfusionGroup);
    expect(ctGroup, 'Chronic Transfusion group missing in DB').toBeTruthy();
    expect(findMember(ctGroup!, C.chronicTransfusionEnabled), 'CT enabled missing in DB').toBeTruthy();

    const ptGroup = findObs(obs, C.physiotherapyGroup);
    expect(ptGroup, 'Physiotherapy group missing in DB').toBeTruthy();
    expect(findMember(ptGroup!, C.physiotherapyEnabled), 'Physiotherapy enabled missing in DB').toBeTruthy();

    const diagGroups = obs.filter((o) => o.concept?.uuid === C.diagnosisGroup && !o.voided);
    expect(diagGroups.length, 'Expected 2 diagnosis groups in DB').toBe(2);
    expect(
      diagGroups.some((g) => (g.groupMembers ?? []).some((m) => m.concept?.uuid === C.diagnosisStroke)),
      'Stroke diagnosis missing in DB',
    ).toBeTruthy();
    expect(
      diagGroups.some((g) => (g.groupMembers ?? []).some((m) => m.concept?.uuid === C.diagnosisSplenomegaly)),
      'Splenomegaly diagnosis missing in DB',
    ).toBeTruthy();

    // ── Verify UI matches DB after hard reload ────────────────────────────────
    await page.reload();
    await page.waitForSelector('[class*="treatmentItem"]', { timeout: 20000 });

    await expect(page.locator('dt:has-text("SCD Diagnosis") + dd')).toContainText('May 20, 2021');
    await expect(page.locator('dt:has-text("SSUUBO Care Enrollment") + dd')).toContainText('Jun 1, 2021');
    await expect(page.locator('dt:has-text("PCV Vaccination") + dd')).toContainText('Apr 10, 2021');
    await expect(page.locator('[class*="treatmentItem"]').filter({ hasText: 'Hydroxyurea' })).toBeVisible();
    await expect(page.locator('[class*="treatmentItem"]').filter({ hasText: 'Chronic Transfusion' })).toBeVisible();
    await expect(page.locator('[class*="treatmentItem"]').filter({ hasText: 'Physiotherapy' })).toBeVisible();
    await expect(page.locator('[class*="diagnosisList"] > div').filter({ hasText: 'Stroke' })).toBeVisible();
    await expect(page.locator('[class*="diagnosisList"] > div').filter({ hasText: 'Splenomegaly' })).toBeVisible();
  });
});
