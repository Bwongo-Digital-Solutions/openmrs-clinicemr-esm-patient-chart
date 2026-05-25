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
};

export type Config = {
  labOrderEncounterTypeUuid: string;
  labOrderTypeUuid: string;
  careSettingUuid: string;
};
