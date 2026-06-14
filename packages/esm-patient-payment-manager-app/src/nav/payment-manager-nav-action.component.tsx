import React from 'react';
import { useTranslation } from 'react-i18next';
import { HeaderGlobalAction } from '@carbon/react';
import { Money } from '@carbon/react/icons';
import { navigate, useConfig, useSession } from '@openmrs/esm-framework';
import type { PaymentManagerConfig } from '../config-schema';
import { isCashierUser } from '../roles';

/**
 * Top-navigation action button (shown only to cashier/front-desk roles) that
 * opens the Pending Payments queue. Gives cashiers a discoverable entry point
 * to the Payment Manager beyond the registration redirect.
 */
const PaymentManagerNavAction: React.FC = () => {
  const { t } = useTranslation();
  const session = useSession();
  const config = useConfig<PaymentManagerConfig>();

  if (!session?.user || !isCashierUser(session, config.cashierRoleNames)) {
    return null;
  }

  return (
    <HeaderGlobalAction
      aria-label={t('paymentManager', 'Payment Manager')}
      tooltipAlignment="end"
      onClick={() => navigate({ to: '${openmrsSpaBase}/payment-manager/home' })}
    >
      <Money size={20} />
    </HeaderGlobalAction>
  );
};

export default PaymentManagerNavAction;
