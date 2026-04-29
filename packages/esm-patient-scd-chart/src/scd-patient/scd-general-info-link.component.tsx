import React, { useEffect } from 'react';
import { InlineLoading } from '@carbon/react';

interface ScdGeneralInfoLinkProps {
  patientUuid?: string;
}

const ScdGeneralInfoLink: React.FC<ScdGeneralInfoLinkProps> = ({ patientUuid: propUuid }) => {
  const patientUuid =
    propUuid ??
    new URLSearchParams(window.location.search).get('patientUuid') ??
    window.location.pathname.match(/\/patient\/([a-f0-9-]{36})\//i)?.[1] ??
    '';

  useEffect(() => {
    if (patientUuid) {
      window.location.href = `/openmrs/spa/scd-patient?patientUuid=${patientUuid}`;
    }
  }, [patientUuid]);

  return (
    <div style={{ padding: '2rem', backgroundColor: 'var(--cds-layer, #fff)' }}>
      <InlineLoading description="Opening General Information..." />
    </div>
  );
};

export default ScdGeneralInfoLink;
