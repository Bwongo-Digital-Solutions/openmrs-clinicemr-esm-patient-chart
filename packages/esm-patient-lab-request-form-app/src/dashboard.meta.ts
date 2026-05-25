import { type DashboardLinkConfig } from '@openmrs/esm-patient-common-lib';

export const dashboardMeta: DashboardLinkConfig & { slot: string } = {
  slot: 'lab-request-dashboard-slot',
  path: 'lab-request',
  title: 'Lab Request',
};
