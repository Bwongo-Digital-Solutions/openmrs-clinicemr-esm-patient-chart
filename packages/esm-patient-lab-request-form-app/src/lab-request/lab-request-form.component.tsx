import React, { useState, useMemo, useCallback } from 'react';
import {
  Accordion,
  AccordionItem,
  Button,
  Checkbox,
  Column,
  Form,
  Grid,
  InlineLoading,
  InlineNotification,
  ProgressIndicator,
  ProgressStep,
  RadioButton,
  RadioButtonGroup,
  Search,
  StructuredListWrapper,
  StructuredListHead,
  StructuredListBody,
  StructuredListRow,
  StructuredListCell,
  Tag,
  TextArea,
  Tile,
} from '@carbon/react';
import { Chemistry, SendFilled, Reset, Close, ArrowRight, ArrowLeft } from '@carbon/react/icons';
import { useTranslation } from 'react-i18next';
import { useConfig, showSnackbar } from '@openmrs/esm-framework';
import { type Config } from '../config-schema';
import { LAB_TEST_CATEGORIES, type LabTest } from './types';
import { submitLabOrders, useSession, usePatientDemographics } from './lab-request.resource';
import styles from './lab-request-form.scss';

interface LabRequestFormProps {
  patientUuid?: string;
  closeWorkspace?: () => void;
}

const STEPS = ['selectTests', 'clinicalDetails', 'reviewSubmit'] as const;

const LabRequestForm: React.FC<LabRequestFormProps> = ({ patientUuid, closeWorkspace }) => {
  const { t } = useTranslation();
  const config = useConfig<Config>();
  const { providerUuid, locationUuid, isLoading: isSessionLoading } = useSession();
  const { patientName } = usePatientDemographics(patientUuid ?? '');

  const [currentStep, setCurrentStep] = useState(0);
  const [selectedTests, setSelectedTests] = useState<Set<string>>(new Set());
  const [urgency, setUrgency] = useState<'ROUTINE' | 'STAT'>('ROUTINE');
  const [clinicalNote, setClinicalNote] = useState('');
  const [otherTests, setOtherTests] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const allTestsMap = useMemo(() => {
    const map = new Map<string, LabTest>();
    for (const cat of LAB_TEST_CATEGORIES) {
      for (const test of cat.tests) {
        map.set(test.id, test);
      }
    }
    return map;
  }, []);

  const filteredCategories = useMemo(() => {
    if (!searchTerm.trim()) return LAB_TEST_CATEGORIES;
    const term = searchTerm.toLowerCase();
    return LAB_TEST_CATEGORIES.map((cat) => ({
      ...cat,
      tests: cat.tests.filter(
        (test) => test.label.toLowerCase().includes(term) || cat.label.toLowerCase().includes(term),
      ),
    })).filter((cat) => cat.tests.length > 0);
  }, [searchTerm]);

  const toggleTest = useCallback((testId: string) => {
    setSelectedTests((prev) => {
      const next = new Set(prev);
      if (next.has(testId)) {
        next.delete(testId);
      } else {
        next.add(testId);
      }
      return next;
    });
  }, []);

  const toggleCategory = useCallback(
    (categoryId: string) => {
      const category = LAB_TEST_CATEGORIES.find((c) => c.id === categoryId);
      if (!category) return;
      const allSelected = category.tests.every((t) => selectedTests.has(t.id));
      setSelectedTests((prev) => {
        const next = new Set(prev);
        for (const test of category.tests) {
          if (allSelected) {
            next.delete(test.id);
          } else {
            next.add(test.id);
          }
        }
        return next;
      });
    },
    [selectedTests],
  );

  const clearAll = useCallback(() => {
    setSelectedTests(new Set());
    setClinicalNote('');
    setOtherTests('');
    setSaveError(null);
    setCurrentStep(0);
  }, []);

  const removeSelectedTest = useCallback((testId: string) => {
    setSelectedTests((prev) => {
      const next = new Set(prev);
      next.delete(testId);
      return next;
    });
  }, []);

  const goNext = () => {
    if (currentStep === 0 && selectedTests.size === 0) {
      setSaveError(t('noTestsSelected', 'Please select at least one test to proceed.'));
      return;
    }
    setSaveError(null);
    setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
  };

  const goBack = () => {
    setSaveError(null);
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTests.size === 0) {
      setSaveError(t('noTestsSelected', 'Please select at least one test to order.'));
      return;
    }
    if (!patientUuid) {
      setSaveError(t('noPatient', 'No patient context available.'));
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    const testsToOrder: LabTest[] = Array.from(selectedTests)
      .map((id) => allTestsMap.get(id))
      .filter(Boolean) as LabTest[];

    const result = await submitLabOrders(
      patientUuid,
      testsToOrder,
      urgency,
      clinicalNote,
      config.labOrderEncounterTypeUuid,
      config.labOrderTypeUuid,
      config.careSettingUuid,
      providerUuid,
      locationUuid,
    );

    setIsSaving(false);

    if (result.success) {
      showSnackbar({
        title: t('labOrderSuccess', 'Lab Orders Submitted'),
        subtitle: t('labOrderSuccessDetail', '{{count}} test(s) ordered successfully.', {
          count: testsToOrder.length,
        }),
        kind: 'success',
        isLowContrast: false,
        timeoutInMs: 5000,
      });
      clearAll();
      closeWorkspace?.();
    } else {
      setSaveError(result.error ?? t('unknownError', 'An unknown error occurred.'));
    }
  };

  const selectedTestsByCategory = useMemo(() => {
    const grouped: { categoryLabel: string; tests: LabTest[] }[] = [];
    for (const cat of LAB_TEST_CATEGORIES) {
      const tests = cat.tests.filter((t) => selectedTests.has(t.id));
      if (tests.length > 0) {
        grouped.push({ categoryLabel: cat.label, tests });
      }
    }
    return grouped;
  }, [selectedTests]);

  return (
    <Form onSubmit={handleSubmit} className={styles.formWrapper}>
      {/* ── Header ────────────────────────────────────────────── */}
      <div className={styles.formHeader}>
        <div className={styles.headerLeft}>
          <Chemistry size={24} className={styles.headerIcon} />
          <div>
            <h3 className={styles.formTitle}>{t('labRequestForm', 'Laboratory Request Form')}</h3>
            {patientName && <p className={styles.patientLabel}>{patientName}</p>}
          </div>
        </div>
      </div>

      {/* ── Progress Indicator ────────────────────────────────── */}
      <div className={styles.progressContainer}>
        <ProgressIndicator currentIndex={currentStep} spaceEqually>
          <ProgressStep
            label={t('selectTests', 'Select Tests')}
            secondaryLabel={selectedTests.size > 0 ? `${selectedTests.size} selected` : ''}
          />
          <ProgressStep label={t('clinicalDetails', 'Clinical Details')} />
          <ProgressStep label={t('reviewSubmit', 'Review & Submit')} />
        </ProgressIndicator>
      </div>

      {/* ── Error Banner ──────────────────────────────────────── */}
      {saveError && (
        <InlineNotification
          kind="error"
          title={t('error', 'Error')}
          subtitle={saveError}
          onCloseButtonClick={() => setSaveError(null)}
          className={styles.notification}
        />
      )}

      {/* ══════════════════════════════════════════════════════════
          STEP 1: Select Tests
         ══════════════════════════════════════════════════════════ */}
      {currentStep === 0 && (
        <div className={styles.stepContent}>
          {/* Selected Tests Summary */}
          {selectedTests.size > 0 && (
            <Tile className={styles.selectedSummary}>
              <div className={styles.summaryHeader}>
                <span className={styles.summaryCount}>
                  {t('selectedTests', '{{count}} test(s) selected', { count: selectedTests.size })}
                </span>
                <Button kind="ghost" size="sm" renderIcon={Reset} onClick={clearAll}>
                  {t('clearAll', 'Clear All')}
                </Button>
              </div>
              <div className={styles.tagGroup}>
                {Array.from(selectedTests).map((id) => {
                  const test = allTestsMap.get(id);
                  return test ? (
                    <Tag
                      key={id}
                      type="blue"
                      size="md"
                      filter
                      onClose={() => removeSelectedTest(id)}
                      title={t('removeTest', 'Remove')}
                    >
                      {test.label}
                    </Tag>
                  ) : null;
                })}
              </div>
            </Tile>
          )}

          {/* Search */}
          <Search
            id="lab-test-search"
            labelText={t('searchTests', 'Search tests')}
            placeholder={t('searchPlaceholder', 'Search by test or category name...')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onClear={() => setSearchTerm('')}
            className={styles.searchBar}
            size="lg"
          />

          {/* Test Categories */}
          <div className={styles.categoriesContainer}>
            <Accordion align="start">
              {filteredCategories.map((category) => {
                const selectedInCategory = category.tests.filter((t) => selectedTests.has(t.id)).length;
                const allSelected = selectedInCategory === category.tests.length && category.tests.length > 0;

                return (
                  <AccordionItem
                    key={category.id}
                    title={
                      <div className={styles.categoryTitle}>
                        <span>{category.label}</span>
                        {selectedInCategory > 0 && (
                          <Tag type="blue" size="sm">
                            {selectedInCategory}
                          </Tag>
                        )}
                      </div>
                    }
                    className={styles.categoryAccordion}
                  >
                    <div className={styles.categoryContent}>
                      <div className={styles.selectAllRow}>
                        <Checkbox
                          id={`select-all-${category.id}`}
                          labelText={t('selectAll', 'Select All')}
                          checked={allSelected}
                          indeterminate={selectedInCategory > 0 && !allSelected}
                          onChange={() => toggleCategory(category.id)}
                        />
                      </div>
                      <Grid narrow className={styles.testsGrid}>
                        {category.tests.map((test) => (
                          <Column key={test.id} lg={4} md={4} sm={4}>
                            <Checkbox
                              id={`test-${test.id}`}
                              labelText={test.label}
                              checked={selectedTests.has(test.id)}
                              onChange={() => toggleTest(test.id)}
                              className={styles.testCheckbox}
                            />
                          </Column>
                        ))}
                      </Grid>
                    </div>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          STEP 2: Clinical Details
         ══════════════════════════════════════════════════════════ */}
      {currentStep === 1 && (
        <div className={styles.stepContent}>
          <Tile className={styles.detailsSection}>
            <h4 className={styles.sectionTitle}>{t('urgencyLevel', 'Urgency Level')}</h4>
            <RadioButtonGroup
              name="urgency"
              legendText={t('selectUrgency', 'Select urgency level for this lab request')}
              valueSelected={urgency}
              onChange={(val: string) => setUrgency(val as 'ROUTINE' | 'STAT')}
              orientation="horizontal"
              className={styles.urgencyGroup}
            >
              <RadioButton id="routine" value="ROUTINE" labelText={t('routine', 'Routine')} />
              <RadioButton id="stat" value="STAT" labelText={t('stat', 'STAT (Urgent)')} />
            </RadioButtonGroup>
          </Tile>

          <Tile className={styles.detailsSection}>
            <h4 className={styles.sectionTitle}>{t('additionalInfo', 'Additional Information')}</h4>
            <Grid narrow>
              <Column lg={8} md={4} sm={4}>
                <TextArea
                  id="clinical-note"
                  labelText={t('clinicalNote', 'Clinical Note')}
                  value={clinicalNote}
                  onChange={(e) => setClinicalNote(e.target.value)}
                  placeholder={t('clinicalNotePlaceholder', 'Enter clinical information relevant to the request...')}
                  rows={4}
                />
              </Column>
              <Column lg={8} md={4} sm={4}>
                <TextArea
                  id="other-tests"
                  labelText={t('otherTests', 'In Case of Other Tests, Specify')}
                  value={otherTests}
                  onChange={(e) => setOtherTests(e.target.value)}
                  placeholder={t('otherTestsPlaceholder', 'Specify any tests not listed above...')}
                  rows={4}
                />
              </Column>
            </Grid>
          </Tile>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          STEP 3: Review & Submit
         ══════════════════════════════════════════════════════════ */}
      {currentStep === 2 && (
        <div className={styles.stepContent}>
          <Tile className={styles.reviewSection}>
            <h4 className={styles.sectionTitle}>{t('orderSummary', 'Order Summary')}</h4>
            <div className={styles.reviewMeta}>
              <Tag type={urgency === 'STAT' ? 'red' : 'blue'} size="md">
                {urgency === 'STAT' ? t('stat', 'STAT (Urgent)') : t('routine', 'Routine')}
              </Tag>
              <span className={styles.reviewTestCount}>
                {t('totalTests', '{{count}} test(s)', { count: selectedTests.size })}
              </span>
            </div>
          </Tile>

          <Tile className={styles.reviewSection}>
            <h4 className={styles.sectionTitle}>{t('selectedTestsReview', 'Selected Tests')}</h4>
            <StructuredListWrapper>
              <StructuredListHead>
                <StructuredListRow head>
                  <StructuredListCell head>{t('category', 'Category')}</StructuredListCell>
                  <StructuredListCell head>{t('tests', 'Tests')}</StructuredListCell>
                </StructuredListRow>
              </StructuredListHead>
              <StructuredListBody>
                {selectedTestsByCategory.map((group) => (
                  <StructuredListRow key={group.categoryLabel}>
                    <StructuredListCell className={styles.reviewCategoryCell}>{group.categoryLabel}</StructuredListCell>
                    <StructuredListCell>
                      <div className={styles.reviewTestTags}>
                        {group.tests.map((test) => (
                          <Tag key={test.id} type="blue" size="sm">
                            {test.label}
                          </Tag>
                        ))}
                      </div>
                    </StructuredListCell>
                  </StructuredListRow>
                ))}
              </StructuredListBody>
            </StructuredListWrapper>
          </Tile>

          {(clinicalNote || otherTests) && (
            <Tile className={styles.reviewSection}>
              <h4 className={styles.sectionTitle}>{t('notes', 'Notes')}</h4>
              {clinicalNote && (
                <div className={styles.reviewNote}>
                  <strong>{t('clinicalNote', 'Clinical Note')}:</strong>
                  <p>{clinicalNote}</p>
                </div>
              )}
              {otherTests && (
                <div className={styles.reviewNote}>
                  <strong>{t('otherTests', 'Other Tests')}:</strong>
                  <p>{otherTests}</p>
                </div>
              )}
            </Tile>
          )}
        </div>
      )}

      {/* ── Navigation Actions ────────────────────────────────── */}
      <div className={styles.formActions}>
        {currentStep > 0 && (
          <Button kind="secondary" size="lg" renderIcon={ArrowLeft} onClick={goBack} disabled={isSaving}>
            {t('back', 'Back')}
          </Button>
        )}

        {currentStep < STEPS.length - 1 && (
          <Button kind="primary" size="lg" renderIcon={ArrowRight} onClick={goNext}>
            {t('next', 'Next')}
          </Button>
        )}

        {currentStep === STEPS.length - 1 && (
          <Button
            kind="primary"
            type="submit"
            size="lg"
            renderIcon={SendFilled}
            disabled={isSaving || isSessionLoading}
          >
            {isSaving ? (
              <InlineLoading description={t('submitting', 'Submitting...')} />
            ) : (
              t('submitLabRequest', 'Submit Lab Request ({{count}})', { count: selectedTests.size })
            )}
          </Button>
        )}

        <Button kind="ghost" size="lg" renderIcon={Reset} onClick={clearAll} disabled={isSaving}>
          {t('reset', 'Reset Form')}
        </Button>

        {closeWorkspace && (
          <Button kind="ghost" size="lg" renderIcon={Close} onClick={closeWorkspace} disabled={isSaving}>
            {t('cancel', 'Cancel')}
          </Button>
        )}
      </div>
    </Form>
  );
};

export default LabRequestForm;
