import { Type } from '@openmrs/esm-framework';

export const configSchema = {
  registrationClerkRoleName: {
    _type: Type.String,
    _default: 'Organizational: Registration Clerk',
    _description:
      'Name of the OpenMRS role that, when held by the current user, makes the post-registration page redirect to the My Registered Patients list instead of the patient chart.',
  },
  registeredPatientsListPath: {
    _type: Type.String,
    _default: 'my-registered-patients',
    _description: 'SPA-relative path to redirect Registration Clerks to after a successful registration.',
  },
  registrationEncounterTypeUuid: {
    _type: Type.String,
    _default: 'dd528487-82a5-4082-9c72-ed246bd49591',
    _description:
      'UUID of the encounter type recorded during patient registration. Used to look up patients registered by the current user.',
  },
  pageSize: {
    _type: Type.Number,
    _default: 25,
    _description: 'Maximum number of recent registrations to load for the My Registered Patients list.',
  },
};

export interface PostRegistrationRedirectConfig {
  registrationClerkRoleName: string;
  registeredPatientsListPath: string;
  registrationEncounterTypeUuid: string;
  pageSize: number;
}
