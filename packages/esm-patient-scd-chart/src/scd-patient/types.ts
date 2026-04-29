export interface Sibling {
  id: string;
  name: string;
  yearOfBirth: string;
  testedForScd: 'yes' | 'no' | '';
  testResult: 'NA' | 'negative' | 'positive' | '';
  ssuuboNo: string;
}

export type DiagnosisKey =
  | 'scdNonHU'
  | 'scdOnHU'
  | 'conditionalTCD'
  | 'abnormalTCD'
  | 'stroke'
  | 'splenomegaly'
  | 'chronicSequestration'
  | 'osteonecrosis'
  | 'other';

export interface PrimaryDiagnosis {
  key: DiagnosisKey;
  label: string;
  diagnosedDate: string;
  otherDescription?: string;
}

export interface ScdPatientGeneralInfo {
  deathDate: string;
  address: string;
  contactNumbers: string[];
  comments: string;
  photographyUrl: string;
  photographyFile: File | null;

  siblings: Sibling[];

  dateOfScdDiagnosis: string;
  dateOfSsuuboCareEnrollment: string;
  pcvVaccinationDate: string;

  hydroxyureaEnabled: boolean;
  hydroxyureaStartDate: string;
  hydroxyureaStopDate: string;

  chronicTransfusionEnabled: boolean;
  chronicTransfusionStartDate: string;
  chronicTransfusionStopDate: string;

  physiotherapyEnabled: boolean;
  physiotherapyStartDate: string;
  physiotherapyStopDate: string;

  primaryDiagnoses: PrimaryDiagnosis[];
}

export const DIAGNOSIS_OPTIONS: { key: DiagnosisKey; label: string }[] = [
  { key: 'scdNonHU', label: 'SCD non-HU' },
  { key: 'scdOnHU', label: 'SCD on HU' },
  { key: 'conditionalTCD', label: 'Conditional TCD' },
  { key: 'abnormalTCD', label: 'Abnormal TCD' },
  { key: 'stroke', label: 'Stroke' },
  { key: 'splenomegaly', label: 'Splenomegaly' },
  { key: 'chronicSequestration', label: 'Chronic Sequestration' },
  { key: 'osteonecrosis', label: 'Osteonecrosis' },
  { key: 'other', label: 'Other' },
];

export const initialFormState: ScdPatientGeneralInfo = {
  deathDate: '',
  address: '',
  contactNumbers: [''],
  comments: '',
  photographyUrl: '',
  photographyFile: null,
  siblings: [],
  dateOfScdDiagnosis: '',
  dateOfSsuuboCareEnrollment: '',
  pcvVaccinationDate: '',
  hydroxyureaEnabled: false,
  hydroxyureaStartDate: '',
  hydroxyureaStopDate: '',
  chronicTransfusionEnabled: false,
  chronicTransfusionStartDate: '',
  chronicTransfusionStopDate: '',
  physiotherapyEnabled: false,
  physiotherapyStartDate: '',
  physiotherapyStopDate: '',
  primaryDiagnoses: [],
};
