import { getAsyncLifecycle, getSyncLifecycle, defineConfigSchema } from '@openmrs/esm-framework';
import { createDashboardLink } from '@openmrs/esm-patient-common-lib';
import { configSchema } from './config-schema';
import { dashboardMeta } from './dashboard.meta';

const moduleName = '@clinicemr/esm-patient-lab-request-form-app';

const options = {
  featureName: 'lab-request-form',
  moduleName,
};

export const importTranslation = require.context('../translations', false, /.json$/, 'lazy');

export function startupApp() {
  defineConfigSchema(moduleName, configSchema);
}

export const labRequestFormWorkspace = getAsyncLifecycle(
  () => import('./lab-request/lab-request-form.component'),
  options,
);

export const labRequestActionButton = getAsyncLifecycle(
  () => import('./lab-request/lab-request-action-button.component'),
  options,
);

export const labRequestDashboard = getAsyncLifecycle(
  () => import('./lab-request/lab-request-dashboard.component'),
  options,
);

// t('Lab Request', 'Lab Request')
export const labRequestNavLink = getSyncLifecycle(
  createDashboardLink({
    ...dashboardMeta,
  }),
  options,
);
