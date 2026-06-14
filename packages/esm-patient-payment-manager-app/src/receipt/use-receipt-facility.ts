import { useSession, useConfig } from '@openmrs/esm-framework';
import type { PaymentManagerConfig } from '../config-schema';
import type { ReceiptFacility } from './print-receipt';

/**
 * Resolves the facility header shown on printed receipts/invoices. Prefers the
 * `receiptFacilityName` / `receiptFacilityDetails` config, otherwise falls back
 * to the current session location name.
 */
export function useReceiptFacility(): ReceiptFacility {
  const session = useSession();
  const config = useConfig<PaymentManagerConfig>();

  const name = config.receiptFacilityName || session?.sessionLocation?.display || 'Clinic';
  const details = (config.receiptFacilityDetails ?? []).filter(Boolean);
  const logoUrl = config.receiptLogoUrl || undefined;

  return { name, details, logoUrl };
}
