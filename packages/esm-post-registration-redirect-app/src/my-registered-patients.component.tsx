import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useSWR from 'swr';
import {
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
  Button,
} from '@carbon/react';
import { Add, ArrowRight } from '@carbon/icons-react';
import { navigate, openmrsFetch, restBaseUrl, useConfig, useSession, formatDate } from '@openmrs/esm-framework';
import type { PostRegistrationRedirectConfig } from './config-schema';
import { getRegisteredPatients } from './registered-patients-store';
import styles from './my-registered-patients.scss';

interface PatientResource {
  uuid: string;
  display: string;
  identifiers?: Array<{ identifier: string; preferred?: boolean }>;
  person?: { gender?: string; age?: number };
}

const patientRep = 'custom:(uuid,display,identifiers:(identifier,preferred),person:(gender,age))';

/**
 * Fetch a list of patients by UUID via the OpenMRS REST patient endpoint.
 * The single-patient endpoint (`/ws/rest/v1/patient/{uuid}`) is reliable on
 * every OpenMRS REST build, unlike the encounter search endpoint which
 * requires `patient` as a parameter and 500s otherwise.
 */
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
  const config = useConfig<PostRegistrationRedirectConfig>();
  const currentUserUuid = session?.user?.uuid;

  // Read the full per-user list of registered patient UUIDs (most recent first).
  const entries = useMemo(() => (currentUserUuid ? getRegisteredPatients(currentUserUuid) : []), [currentUserUuid]);

  // Client-side pagination state. Defaults to the configured `pageSize`.
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(config.pageSize ?? 25);

  const swrKey =
    currentUserUuid && entries.length > 0
      ? ['my-registered-patients', currentUserUuid, entries.map((e) => e.patientUuid).join(',')]
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
        };
      })
      .filter(Boolean) as Array<{
      id: string;
      name: string;
      identifier: string;
      gender: string;
      age: string;
      registeredOn: string;
    }>;
  }, [data, entries]);

  // Window of rows shown on the current page.
  const pagedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, currentPage, pageSize]);

  const goToRegistration = () => navigate({ to: '${openmrsSpaBase}/patient-registration' });

  const headers = [
    { key: 'name', header: t('patientName', 'Name') },
    { key: 'identifier', header: t('identifier', 'Identifier') },
    { key: 'gender', header: t('gender', 'Gender') },
    { key: 'age', header: t('age', 'Age') },
    { key: 'registeredOn', header: t('registeredOn', 'Registered on') },
    { key: 'actions', header: '' },
  ];

  if (entries.length === 0) {
    return (
      <div className={styles.container}>
        <h2 className={styles.title}>{t('myRegisteredPatients', 'My Registered Patients')}</h2>
        <Tile className={styles.emptyTile}>
          <p>{t('noPatientsRegistered', "You haven't registered any patients yet.")}</p>
          <Button className={styles.emptyAction} kind="primary" renderIcon={Add} onClick={goToRegistration}>
            {t('registerNewPatient', 'Register New Patient')}
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
        <Button kind="ghost" renderIcon={Add} onClick={goToRegistration}>
          {t('registerNewPatient', 'Register New Patient')}
        </Button>
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
    </div>
  );
};

export default MyRegisteredPatients;
