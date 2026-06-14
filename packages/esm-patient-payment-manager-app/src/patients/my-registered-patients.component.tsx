import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useSWR from 'swr';
import {
  Button,
  DataTable,
  DataTableSkeleton,
  InlineNotification,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tile,
} from '@carbon/react';
import { Add, ArrowRight, Receipt } from '@carbon/react/icons';
import { formatDate, navigate, openmrsFetch, restBaseUrl, useConfig, useSession } from '@openmrs/esm-framework';
import type { PaymentManagerConfig } from '../config-schema';
import { isCashierUser } from '../roles';
import { getRegisteredPatients } from '../registered-patients-store';
import { getAmountPaidForPatient, getBillsForPatient, useLocalBills, type LocalBill } from '../billing/billing.resource';
import PaymentReceiptModal from '../receipt/payment-receipt-modal.component';
import styles from '../payment-manager.scss';

interface PatientResource {
  uuid: string;
  display: string;
  identifiers?: Array<{ identifier: string; preferred?: boolean }>;
  person?: { gender?: string; age?: number };
}

const patientRep = 'custom:(uuid,display,identifiers:(identifier,preferred),person:(gender,age))';

async function fetchPatients(uuids: string[]): Promise<PatientResource[]> {
  if (uuids.length === 0) return [];
  const results = await Promise.allSettled(
    uuids.map((uuid) =>
      openmrsFetch<PatientResource>(`${restBaseUrl}/patient/${uuid}?v=${encodeURIComponent(patientRep)}`).then(
        (res) => res.data,
      ),
    ),
  );
  return results
    .filter((r): r is PromiseFulfilledResult<PatientResource> => r.status === 'fulfilled')
    .map((r) => r.value);
}

const MyRegisteredPatients: React.FC = () => {
  const { t } = useTranslation();
  const session = useSession();
  const config = useConfig<PaymentManagerConfig>();
  const currentUserUuid = session?.user?.uuid;
  const isCashier = isCashierUser(session, config.cashierRoleNames);

  const entries = useMemo(() => (currentUserUuid ? getRegisteredPatients(currentUserUuid) : []), [currentUserUuid]);
  // Subscribe to the local bill store so amount-paid figures update live.
  const { bills } = useLocalBills();

  const currencyFmt = (value: number) => `${config.defaultCurrency} ${new Intl.NumberFormat().format(value ?? 0)}`;

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(config.pageSize ?? 25);
  const [receiptBill, setReceiptBill] = useState<LocalBill | null>(null);

  const openReceipt = (patientUuid: string) => {
    const paid = getBillsForPatient(patientUuid).find((b) => b.status === 'PAID');
    if (paid) {
      setReceiptBill(paid);
    }
  };

  const swrKey =
    currentUserUuid && entries.length > 0
      ? ['payment-manager-registered-patients', currentUserUuid, entries.map((e) => e.patientUuid).join(',')]
      : null;

  const { data, error, isLoading } = useSWR(swrKey, () => fetchPatients(entries.map((e) => e.patientUuid)));

  const rows = useMemo(() => {
    const patients = data ?? [];
    const byUuid = new Map(patients.map((p) => [p.uuid, p]));
    return entries
      .map((entry) => {
        const p = byUuid.get(entry.patientUuid);
        if (!p) return null;
        const preferredId = p.identifiers?.find((i) => i.preferred) ?? p.identifiers?.[0];
        return {
          id: p.uuid,
          name: p.display,
          identifier: preferredId?.identifier ?? '—',
          gender: p.person?.gender ?? '—',
          age: p.person?.age != null ? String(p.person.age) : '—',
          registeredOn: entry.registeredAt ? formatDate(new Date(entry.registeredAt)) : '—',
          amountPaid: currencyFmt(getAmountPaidForPatient(p.uuid)),
        };
      })
      .filter(Boolean) as Array<{
      id: string;
      name: string;
      identifier: string;
      gender: string;
      age: string;
      registeredOn: string;
      amountPaid: string;
    }>;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, entries, bills, config.defaultCurrency]);

  const pagedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, currentPage, pageSize]);

  const startNewRegistration = () => navigate({ to: `\${openmrsSpaBase}/${config.consultationPaymentPath}` });

  const headers = [
    { key: 'name', header: t('patientName', 'Name') },
    { key: 'identifier', header: t('identifier', 'Identifier') },
    { key: 'gender', header: t('gender', 'Gender') },
    { key: 'age', header: t('age', 'Age') },
    { key: 'registeredOn', header: t('registeredOn', 'Registered on') },
    { key: 'amountPaid', header: t('amountPaid', 'Amount paid') },
    { key: 'actions', header: '' },
  ];

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

  if (entries.length === 0) {
    return (
      <div className={styles.container}>
        <h2 className={styles.title}>{t('myRegisteredPatients', 'My Registered Patients')}</h2>
        <Tile className={styles.emptyTile}>
          <p>{t('noPatientsRegistered', "You haven't registered any patients yet.")}</p>
          <Button className={styles.emptyAction} kind="primary" renderIcon={Add} onClick={startNewRegistration}>
            {t('newConsultation', 'New consultation & registration')}
          </Button>
        </Tile>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={styles.container}>
        <h2 className={styles.title}>{t('myRegisteredPatients', 'My Registered Patients')}</h2>
        <DataTableSkeleton headers={headers} rowCount={Math.min(entries.length, 5)} />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <h2 className={styles.title}>{t('myRegisteredPatients', 'My Registered Patients')}</h2>
        <InlineNotification
          kind="error"
          title={t('errorLoading', "Could not load patients you've registered.")}
          subtitle={String((error as Error)?.message ?? '')}
          lowContrast
          hideCloseButton
        />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>{t('myRegisteredPatients', 'My Registered Patients')}</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button
            kind="ghost"
            renderIcon={Receipt}
            onClick={() => navigate({ to: '${openmrsSpaBase}/payment-manager/home' })}
          >
            {t('paymentManager', 'Payment Manager')}
          </Button>
          <Button kind="primary" renderIcon={Add} onClick={startNewRegistration}>
            {t('newConsultation', 'New consultation & registration')}
          </Button>
        </div>
      </div>
      <DataTable rows={pagedRows} headers={headers} useZebraStyles>
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
                {dataRows.map((r) => (
                  <TableRow {...getRowProps({ row: r })} key={r.id}>
                    {r.cells.map((cell) =>
                      cell.info.header === 'actions' ? (
                        <TableCell key={cell.id}>
                          <Button
                            kind="ghost"
                            size="sm"
                            renderIcon={Receipt}
                            onClick={() => openReceipt(r.id)}
                          >
                            {t('receipt', 'Receipt')}
                          </Button>
                          <Button
                            kind="ghost"
                            size="sm"
                            renderIcon={ArrowRight}
                            onClick={() => navigate({ to: `\${openmrsSpaBase}/patient/${r.id}/chart` })}
                          >
                            {t('openChart', 'Open chart')}
                          </Button>
                        </TableCell>
                      ) : (
                        <TableCell key={cell.id}>{cell.value}</TableCell>
                      ),
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DataTable>
      <Pagination
        page={currentPage}
        pageSize={pageSize}
        pageSizes={[10, 25, 50, 100]}
        totalItems={rows.length}
        onChange={({ page, pageSize: newPageSize }) => {
          setCurrentPage(page);
          if (newPageSize !== pageSize) {
            setPageSize(newPageSize);
          }
        }}
      />
      {receiptBill && <PaymentReceiptModal bill={receiptBill} onClose={() => setReceiptBill(null)} />}
    </div>
  );
};

export default MyRegisteredPatients;
