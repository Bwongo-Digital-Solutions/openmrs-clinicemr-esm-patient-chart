import type { Page, Locator } from '@playwright/test';

export class ScdFormPage {
  readonly page: Page;
  readonly formTitle: Locator;
  readonly personalDetailsSection: Locator;
  readonly photographSection: Locator;
  readonly siblingsSection: Locator;
  readonly keyDatesSection: Locator;
  readonly treatmentsSection: Locator;
  readonly primaryDiagnosesSection: Locator;
  readonly addressInput: Locator;
  readonly deathDateInput: Locator;
  readonly commentsTextarea: Locator;
  readonly contactNumberInput: Locator;
  readonly addContactButton: Locator;
  readonly photoUploadInput: Locator;
  readonly uploadPhotoButton: Locator;
  readonly addSiblingButton: Locator;
  readonly saveButton: Locator;
  readonly successNotification: Locator;
  readonly errorNotification: Locator;
  readonly isSavingIndicator: Locator;
  readonly scdDiagnosisDateInput: Locator;
  readonly ssuuboEnrollmentDateInput: Locator;
  readonly pcvVaccinationDateInput: Locator;
  readonly hydroxyureaCheckbox: Locator;
  readonly hydroxyureaStartDateInput: Locator;
  readonly chronicTransfusionCheckbox: Locator;
  readonly chronicTransfusionStartDateInput: Locator;
  readonly physiotherapyCheckbox: Locator;
  readonly physiotherapyStartDateInput: Locator;

  constructor(page: Page) {
    this.page = page;
    this.formTitle = page.getByRole('heading', { name: /sheet 1.*general information/i });
    this.personalDetailsSection = page.getByRole('heading', { name: /personal details/i });
    this.photographSection = page.getByRole('heading', { name: /photograph/i });
    this.siblingsSection = page.getByRole('heading', { name: /siblings/i });
    this.keyDatesSection = page.getByRole('heading', { name: /key dates/i });
    this.treatmentsSection = page.getByRole('heading', { name: /treatments/i });
    this.primaryDiagnosesSection = page.getByRole('heading', { name: /primary diagnoses/i });
    this.addressInput = page.locator('#address');
    this.deathDateInput = page.locator('#death-date');
    this.commentsTextarea = page.locator('#comments');
    this.contactNumberInput = page.locator('#contact-0');
    this.addContactButton = page.getByRole('button', { name: /add contact number/i });
    this.photoUploadInput = page.locator('#photo-upload-input');
    this.uploadPhotoButton = page.getByRole('button', { name: /upload photo/i });
    this.addSiblingButton = page.getByRole('button', { name: /add sibling/i });
    this.saveButton = page.getByRole('button', { name: /save patient information/i });
    this.successNotification = page
      .locator('.cds--inline-notification--success')
      .filter({ hasText: /saved successfully/i });
    this.errorNotification = page.locator('.cds--inline-notification--error').filter({ hasText: /error saving data/i });
    this.isSavingIndicator = page.getByText(/saving/i);
    this.scdDiagnosisDateInput = page.locator('#scd-diagnosis-date');
    this.ssuuboEnrollmentDateInput = page.locator('#ssuubo-enrollment-date');
    this.pcvVaccinationDateInput = page.locator('#pcv-vaccination-date');
    this.hydroxyureaCheckbox = page.locator('#hydroxyurea-enabled');
    this.hydroxyureaStartDateInput = page.locator('#hydroxyurea-start');
    this.chronicTransfusionCheckbox = page.locator('#chronic-transfusion-enabled');
    this.chronicTransfusionStartDateInput = page.locator('#chronic-transfusion-start');
    this.physiotherapyCheckbox = page.locator('#physiotherapy-enabled');
    this.physiotherapyStartDateInput = page.locator('#physiotherapy-start');
  }

  async gotoPatientChart(patientUuid: string) {
    // Standalone route: /spa/scd-patient?patientUuid=<uuid>
    await this.page.goto(`${process.env.E2E_BASE_URL}/spa/scd-patient?patientUuid=${patientUuid}`);
    // Dashboard is always shown first; click Edit Information to open the form
    await this.page
      .getByRole('heading', { name: /scd patient dashboard/i })
      .waitFor({ state: 'visible', timeout: 20000 });
    await this.page.getByRole('button', { name: /edit information/i }).click();
    await this.formTitle.waitFor({ state: 'visible', timeout: 10000 });
  }

  async fillPersonalDetails(data: {
    address?: string;
    deathDate?: string;
    comments?: string;
    contactNumbers?: string[];
  }) {
    if (data.address) {
      await this.addressInput.fill(data.address);
    }
    if (data.deathDate) {
      await this.fillDateInput(this.deathDateInput, data.deathDate);
    }
    if (data.comments) {
      await this.commentsTextarea.fill(data.comments);
    }
    if (data.contactNumbers && data.contactNumbers.length > 0) {
      await this.contactNumberInput.fill(data.contactNumbers[0]);
      for (let i = 1; i < data.contactNumbers.length; i++) {
        await this.addContactButton.click();
        await this.page.locator(`#contact-${i}`).fill(data.contactNumbers[i]);
      }
    }
  }

  /**
   * Fill a Carbon DatePickerInput (Flatpickr-backed) by triple-clicking then typing
   * the YYYY-MM-DD date string and pressing Tab to commit.
   */
  private async fillDateInput(locator: Locator, isoDate: string) {
    await locator.scrollIntoViewIfNeeded();
    // Directly invoke Flatpickr's setDate so it updates internal state AND
    // fires the onChange callback that updates the React form field.
    await locator.evaluate((el: HTMLInputElement, date: string) => {
      // Carbon DatePicker attaches _flatpickr to the .cds--date-picker wrapper,
      // not to the <input> element itself. Traverse up to find it.
      const container = el.closest('.cds--date-picker') ?? el.closest('[data-date-picker]') ?? el;
      const fp = (container as any)._flatpickr ?? (el as any)._flatpickr;
      if (fp) {
        fp.setDate(date, true); // true = fire all change events
      } else {
        // Last resort: set value and dispatch events
        el.value = date;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, isoDate);
    await locator.press('Tab');
  }

  async fillKeyDates(data: { scdDiagnosisDate?: string; ssuuboEnrollmentDate?: string; pcvVaccinationDate?: string }) {
    if (data.scdDiagnosisDate) {
      await this.fillDateInput(this.scdDiagnosisDateInput, data.scdDiagnosisDate);
    }
    if (data.ssuuboEnrollmentDate) {
      await this.fillDateInput(this.ssuuboEnrollmentDateInput, data.ssuuboEnrollmentDate);
    }
    if (data.pcvVaccinationDate) {
      await this.fillDateInput(this.pcvVaccinationDateInput, data.pcvVaccinationDate);
    }
  }

  async enableTreatments(data: {
    hydroxyurea?: { startDate?: string; stopDate?: string };
    chronicTransfusion?: { startDate?: string; stopDate?: string };
    physiotherapy?: { startDate?: string; stopDate?: string };
  }) {
    if (data.hydroxyurea) {
      await this.page.locator('label[for="hydroxyurea-enabled"]').click();
      if (data.hydroxyurea.startDate) {
        await this.fillDateInput(this.hydroxyureaStartDateInput, data.hydroxyurea.startDate);
      }
      if (data.hydroxyurea.stopDate) {
        await this.fillDateInput(this.page.locator('#hydroxyurea-stop'), data.hydroxyurea.stopDate);
      }
    }
    if (data.chronicTransfusion) {
      await this.page.locator('label[for="chronic-transfusion-enabled"]').click();
      if (data.chronicTransfusion.startDate) {
        await this.fillDateInput(this.chronicTransfusionStartDateInput, data.chronicTransfusion.startDate);
      }
      if (data.chronicTransfusion.stopDate) {
        await this.fillDateInput(this.page.locator('#chronic-transfusion-stop'), data.chronicTransfusion.stopDate);
      }
    }
    if (data.physiotherapy) {
      await this.page.locator('label[for="physiotherapy-enabled"]').click();
      if (data.physiotherapy.startDate) {
        await this.fillDateInput(this.physiotherapyStartDateInput, data.physiotherapy.startDate);
      }
      if (data.physiotherapy.stopDate) {
        await this.fillDateInput(this.page.locator('#physiotherapy-stop'), data.physiotherapy.stopDate);
      }
    }
  }

  async addSibling(data: {
    name: string;
    yearOfBirth: string;
    testedForScd: string;
    testResult?: string;
    ssuuboNo?: string;
  }) {
    const countBefore = await this.page.locator('[id^="sibling-name-"]').count();
    await this.addSiblingButton.click();
    // Wait for a new sibling row to appear
    await this.page.waitForFunction((n) => document.querySelectorAll('[id^="sibling-name-"]').length > n, countBefore, {
      timeout: 5000,
    });
    // Get the UUID-based id of the newly added sibling name input (the last one)
    const allNameInputs = await this.page.locator('[id^="sibling-name-"]').all();
    const lastInput = allNameInputs[allNameInputs.length - 1];
    const rawId = await lastInput.getAttribute('id'); // e.g. "sibling-name-<uuid>"
    const uuid = rawId?.replace('sibling-name-', '') ?? '';

    await this.page.locator(`#sibling-name-${uuid}`).fill(data.name);
    await this.page.locator(`#sibling-yob-${uuid}`).fill(data.yearOfBirth);
    await this.page.locator(`#sibling-tested-${uuid}`).selectOption(data.testedForScd);

    if (data.testedForScd === 'yes' && data.testResult) {
      await this.page.locator(`#sibling-result-${uuid}`).selectOption(data.testResult);
    }
    if (data.ssuuboNo) {
      await this.page.locator(`#sibling-ssuubo-${uuid}`).fill(data.ssuuboNo);
    }
  }

  async addDiagnosis(data: {
    key: string; // e.g. 'scdNonHU', 'stroke', 'other'
    diagnosedDate: string; // ISO YYYY-MM-DD
    otherDescription?: string;
  }) {
    // Click the label to toggle the diagnosis checkbox (avoids pointer-event interception)
    await this.page.locator(`label[for="diagnosis-${data.key}"]`).click();
    // Wait for date input to appear
    const dateInput = this.page.locator(`#diagnosis-date-${data.key}`);
    await dateInput.waitFor({ state: 'visible', timeout: 5000 });
    await this.fillDateInput(dateInput, data.diagnosedDate);
    if (data.key === 'other' && data.otherDescription) {
      await this.page.locator('#diagnosis-other-description').fill(data.otherDescription);
    }
  }

  async uploadPhoto(filePath: string) {
    await this.uploadPhotoButton.click();
    await this.photoUploadInput.setInputFiles(filePath);
  }

  async saveForm() {
    await this.saveButton.click();
  }

  async waitForSaveSuccess() {
    // Race: the success notification (briefly visible before onSave hands off)
    // OR the dashboard title (appears after the form unmounts post-save).
    await Promise.race([
      this.successNotification.waitFor({ state: 'visible', timeout: 20000 }),
      this.page.locator('h2:has-text("SCD Patient Dashboard")').waitFor({ state: 'visible', timeout: 20000 }),
    ]);
  }

  async waitForSaveError() {
    await this.errorNotification.waitFor({ state: 'visible', timeout: 15000 });
  }

  async isFormVisible() {
    return await this.formTitle.isVisible();
  }

  async getFormData() {
    const address = await this.addressInput.inputValue();
    const comments = await this.commentsTextarea.inputValue();
    const contactNumber = await this.contactNumberInput.inputValue();

    return {
      address,
      comments,
      contactNumber,
    };
  }
}
