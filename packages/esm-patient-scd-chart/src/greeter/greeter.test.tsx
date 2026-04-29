import React from 'react';
import { render, screen } from '@testing-library/react';
import { useConfig } from '@openmrs/esm-framework';
import { Config } from '../config-schema';
import Greeter from './greeter.component';

const mockUseConfig = jest.mocked(useConfig<Config>);

const baseScdConfig: Pick<Config, 'scdEncounterTypeUuid' | 'scdLocationUuid' | 'conceptUuids'> = {
  scdEncounterTypeUuid: '',
  scdLocationUuid: '',
  conceptUuids: {
    address: '',
    deathDate: '',
    comments: '',
    contactNumbers: '',
    siblingsData: '',
    dateOfScdDiagnosis: '',
    dateOfSsuuboCareEnrollment: '',
    pcvVaccinationDate: '',
    hydroxyureaGroup: '',
    hydroxyureaEnabled: '',
    hydroxyureaStartDate: '',
    hydroxyureaStopDate: '',
    chronicTransfusionGroup: '',
    chronicTransfusionEnabled: '',
    chronicTransfusionStartDate: '',
    chronicTransfusionStopDate: '',
    physiotherapyGroup: '',
    physiotherapyEnabled: '',
    physiotherapyStartDate: '',
    physiotherapyStopDate: '',
    diagnosisGroup: '',
    diagnosisDate: '',
    diagnosisOtherDescription: '',
    diagnosisScdNonHU: '',
    diagnosisScdOnHU: '',
    diagnosisConditionalTCD: '',
    diagnosisAbnormalTCD: '',
    diagnosisStroke: '',
    diagnosisSplenomegaly: '',
    diagnosisChronicSequestration: '',
    diagnosisOsteonecrosis: '',
    diagnosisOther: '',
  },
};

it('displays the expected default text', () => {
  const config: Config = { casualGreeting: false, whoToGreet: ['World'], ...baseScdConfig };
  mockUseConfig.mockReturnValue(config);

  render(<Greeter />);

  expect(screen.getByText(/world/i)).toHaveTextContent('hello World!');
});

it('casually greets my friends', () => {
  const config: Config = {
    casualGreeting: true,
    whoToGreet: ['Ariel', 'Barak', 'Callum'],
    ...baseScdConfig,
  };
  mockUseConfig.mockReturnValue(config);

  render(<Greeter />);

  expect(screen.getByText(/ariel/i)).toHaveTextContent('hey Ariel, Barak, Callum!');
});
