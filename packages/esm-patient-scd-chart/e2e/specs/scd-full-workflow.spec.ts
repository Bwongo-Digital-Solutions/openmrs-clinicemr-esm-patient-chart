/**
 * SCD Full Workflow Test
 *
 * Fills EVERY form field (all dates are past dates), saves, navigates back to
 * the patient chart, reopens the SCD dashboard and verifies every field is
 * displayed correctly on the summary dashboard.
 */
import { expect } from '@playwright/test';
import { test } from '../core/test';
import { ScdFormPage, ScdDashboardPage } from '../pages';
import { generateRandomPatient, deletePatient } from '../fixtures';

// ---------------------------------------------------------------------------
// Test data – all dates are firmly in the past
// ---------------------------------------------------------------------------
const D = {
  address: 'Plot 15, Kampala Road, Kampala',
  contact1: '+256700111222',
  contact2: '+256711333444',
  comments: 'SCD confirmed at age 2. Enrolled in SSUUBO program 2020.',

  scdDiagnosisDate: '2020-03-15',
  ssuuboEnrollmentDate: '2020-06-01',
  pcvVaccinationDate: '2021-09-20',

  hydroxyureaStart: '2020-07-01',
  hydroxyureaStop: '2022-12-31',

  chronicTransfusionStart: '2021-01-15',
  // no stop → displayed as "ongoing"

  physiotherapyStart: '2022-03-01',
  physiotherapyStop: '2023-06-30',

  sibling1Name: 'Alice Nakato',
  sibling1Yob: '2015',
  sibling1Tested: 'yes' as const,
  sibling1Result: 'negative' as const,
  sibling1Ssuubo: 'SSU-001',

  sibling2Name: 'Bob Kato',
  sibling2Yob: '2012',
  sibling2Tested: 'yes' as const,
  sibling2Result: 'positive' as const,
  sibling2Ssuubo: 'SSU-002',

  diag1Key: 'scdNonHU',
  diag1Date: '2020-03-15',
  diag2Key: 'stroke',
  diag2Date: '2021-06-10',
  diag3Key: 'splenomegaly',
  diag3Date: '2021-08-20',
  diag4Key: 'other',
  diag4Date: '2022-01-01',
  diag4Other: 'Avascular necrosis of hip',
} as const;

/** Mirror the dashboard's formatDate helper so assertions match exactly. */
function fmt(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// ---------------------------------------------------------------------------

test.describe('SCD Full Workflow', () => {
  let patient: any;
  let scdFormPage: ScdFormPage;
  let scdDashboardPage: ScdDashboardPage;

  test.beforeEach(async ({ page, api }) => {
    patient = await generateRandomPatient(api);
    scdFormPage = new ScdFormPage(page);
    scdDashboardPage = new ScdDashboardPage(page);
  });

  test.afterEach(async ({ api }) => {
    if (patient?.uuid) {
      await deletePatient(api, patient.uuid).catch(() => {});
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  test('fill every form field → save → back to chart → reopen SCD dashboard → all data visible', async ({ page }) => {
    // ── 1. Open the form ────────────────────────────────────────────────
    await scdFormPage.gotoPatientChart(patient.uuid);

    // ── 2. Personal details ─────────────────────────────────────────────
    await scdFormPage.fillPersonalDetails({
      address: D.address,
      comments: D.comments,
      contactNumbers: [D.contact1, D.contact2],
    });

    // ── 3. Key dates ────────────────────────────────────────────────────
    await scdFormPage.fillKeyDates({
      scdDiagnosisDate: D.scdDiagnosisDate,
      ssuuboEnrollmentDate: D.ssuuboEnrollmentDate,
      pcvVaccinationDate: D.pcvVaccinationDate,
    });

    // ── 4. Treatments (all three, with start + stop dates) ───────────────
    await scdFormPage.enableTreatments({
      hydroxyurea: { startDate: D.hydroxyureaStart, stopDate: D.hydroxyureaStop },
      chronicTransfusion: { startDate: D.chronicTransfusionStart /* no stop → ongoing */ },
      physiotherapy: { startDate: D.physiotherapyStart, stopDate: D.physiotherapyStop },
    });

    // ── 5. Siblings ─────────────────────────────────────────────────────
    await scdFormPage.addSibling({
      name: D.sibling1Name,
      yearOfBirth: D.sibling1Yob,
      testedForScd: D.sibling1Tested,
      testResult: D.sibling1Result,
      ssuuboNo: D.sibling1Ssuubo,
    });
    await scdFormPage.addSibling({
      name: D.sibling2Name,
      yearOfBirth: D.sibling2Yob,
      testedForScd: D.sibling2Tested,
      testResult: D.sibling2Result,
      ssuuboNo: D.sibling2Ssuubo,
    });

    // ── 6. Primary diagnoses ─────────────────────────────────────────────
    await scdFormPage.addDiagnosis({ key: D.diag1Key, diagnosedDate: D.diag1Date });
    await scdFormPage.addDiagnosis({ key: D.diag2Key, diagnosedDate: D.diag2Date });
    await scdFormPage.addDiagnosis({ key: D.diag3Key, diagnosedDate: D.diag3Date });
    await scdFormPage.addDiagnosis({
      key: D.diag4Key,
      diagnosedDate: D.diag4Date,
      otherDescription: D.diag4Other,
    });

    // ── 7. Save ─────────────────────────────────────────────────────────
    await scdFormPage.saveForm();
    await scdFormPage.waitForSaveSuccess();

    // ── 8. Navigate back to patient chart ────────────────────────────────
    // After save the dashboard is shown; click the back button.
    await scdDashboardPage.dashboardTitle.waitFor({ state: 'visible', timeout: 20000 });
    await scdDashboardPage.backToPatientChartButton.waitFor({ state: 'visible', timeout: 5000 });
    await scdDashboardPage.backToPatientChartButton.click();

    // Should land on the patient chart URL
    await expect(page).toHaveURL(/\/patient\/.*\/chart/, { timeout: 15000 });

    // ── 9. Reopen SCD dashboard (standalone page) to verify persistence ───
    // Navigate to the standalone SCD summary page – this is the same route
    // opened by the patient chart's SCD General Info sidebar link.
    await scdDashboardPage.gotoPatientChart(patient.uuid);

    // ── 10. Wait for all data to be fully loaded ─────────────────────────
    await scdDashboardPage.treatmentsCard.waitFor({ state: 'visible', timeout: 15000 });
    await scdDashboardPage.siblingsCard.waitFor({ state: 'visible', timeout: 15000 });

    // ── 11. Verify Contact Details card ──────────────────────────────────
    await expect(page.locator('dd').filter({ hasText: D.address })).toBeVisible();
    await expect(page.locator('.cds--tag').filter({ hasText: D.contact1 })).toBeVisible();
    await expect(page.locator('.cds--tag').filter({ hasText: D.contact2 })).toBeVisible();
    await expect(page.locator('dd').filter({ hasText: D.comments })).toBeVisible();

    // ── 12. Verify Key Dates card ─────────────────────────────────────────
    await expect(page.locator('dd').filter({ hasText: fmt(D.scdDiagnosisDate) })).toBeVisible();
    await expect(page.locator('dd').filter({ hasText: fmt(D.ssuuboEnrollmentDate) })).toBeVisible();
    await expect(page.locator('dd').filter({ hasText: fmt(D.pcvVaccinationDate) })).toBeVisible();

    // ── 13. Verify Treatments card ────────────────────────────────────────
    const treatments = await scdDashboardPage.getTreatmentsData();
    expect(treatments).toHaveLength(3);

    const hu = treatments.find((t) => t.label.includes('Hydroxyurea'));
    expect(hu).toBeTruthy();
    expect(hu?.dates).toContain(fmt(D.hydroxyureaStart));
    expect(hu?.dates).toContain(fmt(D.hydroxyureaStop));

    const ct = treatments.find((t) => t.label.includes('Chronic Transfusion'));
    expect(ct).toBeTruthy();
    expect(ct?.dates).toContain(fmt(D.chronicTransfusionStart));
    expect(ct?.dates).toContain('ongoing');

    const pt = treatments.find((t) => t.label.includes('Physiotherapy'));
    expect(pt).toBeTruthy();
    expect(pt?.dates).toContain(fmt(D.physiotherapyStart));
    expect(pt?.dates).toContain(fmt(D.physiotherapyStop));

    // ── 14. Verify Siblings card ──────────────────────────────────────────
    const siblings = await scdDashboardPage.getSiblingsData();
    expect(siblings).toHaveLength(2);

    const s1 = siblings.find((s) => s.name === D.sibling1Name);
    expect(s1).toBeTruthy();
    expect(s1?.yearOfBirth).toBe(D.sibling1Yob);
    expect(s1?.tested).toBe(D.sibling1Tested);
    expect(s1?.result).toBe(D.sibling1Result);
    expect(s1?.ssuuboNo).toBe(D.sibling1Ssuubo);

    const s2 = siblings.find((s) => s.name === D.sibling2Name);
    expect(s2).toBeTruthy();
    expect(s2?.yearOfBirth).toBe(D.sibling2Yob);
    expect(s2?.tested).toBe(D.sibling2Tested);
    expect(s2?.result).toBe(D.sibling2Result);
    expect(s2?.ssuuboNo).toBe(D.sibling2Ssuubo);

    // ── 15. Verify Primary Diagnoses card ─────────────────────────────────
    const diagnoses = await scdDashboardPage.getPrimaryDiagnosesData();
    expect(diagnoses).toHaveLength(4);

    const diag1 = diagnoses.find((d) => d.label.includes('SCD non-HU'));
    expect(diag1).toBeTruthy();
    expect(diag1?.diagnosedDate).toContain(fmt(D.diag1Date));

    const diag2 = diagnoses.find((d) => d.label.includes('Stroke'));
    expect(diag2).toBeTruthy();
    expect(diag2?.diagnosedDate).toContain(fmt(D.diag2Date));

    const diag3 = diagnoses.find((d) => d.label.includes('Splenomegaly'));
    expect(diag3).toBeTruthy();
    expect(diag3?.diagnosedDate).toContain(fmt(D.diag3Date));

    const diag4 = diagnoses.find((d) => d.label.includes('Other'));
    expect(diag4).toBeTruthy();
    expect(diag4?.diagnosedDate).toContain(fmt(D.diag4Date));
    expect(diag4?.otherDescription).toContain(D.diag4Other);
  });
});
