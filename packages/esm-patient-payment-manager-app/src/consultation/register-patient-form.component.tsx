import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Form, NumberInput, Tile } from '@carbon/react';
import { ArrowRight } from '@carbon/react/icons';
import { navigate, showSnackbar, useConfig, useSession } from '@openmrs/esm-framework';
import type { PaymentManagerConfig } from '../config-schema';
import BillableServicePicker, { type SelectedService } from '../billing/billable-service-picker.component';
import PayerSelector, { formatPayer, type PayerSelection } from '../billing/payer-selector.component';
import { setConsultationToken } from './consultation-session';
import styles from '../payment-manager.scss';

/**
 * Register-new-patient form: pick the consultation/billable service (searchable),
 * choose the client type + payer (private payment mode or corporate insurer),
 * enter the amount tendered, then record the payment and proceed to patient
 * registration. The actual receipt is printed after registration completes
 * (post-registration redirect), once the patient UUID exists.
 */
const RegisterPatientForm: React.FC = () => {
  const { t } = useTranslation();
  const session = useSession();
  const config = useConfig<PaymentManagerConfig>();

  const [selected, setSelected] = useState<SelectedService | null>(null);
  const [payer, setPayer] = useState<PayerSelection>({ clientType: 'PRIVATE', payer: '' });
  const [amountTendered, setAmountTendered] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);

  const price = selected?.price?.price ?? 0;

  useEffect(() => {
    setAmountTendered(price);
  }, [price]);

  const currencyFmt = useMemo(
    () => (value: number) => `${config.defaultCurrency} ${new Intl.NumberFormat().format(value ?? 0)}`,
    [config.defaultCurrency],
  );

  const canSubmit = !!selected && !!payer.payer && amountTendered >= price && price >= 0 && !submitting;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected || !payer.payer) return;
    setSubmitting(true);
    try {
      setConsultationToken(session.user.uuid, {
        serviceUuid: selected.service.uuid,
        serviceName: selected.service.name,
        price,
        priceUuid: selected.price.uuid,
        priceName: selected.price.name,
        paymentModeUuid: formatPayer(payer),
        clientType: payer.clientType,
        insuranceProvider: payer.clientType === 'CORPORATE' ? payer.payer : undefined,
        cashierName: session?.user?.display,
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
    <Tile className={styles.card}>
      <Form onSubmit={handleSubmit}>
        <div className={styles.field}>
          <BillableServicePicker
            id="consultation-service"
            titleText={t('consultationService', 'Consultation fee / billable service')}
            currency={config.defaultCurrency}
            selectedServiceUuid={selected?.service.uuid ?? config.consultationBillableServiceUuid}
            onChange={setSelected}
          />
        </div>

        <div className={styles.field}>
          <PayerSelector id="consultation-payer" value={payer} onChange={setPayer} />
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
            {submitting ? t('processing', 'Processing…') : t('receiveAndRegister', 'Receive payment & register patient')}
          </Button>
        </div>
      </Form>
    </Tile>
  );
};

export default RegisterPatientForm;
