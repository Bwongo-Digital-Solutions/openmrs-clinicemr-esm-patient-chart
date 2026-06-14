import useSWR from 'swr';
import { openmrsFetch, restBaseUrl, useConfig } from '@openmrs/esm-framework';
import type { BillableService, PaymentMode, ServicePrice } from './types';
import type { ConfiguredBillableService, PaymentManagerConfig } from '../config-schema';

interface RestResults<T> {
  results: T[];
}

interface ApiServicePrice {
  uuid: string;
  name: string;
  price: number;
}

interface ApiBillableService {
  uuid: string;
  name: string;
  shortName?: string;
  serviceStatus?: string;
  serviceType?: { display: string };
  servicePrices?: ApiServicePrice[];
}

/** Maps the configured billableServices array into the BillableService shape. */
function configuredServices(config: PaymentManagerConfig): BillableService[] {
  return (config.billableServices ?? []).map((s: ConfiguredBillableService) => ({
    uuid: s.uuid,
    name: s.name,
    serviceStatus: 'ENABLED',
    servicePrices: [{ uuid: `${s.uuid}-default`, name: 'Default', price: s.price ?? 0 }],
  }));
}

/**
 * Billable services are fetched live from the Billing/Cashier module REST API
 * (`{billingApiBasePath}/billableService`), following the official
 * openmrs-esm-billing-app. If the OMOD is unavailable (network/404 error) we
 * gracefully fall back to the distro `billableServices` config so the workflow
 * never breaks.
 */
export function useBillableServices() {
  const config = useConfig<PaymentManagerConfig>();
  const base = config.billingApiBasePath || 'billing';
  const rep = 'custom:(uuid,name,shortName,serviceStatus,serviceType:(display),servicePrices:(uuid,name,price))';
  const url = `${restBaseUrl}/${base}/billableService?v=${rep}`;

  const { data, error, isLoading, mutate } = useSWR<{ data: RestResults<ApiBillableService> }>(url, openmrsFetch, {
    shouldRetryOnError: false,
  });

  const apiServices: BillableService[] = (data?.data?.results ?? [])
    .filter((s) => !s.serviceStatus || s.serviceStatus === 'ENABLED')
    .map((s) => ({
      uuid: s.uuid,
      name: s.name,
      shortName: s.shortName,
      serviceStatus: s.serviceStatus ?? 'ENABLED',
      serviceType: s.serviceType ? { uuid: '', display: s.serviceType.display } : undefined,
      servicePrices: (s.servicePrices?.length
        ? s.servicePrices
        : [{ uuid: `${s.uuid}-default`, name: 'Default', price: 0 }]
      ).map((p): ServicePrice => ({ uuid: p.uuid, name: p.name, price: p.price ?? 0 })),
    }));

  // API-first; fall back to config when the API returns nothing or errors.
  const fallback = configuredServices(config);
  const billableServices = apiServices.length ? apiServices : fallback;

  return {
    billableServices,
    error: apiServices.length || fallback.length ? undefined : error,
    isLoading: isLoading && fallback.length === 0,
    usingFallback: apiServices.length === 0,
    mutate,
  };
}

/**
 * Payment modes come from distro configuration (`paymentMethods`).
 */
export function usePaymentModes() {
  const config = useConfig<PaymentManagerConfig>();
  const paymentModes: PaymentMode[] = (config.paymentMethods ?? []).map((name: string) => ({
    uuid: name,
    name,
  }));
  return { paymentModes, error: undefined, isLoading: false };
}

/**
 * Resolve the provider record for a given user uuid. The core `provider` REST
 * resource is part of webservices.rest and is always available.
 */
export function useProviderUuid(userUuid: string | undefined) {
  const url = userUuid ? `${restBaseUrl}/provider?user=${userUuid}&v=custom:(uuid,display)` : null;
  const { data, error, isLoading } = useSWR<{ data: RestResults<{ uuid: string; display: string }> }>(
    url,
    openmrsFetch,
  );
  return { providerUuid: data?.data?.results?.[0]?.uuid, error, isLoading };
}

// Bill creation, payment and listing are handled locally in `local-bill-store`
// (re-exported below) because there is no billing backend to persist to.
export {
  createLocalBill,
  payLocalBill,
  useLocalBills,
  getBillsForPatient,
  getAmountPaidForPatient,
  billTotal,
  generateReceiptNumber,
  generateOrderId,
} from './local-bill-store';
export type { LocalBill, LocalLineItem, LocalBillStatus, ClientType } from './local-bill-store';
