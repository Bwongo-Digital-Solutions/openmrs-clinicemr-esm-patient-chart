import { getAsyncLifecycle, defineConfigSchema } from '@openmrs/esm-framework';
import { configSchema } from './config-schema';

const moduleName = '@clinicemr/esm-post-registration-redirect-app';

const options = {
  featureName: 'post-registration-redirect',
  moduleName,
};

export const importTranslation = require.context('../translations', false, /.json$/, 'lazy');

export function startupApp() {
  defineConfigSchema(moduleName, configSchema);
}

export const postRegistrationRedirect = getAsyncLifecycle(
  () => import('./post-registration-redirect.component'),
  options,
);

export const myRegisteredPatients = getAsyncLifecycle(() => import('./my-registered-patients.component'), options);

export const registrationClerkLockdown = getAsyncLifecycle(
  () => import('./registration-clerk-lockdown.component'),
  options,
);
