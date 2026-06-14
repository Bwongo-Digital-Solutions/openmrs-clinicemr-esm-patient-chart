import React from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '@carbon/react';
import { useConfig } from '@openmrs/esm-framework';
import type { PaymentManagerConfig } from '../config-schema';
import { billTotal, type LocalBill } from '../billing/billing.resource';
import { printReceipt } from './print-receipt';
import { useReceiptFacility } from './use-receipt-facility';
import styles from '../payment-manager.scss';

interface PaymentReceiptModalProps {
  bill: LocalBill;
  documentType?: 'RECEIPT' | 'INVOICE';
  onClose: () => void;
}

/**
 * On-screen preview of a payment receipt/invoice with a Print action. Mirrors
 * the layout produced by `print-receipt` so what the cashier sees matches what
 * prints.
 */
const PaymentReceiptModal: React.FC<PaymentReceiptModalProps> = ({ bill, documentType = 'RECEIPT', onClose }) => {
  const { t } = useTranslation();
  const config = useConfig<PaymentManagerConfig>();
  const facility = useReceiptFacility();
  const currency = config.defaultCurrency;

  const total = billTotal(bill);
  const tendered = bill.amountTendered ?? total;
  const change = Math.max(0, tendered - total);
  const fmt = (v: number) => `${currency} ${new Intl.NumberFormat().format(v ?? 0)}`;
  const payer =
    bill.clientType === 'CORPORATE'
      ? `${bill.insuranceProvider ?? bill.paymentMethod ?? ''} (${t('insurance', 'Insurance')})`
      : bill.paymentMethod ?? '';

  const handlePrint = () => printReceipt({ bill, facility, currency, documentType });

  return (
    <Modal
      open
      modalHeading={documentType === 'INVOICE' ? t('invoice', 'Invoice') : t('paymentReceipt', 'Payment receipt')}
      primaryButtonText={t('print', 'Print')}
      secondaryButtonText={t('close', 'Close')}
      onRequestClose={onClose}
      onRequestSubmit={handlePrint}
    >
      <div className={styles.receiptPreview}>
        <div className={styles.receiptHeader}>
          {facility.logoUrl && <img src={facility.logoUrl} alt="logo" className={styles.receiptLogo} />}
          <div className={styles.receiptFacility}>{facility.name}</div>
          {facility.details?.map((line, i) => (
            <div key={i} className={styles.receiptDetails}>
              {line}
            </div>
          ))}
          <div className={styles.receiptDocTitle}>
            {documentType === 'INVOICE' ? t('invoiceUpper', 'INVOICE') : t('receiptUpper', 'PAYMENT RECEIPT')}
          </div>
        </div>

        <div className={styles.receiptMeta}>
          <div>
            <span>{t('receiptNo', 'No')}:</span> <strong>{bill.receiptNumber ?? '—'}</strong>
          </div>
          <div>
            <span>{t('date', 'Date')}:</span> {new Date(bill.paidAt ?? bill.createdAt).toLocaleString()}
          </div>
          <div>
            <span>{t('patient', 'Patient')}:</span> {bill.patientName || bill.patientUuid}
          </div>
          {bill.requestedByName && (
            <div>
              <span>{t('requestedBy', 'Requested by')}:</span> {bill.requestedByName}
            </div>
          )}
          {payer && (
            <div>
              <span>{t('payment', 'Payment')}:</span> {payer}
            </div>
          )}
        </div>

        <table className={styles.receiptTable}>
          <thead>
            <tr>
              <th>{t('item', 'Item')}</th>
              <th className={styles.alignCenter}>{t('qty', 'Qty')}</th>
              <th className={styles.alignRight}>{t('price', 'Price')}</th>
              <th className={styles.alignRight}>{t('amount', 'Amount')}</th>
            </tr>
          </thead>
          <tbody>
            {bill.lineItems.map((li, i) => (
              <tr key={i}>
                <td>{li.name || t('service', 'Service')}</td>
                <td className={styles.alignCenter}>{li.quantity ?? 1}</td>
                <td className={styles.alignRight}>{fmt(li.price ?? 0)}</td>
                <td className={styles.alignRight}>{fmt((li.price ?? 0) * (li.quantity ?? 1))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className={styles.receiptTotals}>
          <div className={styles.receiptGrand}>
            <span>{t('total', 'Total')}</span>
            <span>{fmt(total)}</span>
          </div>
          {documentType === 'RECEIPT' && (
            <>
              <div className={styles.receiptRow}>
                <span>{t('amountTendered', 'Amount tendered')}</span>
                <span>{fmt(tendered)}</span>
              </div>
              <div className={styles.receiptRow}>
                <span>{t('change', 'Change')}</span>
                <span>{fmt(change)}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default PaymentReceiptModal;
