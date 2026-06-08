import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Accordion, AccordionItem, InlineNotification, RadioButton, RadioButtonGroup, Tag } from '@carbon/react';
import { useBillableServices } from './billing.resource';
import type { BillableService, ServicePrice } from './types';
import styles from '../payment-manager.scss';

export interface SelectedService {
  service: BillableService;
  price: ServicePrice;
}

interface BillableServicePickerProps {
  id?: string;
  titleText?: string;
  currency: string;
  selectedServiceUuid?: string;
  onChange: (selected: SelectedService | null) => void;
}

interface ServiceOption {
  id: string;
  service: BillableService;
  price: ServicePrice;
  label: string;
  priceLabel: string;
}

/**
 * Accordion listing every billable service stored in the system (distro
 * `billableServices` config) together with its price. Each service/price
 * combination is a selectable radio option so cashiers can see the cost of
 * every service at a glance and pick one.
 */
const BillableServicePicker: React.FC<BillableServicePickerProps> = ({
  id = 'billable-service-picker',
  titleText,
  currency,
  selectedServiceUuid,
  onChange,
}) => {
  const { t } = useTranslation();
  const { billableServices } = useBillableServices();

  const options = useMemo<ServiceOption[]>(() => {
    const formatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
    return billableServices.flatMap((service) =>
      (service.servicePrices?.length ? service.servicePrices : [{ uuid: '', name: 'Default', price: 0 }]).map(
        (price) => ({
          id: `${service.uuid}:${price.uuid}`,
          service,
          price,
          label: service.name,
          priceLabel: `${currency} ${formatter.format(price.price ?? 0)}`,
        }),
      ),
    );
  }, [billableServices, currency]);

  const selectedOption = useMemo(
    () => options.find((o) => o.service.uuid === selectedServiceUuid) ?? null,
    [options, selectedServiceUuid],
  );

  if (options.length === 0) {
    return (
      <InlineNotification
        kind="warning"
        lowContrast
        hideCloseButton
        title={t('noServices', 'No billable services configured')}
        subtitle={t(
          'noServicesSubtitle',
          'Ask an administrator to add billable services to the Payment Manager configuration.',
        )}
      />
    );
  }

  const handleSelect = (optionId: string | number) => {
    const option = options.find((o) => o.id === String(optionId));
    onChange(option ? { service: option.service, price: option.price } : null);
  };

  return (
    <Accordion>
      <AccordionItem
        title={`${titleText ?? t('selectService', 'Select service')}${
          selectedOption ? ` — ${selectedOption.label} (${selectedOption.priceLabel})` : ''
        }`}
        open
      >
        <RadioButtonGroup
          name={id}
          orientation="vertical"
          valueSelected={selectedOption?.id ?? ''}
          onChange={handleSelect}
        >
          {options.map((option) => (
            <RadioButton
              key={option.id}
              id={`${id}-${option.id}`}
              value={option.id}
              labelText={
                <span className={styles.serviceRow}>
                  <span>{option.label}</span>
                  <Tag type="green" size="sm">
                    {option.priceLabel}
                  </Tag>
                </span>
              }
            />
          ))}
        </RadioButtonGroup>
      </AccordionItem>
    </Accordion>
  );
};

export default BillableServicePicker;
