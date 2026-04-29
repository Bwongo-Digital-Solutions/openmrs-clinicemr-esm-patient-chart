import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Button,
  Checkbox,
  DatePicker,
  DatePickerInput,
  Form,
  FormGroup,
  Grid,
  Column,
  InlineLoading,
  InlineNotification,
  Select,
  SelectItem,
  TextArea,
  TextInput,
  Tile,
} from '@carbon/react';
import { Add, TrashCan, UserAvatar } from '@carbon/icons-react';
import { useTranslation } from 'react-i18next';
import { useConfig, showSnackbar } from '@openmrs/esm-framework';
import {
  type ScdPatientGeneralInfo,
  type Sibling,
  type PrimaryDiagnosis,
  type DiagnosisKey,
  DIAGNOSIS_OPTIONS,
  initialFormState,
} from './types';
import { type Config } from '../config-schema';
import {
  saveScdEncounter,
  uploadPatientPhoto,
  usePatientDemographics,
  usePersonDetails,
  savePersonDetails,
  saveContactNumbers,
} from './scd-patient.resource';
import styles from './scd-general-info-form.scss';

interface ContactNumberErrors extends Array<string | undefined> {}

interface SiblingErrors {
  name?: string;
  yearOfBirth?: string;
  testedForScd?: string;
  testResult?: string;
}

interface DiagnosisErrors {
  diagnosedDate?: string;
  otherDescription?: string;
}

interface FormErrors {
  address?: string;
  dateOfScdDiagnosis?: string;
  dateOfSsuuboCareEnrollment?: string;
  contactNumbers?: ContactNumberErrors;
  hydroxyureaStartDate?: string;
  hydroxyureaStopDate?: string;
  chronicTransfusionStartDate?: string;
  chronicTransfusionStopDate?: string;
  physiotherapyStartDate?: string;
  physiotherapyStopDate?: string;
  siblings?: SiblingErrors[];
  diagnoses?: Record<string, DiagnosisErrors>;
}

interface ScdGeneralInfoFormProps {
  patientUuid?: string;
  existingEncounterUuid?: string;
  onSave?: (data: ScdPatientGeneralInfo) => void;
  onCancel?: () => void;
  initialData?: Partial<ScdPatientGeneralInfo>;
}

const ScdGeneralInfoForm: React.FC<ScdGeneralInfoFormProps> = ({
  patientUuid,
  existingEncounterUuid,
  onSave,
  onCancel,
  initialData,
}) => {
  const { t } = useTranslation();
  const config = useConfig<Config>();
  const { patientName, patientDob, isLoading: isDemographicsLoading } = usePatientDemographics(patientUuid ?? '');
  const {
    address: personAddress,
    deathDate: personDeathDate,
    contactNumbers: personPhones,
    isLoading: isLoadingPerson,
  } = usePersonDetails(patientUuid ?? '');
  const [form, setForm] = useState<ScdPatientGeneralInfo>({ ...initialFormState, ...initialData });
  const personHydratedRef = useRef(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const touchedRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const errorBannerRef = useRef<HTMLDivElement>(null);

  // Hydrate address / deathDate / contactNumbers from person record once loaded
  useEffect(() => {
    if (isLoadingPerson || personHydratedRef.current || !patientUuid) return;
    personHydratedRef.current = true;
    setForm((prev) => ({
      ...prev,
      address: personAddress || prev.address,
      deathDate: personDeathDate || prev.deathDate,
      contactNumbers: personPhones.length > 0 ? personPhones : prev.contactNumbers,
    }));
  }, [isLoadingPerson, patientUuid, personAddress, personDeathDate, personPhones]);

  const validate = useCallback(
    (data: ScdPatientGeneralInfo): FormErrors => {
      const e: FormErrors = {};

      if (!data.address || !data.address.trim()) e.address = t('addressRequired', 'Address is required');

      const contactErrs: (string | undefined)[] = data.contactNumbers.map((num) =>
        num && !/^\+?[\d\s\-().]{7,}$/.test(num.trim()) ? t('invalidPhone', 'Enter a valid phone number') : undefined,
      );
      if (contactErrs.some(Boolean)) e.contactNumbers = contactErrs;

      if (data.hydroxyureaEnabled && !data.hydroxyureaStartDate)
        e.hydroxyureaStartDate = t('startDateRequired', 'Start date is required when treatment is enabled');
      if (
        data.hydroxyureaEnabled &&
        data.hydroxyureaStartDate &&
        data.hydroxyureaStopDate &&
        data.hydroxyureaStopDate < data.hydroxyureaStartDate
      )
        e.hydroxyureaStopDate = t('stopAfterStart', 'Stop date must be on or after start date');

      if (data.chronicTransfusionEnabled && !data.chronicTransfusionStartDate)
        e.chronicTransfusionStartDate = t('startDateRequired', 'Start date is required when treatment is enabled');
      if (
        data.chronicTransfusionEnabled &&
        data.chronicTransfusionStartDate &&
        data.chronicTransfusionStopDate &&
        data.chronicTransfusionStopDate < data.chronicTransfusionStartDate
      )
        e.chronicTransfusionStopDate = t('stopAfterStart', 'Stop date must be on or after start date');

      if (data.physiotherapyEnabled && !data.physiotherapyStartDate)
        e.physiotherapyStartDate = t('startDateRequired', 'Start date is required when treatment is enabled');
      if (
        data.physiotherapyEnabled &&
        data.physiotherapyStartDate &&
        data.physiotherapyStopDate &&
        data.physiotherapyStopDate < data.physiotherapyStartDate
      )
        e.physiotherapyStopDate = t('stopAfterStart', 'Stop date must be on or after start date');

      const sibErrs: SiblingErrors[] = data.siblings.map((s) => {
        const se: SiblingErrors = {};
        if (!s.name.trim()) se.name = t('nameRequired', 'Name is required');
        if (!s.yearOfBirth) {
          se.yearOfBirth = t('fieldRequired', 'Year of birth is required');
        } else if (
          !/^\d{4}$/.test(s.yearOfBirth) ||
          +s.yearOfBirth < 1900 ||
          +s.yearOfBirth > new Date().getFullYear()
        ) {
          se.yearOfBirth = t('invalidYear', 'Enter a valid 4-digit year (1900–present)');
        }
        if (!s.testedForScd) se.testedForScd = t('selectionRequired', 'Please make a selection');
        if (s.testedForScd === 'yes' && !s.testResult)
          se.testResult = t('selectionRequired', 'Please make a selection');
        return se;
      });
      if (sibErrs.some((se) => Object.keys(se).length > 0)) e.siblings = sibErrs;

      const diagErrs: Record<string, DiagnosisErrors> = {};
      for (const diag of data.primaryDiagnoses) {
        const de: DiagnosisErrors = {};
        if (!diag.diagnosedDate) de.diagnosedDate = t('dateRequired', 'Diagnosed date is required');
        if (diag.key === 'other' && !diag.otherDescription?.trim())
          de.otherDescription = t('descriptionRequired', 'Description is required');
        if (Object.keys(de).length > 0) diagErrs[diag.key] = de;
      }
      if (Object.keys(diagErrs).length > 0) e.diagnoses = diagErrs;

      return e;
    },
    [t],
  );

  const setField = useCallback(
    <K extends keyof ScdPatientGeneralInfo>(key: K, value: ScdPatientGeneralInfo[K]) => {
      setForm((prev) => {
        const next = { ...prev, [key]: value };
        if (touchedRef.current) {
          // Schedule outside the updater to avoid calling a setter inside another setter
          setTimeout(() => setErrors(validate(next)), 0);
        }
        return next;
      });
    },
    [validate],
  );

  // ── Contact numbers ──────────────────────────────────────────────────
  const addContact = () => setField('contactNumbers', [...form.contactNumbers, '']);
  const updateContact = (idx: number, val: string) => {
    const updated = [...form.contactNumbers];
    updated[idx] = val;
    setField('contactNumbers', updated);
  };
  const removeContact = (idx: number) => {
    setField(
      'contactNumbers',
      form.contactNumbers.filter((_, i) => i !== idx),
    );
  };

  // ── Photo ─────────────────────────────────────────────────────────────
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (file) {
      setField('photographyFile', file);
      setField('photographyUrl', URL.createObjectURL(file));
    }
  };

  // ── Siblings ─────────────────────────────────────────────────────────
  const addSibling = () => {
    const newSibling: Sibling = {
      id: Date.now().toString(),
      name: '',
      yearOfBirth: '',
      testedForScd: '',
      testResult: '',
      ssuuboNo: '',
    };
    setField('siblings', [...form.siblings, newSibling]);
  };
  const updateSibling = (id: string, key: keyof Sibling, value: string) => {
    setField(
      'siblings',
      form.siblings.map((s) => (s.id === id ? { ...s, [key]: value } : s)),
    );
  };
  const removeSibling = (id: string) => {
    setField(
      'siblings',
      form.siblings.filter((s) => s.id !== id),
    );
  };

  // ── Primary diagnoses ─────────────────────────────────────────────────
  const toggleDiagnosis = (key: DiagnosisKey) => {
    const exists = form.primaryDiagnoses.find((d) => d.key === key);
    if (exists) {
      setField(
        'primaryDiagnoses',
        form.primaryDiagnoses.filter((d) => d.key !== key),
      );
    } else {
      const label = DIAGNOSIS_OPTIONS.find((o) => o.key === key)?.label ?? key;
      setField('primaryDiagnoses', [...form.primaryDiagnoses, { key, label, diagnosedDate: '', otherDescription: '' }]);
    }
  };
  const updateDiagnosis = (key: DiagnosisKey, field: keyof PrimaryDiagnosis, value: string) => {
    setField(
      'primaryDiagnoses',
      form.primaryDiagnoses.map((d) => (d.key === key ? { ...d, [field]: value } : d)),
    );
  };

  // Build a human-readable list of every validation error with field names
  const getErrorSummary = useCallback(
    (errs: FormErrors): string[] => {
      const summary: string[] = [];

      if (errs.address)
        summary.push(t('errorField', '{{field}}: {{msg}}', { field: t('address', 'Address'), msg: errs.address }));
      if (errs.dateOfScdDiagnosis)
        summary.push(
          t('errorField', '{{field}}: {{msg}}', {
            field: t('dateOfScdDiagnosis', 'Date of SCD Diagnosis'),
            msg: errs.dateOfScdDiagnosis,
          }),
        );
      if (errs.dateOfSsuuboCareEnrollment)
        summary.push(
          t('errorField', '{{field}}: {{msg}}', {
            field: t('dateOfSsuuboCareEnrollment', 'Date of SSUUBO Care Enrollment'),
            msg: errs.dateOfSsuuboCareEnrollment,
          }),
        );

      if (errs.contactNumbers) {
        errs.contactNumbers.forEach((err, idx) => {
          if (err)
            summary.push(
              t('errorField', '{{field}}: {{msg}}', {
                field: `${t('contactNumber', 'Contact Number')} ${idx + 1}`,
                msg: err,
              }),
            );
        });
      }

      if (errs.hydroxyureaStartDate)
        summary.push(
          t('errorField', '{{field}}: {{msg}}', {
            field: t('hydroxyureaStartDate', 'Hydroxyurea Start Date'),
            msg: errs.hydroxyureaStartDate,
          }),
        );
      if (errs.hydroxyureaStopDate)
        summary.push(
          t('errorField', '{{field}}: {{msg}}', {
            field: t('hydroxyureaStopDate', 'Hydroxyurea Stop Date'),
            msg: errs.hydroxyureaStopDate,
          }),
        );
      if (errs.chronicTransfusionStartDate)
        summary.push(
          t('errorField', '{{field}}: {{msg}}', {
            field: t('chronicTransfusionStartDate', 'Chronic Transfusion Start Date'),
            msg: errs.chronicTransfusionStartDate,
          }),
        );
      if (errs.chronicTransfusionStopDate)
        summary.push(
          t('errorField', '{{field}}: {{msg}}', {
            field: t('chronicTransfusionStopDate', 'Chronic Transfusion Stop Date'),
            msg: errs.chronicTransfusionStopDate,
          }),
        );
      if (errs.physiotherapyStartDate)
        summary.push(
          t('errorField', '{{field}}: {{msg}}', {
            field: t('physiotherapyStartDate', 'Physiotherapy Start Date'),
            msg: errs.physiotherapyStartDate,
          }),
        );
      if (errs.physiotherapyStopDate)
        summary.push(
          t('errorField', '{{field}}: {{msg}}', {
            field: t('physiotherapyStopDate', 'Physiotherapy Stop Date'),
            msg: errs.physiotherapyStopDate,
          }),
        );

      if (errs.siblings) {
        errs.siblings.forEach((se, idx) => {
          const prefix = `${t('sibling', 'Sibling')} ${idx + 1}`;
          if (se.name)
            summary.push(
              t('errorField', '{{field}}: {{msg}}', { field: `${prefix} – ${t('siblingName', 'Name')}`, msg: se.name }),
            );
          if (se.yearOfBirth)
            summary.push(
              t('errorField', '{{field}}: {{msg}}', {
                field: `${prefix} – ${t('yearOfBirth', 'Year of Birth')}`,
                msg: se.yearOfBirth,
              }),
            );
          if (se.testedForScd)
            summary.push(
              t('errorField', '{{field}}: {{msg}}', {
                field: `${prefix} – ${t('testedForScd', 'Tested for SCD')}`,
                msg: se.testedForScd,
              }),
            );
          if (se.testResult)
            summary.push(
              t('errorField', '{{field}}: {{msg}}', {
                field: `${prefix} – ${t('testResult', 'Test Result')}`,
                msg: se.testResult,
              }),
            );
        });
      }

      if (errs.diagnoses) {
        Object.entries(errs.diagnoses).forEach(([key, de]) => {
          const diagLabel = DIAGNOSIS_OPTIONS.find((o) => o.key === key)?.label ?? key;
          if (de.diagnosedDate)
            summary.push(
              t('errorField', '{{field}}: {{msg}}', {
                field: `${diagLabel} – ${t('diagnosedDate', 'Diagnosed Date')}`,
                msg: de.diagnosedDate,
              }),
            );
          if (de.otherDescription)
            summary.push(
              t('errorField', '{{field}}: {{msg}}', {
                field: `${diagLabel} – ${t('describeOther', 'Description')}`,
                msg: de.otherDescription,
              }),
            );
        });
      }

      return summary;
    },
    [t],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    touchedRef.current = true;
    const validationErrors = validate(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      // Scroll to the error banner so the user can see all errors immediately
      setTimeout(() => errorBannerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
      return;
    }
    setIsSaving(true);
    setSaveError(null);

    try {
      let finalForm = { ...form };

      // Upload photo if a new file was selected
      if (patientUuid && form.photographyFile) {
        try {
          const photoUrl = await uploadPatientPhoto(patientUuid, form.photographyFile);
          finalForm = { ...finalForm, photographyUrl: photoUrl, photographyFile: null };
          setField('photographyUrl', photoUrl);
          setField('photographyFile', null);
        } catch {
          // Non-fatal: photo upload failure doesn't block the rest
        }
      }

      // Save to OpenMRS if patientUuid is available
      if (patientUuid) {
        await Promise.all([
          // Clinical obs → encounter
          config.scdEncounterTypeUuid
            ? saveScdEncounter(
                patientUuid,
                finalForm,
                config.scdEncounterTypeUuid,
                config.conceptUuids,
                config.scdLocationUuid || undefined,
                existingEncounterUuid,
              )
            : Promise.resolve(),
          // Personal details → person record
          savePersonDetails(patientUuid, finalForm.address, finalForm.deathDate),
          // Phone numbers → person attributes
          saveContactNumbers(patientUuid, finalForm.contactNumbers),
        ]);
      }

      showSnackbar({
        title: t('savedSuccess', 'Saved successfully'),
        subtitle: t('dataRecorded', 'Patient information has been recorded.'),
        kind: 'success',
        isLowContrast: false,
        timeoutInMs: 5000,
      });
      onSave?.(finalForm);
    } catch (err: unknown) {
      const responseBody = (err as Record<string, unknown>)?.responseBody;
      const detail =
        responseBody && typeof responseBody === 'object'
          ? JSON.stringify(responseBody)
          : typeof responseBody === 'string'
            ? responseBody
            : null;
      const msg = err instanceof Error ? err.message : String(err);
      const errorMsg = detail ? `${msg} | ${detail}` : msg;
      setSaveError(errorMsg);
      // Auto-dismiss save error after 10 seconds
      setTimeout(() => setSaveError(null), 10000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Form onSubmit={handleSubmit} className={styles.formWrapper} noValidate>
      <div className={styles.formHeader}>
        <h2 className={styles.formTitle}>{t('scdSheetOne', 'Sheet 1 – General Information About the Client')}</h2>
      </div>

      {/* Floating error banner — fixed top-center overlay */}
      {(saveError || (Object.keys(errors).length > 0 && touchedRef.current)) && (
        <div ref={errorBannerRef} className={styles.floatingErrorBanner}>
          {saveError && (
            <InlineNotification
              kind="error"
              lowContrast={false}
              title={t('saveError', 'Error saving data')}
              subtitle={saveError}
              className={styles.errorNotification}
            />
          )}

          {Object.keys(errors).length > 0 && touchedRef.current && (
            <InlineNotification
              kind="error"
              lowContrast={false}
              title={t('validationErrorsTitle', 'Please fix the following errors:')}
              subtitle={
                <ul className={styles.errorList}>
                  {getErrorSummary(errors).map((msg, i) => (
                    <li key={i} className={styles.errorItem}>
                      {msg}
                    </li>
                  ))}
                </ul>
              }
              hideCloseButton
              className={styles.validationNotification}
            />
          )}
        </div>
      )}

      {!patientUuid && (
        <InlineNotification
          kind="warning"
          title={t('noPatientContext', 'No patient context')}
          subtitle={t(
            'noPatientContextHint',
            'Data will not be persisted to the database until a patient UUID is provided.',
          )}
          className={styles.notification}
        />
      )}

      {/* ── PERSONAL DETAILS ─────────────────────────────────────────── */}
      <Tile className={styles.section}>
        <h4 className={styles.sectionTitle}>{t('personalDetails', 'Personal Details')}</h4>

        {/* Read-only patient identity from OpenMRS */}
        {patientUuid && (
          <div className={styles.patientBanner}>
            {isDemographicsLoading ? (
              <InlineLoading description={t('loadingPatient', 'Loading patient...')} />
            ) : (
              <div className={styles.patientBannerContent}>
                <span className={styles.patientBannerName}>{patientName || '—'}</span>
                <span className={styles.patientBannerDob}>
                  {t('dob', 'DOB')}:{' '}
                  {patientDob
                    ? new Date(patientDob).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })
                    : '—'}
                </span>
              </div>
            )}
          </div>
        )}

        <Grid narrow>
          <Column lg={8} md={8} sm={4} className={styles.fieldSpacing}>
            <DatePicker
              datePickerType="single"
              dateFormat="Y-m-d"
              value={form.deathDate}
              onChange={(_, dateStr) => setField('deathDate', dateStr)}
            >
              <DatePickerInput
                id="death-date"
                labelText={t('deathDate', 'Death Date (optional)')}
                placeholder="YYYY-MM-DD"
                size="md"
              />
            </DatePicker>
          </Column>

          <Column lg={8} md={8} sm={4} className={styles.fieldSpacing}>
            <TextInput
              id="address"
              labelText={t('address', 'Address')}
              value={form.address}
              onChange={(e) => setField('address', e.target.value)}
              placeholder={t('enterAddress', 'Enter address')}
              invalid={!!errors.address}
              invalidText={errors.address}
            />
          </Column>

          {/* Contact numbers */}
          <Column lg={8} md={6} sm={4}>
            <FormGroup legendText={t('contactNumbers', 'Contact Numbers')}>
              {form.contactNumbers.map((num, idx) => (
                <div key={idx} className={styles.listRow}>
                  <TextInput
                    id={`contact-${idx}`}
                    labelText=""
                    hideLabel
                    value={num}
                    onChange={(e) => updateContact(idx, e.target.value)}
                    placeholder={t('phoneNumber', 'Phone number')}
                    invalid={!!errors.contactNumbers?.[idx]}
                    invalidText={errors.contactNumbers?.[idx]}
                  />
                  <Button
                    kind="danger--ghost"
                    size="sm"
                    renderIcon={TrashCan}
                    iconDescription={t('remove', 'Remove')}
                    hasIconOnly
                    onClick={() => removeContact(idx)}
                    disabled={form.contactNumbers.length === 1}
                    className={styles.iconBtn}
                  />
                </div>
              ))}
              <Button kind="ghost" size="sm" renderIcon={Add} onClick={addContact} className={styles.addBtn}>
                {t('addContact', 'Add contact number')}
              </Button>
            </FormGroup>
          </Column>

          <Column lg={8} md={6} sm={4}>
            <TextArea
              id="comments"
              labelText={t('comments', 'Comments')}
              value={form.comments}
              onChange={(e) => setField('comments', e.target.value)}
              rows={3}
              placeholder={t('enterComments', 'Enter any comments...')}
            />
          </Column>
        </Grid>
      </Tile>

      {/* ── PHOTOGRAPH ───────────────────────────────────────────────── */}
      <Tile className={styles.section}>
        <h4 className={styles.sectionTitle}>{t('photograph', 'Photograph')}</h4>
        <div className={styles.photoRow}>
          <div className={styles.photoPreview}>
            {form.photographyUrl ? (
              <img src={form.photographyUrl} alt={t('patientPhoto', 'Patient photo')} className={styles.photoImg} />
            ) : (
              <div className={styles.photoPlaceholder}>
                <UserAvatar size={64} className={styles.photoIcon} />
                <p className={styles.photoPlaceholderText}>{t('noPhoto', 'No photo uploaded')}</p>
              </div>
            )}
          </div>
          <div className={styles.photoUpload}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              style={{ display: 'none' }}
              id="photo-upload-input"
            />
            <Button kind="secondary" size="sm" renderIcon={Add} onClick={() => fileInputRef.current?.click()}>
              {form.photographyUrl ? t('changePhoto', 'Change Photo') : t('uploadPhoto', 'Upload Photo')}
            </Button>
            {form.photographyUrl && (
              <Button
                kind="danger--ghost"
                size="sm"
                onClick={() => {
                  setField('photographyUrl', '');
                  setField('photographyFile', null);
                }}
                className={styles.removePhotoBtn}
              >
                {t('removePhoto', 'Remove')}
              </Button>
            )}
          </div>
        </div>
      </Tile>

      {/* ── SIBLINGS ─────────────────────────────────────────────────── */}
      <Tile className={styles.section}>
        <h4 className={styles.sectionTitle}>{t('siblings', 'Siblings')}</h4>
        {form.siblings.length === 0 && <p className={styles.emptyNote}>{t('noSiblings', 'No siblings added yet.')}</p>}
        {form.siblings.map((sibling, idx) => (
          <div key={sibling.id} className={styles.siblingCard}>
            <div className={styles.siblingHeader}>
              <span className={styles.siblingLabel}>
                {t('sibling', 'Sibling')} {idx + 1}
              </span>
              <Button
                kind="danger--ghost"
                size="sm"
                renderIcon={TrashCan}
                iconDescription={t('removeSibling', 'Remove sibling')}
                hasIconOnly
                onClick={() => removeSibling(sibling.id)}
              />
            </div>
            <Grid narrow>
              <Column lg={4} md={4} sm={4}>
                <TextInput
                  id={`sibling-name-${sibling.id}`}
                  labelText={t('siblingName', 'Name')}
                  value={sibling.name}
                  onChange={(e) => updateSibling(sibling.id, 'name', e.target.value)}
                  invalid={!!errors.siblings?.[idx]?.name}
                  invalidText={errors.siblings?.[idx]?.name}
                />
              </Column>
              <Column lg={2} md={2} sm={4}>
                <TextInput
                  id={`sibling-yob-${sibling.id}`}
                  labelText={t('yearOfBirth', 'Year of Birth')}
                  value={sibling.yearOfBirth}
                  onChange={(e) => updateSibling(sibling.id, 'yearOfBirth', e.target.value)}
                  placeholder="YYYY"
                  invalid={!!errors.siblings?.[idx]?.yearOfBirth}
                  invalidText={errors.siblings?.[idx]?.yearOfBirth}
                />
              </Column>
              <Column lg={3} md={3} sm={4}>
                <Select
                  id={`sibling-tested-${sibling.id}`}
                  labelText={t('testedForScd', 'Tested for SCD')}
                  value={sibling.testedForScd}
                  onChange={(e) => updateSibling(sibling.id, 'testedForScd', e.target.value)}
                  invalid={!!errors.siblings?.[idx]?.testedForScd}
                  invalidText={errors.siblings?.[idx]?.testedForScd}
                >
                  <SelectItem value="" text={t('select', 'Select...')} />
                  <SelectItem value="yes" text={t('yes', 'Yes')} />
                  <SelectItem value="no" text={t('no', 'No')} />
                </Select>
              </Column>
              <Column lg={3} md={3} sm={4}>
                <Select
                  id={`sibling-result-${sibling.id}`}
                  labelText={t('testResult', 'Test Result')}
                  value={sibling.testResult}
                  onChange={(e) => updateSibling(sibling.id, 'testResult', e.target.value)}
                  disabled={sibling.testedForScd !== 'yes'}
                  invalid={!!errors.siblings?.[idx]?.testResult}
                  invalidText={errors.siblings?.[idx]?.testResult}
                >
                  <SelectItem value="" text={t('select', 'Select...')} />
                  <SelectItem value="NA" text="NA" />
                  <SelectItem value="negative" text={t('negative', 'Negative')} />
                  <SelectItem value="positive" text={t('positive', 'Positive')} />
                </Select>
              </Column>
              <Column lg={4} md={4} sm={4}>
                <TextInput
                  id={`sibling-ssuubo-${sibling.id}`}
                  labelText={t('ssuuboNo', 'SSUUBO No.')}
                  value={sibling.ssuuboNo}
                  onChange={(e) => updateSibling(sibling.id, 'ssuuboNo', e.target.value)}
                />
              </Column>
            </Grid>
          </div>
        ))}
        <Button kind="ghost" size="sm" renderIcon={Add} onClick={addSibling} className={styles.addBtn}>
          {t('addSibling', 'Add sibling')}
        </Button>
      </Tile>

      {/* ── KEY DATES ────────────────────────────────────────────────── */}
      <Tile className={styles.section}>
        <h4 className={styles.sectionTitle}>{t('keyDates', 'Key Dates')}</h4>
        <Grid narrow>
          <Column lg={4} md={4} sm={4}>
            <DatePicker
              datePickerType="single"
              dateFormat="Y-m-d"
              value={form.dateOfScdDiagnosis}
              onChange={(_, dateStr) => setField('dateOfScdDiagnosis', dateStr)}
            >
              <DatePickerInput
                id="scd-diagnosis-date"
                labelText={t('dateOfScdDiagnosis', 'Date of SCD Diagnosis')}
                placeholder="YYYY-MM-DD"
                size="md"
                invalid={!!errors.dateOfScdDiagnosis}
                invalidText={errors.dateOfScdDiagnosis}
              />
            </DatePicker>
          </Column>
          <Column lg={4} md={4} sm={4}>
            <DatePicker
              datePickerType="single"
              dateFormat="Y-m-d"
              value={form.dateOfSsuuboCareEnrollment}
              onChange={(_, dateStr) => setField('dateOfSsuuboCareEnrollment', dateStr)}
            >
              <DatePickerInput
                id="ssuubo-enrollment-date"
                labelText={t('dateOfSsuuboCareEnrollment', 'Date of SSUUBO Care Enrollment')}
                placeholder="YYYY-MM-DD"
                size="md"
                invalid={!!errors.dateOfSsuuboCareEnrollment}
                invalidText={errors.dateOfSsuuboCareEnrollment}
              />
            </DatePicker>
          </Column>
          <Column lg={4} md={4} sm={4}>
            <DatePicker
              datePickerType="single"
              dateFormat="Y-m-d"
              value={form.pcvVaccinationDate}
              onChange={(_, dateStr) => setField('pcvVaccinationDate', dateStr)}
            >
              <DatePickerInput
                id="pcv-vaccination-date"
                labelText={t('pcvVaccinationDate', 'PCV Vaccination Date')}
                placeholder="YYYY-MM-DD"
                size="md"
              />
            </DatePicker>
          </Column>
        </Grid>
      </Tile>

      {/* ── TREATMENTS ───────────────────────────────────────────────── */}
      <Tile className={styles.section}>
        <h4 className={styles.sectionTitle}>{t('treatments', 'Treatments')}</h4>
        <Grid narrow>
          {/* Hydroxyurea */}
          <Column lg={16} md={8} sm={4}>
            <div className={styles.treatmentBlock}>
              <Checkbox
                id="hydroxyurea-enabled"
                labelText={t('hydroxyureaTreatment', 'Hydroxyurea Treatment')}
                checked={form.hydroxyureaEnabled}
                onChange={(_, { checked }) => setField('hydroxyureaEnabled', checked)}
              />
              {form.hydroxyureaEnabled && (
                <div className={styles.treatmentDates}>
                  <DatePicker
                    datePickerType="single"
                    dateFormat="Y-m-d"
                    value={form.hydroxyureaStartDate}
                    onChange={(_, dateStr) => setField('hydroxyureaStartDate', dateStr)}
                    className={styles.datePicker}
                  >
                    <DatePickerInput
                      id="hydroxyurea-start"
                      labelText={t('startDate', 'Start Date')}
                      placeholder="YYYY-MM-DD"
                      size="md"
                      invalid={!!errors.hydroxyureaStartDate}
                      invalidText={errors.hydroxyureaStartDate}
                    />
                  </DatePicker>
                  <DatePicker
                    datePickerType="single"
                    dateFormat="Y-m-d"
                    value={form.hydroxyureaStopDate}
                    onChange={(_, dateStr) => setField('hydroxyureaStopDate', dateStr)}
                    className={styles.datePicker}
                  >
                    <DatePickerInput
                      id="hydroxyurea-stop"
                      labelText={t('stopDate', 'Stop Date')}
                      placeholder="YYYY-MM-DD"
                      size="md"
                      invalid={!!errors.hydroxyureaStopDate}
                      invalidText={errors.hydroxyureaStopDate}
                    />
                  </DatePicker>
                </div>
              )}
            </div>
          </Column>

          {/* Chronic Transfusion */}
          <Column lg={16} md={8} sm={4}>
            <div className={styles.treatmentBlock}>
              <Checkbox
                id="chronic-transfusion-enabled"
                labelText={t('chronicTransfusionProgramme', 'Chronic Transfusion Programme')}
                checked={form.chronicTransfusionEnabled}
                onChange={(_, { checked }) => setField('chronicTransfusionEnabled', checked)}
              />
              {form.chronicTransfusionEnabled && (
                <div className={styles.treatmentDates}>
                  <DatePicker
                    datePickerType="single"
                    dateFormat="Y-m-d"
                    value={form.chronicTransfusionStartDate}
                    onChange={(_, dateStr) => setField('chronicTransfusionStartDate', dateStr)}
                    className={styles.datePicker}
                  >
                    <DatePickerInput
                      id="chronic-transfusion-start"
                      labelText={t('startDate', 'Start Date')}
                      placeholder="YYYY-MM-DD"
                      size="md"
                      invalid={!!errors.chronicTransfusionStartDate}
                      invalidText={errors.chronicTransfusionStartDate}
                    />
                  </DatePicker>
                  <DatePicker
                    datePickerType="single"
                    dateFormat="Y-m-d"
                    value={form.chronicTransfusionStopDate}
                    onChange={(_, dateStr) => setField('chronicTransfusionStopDate', dateStr)}
                    className={styles.datePicker}
                  >
                    <DatePickerInput
                      id="chronic-transfusion-stop"
                      labelText={t('stopDate', 'Stop Date')}
                      placeholder="YYYY-MM-DD"
                      size="md"
                      invalid={!!errors.chronicTransfusionStopDate}
                      invalidText={errors.chronicTransfusionStopDate}
                    />
                  </DatePicker>
                </div>
              )}
            </div>
          </Column>

          {/* Physiotherapy */}
          <Column lg={16} md={8} sm={4}>
            <div className={styles.treatmentBlock}>
              <Checkbox
                id="physiotherapy-enabled"
                labelText={t('physiotherapy', 'Physiotherapy')}
                checked={form.physiotherapyEnabled}
                onChange={(_, { checked }) => setField('physiotherapyEnabled', checked)}
              />
              {form.physiotherapyEnabled && (
                <div className={styles.treatmentDates}>
                  <DatePicker
                    datePickerType="single"
                    dateFormat="Y-m-d"
                    value={form.physiotherapyStartDate}
                    onChange={(_, dateStr) => setField('physiotherapyStartDate', dateStr)}
                    className={styles.datePicker}
                  >
                    <DatePickerInput
                      id="physiotherapy-start"
                      labelText={t('startDate', 'Start Date')}
                      placeholder="YYYY-MM-DD"
                      size="md"
                      invalid={!!errors.physiotherapyStartDate}
                      invalidText={errors.physiotherapyStartDate}
                    />
                  </DatePicker>
                  <DatePicker
                    datePickerType="single"
                    dateFormat="Y-m-d"
                    value={form.physiotherapyStopDate}
                    onChange={(_, dateStr) => setField('physiotherapyStopDate', dateStr)}
                    className={styles.datePicker}
                  >
                    <DatePickerInput
                      id="physiotherapy-stop"
                      labelText={t('stopDate', 'Stop Date')}
                      placeholder="YYYY-MM-DD"
                      size="md"
                      invalid={!!errors.physiotherapyStopDate}
                      invalidText={errors.physiotherapyStopDate}
                    />
                  </DatePicker>
                </div>
              )}
            </div>
          </Column>
        </Grid>
      </Tile>

      {/* ── PRIMARY DIAGNOSES ─────────────────────────────────────────── */}
      <Tile className={styles.section}>
        <h4 className={styles.sectionTitle}>{t('primaryDiagnoses', 'Primary Diagnoses')}</h4>
        <p className={styles.sectionHint}>
          {t('primaryDiagnosesHint', 'Select all applicable diagnoses and provide the date of diagnosis.')}
        </p>
        <Grid narrow>
          {DIAGNOSIS_OPTIONS.map((option) => {
            const active = form.primaryDiagnoses.find((d) => d.key === option.key);
            return (
              <Column key={option.key} lg={16} md={8} sm={4}>
                <div className={`${styles.diagnosisBlock} ${active ? styles.diagnosisBlockActive : ''}`}>
                  <Checkbox
                    id={`diagnosis-${option.key}`}
                    labelText={option.label}
                    checked={!!active}
                    onChange={() => toggleDiagnosis(option.key)}
                  />
                  {active && (
                    <div className={styles.diagnosisDetails}>
                      <DatePicker
                        datePickerType="single"
                        dateFormat="Y-m-d"
                        value={active.diagnosedDate}
                        onChange={(_, dateStr) => updateDiagnosis(option.key, 'diagnosedDate', dateStr)}
                        className={styles.datePicker}
                      >
                        <DatePickerInput
                          id={`diagnosis-date-${option.key}`}
                          labelText={t('diagnosedDate', 'Diagnosed Date')}
                          placeholder="YYYY-MM-DD"
                          size="md"
                          invalid={!!errors.diagnoses?.[option.key]?.diagnosedDate}
                          invalidText={errors.diagnoses?.[option.key]?.diagnosedDate}
                        />
                      </DatePicker>
                      {option.key === 'other' && (
                        <TextInput
                          id="diagnosis-other-description"
                          labelText={t('describeOther', 'Describe the complication')}
                          value={active.otherDescription ?? ''}
                          onChange={(e) => updateDiagnosis('other', 'otherDescription', e.target.value)}
                          placeholder={t('otherComplication', 'Type of complication...')}
                          className={styles.otherInput}
                          invalid={!!errors.diagnoses?.other?.otherDescription}
                          invalidText={errors.diagnoses?.other?.otherDescription}
                        />
                      )}
                    </div>
                  )}
                </div>
              </Column>
            );
          })}
        </Grid>
      </Tile>

      {/* ── SUBMIT ───────────────────────────────────────────────────── */}
      <div className={styles.formActions}>
        <Button kind="primary" type="submit" size="lg" disabled={isSaving}>
          {isSaving ? (
            <InlineLoading description={t('saving', 'Saving…')} />
          ) : (
            t('savePatientInfo', 'Save Patient Information')
          )}
        </Button>
        <Button
          kind="secondary"
          size="lg"
          disabled={isSaving}
          onClick={() => {
            setForm({ ...initialFormState });
            setSaveError(null);
          }}
        >
          {t('reset', 'Reset')}
        </Button>
        {onCancel && (
          <Button kind="ghost" size="lg" disabled={isSaving} onClick={onCancel}>
            {t('cancel', 'Cancel')}
          </Button>
        )}
      </div>
    </Form>
  );
};

export default ScdGeneralInfoForm;
