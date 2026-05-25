import React from 'react';
import { useParams } from 'react-router-dom';
import LabRequestForm from './lab-request-form.component';

const LabRequestDashboard: React.FC = () => {
  const { patientUuid } = useParams<{ patientUuid: string }>();

  return <LabRequestForm patientUuid={patientUuid} />;
};

export default LabRequestDashboard;
