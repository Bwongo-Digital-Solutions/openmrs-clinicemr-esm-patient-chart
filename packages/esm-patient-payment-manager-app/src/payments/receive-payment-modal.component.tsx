import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dropdown, InlineLoading, InlineNotification, Modal, NumberInput } from '@carbon/react';
import { showSnackbar, useConfig } from '@openmrs/esm-framework';
import type { PaymentManagerConfig } from '../config-schema';
import { processPayment, usePaymentModes } from '../billing/billing.resource';
import type { Bill } from '../billing/types';

interface ReceivePaymentModalProps {
  bill: Bill;
  onClose: () => void;
  onPaid: () => void;
}

const ReceivePaymentModal: React.FC<ReceivePaymentModalProps> = ({ bill, onClose, onPaid }) => {
  const { t } = useTranslation();
  const config = useConfig<PaymentManagerConfig>();
  const { paymentModes, isLoading } = usePaymentModes();

  const total = useMemo(
    () => bill.lineItems.reduce((sum, li) => sum + li.price * (li.quantity ?? 1), 0),
    [bill.lineItems],
  );

  const [paymentModeUuid, setPaymentModeUuid] = useState('');
  const [amountTendered, setAmountTendered] = useState(total);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currencyFmt = (value: number) => `${config.defaultCurrency} ${new Intl.NumberFormat().format(value ?? 0)}`;

  const handleSubmit = async () => {
    if (!paymentModeUuid) {
      setError(t('selectPaymentMode', 'Select a payment method.'));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await processPayment(config.billingApiBasePath, { bill, paymentModeUuid, amountTendered });
      showSnackbar({
        kind: 'success',
        title: t('paymentProcessed', 'Payment processed'),
        subtitle: t('orderCanProceed', 'The order can now proceed.'),
      });
      onPaid();
    } catch (err) {
      setError(String((err as Error)?.message ?? t('paymentFailed', 'Payment failed.')));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open
      modalHeading={t('receivePayment', 'Receive payment')}
      primaryButtonText={submitting ? t('processing', 'Processing…') : t('confirmPayment', 'Confirm payment')}
      secondaryButtonText={t('cancel', 'Cancel')}
      primaryButtonDisabled={submitting}
      onRequestClose={onClose}
      onRequestSubmit={handleSubmit}
    >
      <p style={{ marginBottom: '1rem' }}>
        {t('patient', 'Patient')}:{' '}
        <strong>{typeof bill.patient === 'string' ? bill.patient : bill.patient?.display}</strong>
      </p>
      <ul style={{ marginBottom: '1rem' }}>
        {bill.lineItems.map((li, i) => (
          <li key={li.uuid ?? i} style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>{li.display ?? li.priceName ?? t('service', 'Service')}</span>
            <span>{currencyFmt(li.price * (li.quantity ?? 1))}</span>
          </li>
        ))}
      </ul>
      <p style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, marginBottom: '1rem' }}>
        <span>{t('totalDue', 'Total due')}</span>
        <span>{currencyFmt(total)}</span>
      </p>

      {isLoading ? (
        <InlineLoading description={t('loadingModes', 'Loading payment modes…')} />
      ) : (
        <Dropdown
          id="receive-payment-mode"
          titleText={t('paymentMode', 'Payment method')}
          label={t('choosePaymentMode', 'Choose a payment method…')}
          items={paymentModes}
          itemToString={(item) => item?.name ?? ''}
          selectedItem={paymentModes.find((m) => m.uuid === paymentModeUuid) ?? null}
          onChange={({ selectedItem }) => setPaymentModeUuid(selectedItem?.uuid ?? '')}
        />
      )}
      <div style={{ marginTop: '1rem' }}>
        <NumberInput
          id="receive-amount-tendered"
          label={t('amountTendered', 'Amount tendered')}
          min={0}
          value={amountTendered}
          onChange={(_e, { value }) => setAmountTendered(Number(value) || 0)}
        />
      </div>
      {amountTendered > total && (
        <p style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
          <span>{t('change', 'Change')}</span>
          <span>{currencyFmt(amountTendered - total)}</span>
        </p>
      )}
      {error && (
        <InlineNotification kind="error" lowContrast hideCloseButton title={t('error', 'Error')} subtitle={error} />
      )}
    </Modal>
  );
};

export default ReceivePaymentModal;
