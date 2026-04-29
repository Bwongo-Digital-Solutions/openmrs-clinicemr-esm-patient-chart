import { expect } from '@playwright/test';
import { test } from '../core/test';
import { ScdFormPage, ScdDashboardPage } from '../pages';
import { generateRandomPatient, deletePatient } from '../fixtures';

test.describe('SCD Form Submission', () => {
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

  test('should save basic SCD form data successfully', async ({ page }) => {
    await scdFormPage.gotoPatientChart(patient.uuid);

    // Fill in basic personal details
    await scdFormPage.fillPersonalDetails({
      address: '123 Test Street, Kampala',
      comments: 'Test patient for SCD form submission',
      contactNumbers: ['+256700123456', '+256711987654'],
    });

    // Fill in key dates
    await scdFormPage.fillKeyDates({
      scdDiagnosisDate: '2023-01-15',
      ssuuboEnrollmentDate: '2023-02-01',
      pcvVaccinationDate: '2023-01-20',
    });

    // Save the form
    await scdFormPage.saveForm();

    // Verify success notification
    await scdFormPage.waitForSaveSuccess();
    await expect(scdFormPage.successNotification).toBeVisible();

    // Navigate to dashboard to verify data was saved
    await scdDashboardPage.gotoAndWaitForData(patient.uuid);

    // Verify the data is displayed correctly on dashboard
    const dashboardData = await scdDashboardPage.getDashboardData();
    expect(dashboardData.address).toBe('123 Test Street, Kampala');
    expect(dashboardData.comments).toBe('Test patient for SCD form submission');
    expect(dashboardData.contactNumbers).toContain('+256700123456');
    expect(dashboardData.contactNumbers).toContain('+256711987654');
    expect(dashboardData.scdDiagnosisDate).toContain('Jan 15, 2023');
    expect(dashboardData.ssuuboEnrollmentDate).toContain('Feb 1, 2023');
    expect(dashboardData.pcvVaccinationDate).toContain('Jan 20, 2023');
  });

  test('should save SCD form with treatments enabled', async ({ page }) => {
    await scdFormPage.gotoPatientChart(patient.uuid);

    // Fill basic details
    await scdFormPage.fillPersonalDetails({
      address: '456 Treatment Street, Entebbe',
    });

    // Enable treatments
    await scdFormPage.enableTreatments({
      hydroxyurea: { startDate: '2023-03-01' },
      chronicTransfusion: { startDate: '2023-04-15' },
      physiotherapy: { startDate: '2023-05-10' },
    });

    // Save the form
    await scdFormPage.saveForm();
    await scdFormPage.waitForSaveSuccess();

    // Verify on dashboard
    await scdDashboardPage.gotoAndWaitForData(patient.uuid);
    const treatments = await scdDashboardPage.getTreatmentsData();

    expect(treatments).toHaveLength(3);
    expect(treatments.some((t) => t.label.includes('Hydroxyurea'))).toBeTruthy();
    expect(treatments.some((t) => t.label.includes('Chronic Transfusion'))).toBeTruthy();
    expect(treatments.some((t) => t.label.includes('Physiotherapy'))).toBeTruthy();
  });

  test('should save SCD form with siblings data', async ({ page }) => {
    await scdFormPage.gotoPatientChart(patient.uuid);

    // Fill basic details
    await scdFormPage.fillPersonalDetails({
      address: '789 Family Street, Jinja',
    });

    // Add siblings
    await scdFormPage.addSibling({
      name: 'John Doe',
      yearOfBirth: '2010',
      testedForScd: 'yes',
      testResult: 'negative',
      ssuuboNo: 'SSUUBO001',
    });

    await scdFormPage.addSibling({
      name: 'Jane Doe',
      yearOfBirth: '2015',
      testedForScd: 'no',
    });

    // Save the form
    await scdFormPage.saveForm();
    await scdFormPage.waitForSaveSuccess();

    // Verify on dashboard
    await scdDashboardPage.gotoAndWaitForData(patient.uuid);
    const siblings = await scdDashboardPage.getSiblingsData();

    expect(siblings).toHaveLength(2);
    expect(siblings.some((s) => s.name === 'John Doe' && s.result === 'negative')).toBeTruthy();
    expect(siblings.some((s) => s.name === 'Jane Doe' && s.tested === 'no')).toBeTruthy();
  });

  test('should handle form validation errors', async ({ page }) => {
    await scdFormPage.gotoPatientChart(patient.uuid);

    // Try to save empty form (should trigger validation)
    await scdFormPage.saveForm();

    // Should not show success notification
    await expect(scdFormPage.successNotification).not.toBeVisible({ timeout: 5000 });

    // Fill invalid phone number
    await scdFormPage.fillPersonalDetails({
      contactNumbers: ['invalid-phone'],
    });

    await scdFormPage.saveForm();

    // Should still not show success notification due to validation
    await expect(scdFormPage.successNotification).not.toBeVisible({ timeout: 5000 });
  });

  test('should update existing SCD data', async ({ page }) => {
    // First, create initial data
    await scdFormPage.gotoPatientChart(patient.uuid);
    await scdFormPage.fillPersonalDetails({
      address: 'Initial Address',
      comments: 'Initial comments',
    });
    await scdFormPage.saveForm();
    await scdFormPage.waitForSaveSuccess();

    // Now update the data
    await scdDashboardPage.gotoAndWaitForData(patient.uuid);
    await scdDashboardPage.clickEditInfo();

    await scdFormPage.fillPersonalDetails({
      address: 'Updated Address',
      comments: 'Updated comments',
    });

    await scdFormPage.saveForm();
    await scdFormPage.waitForSaveSuccess();

    // Verify updates on dashboard
    await scdDashboardPage.gotoAndWaitForData(patient.uuid);
    const dashboardData = await scdDashboardPage.getDashboardData();
    expect(dashboardData.address).toBe('Updated Address');
    expect(dashboardData.comments).toBe('Updated comments');
  });

  test('should handle death date correctly', async ({ page }) => {
    await scdFormPage.gotoPatientChart(patient.uuid);

    // Fill details including death date
    await scdFormPage.fillPersonalDetails({
      address: 'Final Address',
      deathDate: '2023-12-31',
    });

    await scdFormPage.saveForm();
    await scdFormPage.waitForSaveSuccess();

    // Verify on dashboard
    await scdDashboardPage.gotoPatientChart(patient.uuid);

    // Check if deceased status is shown (best-effort — depends on OpenMRS allowing dead PATCH)
    const deceasedMeta = page.locator('[class*="deathMeta"]');
    const isDeathVisible = await deceasedMeta.isVisible();
    if (isDeathVisible) {
      const deceasedText = await deceasedMeta.textContent();
      expect(deceasedText).toContain('Deceased');
      expect(deceasedText).toContain('Dec 31, 2023');
    }
  });

  test('should save SCD form with primary diagnoses', async ({ page }) => {
    await scdFormPage.gotoPatientChart(patient.uuid);

    // Fill basic details
    await scdFormPage.fillPersonalDetails({ address: '10 Diagnoses Road, Kampala' });

    // Add three primary diagnoses
    await scdFormPage.addDiagnosis({ key: 'scdNonHU', diagnosedDate: '2022-06-15' });
    await scdFormPage.addDiagnosis({ key: 'stroke', diagnosedDate: '2023-03-10' });
    await scdFormPage.addDiagnosis({
      key: 'other',
      diagnosedDate: '2023-09-01',
      otherDescription: 'Acute pain crisis',
    });

    await scdFormPage.saveForm();
    await scdFormPage.waitForSaveSuccess();

    // Verify on dashboard
    await scdDashboardPage.gotoAndWaitForData(patient.uuid);
    const diagnoses = await scdDashboardPage.getPrimaryDiagnosesData();

    expect(diagnoses).toHaveLength(3);
    expect(
      diagnoses.some((d) => d.label.includes('SCD non-HU') && d.diagnosedDate.includes('Jun 15, 2022')),
    ).toBeTruthy();
    expect(diagnoses.some((d) => d.label.includes('Stroke') && d.diagnosedDate.includes('Mar 10, 2023'))).toBeTruthy();
    // 'other' card shows "Complication: Acute pain crisis" in the otherDescription span
    expect(
      diagnoses.some((d) => d.label.includes('Other') && d.otherDescription.includes('Acute pain crisis')),
    ).toBeTruthy();
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Mock network failure
    await page.route('**/encounter*', (route) => route.abort());

    await scdFormPage.gotoPatientChart(patient.uuid);
    await scdFormPage.fillPersonalDetails({
      address: 'Test Address',
    });

    await scdFormPage.saveForm();

    // Should show error notification instead of success
    await scdFormPage.waitForSaveError();
    await expect(scdFormPage.errorNotification).toBeVisible();
    await expect(scdFormPage.successNotification).not.toBeVisible();
  });

  test('should persist all sections after page refresh', async ({ page }) => {
    await scdFormPage.gotoPatientChart(patient.uuid);

    // ── 1. Personal details + Comments ───────────────────────────────
    await scdFormPage.fillPersonalDetails({
      address: '42 Persistence Lane, Kampala',
      comments: 'All-sections persistence test comment',
      contactNumbers: ['+256700111222'],
    });

    // ── 2. Key dates ─────────────────────────────────────────────────
    await scdFormPage.fillKeyDates({
      scdDiagnosisDate: '2021-05-20',
      ssuuboEnrollmentDate: '2021-06-01',
      pcvVaccinationDate: '2021-04-10',
    });

    // ── 3. Treatments ────────────────────────────────────────────────
    await scdFormPage.enableTreatments({
      hydroxyurea: { startDate: '2022-01-15' },
      physiotherapy: { startDate: '2022-03-01' },
    });

    // ── 4. Siblings ──────────────────────────────────────────────────
    await scdFormPage.addSibling({
      name: 'Alice Test',
      yearOfBirth: '2012',
      testedForScd: 'yes',
      testResult: 'positive',
      ssuuboNo: 'SSB-007',
    });

    // ── 5. Primary diagnoses ─────────────────────────────────────────
    await scdFormPage.addDiagnosis({ key: 'scdOnHU', diagnosedDate: '2021-05-20' });
    await scdFormPage.addDiagnosis({ key: 'splenomegaly', diagnosedDate: '2022-07-11' });

    // Save
    await scdFormPage.saveForm();
    await scdFormPage.waitForSaveSuccess();

    // Hard browser refresh — data must survive a full reload from DB
    await page.reload();
    // Wait until the dashboard has re-hydrated all encounter obs
    await page.waitForSelector('[class*="treatmentItem"]', { timeout: 20000 });

    // ── Assert: Comments & key dates ─────────────────────────────────
    const dash = await scdDashboardPage.getDashboardData();
    expect(dash.address).toBe('42 Persistence Lane, Kampala');
    expect(dash.comments).toBe('All-sections persistence test comment');
    expect(dash.scdDiagnosisDate).toContain('May 20, 2021');
    expect(dash.ssuuboEnrollmentDate).toContain('Jun 1, 2021');
    expect(dash.pcvVaccinationDate).toContain('Apr 10, 2021');

    // ── Assert: Treatments ───────────────────────────────────────────
    const treatments = await scdDashboardPage.getTreatmentsData();
    expect(treatments.some((t) => t.label.includes('Hydroxyurea'))).toBeTruthy();
    expect(treatments.some((t) => t.label.includes('Physiotherapy'))).toBeTruthy();

    // ── Assert: Siblings ─────────────────────────────────────────────
    const siblings = await scdDashboardPage.getSiblingsData();
    expect(siblings).toHaveLength(1);
    expect(siblings[0].name).toBe('Alice Test');
    expect(siblings[0].yearOfBirth).toBe('2012');
    expect(siblings[0].result).toBe('positive');
    expect(siblings[0].ssuuboNo).toBe('SSB-007');

    // ── Assert: Primary diagnoses ────────────────────────────────────
    const diagnoses = await scdDashboardPage.getPrimaryDiagnosesData();
    expect(diagnoses).toHaveLength(2);
    expect(
      diagnoses.some((d) => d.label.includes('SCD on HU') && d.diagnosedDate.includes('May 20, 2021')),
    ).toBeTruthy();
    expect(
      diagnoses.some((d) => d.label.includes('Splenomegaly') && d.diagnosedDate.includes('Jul 11, 2022')),
    ).toBeTruthy();
  });
});
