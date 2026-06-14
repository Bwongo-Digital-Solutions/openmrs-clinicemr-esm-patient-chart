import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  DataTable,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
  Tile,
} from '@carbon/react';
import { Add, Printer } from '@carbon/react/icons';
import { formatDate, useConfig } from '@openmrs/esm-framework';
import type { PaymentManagerConfig } from '../config-schema';
import { billTotal, useLocalBills, type LocalBill } from '../billing/billing.resource';
import { printReceipt } from '../receipt/print-receipt';
import { useReceiptFacility } from '../receipt/use-receipt-facility';
import CreateBillModal from './create-bill-modal.component';
import styles from '../payment-manager.scss';

interface PatientBillsExtensionProps {
  patientUuid: string;
  patient?: { name?: Array<{ text?: string }> };
}

/**
 * Billing-module extension widget shown in the patient chart. Lists the
 * patient's bills (paid + pending) with the ability to print the invoice
 * (pending) or receipt (paid), and to create a new bill that bills and prints.
 */
const PatientBillsExtension: React.FC<PatientBillsExtensionProps> = ({ patientUuid, patient }) => {
  const { t } = useTranslation();
  const config = useConfig<PaymentManagerConfig>();
  const facility = useReceiptFacility();
  const { bills } = useLocalBills();
  const [showCreate, setShowCreate] = useState(false);

  const currency = config.defaultCurrency;
  const fmt = (v: number) => `${currency} ${new Intl.NumberFormat().format(v ?? 0)}`;
  const patientName = patient?.name?.[0]?.text ?? '';

  const patientBills = useMemo(
    () => bills.filter((b) => b.patientUuid === patientUuid),
    [bills, patientUuid],
  );

  const print = (bill: LocalBill) =>
    printReceipt({ bill, facility, currency, documentType: bill.status === 'PAID' ? 'RECEIPT' : 'INVOICE' });

  const headers = [
    { key: 'items', header: t('itemOrService', 'Item / service') },
    { key: 'amount', header: t('amount', 'Amount') },
    { key: 'status', header: t('status', 'Status') },
    { key: 'date', header: t('date', 'Date') },
    { key: 'actions', header: '' },
  ];

  const rows = patientBills.map((bill) => ({
    id: bill.uuid,
    items: bill.lineItems.map((li) => li.name).join(', '),
    amount: fmt(billTotal(bill)),
    status: bill.status,
    date: formatDate(new Date(bill.paidAt ?? bill.createdAt)),
  }));

  return (
    <Tile className={styles.container} style={{ marginTop: '1rem' }}>
      <div className={styles.header}>
        <h4 className={styles.title}>{t('billingAndReceipts', 'Billing & Receipts')}</h4>
        <Button kind="ghost" size="sm" renderIcon={Add} onClick={() => setShowCreate(true)}>
          {t('newBill', 'New bill')}
        </Button>
      </div>

      {rows.length === 0 ? (
        <p>{t('noBills', 'No bills recorded for this patient yet.')}</p>
      ) : (
        <DataTable rows={rows} headers={headers} size="sm" useZebraStyles>
          {({ rows: dataRows, headers: dataHeaders, getHeaderProps, getRowProps, getTableProps }) => (
            <TableContainer>
              <Table {...getTableProps()}>
                <TableHead>
                  <TableRow>
                    {dataHeaders.map((h) => (
                      <TableHeader {...getHeaderProps({ header: h })} key={h.key}>
                        {h.header}
                      </TableHeader>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dataRows.map((r) => {
                    const bill = patientBills.find((b) => b.uuid === r.id)!;
                    return (
                      <TableRow {...getRowProps({ row: r })} key={r.id}>
                        {r.cells.map((cell) =>
                          cell.info.header === 'actions' ? (
                            <TableCell key={cell.id}>
                              <Button
                                kind="ghost"
                                size="sm"
                                renderIcon={Printer}
                                onClick={() => print(bill)}
                              >
                                {bill.status === 'PAID' ? t('receipt', 'Receipt') : t('invoice', 'Invoice')}
                              </Button>
                            </TableCell>
                          ) : cell.info.header === 'status' ? (
                            <TableCell key={cell.id}>
                              <Tag type={cell.value === 'PAID' ? 'green' : 'magenta'} size="sm">
                                {cell.value}
                              </Tag>
                            </TableCell>
                          ) : (
                            <TableCell key={cell.id}>{cell.value}</TableCell>
                          ),
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DataTable>
      )}

      {showCreate && (
        <CreateBillModal
          patientUuid={patientUuid}
          patientName={patientName}
          onClose={() => setShowCreate(false)}
          onCreated={() => setShowCreate(false)}
        />
      )}
    </Tile>
  );
};

export default PatientBillsExtension;
