import type { Page, Locator } from '@playwright/test';

export class ScdDashboardPage {
  readonly page: Page;
  readonly dashboardTitle: Locator;
  readonly editInfoButton: Locator;
  readonly patientName: Locator;
  readonly patientPhoto: Locator;
  readonly contactDetailsCard: Locator;
  readonly keyDatesCard: Locator;
  readonly treatmentsCard: Locator;
  readonly siblingsCard: Locator;
  readonly primaryDiagnosesCard: Locator;
  readonly addressValue: Locator;
  readonly telephoneNumberValue: Locator;
  readonly scdDiagnosisDateValue: Locator;
  readonly ssuuboEnrollmentDateValue: Locator;
  readonly pcvVaccinationDateValue: Locator;
  readonly noDataNotification: Locator;
  readonly backToPatientChartButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dashboardTitle = page.getByRole('heading', { name: /scd patient dashboard/i });
    this.editInfoButton = page.getByRole('button', { name: /edit information/i });
    this.patientName = page.locator('[class*="patientName"]');
    this.patientPhoto = page.locator('.patientPhoto');
    this.contactDetailsCard = page.getByRole('heading', { name: /contact details/i });
    this.keyDatesCard = page.getByRole('heading', { name: /key dates/i });
    this.treatmentsCard = page.getByRole('heading', { name: /treatments/i });
    this.siblingsCard = page.getByRole('heading', { name: /siblings/i });
    this.primaryDiagnosesCard = page.getByRole('heading', { name: /primary diagnoses/i });
    this.addressValue = page.locator('dt:has-text("Address") + dd');
    this.telephoneNumberValue = page.locator('dt:has-text("Telephone Number") + dd');
    this.scdDiagnosisDateValue = page.locator('dt:has-text("SCD Diagnosis") + dd');
    this.ssuuboEnrollmentDateValue = page.locator('dt:has-text("SSUUBO Care Enrollment") + dd');
    this.pcvVaccinationDateValue = page.locator('dt:has-text("PCV Vaccination") + dd');
    this.noDataNotification = page.getByText(/no patient data recorded yet/i);
    this.backToPatientChartButton = page.getByRole('button', { name: /back to patient chart/i });
  }

  async gotoPatientChart(patientUuid: string) {
    await this.page.goto(`${process.env.E2E_BASE_URL}/spa/scd-patient?patientUuid=${patientUuid}`);
    // Dashboard title is always rendered (empty-state or with data)
    await this.dashboardTitle.waitFor({ state: 'visible', timeout: 20000 });
  }

  async gotoAndWaitForData(patientUuid: string) {
    await this.gotoPatientChart(patientUuid);
    // Wait until the Telephone Number dt/dd pair appears — it only renders once
    // BOTH the encounter (obs) AND person attrs (phone numbers) have loaded.
    await this.page.waitForSelector('dt:has-text("Telephone Number"), .cds--inline-notification--info', {
      timeout: 20000,
    });
  }

  async clickEditInfo() {
    await this.editInfoButton.click();
  }

  async waitForDashboardLoad() {
    await this.dashboardTitle.waitFor({ state: 'visible', timeout: 10000 });
  }

  async getDashboardData() {
    const address = await this.addressValue.textContent();
    const telephoneNumber = await this.telephoneNumberValue.textContent();
    const scdDiagnosisDate = await this.scdDiagnosisDateValue.textContent();
    const ssuuboEnrollmentDate = await this.ssuuboEnrollmentDateValue.textContent();
    const pcvVaccinationDate = await this.pcvVaccinationDateValue.textContent();

    return {
      address: address?.trim() || '',
      telephoneNumber: telephoneNumber?.trim() || '',
      scdDiagnosisDate: scdDiagnosisDate?.trim() || '',
      ssuuboEnrollmentDate: ssuuboEnrollmentDate?.trim() || '',
      pcvVaccinationDate: pcvVaccinationDate?.trim() || '',
    };
  }

  async getEmergencyContacts(): Promise<Array<{ label: string; phone: string }>> {
    const contacts: Array<{ label: string; phone: string }> = [];
    const labels = ['Parent/Guardian', 'Spouse/Partner', 'Emergency Contact'];
    for (const label of labels) {
      const dd = this.page.locator(`dt:has-text("${label}") + dd`);
      if (await dd.isVisible().catch(() => false)) {
        const phone = await dd.textContent();
        if (phone && phone.trim() !== '—') {
          contacts.push({ label, phone: phone.trim() });
        }
      }
    }
    return contacts;
  }

  async hasData(): Promise<boolean> {
    return !(await this.noDataNotification.isVisible());
  }

  async getPatientName(): Promise<string> {
    return (await this.patientName.textContent()) || '';
  }

  async isPatientPhotoVisible(): Promise<boolean> {
    return await this.patientPhoto.isVisible();
  }

  async getTreatmentsData() {
    const treatmentItems = await this.page.locator('[class*="treatmentItem"]').all();
    const treatments = [];

    for (const item of treatmentItems) {
      const label = await item.locator('.cds--tag').textContent();
      const dates = await item.locator('[class*="treatmentDates"]').textContent();
      treatments.push({
        label: label?.trim() || '',
        dates: dates?.trim() || '',
      });
    }

    return treatments;
  }

  async getSiblingsData() {
    // Carbon StructuredList renders rows as divs, not <tr>
    const siblingRows = await this.page
      .locator('.cds--structured-list-row:not(.cds--structured-list-row--header-row)')
      .all();
    const siblings = [];

    for (const row of siblingRows) {
      const cells = await row.locator('.cds--structured-list-td').all();
      if (cells.length >= 5) {
        const name = await cells[0].textContent();
        const yearOfBirth = await cells[1].textContent();
        const tested = await cells[2].textContent();
        const result = await cells[3].textContent();
        const ssuuboNo = await cells[4].textContent();

        siblings.push({
          name: name?.trim() || '',
          yearOfBirth: yearOfBirth?.trim() || '',
          tested: tested?.trim() || '',
          result: result?.trim() || '',
          ssuuboNo: ssuuboNo?.trim() || '',
        });
      }
    }

    return siblings;
  }

  async getPrimaryDiagnosesData() {
    // Use direct children of diagnosisList to avoid matching diagnosisCardHeader
    const diagnosisCards = await this.page.locator('[class*="diagnosisList"] > div').all();
    const diagnoses = [];

    for (const card of diagnosisCards) {
      const label = await card.locator('.cds--tag').textContent();
      const dateEl = card.locator('[class*="diagnosisDate"]');
      const diagnosedDate = (await dateEl.isVisible()) ? await dateEl.textContent() : '';
      const otherEl = card.locator('[class*="diagnosisOther"]');
      const otherDescription = (await otherEl.isVisible()) ? await otherEl.textContent() : '';

      diagnoses.push({
        label: label?.trim() || '',
        diagnosedDate: diagnosedDate?.trim() || '',
        otherDescription: otherDescription?.trim() || '',
      });
    }

    return diagnoses;
  }
}
