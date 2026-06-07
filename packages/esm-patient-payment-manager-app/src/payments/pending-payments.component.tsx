import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  DataTable,
  DataTableSkeleton,
  InlineNotification,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tile,
} from '@carbon/react';
import { Money, Renew } from '@carbon/react/icons';
import { formatDate, useConfig, useSession } from '@openmrs/esm-framework';
import type { PaymentManagerConfig } from '../config-schema';
import { isCashierUser } from '../roles';
import { useBills } from '../billing/billing.resource';
import type { Bill } from '../billing/types';
import ReceivePaymentModal from './receive-payment-modal.component';
import styles from '../payment-manager.scss';

const PendingPayments: React.FC = () => {
  const { t } = useTranslation();
  const session = useSession();
  const config = useConfig<PaymentManagerConfig>();
  const isCashier = isCashierUser(session, config.cashierRoleNames);
  const { bills, error, isLoading, mutate } = useBills('PENDING');
  const [activeBill, setActiveBill] = useState<Bill | null>(null);

  const currencyFmt = (value: number) => `${config.defaultCurrency} ${new Intl.NumberFormat().format(value ?? 0)}`;

  const headers = [
    { key: 'patient', header: t('patient', 'Patient') },
    { key: 'items', header: t('items', 'Items') },
    { key: 'amount', header: t('amount', 'Amount') },
    { key: 'created', header: t('created', 'Created') },
    { key: 'actions', header: '' },
  ];

  const rows = useMemo(
    () =>
      bills.map((bill) => {
        const amount = bill.lineItems.reduce((sum, li) => sum + li.price * (li.quantity ?? 1), 0);
        return {
          id: bill.uuid ?? Math.random().toString(36),
          bill,
          patient: typeof bill.patient === 'string' ? bill.patient : bill.patient?.display ?? '—',
          items: bill.lineItems.map((li) => li.display ?? li.priceName ?? t('service', 'Service')).join(', '),
          amount: currencyFmt(amount),
          created: bill.dateCreated ? formatDate(new Date(bill.dateCreated)) : '—',
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bills, config.defaultCurrency],
  );

  if (session?.user && !isCashier) {
    return (
      <div className={styles.container}>
        <InlineNotification
          kind="error"
          lowContrast
          hideCloseButton
          title={t('accessDenied', 'Access denied')}
          subtitle={t(
            'cashierOnly',
            'Only Cashier, Receptionist or Organisation Nurse roles can use the Payment Manager.',
          )}
        />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>{t('pendingPayments', 'Pending Payments')}</h2>
        <Button kind="ghost" renderIcon={Renew} onClick={() => mutate()}>
          {t('refresh', 'Refresh')}
        </Button>
      </div>

      {error && (
        <InlineNotification
          kind="error"
          lowContrast
          hideCloseButton
          title={t('errorLoadingBills', 'Could not load pending payments')}
          subtitle={String((error as Error)?.message ?? '')}
        />
      )}

      {isLoading ? (
        <DataTableSkeleton headers={headers} rowCount={5} />
      ) : rows.length === 0 ? (
        <Tile className={styles.emptyTile}>
          <p>{t('noPendingPayments', 'There are no pending payments right now.')}</p>
        </Tile>
      ) : (
        <DataTable rows={rows} headers={headers} useZebraStyles>
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
                    const original = rows.find((row) => row.id === r.id)?.bill;
                    return (
                      <TableRow {...getRowProps({ row: r })} key={r.id}>
                        {r.cells.map((cell) =>
                          cell.info.header === 'actions' ? (
                            <TableCell key={cell.id}>
                              <Button
                                kind="primary"
                                size="sm"
                                renderIcon={Money}
                                onClick={() => original && setActiveBill(original)}
                              >
                                {t('receivePayment', 'Receive payment')}
                              </Button>
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

      {activeBill && (
        <ReceivePaymentModal
          bill={activeBill}
          onClose={() => setActiveBill(null)}
          onPaid={() => {
            setActiveBill(null);
            mutate();
          }}
        />
      )}
    </div>
  );
};

export default PendingPayments;
