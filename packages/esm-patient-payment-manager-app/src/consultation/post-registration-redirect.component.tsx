import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { InlineLoading } from '@carbon/react';
import { navigate, showSnackbar, useConfig, useSession } from '@openmrs/esm-framework';
import type { PaymentManagerConfig } from '../config-schema';
import { isCashierUser } from '../roles';
import { addRegisteredPatient } from '../registered-patients-store';
import { clearConsultationToken, getConsultationToken } from './consultation-session';
import { createLocalBill } from '../billing/billing.resource';
import { printReceipt } from '../receipt/print-receipt';

/**
 * One-shot redirect target the patient-registration app sends the cashier to
 * after a successful save (configure
 * `@openmrs/esm-patient-registration-app.links.submitButton`).
 *
 * For cashier users it:
 *   - creates (and immediately settles) the consultation bill recorded on the
 *     consultation payment gate, now that the patient UUID exists,
 *   - records the patient in the cashier's "My Registered Patients" list, and
 *   - returns them to that list.
 * Everyone else is sent to the patient chart (standard workflow).
 */
const PostRegistrationRedirect: React.FC = () => {
  const { t } = useTranslation();
  const session = useSession();
  const config = useConfig<PaymentManagerConfig>();
  const handled = useRef(false);

  useEffect(() => {
    if (!session?.user || handled.current) return;

    const patientUuid = extractPatientUuidFromUrl();
    const isCashier = isCashierUser(session, config.cashierRoleNames);

    if (patientUuid && session.user.uuid) {
      addRegisteredPatient(session.user.uuid, patientUuid);
    }

    if (!isCashier) {
      handled.current = true;
      navigate({
        to: patientUuid ? `\${openmrsSpaBase}/patient/${patientUuid}/chart` : '${openmrsSpaBase}/home',
      });
      return;
    }

    // Cashier: settle the consultation fee against the new patient as a PAID
    // bill in the local store (no billing backend to persist to).
    const token = getConsultationToken(session.user.uuid);

    const finish = () => {
      handled.current = true;
      clearConsultationToken(session.user.uuid);
      navigate({ to: `\${openmrsSpaBase}/${config.registrationListPath}` });
    };

    if (token && patientUuid) {
      try {
        const bill = createLocalBill({
          patientUuid,
          cashierUuid: session.user.uuid,
          cashierName: token.cashierName ?? session.user.display,
          lineItems: [
            {
              name: token.serviceName,
              price: token.price,
              quantity: 1,
            },
          ],
          status: 'PAID',
          paymentMethod: token.paymentModeUuid,
          clientType: token.clientType,
          insuranceProvider: token.insuranceProvider,
          amountTendered: token.amountTendered,
        });
        showSnackbar({
          kind: 'success',
          title: t('consultationBilled', 'Consultation fee settled'),
          subtitle: token.serviceName,
        });
        // Print the consultation/registration receipt now that the patient exists.
        try {
          printReceipt({
            bill,
            facility: {
              name: config.receiptFacilityName || session?.sessionLocation?.display || 'Clinic',
              details: (config.receiptFacilityDetails ?? []).filter(Boolean),
              logoUrl: config.receiptLogoUrl || undefined,
            },
            currency: config.defaultCurrency,
            documentType: 'RECEIPT',
          });
        } catch {
          /* printing is best-effort */
        }
      } catch (err) {
        showSnackbar({
          kind: 'error',
          title: t('billError', 'Could not record consultation bill'),
          subtitle: String((err as Error)?.message ?? ''),
        });
      } finally {
        finish();
      }
    } else {
      finish();
    }
  }, [session, config, t]);

  return (
    <div style={{ padding: '2rem' }}>
      <InlineLoading description={t('redirecting', 'Finalising registration…')} />
    </div>
  );
};

function extractPatientUuidFromUrl(): string {
  const path = window.location.pathname.replace(/\/$/, '');
  const segments = path.split('/');
  const idx = segments.findIndex((s) => s === 'post-registration');
  if (idx === -1 || idx + 1 >= segments.length) return '';
  return segments[idx + 1] ?? '';
}

export default PostRegistrationRedirect;
