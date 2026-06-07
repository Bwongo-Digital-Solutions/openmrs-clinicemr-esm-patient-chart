import type React from 'react';
import { useEffect } from 'react';
import { navigate, showSnackbar, useConfig, useSession } from '@openmrs/esm-framework';
import type { PaymentManagerConfig } from '../config-schema';
import { isCashierUser, isProviderUser } from '../roles';
import { hasValidConsultationToken } from '../consultation/consultation-session';

/**
 * Globally-mounted route guard enforcing the payment-manager access rules:
 *
 *  - Clinical providers (Doctor, Pharmacist, Laboratory) are blocked from
 *    `patient-registration` and any `payment-manager/*` page → bounced home.
 *  - Cashier roles (Organisation Nurse, Cashier, Receptionist) may only reach
 *    `patient-registration` after recording a consultation payment; otherwise
 *    they are redirected to the consultation payment gate.
 */
function firstSegments(): string[] {
  const path = window.location.pathname
    .replace(/^\/openmrs\/spa\/?/, '')
    .replace(/^\/+/, '')
    .toLowerCase();
  return path.split('/').filter(Boolean);
}

const PaymentManagerLockdown: React.FC = () => {
  const session = useSession();
  const config = useConfig<PaymentManagerConfig>();

  useEffect(() => {
    if (!session?.user) return;

    const isProvider = isProviderUser(session, config.providerRoleNames);
    const isCashier = isCashierUser(session, config.cashierRoleNames);

    const enforce = () => {
      const segments = firstSegments();
      const first = segments[0] ?? '';
      const isRegistration = first === 'patient-registration';
      const isPaymentManager = first === 'payment-manager';

      // Block providers from registration + payment manager pages.
      if (isProvider && !isCashier && (isRegistration || isPaymentManager)) {
        showSnackbar({
          kind: 'error',
          title: 'Access denied',
          subtitle: 'Clinical providers cannot register patients or use the Payment Manager.',
        });
        navigate({ to: '${openmrsSpaBase}/home' });
        return;
      }

      // Gate cashier registration on a recorded consultation payment.
      if (isCashier && isRegistration && !hasValidConsultationToken(session.user.uuid)) {
        showSnackbar({
          kind: 'warning',
          title: 'Consultation payment required',
          subtitle: 'Collect the consultation fee before registering this patient.',
        });
        navigate({ to: `\${openmrsSpaBase}/${config.consultationPaymentPath}` });
      }
    };

    enforce();
    const handler = () => enforce();
    window.addEventListener('single-spa:before-routing-event', handler);
    window.addEventListener('popstate', handler);

    return () => {
      window.removeEventListener('single-spa:before-routing-event', handler);
      window.removeEventListener('popstate', handler);
    };
  }, [session, config]);

  return null;
};

export default PaymentManagerLockdown;
