import { getAsyncLifecycle, defineConfigSchema } from '@openmrs/esm-framework';
import { configSchema } from './config-schema';

const moduleName = '@clinicemr/esm-patient-lab-request-form-app';

const options = {
  featureName: 'lab-request-form',
  moduleName,
};

export const importTranslation = require.context('../translations', false, /.json$/, 'lazy');

export function startupApp() {
  defineConfigSchema(moduleName, configSchema);
}

export const labRequestForm = getAsyncLifecycle(
  () => import('./lab-request/lab-request-form.component'),
  options,
);

export const labRequestFormWorkspace = getAsyncLifecycle(
  () => import('./lab-request/lab-request-form.component'),
  options,
);

export const labRequestActionButton = getAsyncLifecycle(
  () => import('./lab-request/lab-request-action-button.component'),
  options,
);
