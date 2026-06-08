import type { TestPrice } from '../config-schema';

/**
 * Builds a fast lookup of test id -> price from the configured price list.
 */
export function buildPriceMap(testPrices: TestPrice[] | undefined): Map<string, number> {
  const map = new Map<string, number>();
  for (const entry of testPrices ?? []) {
    if (entry && typeof entry.testId === 'string') {
      map.set(entry.testId, Number(entry.price) || 0);
    }
  }
  return map;
}

/**
 * Resolves the price of a single test, falling back to defaultPrice when the
 * test has no configured price.
 */
export function getTestPrice(
  testId: string,
  priceMap: Map<string, number>,
  defaultPrice = 0,
): number {
  return priceMap.has(testId) ? (priceMap.get(testId) as number) : defaultPrice;
}

/**
 * Sums the prices of the given test ids.
 */
export function getTotalPrice(
  testIds: Iterable<string>,
  priceMap: Map<string, number>,
  defaultPrice = 0,
): number {
  let total = 0;
  for (const id of testIds) {
    total += getTestPrice(id, priceMap, defaultPrice);
  }
  return total;
}

/**
 * Formats a numeric price with a currency prefix, e.g. "UGX 15,000".
 */
export function formatPrice(value: number, currency: string): string {
  return `${currency} ${new Intl.NumberFormat().format(value ?? 0)}`;
}
