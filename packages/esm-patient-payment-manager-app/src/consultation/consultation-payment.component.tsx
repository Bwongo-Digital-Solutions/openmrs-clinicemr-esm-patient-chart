import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Dropdown, Form, InlineLoading, InlineNotification, NumberInput, TextInput, Tile } from '@carbon/react';
import { ArrowRight } from '@carbon/react/icons';
import { navigate, showSnackbar, useConfig, useSession } from '@openmrs/esm-framework';
import type { PaymentManagerConfig } from '../config-schema';
import { isCashierUser, isProviderUser } from '../roles';
import { usePaymentModes } from '../billing/billing.resource';
import BillableServicePicker, { type SelectedService } from '../billing/billable-service-picker.component';
import { setConsultationToken } from './consultation-session';
import styles from '../payment-manager.scss';

/**
 * Step 1 of the cashier registration workflow: collect the consultation fee.
 * The "Register patient" action is only enabled after a payment is recorded.
 * Providers are blocked from this page entirely.
 */
const ConsultationPayment: React.FC = () => {
  const { t } = useTranslation();
  const session = useSession();
  const config = useConfig<PaymentManagerConfig>();
  const { paymentModes, isLoading: loadingModes, error: modesError } = usePaymentModes();

  const [selected, setSelected] = useState<SelectedService | null>(null);
  const [paymentModeUuid, setPaymentModeUuid] = useState<string>('');
  const [manualPaymentMode, setManualPaymentMode] = useState<string>('');
  const [amountTendered, setAmountTendered] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);

  const isCashier = isCashierUser(session, config.cashierRoleNames);
  const isProvider = isProviderUser(session, config.providerRoleNames);

  const price = selected?.price?.price ?? 0;

  useEffect(() => {
    setAmountTendered(price);
  }, [price]);

  const currencyFmt = useMemo(
    () => (value: number) => `${config.defaultCurrency} ${new Intl.NumberFormat().format(value ?? 0)}`,
    [config.defaultCurrency],
  );

  if (session?.user && !isCashier) {
    return (
      <div className={styles.container}>
        <InlineNotification
          kind="error"
          lowContrast
          hideCloseButton
          title={t('accessDenied', 'Access denied')}
          subtitle={
            isProvider
              ? t('providerNoRegistration', 'Clinical providers cannot collect payments or register patients.')
              : t('cashierOnly', 'Only Cashier, Receptionist or Organisation Nurse roles can use the Payment Manager.')
          }
        />
      </div>
    );
  }

  const hasPaymentMode = !!paymentModeUuid || (!!manualPaymentMode && modesError);
  const canSubmit = !!selected && hasPaymentMode && amountTendered >= price && price >= 0 && !submitting;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected || !hasPaymentMode) return;
    setSubmitting(true);
    try {
      setConsultationToken(session.user.uuid, {
        serviceUuid: selected.service.uuid,
        serviceName: selected.service.name,
        price,
        priceUuid: selected.price.uuid,
        priceName: selected.price.name,
        paymentModeUuid: modesError ? manualPaymentMode : paymentModeUuid,
        amountTendered,
        createdAt: Date.now(),
      });
      showSnackbar({
        kind: 'success',
        title: t('paymentRecorded', 'Consultation payment recorded'),
        subtitle: t('proceedToRegister', 'You can now register the patient.'),
      });
      navigate({ to: '${openmrsSpaBase}/patient-registration' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>{t('consultationPayment', 'Consultation Payment')}</h2>
      <p style={{ marginBottom: '1.5rem' }}>
        {t(
          'consultationPaymentIntro',
          'Collect the consultation fee before registering a new patient. Registration is only enabled once payment has been received.',
        )}
      </p>
      <Tile className={styles.card}>
        <Form onSubmit={handleSubmit}>
          <div className={styles.field}>
            <BillableServicePicker
              id="consultation-service"
              titleText={t('consultationService', 'Consultation / billable service')}
              currency={config.defaultCurrency}
              selectedServiceUuid={selected?.service.uuid ?? config.consultationBillableServiceUuid}
              onChange={setSelected}
            />
          </div>

          <div className={styles.field}>
            {loadingModes ? (
              <InlineLoading description={t('loadingModes', 'Loading payment modes…')} />
            ) : modesError ? (
              <TextInput
                id="payment-mode-manual"
                labelText={t('paymentMode', 'Payment method')}
                value={manualPaymentMode}
                onChange={(e) => setManualPaymentMode(e.target.value)}
                placeholder={t('e.gCash', 'e.g. Cash')}
              />
            ) : (
              <Dropdown
                id="payment-mode"
                titleText={t('paymentMode', 'Payment method')}
                label={t('choosePaymentMode', 'Choose a payment method…')}
                items={paymentModes}
                itemToString={(item) => item?.name ?? ''}
                selectedItem={paymentModes.find((m) => m.uuid === paymentModeUuid) ?? null}
                onChange={({ selectedItem }) => setPaymentModeUuid(selectedItem?.uuid ?? '')}
              />
            )}
          </div>

          <div className={styles.field}>
            <NumberInput
              id="amount-tendered"
              label={t('amountTendered', 'Amount tendered')}
              min={0}
              value={amountTendered}
              onChange={(_e, { value }) => setAmountTendered(Number(value) || 0)}
            />
          </div>

          <div className={styles.summary}>
            <span>{t('amountDue', 'Amount due')}</span>
            <span className={styles.price}>{currencyFmt(price)}</span>
          </div>
          {amountTendered > price && (
            <div className={styles.summary}>
              <span>{t('change', 'Change')}</span>
              <span className={styles.price}>{currencyFmt(amountTendered - price)}</span>
            </div>
          )}

          <div className={styles.actions}>
            <Button type="submit" kind="primary" renderIcon={ArrowRight} disabled={!canSubmit}>
              {submitting
                ? t('processing', 'Processing…')
                : t('receiveAndRegister', 'Receive payment & register patient')}
            </Button>
            <Button kind="ghost" onClick={() => navigate({ to: `\${openmrsSpaBase}/${config.registrationListPath}` })}>
              {t('cancel', 'Cancel')}
            </Button>
          </div>
        </Form>
      </Tile>
    </div>
  );
};

export default ConsultationPayment;
