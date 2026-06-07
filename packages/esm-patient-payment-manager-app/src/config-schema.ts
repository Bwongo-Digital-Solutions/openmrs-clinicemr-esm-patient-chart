import { Type } from '@openmrs/esm-framework';

export const configSchema = {
  cashierRoleNames: {
    _type: Type.Array,
    _elements: { _type: Type.String },
    _default: ['Organizational: Nurse', 'Organizational: Registration Clerk', 'Cashier', 'Receptionist'],
    _description:
      'Names of the OpenMRS roles allowed to use the Payment Manager: receive payments, register patients for consultation, and clear order payments.',
  },
  providerRoleNames: {
    _type: Type.Array,
    _elements: { _type: Type.String },
    _default: [
      'Doctor',
      'Organizational: Doctor',
      'Pharmacist',
      'Organizational: Pharmacist',
      'Laboratory',
      'Organizational: Laboratory',
    ],
    _description:
      'Names of clinical provider roles that are NOT allowed to access the Payment Manager or register patients. Members of these roles are blocked from registration and payment pages.',
  },
  consultationBillableServiceUuid: {
    _type: Type.UUID,
    _default: '',
    _description:
      'UUID of the billable service representing a consultation fee. When set, it is pre-selected on the consultation payment gate. If empty, the cashier picks from all billable services.',
  },
  registrationListPath: {
    _type: Type.String,
    _default: 'payment-manager/patients',
    _description: 'SPA-relative path cashiers are returned to after a successful registration.',
  },
  consultationPaymentPath: {
    _type: Type.String,
    _default: 'payment-manager/consultation',
    _description: 'SPA-relative path of the consultation payment gate that must be completed before registration.',
  },
  registrationEncounterTypeUuid: {
    _type: Type.UUID,
    _default: 'dd528487-82a5-4082-9c72-ed246bd49591',
    _description: 'UUID of the encounter type recorded during patient registration.',
  },
  cashPointUuid: {
    _type: Type.UUID,
    _default: '',
    _description:
      'UUID of the cash point (billing module) bills are created against. If empty, the first cash point returned by the cashier module is used.',
  },
  defaultCurrency: {
    _type: Type.String,
    _default: 'UGX',
    _description: 'Currency code shown next to prices.',
  },
  pageSize: {
    _type: Type.Number,
    _default: 25,
    _description: 'Maximum number of rows to load per page in the payment lists.',
  },
};

export interface PaymentManagerConfig {
  cashierRoleNames: string[];
  providerRoleNames: string[];
  consultationBillableServiceUuid: string;
  registrationListPath: string;
  consultationPaymentPath: string;
  registrationEncounterTypeUuid: string;
  cashPointUuid: string;
  defaultCurrency: string;
  pageSize: number;
}
