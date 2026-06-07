import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Dropdown, InlineLoading, InlineNotification } from '@carbon/react';
import { useBillableServices } from './billing.resource';
import type { BillableService, ServicePrice } from './types';

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
}

/**
 * Dropdown listing every billable service together with its price. Each
 * service/price combination is a selectable option so cashiers can see the
 * cost of every service at a glance.
 */
const BillableServicePicker: React.FC<BillableServicePickerProps> = ({
  id = 'billable-service-picker',
  titleText,
  currency,
  selectedServiceUuid,
  onChange,
}) => {
  const { t } = useTranslation();
  const { billableServices, isLoading, error } = useBillableServices();

  const options = useMemo<ServiceOption[]>(() => {
    const formatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
    return billableServices.flatMap((service) =>
      (service.servicePrices?.length ? service.servicePrices : [{ uuid: '', name: 'Default', price: 0 }]).map(
        (price) => ({
          id: `${service.uuid}:${price.uuid}`,
          service,
          price,
          label: `${service.name} — ${currency} ${formatter.format(price.price ?? 0)}`,
        }),
      ),
    );
  }, [billableServices, currency]);

  const selectedItem = useMemo(
    () => options.find((o) => o.service.uuid === selectedServiceUuid) ?? null,
    [options, selectedServiceUuid],
  );

  if (isLoading) {
    return <InlineLoading description={t('loadingServices', 'Loading billable services…')} />;
  }

  if (error) {
    return (
      <InlineNotification
        kind="error"
        lowContrast
        hideCloseButton
        title={t('servicesError', 'Could not load billable services')}
        subtitle={String((error as Error)?.message ?? '')}
      />
    );
  }

  if (options.length === 0) {
    return (
      <InlineNotification
        kind="warning"
        lowContrast
        hideCloseButton
        title={t('noServices', 'No billable services configured')}
        subtitle={t('noServicesSubtitle', 'Ask an administrator to add billable services in the billing module.')}
      />
    );
  }

  return (
    <Dropdown<ServiceOption>
      id={id}
      titleText={titleText ?? t('selectService', 'Select service')}
      label={t('chooseService', 'Choose a service…')}
      items={options}
      selectedItem={selectedItem}
      itemToString={(item) => item?.label ?? ''}
      onChange={({ selectedItem: item }) => onChange(item ? { service: item.service, price: item.price } : null)}
    />
  );
};

export default BillableServicePicker;
