import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { InlineNotification, Modal, NumberInput } from '@carbon/react';
import { showSnackbar, useConfig } from '@openmrs/esm-framework';
import type { PaymentManagerConfig } from '../config-schema';
import { payLocalBill, billTotal, type LocalBill } from '../billing/billing.resource';
import PayerSelector, { formatPayer, type PayerSelection } from '../billing/payer-selector.component';
import { addNotification } from '../notifications/payment-notifications-store';

interface ReceivePaymentModalProps {
  bill: LocalBill;
  onClose: () => void;
  onPaid: () => void;
}

const ReceivePaymentModal: React.FC<ReceivePaymentModalProps> = ({ bill, onClose, onPaid }) => {
  const { t } = useTranslation();
  const config = useConfig<PaymentManagerConfig>();

  const total = billTotal(bill);

  const [payer, setPayer] = useState<PayerSelection>({ clientType: 'PRIVATE', payer: '' });
  const [amountTendered, setAmountTendered] = useState(total);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currencyFmt = (value: number) => `${config.defaultCurrency} ${new Intl.NumberFormat().format(value ?? 0)}`;

  const handleSubmit = async () => {
    if (!payer.payer) {
      setError(t('selectPaymentMode', 'Select a payment method.'));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      payLocalBill(bill.uuid, { paymentMethod: formatPayer(payer), amountTendered });
      // Notify the clinician who requested the order that payment is concluded.
      if (bill.requestedByUuid) {
        addNotification({
          recipientUuid: bill.requestedByUuid,
          title: t('paymentConcluded', 'Payment concluded'),
          message: t('paymentConcludedFor', '{{patient}} has paid {{amount}} for the requested order.', {
            patient: bill.patientName || t('thePatient', 'The patient'),
            amount: currencyFmt(total),
          }),
          patientUuid: bill.patientUuid,
        });
      }
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
      <p style={{ marginBottom: '0.5rem' }}>
        {t('patient', 'Patient')}: <strong>{bill.patientName || bill.patientUuid}</strong>
      </p>
      {bill.requestedByName && (
        <p style={{ marginBottom: '1rem' }}>
          {t('requestedBy', 'Requested by')}: <strong>{bill.requestedByName}</strong>
        </p>
      )}
      <ul style={{ marginBottom: '1rem' }}>
        {bill.lineItems.map((li, i) => (
          <li key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>{li.name || t('service', 'Service')}</span>
            <span>{currencyFmt(li.price * (li.quantity ?? 1))}</span>
          </li>
        ))}
      </ul>
      <p style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, marginBottom: '1rem' }}>
        <span>{t('totalDue', 'Total due')}</span>
        <span>{currencyFmt(total)}</span>
      </p>

      <PayerSelector id="receive-payer" value={payer} onChange={setPayer} />
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
