import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ComboBox, InlineLoading, InlineNotification, Tag } from '@carbon/react';
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
 * Searchable list (Carbon ComboBox) of every billable service / item available
 * in the system. Data is fetched from the Billing/Cashier module REST API
 * (with a distro-config fallback) so it includes services and stock items
 * priced in the billing module. Each option shows the price, and selecting one
 * returns the matching service + price to the parent.
 */
const BillableServicePicker: React.FC<BillableServicePickerProps> = ({
  id = 'billable-service-picker',
  titleText,
  currency,
  selectedServiceUuid,
  onChange,
}) => {
  const { t } = useTranslation();
  const { billableServices, isLoading, usingFallback } = useBillableServices();

  const options = useMemo<ServiceOption[]>(() => {
    const formatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
    return billableServices.flatMap((service) =>
      (service.servicePrices?.length ? service.servicePrices : [{ uuid: '', name: 'Default', price: 0 }]).map(
        (price) => ({
          id: `${service.uuid}:${price.uuid}`,
          service,
          price,
          label: service.servicePrices && service.servicePrices.length > 1 ? `${service.name} (${price.name})` : service.name,
          priceLabel: `${currency} ${formatter.format(price.price ?? 0)}`,
        }),
      ),
    );
  }, [billableServices, currency]);

  const selectedOption = useMemo(
    () => options.find((o) => o.service.uuid === selectedServiceUuid) ?? null,
    [options, selectedServiceUuid],
  );

  if (isLoading) {
    return <InlineLoading description={t('loadingServices', 'Loading services…')} />;
  }

  if (options.length === 0) {
    return (
      <InlineNotification
        kind="warning"
        lowContrast
        hideCloseButton
        title={t('noServices', 'No billable services available')}
        subtitle={t(
          'noServicesSubtitle',
          'Add billable services/items in the Billing module, or configure them in the Payment Manager settings.',
        )}
      />
    );
  }

  return (
    <>
      <ComboBox
        id={id}
        titleText={titleText ?? t('selectService', 'Search for a service or item')}
        placeholder={t('searchServicePlaceholder', 'Type to search services & items…')}
        items={options}
        itemToString={(item: ServiceOption | null) => (item ? `${item.label} — ${item.priceLabel}` : '')}
        itemToElement={(item: ServiceOption) => (
          <span className={styles.serviceRow}>
            <span>{item.label}</span>
            <Tag type="green" size="sm">
              {item.priceLabel}
            </Tag>
          </span>
        )}
        selectedItem={selectedOption}
        onChange={({ selectedItem }: { selectedItem: ServiceOption | null }) =>
          onChange(selectedItem ? { service: selectedItem.service, price: selectedItem.price } : null)
        }
      />
      {usingFallback && (
        <InlineNotification
          kind="info"
          lowContrast
          hideCloseButton
          className={styles.fallbackNote}
          title={t('usingConfiguredServices', 'Using configured services')}
          subtitle={t(
            'usingConfiguredServicesSub',
            'The Billing module did not return any services, so the configured list is shown.',
          )}
        />
      )}
    </>
  );
};

export default BillableServicePicker;
