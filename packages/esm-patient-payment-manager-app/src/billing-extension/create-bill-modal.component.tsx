import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, InlineNotification, Modal, NumberInput, Tag } from '@carbon/react';
import { Add, TrashCan } from '@carbon/react/icons';
import { showSnackbar, useConfig, useSession } from '@openmrs/esm-framework';
import type { PaymentManagerConfig } from '../config-schema';
import { createLocalBill, type LocalBill, type LocalLineItem } from '../billing/billing.resource';
import BillableServicePicker, { type SelectedService } from '../billing/billable-service-picker.component';
import PayerSelector, { formatPayer, type PayerSelection } from '../billing/payer-selector.component';
import { printReceipt } from '../receipt/print-receipt';
import { useReceiptFacility } from '../receipt/use-receipt-facility';
import styles from '../payment-manager.scss';

interface CreateBillModalProps {
  patientUuid: string;
  patientName: string;
  onClose: () => void;
  onCreated: (bill: LocalBill) => void;
}

/**
 * Billing-module extension modal: build a bill from one or more billable
 * services/items (searchable), then either record an immediate payment and
 * print a receipt, or save a pending bill and print an invoice.
 */
const CreateBillModal: React.FC<CreateBillModalProps> = ({ patientUuid, patientName, onClose, onCreated }) => {
  const { t } = useTranslation();
  const config = useConfig<PaymentManagerConfig>();
  const session = useSession();
  const facility = useReceiptFacility();

  const [lineItems, setLineItems] = useState<LocalLineItem[]>([]);
  const [picker, setPicker] = useState<SelectedService | null>(null);
  const [payer, setPayer] = useState<PayerSelection>({ clientType: 'PRIVATE', payer: '' });
  const [amountTendered, setAmountTendered] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const currency = config.defaultCurrency;
  const fmt = (v: number) => `${currency} ${new Intl.NumberFormat().format(v ?? 0)}`;
  const total = lineItems.reduce((sum, li) => sum + li.price * (li.quantity ?? 1), 0);

  const addLineItem = () => {
    if (!picker) return;
    setLineItems((prev) => [...prev, { name: picker.service.name, price: picker.price.price ?? 0, quantity: 1 }]);
    setPicker(null);
  };

  const removeLineItem = (index: number) => setLineItems((prev) => prev.filter((_, i) => i !== index));

  const submit = (markPaid: boolean) => {
    if (lineItems.length === 0) {
      setError(t('addAtLeastOneItem', 'Add at least one item to the bill.'));
      return;
    }
    if (markPaid && !payer.payer) {
      setError(t('selectPaymentMode', 'Select a payment method.'));
      return;
    }
    setError(null);
    const bill = createLocalBill({
      patientUuid,
      patientName,
      cashierUuid: session?.user?.uuid ?? '',
      cashierName: session?.user?.display,
      lineItems,
      status: markPaid ? 'PAID' : 'PENDING',
      paymentMethod: markPaid ? formatPayer(payer) : undefined,
      clientType: markPaid ? payer.clientType : undefined,
      insuranceProvider: markPaid && payer.clientType === 'CORPORATE' ? payer.payer : undefined,
      amountTendered: markPaid ? amountTendered || total : undefined,
    });
    try {
      printReceipt({ bill, facility, currency, documentType: markPaid ? 'RECEIPT' : 'INVOICE' });
    } catch {
      /* printing is best-effort */
    }
    showSnackbar({
      kind: 'success',
      title: markPaid ? t('paymentProcessed', 'Payment processed') : t('invoiceCreated', 'Invoice created'),
    });
    onCreated(bill);
  };

  return (
    <Modal
      open
      modalHeading={t('createBill', 'Create bill & print')}
      passiveModal
      onRequestClose={onClose}
    >
      <p style={{ marginBottom: '1rem' }}>
        {t('patient', 'Patient')}: <strong>{patientName || patientUuid}</strong>
      </p>

      <div className={styles.field}>
        <BillableServicePicker
          id="quick-bill-service"
          titleText={t('addItem', 'Add a service / item')}
          currency={currency}
          selectedServiceUuid={picker?.service.uuid}
          onChange={setPicker}
        />
        <Button kind="tertiary" size="sm" renderIcon={Add} disabled={!picker} onClick={addLineItem} style={{ marginTop: '0.5rem' }}>
          {t('addToBill', 'Add to bill')}
        </Button>
      </div>

      {lineItems.length > 0 && (
        <ul style={{ marginBottom: '1rem' }}>
          {lineItems.map((li, i) => (
            <li key={i} className={styles.orderRow}>
              <span>{li.name}</span>
              <span style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'center' }}>
                <Tag type="green" size="sm">
                  {fmt(li.price)}
                </Tag>
                <Button
                  hasIconOnly
                  kind="ghost"
                  size="sm"
                  iconDescription={t('remove', 'Remove')}
                  renderIcon={TrashCan}
                  onClick={() => removeLineItem(i)}
                />
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className={styles.summary}>
        <span>{t('total', 'Total')}</span>
        <span className={styles.price}>{fmt(total)}</span>
      </div>

      <div className={styles.field} style={{ marginTop: '1rem' }}>
        <PayerSelector id="quick-bill-payer" value={payer} onChange={setPayer} />
      </div>
      <NumberInput
        id="quick-bill-tendered"
        label={t('amountTendered', 'Amount tendered')}
        min={0}
        value={amountTendered}
        onChange={(_e, { value }) => setAmountTendered(Number(value) || 0)}
      />

      {error && (
        <InlineNotification kind="error" lowContrast hideCloseButton title={t('error', 'Error')} subtitle={error} />
      )}

      <div className={styles.actions}>
        <Button kind="secondary" onClick={() => submit(false)}>
          {t('saveInvoice', 'Save & print invoice')}
        </Button>
        <Button kind="primary" onClick={() => submit(true)}>
          {t('payAndReceipt', 'Receive payment & print receipt')}
        </Button>
      </div>
    </Modal>
  );
};

export default CreateBillModal;
