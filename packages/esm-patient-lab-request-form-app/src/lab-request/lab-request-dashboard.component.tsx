import React from 'react';
import { usePatient } from '@openmrs/esm-framework';
import LabRequestForm from './lab-request-form.component';

const LabRequestDashboard: React.FC = () => {
  const { patientUuid } = usePatient();

  return <LabRequestForm patientUuid={patientUuid} />;
};

export default LabRequestDashboard;
