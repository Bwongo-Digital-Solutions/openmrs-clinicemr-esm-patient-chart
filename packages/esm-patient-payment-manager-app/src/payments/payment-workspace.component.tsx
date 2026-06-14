import React from 'react';
import { useTranslation } from 'react-i18next';
import { InlineNotification, Tab, TabList, TabPanel, TabPanels, Tabs } from '@carbon/react';
import { useConfig, useSession } from '@openmrs/esm-framework';
import type { PaymentManagerConfig } from '../config-schema';
import { isCashierUser } from '../roles';
import RegisterPatientForm from '../consultation/register-patient-form.component';
import PendingPayments from './pending-payments.component';
import MyRegisteredPatients from '../patients/my-registered-patients.component';
import styles from '../payment-manager.scss';

/**
 * Main cashier hub. A tabbed workspace with:
 *   - "Register New Patient": collect the consultation fee (searchable service
 *     list), client type + payer, amount, then receive payment & register.
 *   - "Pending Payments": payment requests sent by providers (drug/test/other
 *     orders) showing patient, provider, item and price, paid via the receive
 *     payment modal.
 */
const PaymentWorkspace: React.FC = () => {
  const { t } = useTranslation();
  const session = useSession();
  const config = useConfig<PaymentManagerConfig>();
  const isCashier = isCashierUser(session, config.cashierRoleNames);

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
      <h2 className={styles.title}>{t('paymentManager', 'Payment Manager')}</h2>
      <Tabs>
        <TabList aria-label={t('paymentManager', 'Payment Manager')} contained>
          <Tab>{t('registerNewPatient', 'Register New Patient')}</Tab>
          <Tab>{t('pendingPayments', 'Pending Payments')}</Tab>
          <Tab>{t('myRegisteredPatients', 'My Registered Patients')}</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <div className={styles.tabContent}>
              <RegisterPatientForm />
            </div>
          </TabPanel>
          <TabPanel>
            <div className={styles.tabContent}>
              <PendingPayments embedded />
            </div>
          </TabPanel>
          <TabPanel>
            <div className={styles.tabContent}>
              <MyRegisteredPatients embedded />
            </div>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  );
};

export default PaymentWorkspace;
