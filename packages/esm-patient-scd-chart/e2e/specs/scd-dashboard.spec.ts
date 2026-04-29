import { expect } from '@playwright/test';
import { test } from '../core/test';
import { ScdFormPage, ScdDashboardPage } from '../pages';
import { generateRandomPatient, deletePatient } from '../fixtures';

test.describe('SCD Patient Dashboard', () => {
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

  test('should display empty state for new patient', async ({ page }) => {
    await scdDashboardPage.gotoPatientChart(patient.uuid);

    // Should show no data notification and edit button
    await expect(scdDashboardPage.noDataNotification).toBeVisible();
    await expect(scdDashboardPage.editInfoButton).toBeVisible();

    // Data cards must not be visible for a new patient
    await expect(scdDashboardPage.contactDetailsCard).not.toBeVisible();
    await expect(scdDashboardPage.keyDatesCard).not.toBeVisible();
  });

  test('should display patient data after form submission', async ({ page }) => {
    // First submit form data
    await scdFormPage.gotoPatientChart(patient.uuid);
    await scdFormPage.fillPersonalDetails({
      address: '123 Dashboard Test Street',
      contactNumbers: ['+256700123456'],
    });
    await scdFormPage.fillKeyDates({
      scdDiagnosisDate: '2023-01-15',
      ssuuboEnrollmentDate: '2023-02-01',
      pcvVaccinationDate: '2023-01-20',
    });
    await scdFormPage.saveForm();
    await scdFormPage.waitForSaveSuccess();

    // Then check dashboard
    await scdDashboardPage.gotoPatientChart(patient.uuid);

    // Should not show empty state
    await expect(scdDashboardPage.noDataNotification).not.toBeVisible();

    // Should show data cards
    await expect(scdDashboardPage.contactDetailsCard).toBeVisible();
    await expect(scdDashboardPage.keyDatesCard).toBeVisible();

    // Verify data display
    const dashboardData = await scdDashboardPage.getDashboardData();
    expect(dashboardData.address).toBe('123 Dashboard Test Street');
    expect(dashboardData.telephoneNumber).toContain('+256700123456');
  });

  test('should display patient demographics correctly', async ({ page, api }) => {
    const testPatient = await generateRandomPatient(api, {
      givenName: 'John',
      familyName: 'Doe',
      birthDate: '2010-05-15',
    });

    try {
      await scdFormPage.gotoPatientChart(testPatient.uuid);
      await scdFormPage.fillPersonalDetails({ address: 'Demographics Test Address' });
      await scdFormPage.saveForm();
      await scdFormPage.waitForSaveSuccess();

      await scdDashboardPage.gotoPatientChart(testPatient.uuid);
      await scdDashboardPage.dashboardTitle.waitFor({ state: 'visible', timeout: 15000 });

      const patientName = await scdDashboardPage.getPatientName();
      expect(patientName).toContain('John');
      expect(patientName).toContain('Doe');
    } finally {
      await deletePatient(api, testPatient.uuid).catch(() => {});
    }
  });

  test('should display treatments correctly', async ({ page }) => {
    await scdFormPage.gotoPatientChart(patient.uuid);
    await scdFormPage.fillPersonalDetails({ address: 'Test Address' });
    await scdFormPage.enableTreatments({
      hydroxyurea: { startDate: '2023-03-01', stopDate: '2023-06-30' },
      chronicTransfusion: { startDate: '2023-04-15' },
    });
    await scdFormPage.saveForm();
    await scdFormPage.waitForSaveSuccess();

    await scdDashboardPage.gotoPatientChart(patient.uuid);
    await scdDashboardPage.treatmentsCard.waitFor({ state: 'visible', timeout: 15000 });

    const treatments = await scdDashboardPage.getTreatmentsData();
    expect(treatments).toHaveLength(2);

    const hydroxyurea = treatments.find((t) => t.label.includes('Hydroxyurea'));
    expect(hydroxyurea).toBeTruthy();
    expect(hydroxyurea?.dates).toContain('Mar 1, 2023');
    expect(hydroxyurea?.dates).toContain('Jun 30, 2023');

    const chronicTransfusion = treatments.find((t) => t.label.includes('Chronic Transfusion'));
    expect(chronicTransfusion).toBeTruthy();
    expect(chronicTransfusion?.dates).toContain('Apr 15, 2023');
    expect(chronicTransfusion?.dates).toContain('ongoing');
  });

  test('should display siblings data correctly', async ({ page }) => {
    await scdFormPage.gotoPatientChart(patient.uuid);
    await scdFormPage.fillPersonalDetails({
      address: 'Test Address',
    });

    await scdFormPage.addSibling({
      name: 'Sibling One',
      yearOfBirth: '2010',
      testedForScd: 'yes',
      testResult: 'negative',
      ssuuboNo: 'SSUUBO001',
    });

    await scdFormPage.addSibling({
      name: 'Sibling Two',
      yearOfBirth: '2015',
      testedForScd: 'no',
    });

    await scdFormPage.saveForm();
    await scdFormPage.waitForSaveSuccess();

    await scdDashboardPage.gotoPatientChart(patient.uuid);
    await scdDashboardPage.siblingsCard.waitFor({ state: 'visible', timeout: 15000 });

    const siblings = await scdDashboardPage.getSiblingsData();
    expect(siblings).toHaveLength(2);

    const siblingOne = siblings.find((s) => s.name === 'Sibling One');
    expect(siblingOne).toBeTruthy();
    expect(siblingOne?.yearOfBirth).toBe('2010');
    expect(siblingOne?.tested).toBe('yes');
    expect(siblingOne?.result).toBe('negative');
    expect(siblingOne?.ssuuboNo).toBe('SSUUBO001');

    const siblingTwo = siblings.find((s) => s.name === 'Sibling Two');
    expect(siblingTwo).toBeTruthy();
    expect(siblingTwo?.yearOfBirth).toBe('2015');
    expect(siblingTwo?.tested).toBe('no');
  });

  test('should navigate to edit mode correctly', async ({ page }) => {
    await scdDashboardPage.gotoPatientChart(patient.uuid);

    // Edit Information button is always present on the dashboard
    await scdDashboardPage.clickEditInfo();

    // Should switch to form view
    await expect(scdFormPage.formTitle).toBeVisible();
    await expect(scdFormPage.saveButton).toBeVisible();
  });

  test('should handle back navigation correctly', async ({ page }) => {
    // Standalone page (URL contains /scd-patient) always shows the back button
    await page.goto(`${process.env.E2E_BASE_URL}/spa/scd-patient?patientUuid=${patient.uuid}`);
    await scdDashboardPage.dashboardTitle.waitFor({ state: 'visible', timeout: 20000 });

    await expect(scdDashboardPage.backToPatientChartButton).toBeVisible();
    await scdDashboardPage.backToPatientChartButton.click();

    await expect(page).toHaveURL(/\/patient\/.*\/chart/, { timeout: 10000 });
  });

  test('should display primary diagnoses correctly', async ({ page }) => {
    await scdFormPage.gotoPatientChart(patient.uuid);
    await scdFormPage.fillPersonalDetails({
      address: 'Test Address',
    });

    // This would require adding primary diagnoses through the form
    // For now, we'll test the empty state
    await scdFormPage.saveForm();
    await scdFormPage.waitForSaveSuccess();

    await scdDashboardPage.gotoPatientChart(patient.uuid);

    const diagnoses = await scdDashboardPage.getPrimaryDiagnosesData();
    expect(diagnoses).toHaveLength(0);
  });

  test('should handle patient photo correctly', async ({ page }) => {
    await scdFormPage.gotoPatientChart(patient.uuid);
    await scdFormPage.fillPersonalDetails({
      address: 'Test Address',
    });

    // Note: Photo upload testing would require a test image file
    // For now, we'll test without photo
    await scdFormPage.saveForm();
    await scdFormPage.waitForSaveSuccess();

    await scdDashboardPage.gotoPatientChart(patient.uuid);

    // Should not show patient photo (no photo uploaded)
    const hasPhoto = await scdDashboardPage.isPatientPhotoVisible();
    expect(hasPhoto).toBeFalsy();
  });

  test('should refresh data after updates', async ({ page }) => {
    // Create initial data
    await scdFormPage.gotoPatientChart(patient.uuid);
    await scdFormPage.fillPersonalDetails({
      address: 'Initial Address',
    });
    await scdFormPage.saveForm();
    await scdFormPage.waitForSaveSuccess();

    // Verify on dashboard
    await scdDashboardPage.gotoPatientChart(patient.uuid);
    let dashboardData = await scdDashboardPage.getDashboardData();
    expect(dashboardData.address).toBe('Initial Address');

    // Update data
    await scdDashboardPage.clickEditInfo();
    await scdFormPage.fillPersonalDetails({
      address: 'Updated Address',
    });
    await scdFormPage.saveForm();
    await scdFormPage.waitForSaveSuccess();

    // Refresh dashboard
    await page.reload();
    await scdDashboardPage.waitForDashboardLoad();

    // Should show updated data
    dashboardData = await scdDashboardPage.getDashboardData();
    expect(dashboardData.address).toBe('Updated Address');
  });

  test('should handle loading states correctly', async ({ page }) => {
    await scdDashboardPage.gotoPatientChart(patient.uuid);

    // Dashboard title must render within a reasonable time (loading skeleton should not hang)
    await expect(scdDashboardPage.dashboardTitle).toBeVisible({ timeout: 10000 });
  });
});
