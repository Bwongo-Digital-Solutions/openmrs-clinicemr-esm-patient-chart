import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Chemistry } from '@carbon/icons-react';
import { launchWorkspace } from '@openmrs/esm-framework';

const LabRequestActionButton: React.FC = () => {
  const { t } = useTranslation();

  const handleClick = useCallback(() => {
    launchWorkspace('lab-request-form-workspace', {
      workspaceTitle: t('labRequest', 'Lab Request'),
    });
  }, [t]);

  return (
    <button
      className="cds--btn cds--btn--ghost"
      onClick={handleClick}
      title={t('labRequest', 'Lab Request')}
      type="button"
    >
      <Chemistry size={20} />
    </button>
  );
};

export default LabRequestActionButton;
