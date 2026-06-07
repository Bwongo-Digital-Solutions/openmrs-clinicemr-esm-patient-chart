import { getAsyncLifecycle, defineConfigSchema } from '@openmrs/esm-framework';
import { configSchema } from './config-schema';

const moduleName = '@clinicemr/esm-patient-payment-manager-app';

const options = {
  featureName: 'patient-payment-manager',
  moduleName,
};

export const importTranslation = require.context('../translations', false, /.json$/, 'lazy');

export function startupApp() {
  defineConfigSchema(moduleName, configSchema);
}

export const consultationPayment = getAsyncLifecycle(
  () => import('./consultation/consultation-payment.component'),
  options,
);

export const postRegistrationRedirect = getAsyncLifecycle(
  () => import('./consultation/post-registration-redirect.component'),
  options,
);

export const myRegisteredPatients = getAsyncLifecycle(
  () => import('./patients/my-registered-patients.component'),
  options,
);

export const pendingPayments = getAsyncLifecycle(() => import('./payments/pending-payments.component'), options);

export const paymentManagerLockdown = getAsyncLifecycle(
  () => import('./lockdown/payment-manager-lockdown.component'),
  options,
);

export const orderPaymentPanel = getAsyncLifecycle(
  () => import('./order-basket/order-payment-panel.extension'),
  options,
);
