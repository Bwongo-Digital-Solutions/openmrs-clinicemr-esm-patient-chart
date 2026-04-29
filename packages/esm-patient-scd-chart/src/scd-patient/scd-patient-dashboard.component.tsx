import React, { useState, useEffect } from 'react';
import {
  Button,
  Tag,
  Tile,
  Grid,
  Column,
  StructuredListWrapper,
  StructuredListHead,
  StructuredListRow,
  StructuredListCell,
  StructuredListBody,
  InlineNotification,
  SkeletonText,
} from '@carbon/react';
import { Edit, UserAvatar, Calendar, Phone, Medication, Stethoscope } from '@carbon/icons-react';
import { useTranslation } from 'react-i18next';
import { useConfig, navigate } from '@openmrs/esm-framework';
import { type ScdPatientGeneralInfo, initialFormState } from './types';
import { type Config } from '../config-schema';
import {
  useScdEncounter,
  mapEncounterToFormData,
  usePatientDemographics,
  usePersonDetails,
  useEmergencyContacts,
} from './scd-patient.resource';
import ScdGeneralInfoForm from './scd-general-info-form.component';
import styles from './scd-patient-dashboard.scss';

interface ScdPatientDashboardProps {
  patientUuid?: string;
}

const ScdPatientDashboard: React.FC<ScdPatientDashboardProps> = ({ patientUuid: propPatientUuid }) => {
  const { t } = useTranslation();
  const config = useConfig<Config>();

  // Resolve patientUuid: prop → query param → patient chart URL path (/patient/<uuid>/chart/...)
  const patientUuid =
    propPatientUuid ??
    new URLSearchParams(window.location.search).get('patientUuid') ??
    window.location.pathname.match(/\/patient\/([a-f0-9-]{36})\//i)?.[1] ??
    undefined;

  const isStandalonePage =
    !window.location.pathname.includes('/patient/') || window.location.pathname.includes('/scd-patient');

  const handleBackToPatientChart = () => {
    if (patientUuid) {
      navigate({ to: `\${openmrsSpaBase}/patient/${patientUuid}/chart/Patient Summary` });
    }
  };

  const {
    encounter,
    isLoading: isLoadingEncounter,
    mutate: mutateEncounter,
  } = useScdEncounter(patientUuid ?? '', config.scdEncounterTypeUuid);

  const { patientName, patientDob } = usePatientDemographics(patientUuid ?? '');
  const {
    address: personAddress,
    deathDate: personDeathDate,
    contactNumbers: personContactNumbers,
    isLoading: isLoadingPerson,
  } = usePersonDetails(patientUuid ?? '');
  const { contacts: emergencyContacts, isLoading: isLoadingEmergencyContacts } = useEmergencyContacts(
    patientUuid ?? '',
    config.registrationEncounterTypeUuid,
    config.emergencyContactConcepts,
  );
  const [patientData, setPatientData] = useState<ScdPatientGeneralInfo | null>(null);
  const [editMode, setEditMode] = useState(false);

  // Stable string deps from config so effect re-runs when config finishes loading
  const diagnosisUuid = config.conceptUuids?.dateOfScdDiagnosis ?? '';
  const enrollmentUuid = config.conceptUuids?.dateOfSsuuboCareEnrollment ?? '';
  const pcvUuid = config.conceptUuids?.pcvVaccinationDate ?? '';
  const commentsUuid = config.conceptUuids?.comments ?? '';

  // Once encounter AND person details both load, merge everything into patientData
  useEffect(() => {
    if (isLoadingPerson) return; // wait for person attrs before committing
    if (encounter) {
      const mapped = mapEncounterToFormData(encounter, config.conceptUuids);
      setPatientData((prev) => ({
        ...initialFormState,
        ...(prev ?? {}),
        ...mapped,
        address: personAddress || (prev ?? initialFormState).address,
        deathDate: personDeathDate || (prev ?? initialFormState).deathDate,
        contactNumbers:
          personContactNumbers.length > 0 ? personContactNumbers : (prev ?? initialFormState).contactNumbers,
      }));
    }
  }, [
    encounter,
    isLoadingEncounter,
    isLoadingPerson,
    personAddress,
    personDeathDate,
    personContactNumbers,
    diagnosisUuid,
    enrollmentUuid,
    pcvUuid,
    commentsUuid,
  ]);

  const handleSave = (data: ScdPatientGeneralInfo) => {
    setPatientData(data);
    setEditMode(false);
    mutateEncounter();
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const activeTreatments = patientData
    ? [
        patientData.hydroxyureaEnabled && {
          label: t('hydroxyureaTreatment', 'Hydroxyurea Treatment'),
          start: patientData.hydroxyureaStartDate,
          stop: patientData.hydroxyureaStopDate,
          color: 'blue' as const,
        },
        patientData.chronicTransfusionEnabled && {
          label: t('chronicTransfusionProgramme', 'Chronic Transfusion Programme'),
          start: patientData.chronicTransfusionStartDate,
          stop: patientData.chronicTransfusionStopDate,
          color: 'purple' as const,
        },
        patientData.physiotherapyEnabled && {
          label: t('physiotherapy', 'Physiotherapy'),
          start: patientData.physiotherapyStartDate,
          stop: patientData.physiotherapyStopDate,
          color: 'teal' as const,
        },
      ].filter(Boolean)
    : [];

  if (isLoadingEncounter) {
    return (
      <div className={styles.dashboardWrapper} style={{ backgroundColor: 'var(--cds-layer, #fff)' }}>
        <SkeletonText heading width="40%" />
        <SkeletonText paragraph lineCount={6} />
      </div>
    );
  }

  if (editMode) {
    return (
      <div className={styles.dashboardWrapper} style={{ backgroundColor: 'var(--cds-layer, #fff)' }}>
        <div className={styles.editHeader}>
          {patientData && (
            <Button kind="ghost" size="sm" onClick={() => setEditMode(false)} className={styles.cancelBtn}>
              {t('cancelEdit', '← Back to Dashboard')}
            </Button>
          )}
        </div>
        <ScdGeneralInfoForm
          patientUuid={patientUuid}
          existingEncounterUuid={encounter?.uuid}
          onSave={handleSave}
          onCancel={() => setEditMode(false)}
          initialData={patientData ?? undefined}
        />
      </div>
    );
  }

  return (
    <div className={styles.dashboardWrapper} style={{ backgroundColor: 'var(--cds-layer, #fff)' }}>
      {/* ── BACK NAVIGATION (standalone page only) ────────────────── */}
      {isStandalonePage && patientUuid && (
        <div className={styles.backNav}>
          <Button kind="ghost" size="sm" onClick={handleBackToPatientChart}>
            {t('backToPatientChart', '← Back to Patient Chart')}
          </Button>
        </div>
      )}

      {/* ── DASHBOARD HEADER ──────────────────────────────────────── */}
      <div className={styles.dashboardHeader}>
        <div className={styles.headerLeft}>
          <h2 className={styles.dashboardTitle}>{t('scdDashboard', 'SCD Patient Dashboard')}</h2>
          <p className={styles.dashboardSubtitle}>{t('sheetOneLabel', 'Sheet 1 – General Information')}</p>
        </div>
        <Button kind="secondary" size="sm" renderIcon={Edit} onClick={() => setEditMode(true)}>
          {t('editInfo', 'Edit Information')}
        </Button>
      </div>

      {!patientData && (
        <InlineNotification
          kind="info"
          title={t('noData', 'No patient data recorded yet.')}
          subtitle={t('clickEdit', 'Click "Edit Information" to enter patient data.')}
          hideCloseButton
        />
      )}

      {patientData && (
        <Grid narrow className={styles.dashboardGrid}>
          {/* ── HERO CARD ─────────────────────────────────────────── */}
          <Column lg={4} md={8} sm={4}>
            <Tile className={`${styles.card} ${styles.heroCard}`}>
              <div className={styles.photoFrame}>
                {patientData.photographyUrl ? (
                  <img
                    src={patientData.photographyUrl}
                    alt={t('patientPhoto', 'Patient photo')}
                    className={styles.patientPhoto}
                  />
                ) : (
                  <div className={styles.photoFallback}>
                    <UserAvatar size={64} className={styles.photoFallbackIcon} />
                  </div>
                )}
              </div>
              <h3 className={styles.patientName}>{patientName || '—'}</h3>
              <div className={styles.heroMeta}>
                <span className={styles.metaItem}>
                  <Calendar size={14} />
                  {t('dob', 'DOB')}: {formatDate(patientDob)}
                </span>
                {patientData.deathDate && (
                  <span className={`${styles.metaItem} ${styles.deathMeta}`}>
                    <Calendar size={14} />
                    {t('deceased', 'Deceased')}: {formatDate(patientData.deathDate)}
                  </span>
                )}
              </div>
            </Tile>
          </Column>

          {/* ── CONTACT DETAILS ───────────────────────────────────── */}
          <Column lg={6} md={8} sm={4}>
            <Tile className={styles.card}>
              <div className={styles.cardHeader}>
                <Phone size={16} className={styles.cardIcon} />
                <h4 className={styles.cardTitle}>{t('contactDetails', 'Contact Details')}</h4>
              </div>
              <dl className={styles.dataList}>
                <dt>{t('address', 'Address')}</dt>
                <dd>{patientData.address || '—'}</dd>
                <dt>{t('telephoneNumber', 'Telephone Number')}</dt>
                <dd>
                  {(patientData.contactNumbers ?? []).filter(Boolean).length > 0
                    ? (patientData.contactNumbers ?? []).filter(Boolean).join(', ')
                    : '—'}
                </dd>
                {emergencyContacts.map((ec, i) => (
                  <React.Fragment key={i}>
                    <dt>{ec.label}</dt>
                    <dd>{ec.phone}</dd>
                  </React.Fragment>
                ))}
              </dl>
            </Tile>
          </Column>

          {/* ── KEY DATES ─────────────────────────────────────────── */}
          <Column lg={6} md={8} sm={4}>
            <Tile className={styles.card}>
              <div className={styles.cardHeader}>
                <Calendar size={16} className={styles.cardIcon} />
                <h4 className={styles.cardTitle}>{t('keyDates', 'Key Dates')}</h4>
              </div>
              <dl className={styles.dataList}>
                <dt>{t('dateOfScdDiagnosis', 'SCD Diagnosis')}</dt>
                <dd>{formatDate(patientData.dateOfScdDiagnosis)}</dd>
                <dt>{t('dateOfSsuuboCareEnrollment', 'SSUUBO Care Enrollment')}</dt>
                <dd>{formatDate(patientData.dateOfSsuuboCareEnrollment)}</dd>
                <dt>{t('pcvVaccinationDate', 'PCV Vaccination')}</dt>
                <dd>{formatDate(patientData.pcvVaccinationDate)}</dd>
              </dl>
            </Tile>
          </Column>

          {/* ── ACTIVE TREATMENTS ─────────────────────────────────── */}
          <Column lg={8} md={8} sm={4}>
            <Tile className={styles.card}>
              <div className={styles.cardHeader}>
                <Medication size={16} className={styles.cardIcon} />
                <h4 className={styles.cardTitle}>{t('treatments', 'Treatments')}</h4>
              </div>
              {activeTreatments.length === 0 ? (
                <p className={styles.emptyNote}>{t('noActiveTreatments', 'No active treatments recorded.')}</p>
              ) : (
                <div className={styles.treatmentList}>
                  {(activeTreatments as { label: string; start: string; stop: string; color: string }[]).map((tx) => (
                    <div key={tx.label} className={styles.treatmentItem}>
                      <Tag type={tx.color as any} size="md">
                        {tx.label}
                      </Tag>
                      <span className={styles.treatmentDates}>
                        {formatDate(tx.start)}
                        {tx.stop ? ` → ${formatDate(tx.stop)}` : ` → ${t('ongoing', 'ongoing')}`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Tile>
          </Column>

          {/* ── SIBLINGS ──────────────────────────────────────────── */}
          {(patientData.siblings ?? []).length > 0 && (
            <Column lg={8} md={8} sm={4}>
              <Tile className={styles.card}>
                <div className={styles.cardHeader}>
                  <UserAvatar size={16} className={styles.cardIcon} />
                  <h4 className={styles.cardTitle}>
                    {t('siblings', 'Siblings')} ({patientData.siblings.length})
                  </h4>
                </div>
                <StructuredListWrapper isCondensed>
                  <StructuredListHead>
                    <StructuredListRow head>
                      <StructuredListCell head>{t('siblingName', 'Name')}</StructuredListCell>
                      <StructuredListCell head>{t('yearOfBirth', 'YOB')}</StructuredListCell>
                      <StructuredListCell head>{t('testedForScd', 'Tested')}</StructuredListCell>
                      <StructuredListCell head>{t('testResult', 'Result')}</StructuredListCell>
                      <StructuredListCell head>{t('ssuuboNo', 'SSUUBO No.')}</StructuredListCell>
                    </StructuredListRow>
                  </StructuredListHead>
                  <StructuredListBody>
                    {(patientData.siblings ?? []).map((sibling) => (
                      <StructuredListRow key={sibling.id}>
                        <StructuredListCell>{sibling.name || '—'}</StructuredListCell>
                        <StructuredListCell>{sibling.yearOfBirth || '—'}</StructuredListCell>
                        <StructuredListCell>
                          {sibling.testedForScd ? (
                            <Tag type={sibling.testedForScd === 'yes' ? 'green' : 'gray'} size="sm">
                              {sibling.testedForScd}
                            </Tag>
                          ) : (
                            '—'
                          )}
                        </StructuredListCell>
                        <StructuredListCell>
                          {sibling.testResult ? (
                            <Tag
                              type={
                                sibling.testResult === 'positive'
                                  ? 'red'
                                  : sibling.testResult === 'negative'
                                    ? 'green'
                                    : 'gray'
                              }
                              size="sm"
                            >
                              {sibling.testResult}
                            </Tag>
                          ) : (
                            '—'
                          )}
                        </StructuredListCell>
                        <StructuredListCell>{sibling.ssuuboNo || '—'}</StructuredListCell>
                      </StructuredListRow>
                    ))}
                  </StructuredListBody>
                </StructuredListWrapper>
              </Tile>
            </Column>
          )}

          {/* ── PRIMARY DIAGNOSES ─────────────────────────────────── */}
          <Column lg={16} md={8} sm={4}>
            <Tile className={styles.card}>
              <div className={styles.cardHeader}>
                <Stethoscope size={16} className={styles.cardIcon} />
                <h4 className={styles.cardTitle}>{t('primaryDiagnoses', 'Primary Diagnoses')}</h4>
              </div>
              {(patientData.primaryDiagnoses ?? []).length === 0 ? (
                <p className={styles.emptyNote}>{t('noDiagnoses', 'No primary diagnoses recorded.')}</p>
              ) : (
                <div className={styles.diagnosisList}>
                  {(patientData.primaryDiagnoses ?? []).map((diag) => (
                    <div key={diag.key} className={styles.diagnosisCard}>
                      <div className={styles.diagnosisCardHeader}>
                        <Tag type="red" size="md">
                          {diag.label}
                        </Tag>
                        {diag.diagnosedDate && (
                          <span className={styles.diagnosisDate}>
                            {t('diagnosed', 'Diagnosed')}: {formatDate(diag.diagnosedDate)}
                          </span>
                        )}
                      </div>
                      {diag.key === 'other' && diag.otherDescription && (
                        <p className={styles.diagnosisOther}>
                          <strong>{t('complication', 'Complication')}:</strong> {diag.otherDescription}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Tile>
          </Column>
        </Grid>
      )}
    </div>
  );
};

export default ScdPatientDashboard;
