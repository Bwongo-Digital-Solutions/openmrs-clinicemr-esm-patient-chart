import { Type } from '@openmrs/esm-framework';

export const configSchema = {
  labOrderEncounterTypeUuid: {
    _type: Type.String,
    _default: '67a71486-1a54-468f-ac3e-7091a9a79584',
    _description: 'UUID of the encounter type for lab orders.',
  },
  labOrderTypeUuid: {
    _type: Type.String,
    _default: '52a447d3-a64a-11e3-9aeb-50e549534c5e',
    _description: 'UUID of the order type for test orders.',
  },
  careSettingUuid: {
    _type: Type.String,
    _default: '6f0c9a92-6f24-11e3-af88-005056821db0',
    _description: 'UUID of the care setting (Outpatient).',
  },
  defaultCurrency: {
    _type: Type.String,
    _default: 'UGX',
    _description: 'Currency code/symbol shown next to test prices.',
  },
  defaultTestPrice: {
    _type: Type.Number,
    _default: 0,
    _description: 'Fallback price used for a test that has no explicit price configured in testPrices.',
  },
  testPrices: {
    _type: Type.Array,
    _elements: {
      testId: { _type: Type.String },
      price: { _type: Type.Number },
    },
    _default: [],
    _description:
      'Per-test prices keyed by the test id (matching LAB_TEST_CATEGORIES). Sourced from the facility price list / database export and configured in the distro. Tests without an entry fall back to defaultTestPrice.',
  },
};

export interface TestPrice {
  testId: string;
  price: number;
}

export type Config = {
  labOrderEncounterTypeUuid: string;
  labOrderTypeUuid: string;
  careSettingUuid: string;
  defaultCurrency: string;
  defaultTestPrice: number;
  testPrices: TestPrice[];
};
