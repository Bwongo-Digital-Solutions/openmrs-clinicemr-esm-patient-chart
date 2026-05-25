import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { InlineLoading } from '@carbon/react';
import { navigate, useConfig, useSession } from '@openmrs/esm-framework';
import type { PostRegistrationRedirectConfig } from './config-schema';
import { addRegisteredPatient } from './registered-patients-store';

/**
 * Acts as a one-shot redirect target for the patient registration app.
 *
 * Configure `@openmrs/esm-patient-registration-app.links.submitButton` to
 *   `${openmrsSpaBase}/post-registration/${patientUuid}`
 * and this component will:
 *   - send Registration Clerks to the My Registered Patients list, and
 *   - send everyone else to the patient chart (the standard workflow).
 */
const PostRegistrationRedirect: React.FC = () => {
  const { t } = useTranslation();
  const session = useSession();
  const config = useConfig<PostRegistrationRedirectConfig>();

  useEffect(() => {
    // Wait until the session is loaded; useSession returns an empty object initially.
    if (!session?.user) return;

    const patientUuid = extractPatientUuidFromUrl();
    const userRoles: string[] = (session.user.roles ?? []).map((r: { display?: string; name?: string }) =>
      String(r.display ?? r.name ?? ''),
    );
    const isRegistrationClerk = userRoles.some(
      (role) => role.trim().toLowerCase() === config.registrationClerkRoleName.trim().toLowerCase(),
    );

    // Record the freshly-registered patient against the current user so the
    // My Registered Patients list can show them (server-side filtering by
    // creator is not supported on the encounter REST endpoint).
    if (patientUuid && session.user.uuid) {
      addRegisteredPatient(session.user.uuid, patientUuid);
    }

    if (isRegistrationClerk) {
      navigate({ to: `\${openmrsSpaBase}/${config.registeredPatientsListPath}` });
    } else if (patientUuid) {
      navigate({ to: `\${openmrsSpaBase}/patient/${patientUuid}/chart` });
    } else {
      // No patient UUID in URL — fall back to home rather than the chart of an unknown patient.
      navigate({ to: `\${openmrsSpaBase}/home` });
    }
  }, [session, config.registrationClerkRoleName, config.registeredPatientsListPath]);

  return (
    <div style={{ padding: '2rem' }}>
      <InlineLoading description={t('redirecting', 'Redirecting…')} />
    </div>
  );
};

/**
 * Pulls the patient UUID out of `/openmrs/spa/post-registration/<uuid>`.
 * Returns an empty string if no UUID-looking segment is present.
 */
function extractPatientUuidFromUrl(): string {
  const path = window.location.pathname.replace(/\/$/, '');
  const segments = path.split('/');
  const idx = segments.findIndex((s) => s === 'post-registration');
  if (idx === -1 || idx + 1 >= segments.length) return '';
  return segments[idx + 1] ?? '';
}

export default PostRegistrationRedirect;
