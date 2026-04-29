import { Type, validator } from '@openmrs/esm-framework';

export const configSchema = {
  casualGreeting: {
    _type: Type.Boolean,
    _default: false,
    _description: 'Whether to use a casual greeting (or a formal one).',
  },
  whoToGreet: {
    _type: Type.Array,
    _default: ['World'],
    _description: 'Who should be greeted. Names will be separated by a comma and space.',
    _elements: {
      _type: Type.String,
    },
    _validators: [validator((v) => v.length > 0, 'At least one person must be greeted.')],
  },

  // ── SCD module settings ─────────────────────────────────────────────
  scdEncounterTypeUuid: {
    _type: Type.String,
    _default: '',
    _description: 'UUID of the SCD General Information encounter type in OpenMRS.',
  },
  scdLocationUuid: {
    _type: Type.String,
    _default: '',
    _description: 'UUID of the default location for SCD encounters. Leave empty to omit location.',
  },
  registrationEncounterTypeUuid: {
    _type: Type.String,
    _default: '',
    _description: 'UUID of the registration encounter type. Used to fetch emergency contact obs.',
  },
  emergencyContactConcepts: {
    parentGuardianPhone: {
      _type: Type.UUID,
      _default: '',
      _description: 'Concept UUID for Parent/Guardian phone number (Text type).',
    },
    spousePartnerPhone: {
      _type: Type.UUID,
      _default: '',
      _description: 'Concept UUID for Spouse/Partner phone number (Text type).',
    },
    emergencyContactPhone: {
      _type: Type.UUID,
      _default: '',
      _description: 'Concept UUID for Emergency Contact phone number (Text type).',
    },
  },

  // ── Concept UUIDs ───────────────────────────────────────────────────
  conceptUuids: {
    address: {
      _type: Type.UUID,
      _default: '',
      _description: 'Concept UUID for patient address (Text type).',
    },
    deathDate: {
      _type: Type.UUID,
      _default: '',
      _description: 'Concept UUID for death date (Date type).',
    },
    comments: {
      _type: Type.UUID,
      _default: '',
      _description: 'Concept UUID for free-text comments (LONGTEXT type).',
    },
    contactNumbers: {
      _type: Type.UUID,
      _default: '',
      _description: 'Concept UUID for contact numbers stored as JSON text.',
    },
    siblingsData: {
      _type: Type.UUID,
      _default: '',
      _description: 'Concept UUID for siblings data stored as JSON text.',
    },
    dateOfScdDiagnosis: {
      _type: Type.UUID,
      _default: '',
      _description: 'Concept UUID for date of SCD diagnosis (Date type).',
    },
    dateOfSsuuboCareEnrollment: {
      _type: Type.UUID,
      _default: '',
      _description: 'Concept UUID for date of SSUUBO care enrollment (Date type).',
    },
    pcvVaccinationDate: {
      _type: Type.UUID,
      _default: '',
      _description: 'Concept UUID for PCV vaccination date (Date type).',
    },
    hydroxyureaGroup: {
      _type: Type.UUID,
      _default: '',
      _description: 'Concept UUID for the Hydroxyurea treatment obs group.',
    },
    hydroxyureaEnabled: {
      _type: Type.UUID,
      _default: '',
      _description: 'Concept UUID for hydroxyurea treatment status (Boolean type).',
    },
    hydroxyureaStartDate: {
      _type: Type.UUID,
      _default: '',
      _description: 'Concept UUID for hydroxyurea start date (Date type).',
    },
    hydroxyureaStopDate: {
      _type: Type.UUID,
      _default: '',
      _description: 'Concept UUID for hydroxyurea stop date (Date type).',
    },
    chronicTransfusionGroup: {
      _type: Type.UUID,
      _default: '',
      _description: 'Concept UUID for the Chronic Transfusion obs group.',
    },
    chronicTransfusionEnabled: {
      _type: Type.UUID,
      _default: '',
      _description: 'Concept UUID for chronic transfusion status (Boolean type).',
    },
    chronicTransfusionStartDate: {
      _type: Type.UUID,
      _default: '',
      _description: 'Concept UUID for chronic transfusion start date (Date type).',
    },
    chronicTransfusionStopDate: {
      _type: Type.UUID,
      _default: '',
      _description: 'Concept UUID for chronic transfusion stop date (Date type).',
    },
    physiotherapyGroup: {
      _type: Type.UUID,
      _default: '',
      _description: 'Concept UUID for the Physiotherapy obs group.',
    },
    physiotherapyEnabled: {
      _type: Type.UUID,
      _default: '',
      _description: 'Concept UUID for physiotherapy status (Boolean type).',
    },
    physiotherapyStartDate: {
      _type: Type.UUID,
      _default: '',
      _description: 'Concept UUID for physiotherapy start date (Date type).',
    },
    physiotherapyStopDate: {
      _type: Type.UUID,
      _default: '',
      _description: 'Concept UUID for physiotherapy stop date (Date type).',
    },
    diagnosisGroup: {
      _type: Type.UUID,
      _default: '',
      _description: 'Concept UUID for a primary diagnosis obs group.',
    },
    diagnosisDate: {
      _type: Type.UUID,
      _default: '',
      _description: 'Concept UUID for date of diagnosis within a diagnosis group (Date type).',
    },
    diagnosisOtherDescription: {
      _type: Type.UUID,
      _default: '',
      _description: 'Concept UUID for free-text description of "Other" diagnosis.',
    },
    diagnosisScdNonHU: {
      _type: Type.UUID,
      _default: '',
      _description: 'Concept UUID for SCD non-HU diagnosis.',
    },
    diagnosisScdOnHU: {
      _type: Type.UUID,
      _default: '',
      _description: 'Concept UUID for SCD on HU diagnosis.',
    },
    diagnosisConditionalTCD: {
      _type: Type.UUID,
      _default: '',
      _description: 'Concept UUID for Conditional TCD diagnosis.',
    },
    diagnosisAbnormalTCD: {
      _type: Type.UUID,
      _default: '',
      _description: 'Concept UUID for Abnormal TCD diagnosis.',
    },
    diagnosisStroke: {
      _type: Type.UUID,
      _default: '',
      _description: 'Concept UUID for Stroke diagnosis.',
    },
    diagnosisSplenomegaly: {
      _type: Type.UUID,
      _default: '',
      _description: 'Concept UUID for Splenomegaly diagnosis.',
    },
    diagnosisChronicSequestration: {
      _type: Type.UUID,
      _default: '',
      _description: 'Concept UUID for Chronic Sequestration diagnosis.',
    },
    diagnosisOsteonecrosis: {
      _type: Type.UUID,
      _default: '',
      _description: 'Concept UUID for Osteonecrosis diagnosis.',
    },
    diagnosisOther: {
      _type: Type.UUID,
      _default: '',
      _description: 'Concept UUID for Other diagnosis.',
    },
  },
};

export type ScdConceptUuids = {
  address: string;
  deathDate: string;
  comments: string;
  contactNumbers: string;
  siblingsData: string;
  dateOfScdDiagnosis: string;
  dateOfSsuuboCareEnrollment: string;
  pcvVaccinationDate: string;
  hydroxyureaGroup: string;
  hydroxyureaEnabled: string;
  hydroxyureaStartDate: string;
  hydroxyureaStopDate: string;
  chronicTransfusionGroup: string;
  chronicTransfusionEnabled: string;
  chronicTransfusionStartDate: string;
  chronicTransfusionStopDate: string;
  physiotherapyGroup: string;
  physiotherapyEnabled: string;
  physiotherapyStartDate: string;
  physiotherapyStopDate: string;
  diagnosisGroup: string;
  diagnosisDate: string;
  diagnosisOtherDescription: string;
  diagnosisScdNonHU: string;
  diagnosisScdOnHU: string;
  diagnosisConditionalTCD: string;
  diagnosisAbnormalTCD: string;
  diagnosisStroke: string;
  diagnosisSplenomegaly: string;
  diagnosisChronicSequestration: string;
  diagnosisOsteonecrosis: string;
  diagnosisOther: string;
};

export type EmergencyContactConcepts = {
  parentGuardianPhone: string;
  spousePartnerPhone: string;
  emergencyContactPhone: string;
};

export type Config = {
  casualGreeting: boolean;
  whoToGreet: Array<string>;
  scdEncounterTypeUuid: string;
  scdLocationUuid: string;
  registrationEncounterTypeUuid: string;
  emergencyContactConcepts: EmergencyContactConcepts;
  conceptUuids: ScdConceptUuids;
};
