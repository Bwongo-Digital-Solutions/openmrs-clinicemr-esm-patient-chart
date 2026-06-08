import { buildPriceMap, formatPrice, getTestPrice, getTotalPrice } from './pricing';

describe('lab request pricing', () => {
  const prices = [
    { testId: 'cbc', price: 15000 },
    { testId: 'esr', price: 8000 },
  ];

  it('builds a price map from config entries', () => {
    const map = buildPriceMap(prices);
    expect(map.get('cbc')).toBe(15000);
    expect(map.get('esr')).toBe(8000);
    expect(map.size).toBe(2);
  });

  it('tolerates undefined / malformed config', () => {
    expect(buildPriceMap(undefined).size).toBe(0);
    // @ts-expect-error testing malformed input
    expect(buildPriceMap([{ price: 10 }, null]).size).toBe(0);
  });

  it('resolves a configured price', () => {
    const map = buildPriceMap(prices);
    expect(getTestPrice('cbc', map, 0)).toBe(15000);
  });

  it('falls back to the default price for unconfigured tests', () => {
    const map = buildPriceMap(prices);
    expect(getTestPrice('unknown', map, 5000)).toBe(5000);
    expect(getTestPrice('unknown', map)).toBe(0);
  });

  it('sums prices across selected tests using the default for gaps', () => {
    const map = buildPriceMap(prices);
    expect(getTotalPrice(['cbc', 'esr'], map, 0)).toBe(23000);
    expect(getTotalPrice(['cbc', 'unknown'], map, 1000)).toBe(16000);
    expect(getTotalPrice([], map, 0)).toBe(0);
  });

  it('formats prices with the currency prefix', () => {
    expect(formatPrice(15000, 'UGX')).toBe('UGX 15,000');
    expect(formatPrice(0, 'UGX')).toBe('UGX 0');
  });
});
