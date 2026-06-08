import React from 'react';
import { useTranslation } from 'react-i18next';
import { Dropdown, RadioButton, RadioButtonGroup } from '@carbon/react';
import { useConfig } from '@openmrs/esm-framework';
import type { PaymentManagerConfig } from '../config-schema';
import styles from '../payment-manager.scss';

export type ClientType = 'PRIVATE' | 'CORPORATE';

export interface PayerSelection {
  clientType: ClientType;
  /** The chosen payment mode (private) or insurance provider (corporate). */
  payer: string;
}

interface PayerSelectorProps {
  id?: string;
  value: PayerSelection;
  onChange: (next: PayerSelection) => void;
}

/**
 * Captures who is paying:
 *   - Corporate patients pay via an insurance provider (`insuranceProviders` config).
 *   - Private patients pay with a payment mode such as Cash, Bank, Mobile Money,
 *     Airtel Money (`paymentMethods` config).
 *
 * Selecting a different client type resets the chosen payer so the cashier must
 * pick a valid option for that type.
 */
const PayerSelector: React.FC<PayerSelectorProps> = ({ id = 'payer', value, onChange }) => {
  const { t } = useTranslation();
  const config = useConfig<PaymentManagerConfig>();

  const privateMethods = (config.paymentMethods ?? []).map((name) => ({ id: name, name }));
  const insurers = (config.insuranceProviders ?? []).map((name) => ({ id: name, name }));

  const items = value.clientType === 'CORPORATE' ? insurers : privateMethods;
  const selectedItem = items.find((i) => i.id === value.payer) ?? null;

  const handleClientType = (clientType: ClientType) => {
    onChange({ clientType, payer: '' });
  };

  return (
    <div>
      <RadioButtonGroup
        name={`${id}-client-type`}
        legendText={t('clientType', 'Client type')}
        valueSelected={value.clientType}
        onChange={(val) => handleClientType(val as ClientType)}
        className={styles.field}
      >
        <RadioButton id={`${id}-private`} value="PRIVATE" labelText={t('privatePatient', 'Private (self-paying)')} />
        <RadioButton
          id={`${id}-corporate`}
          value="CORPORATE"
          labelText={t('corporatePatient', 'Corporate (insurance)')}
        />
      </RadioButtonGroup>

      <Dropdown
        id={`${id}-payer`}
        titleText={
          value.clientType === 'CORPORATE'
            ? t('insuranceProvider', 'Insurance provider')
            : t('paymentMode', 'Payment method')
        }
        label={
          value.clientType === 'CORPORATE'
            ? t('chooseInsurer', 'Choose an insurance provider…')
            : t('choosePaymentMode', 'Choose a payment method…')
        }
        items={items}
        itemToString={(item) => item?.name ?? ''}
        selectedItem={selectedItem}
        onChange={({ selectedItem: item }) =>
          onChange({ clientType: value.clientType, payer: item?.id ?? '' })
        }
      />
    </div>
  );
};

/** Human-readable label for a payer selection, used on bills and receipts. */
export function formatPayer(selection: PayerSelection): string {
  if (!selection.payer) return '';
  return selection.clientType === 'CORPORATE' ? `${selection.payer} (Insurance)` : selection.payer;
}

export default PayerSelector;
