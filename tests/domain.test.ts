import { describe, expect, it } from 'vitest';
import { classifyPrices, coarseCenter, distanceMiles, mergeStations, selectStations } from '@/lib/domain/stations';
import { freshness } from '@/lib/domain/freshness';
import { parsePreferences } from '@/lib/domain/preferences';
import { DEFAULT_PREFERENCES, type Station } from '@/lib/domain/types';
const now = Date.parse('2026-09-28T12:00:00Z');
export const station = (id: string, amount?: number, lat = 33.685): Station => ({ id, name: id, brand: 'Shell', position: { lat, lng: -117.8265 }, address: { label: 'Example address', city: 'Irvine', state: 'CA', postalCode: '92606', countryCode: 'USA' }, prices: amount === undefined ? {} : { regular: { amount, currency: 'USD', unit: 'US_gal', updatedAt: new Date(now).toISOString() } } });
const center = { lat: 33.6846, lng: -117.8265 };
describe('relative price classification', () => {
  it('distributes 100 unique prices into 25/50/15/10 groups', () => {
    const tiers = [...classifyPrices(Array.from({ length: 100 }, (_,i) => station(String(i), 3 + i / 100)), 'regular').values()];
    expect(['low','typical','high','very-high'].map(t => tiers.filter(x => x === t).length)).toEqual([25,50,15,10]);
  });
  it('is independent of absolute area price', () => {
    const a = Array.from({ length: 20 }, (_,i) => station(String(i), 3 + i / 10));
    const b = Array.from({ length: 20 }, (_,i) => station(String(i), 6 + i / 10));
    expect([...classifyPrices(a, 'regular')]).toEqual([...classifyPrices(b, 'regular')]);
  });
  it('keeps ties together and handles a singleton and all-equal sets', () => {
    expect([...classifyPrices([station('a',4),station('b',4)], 'regular').values()]).toEqual(['typical','typical']);
    expect(classifyPrices([station('a',4)], 'regular').get('a')).toBe('typical');
    const tiers = classifyPrices([station('a',4), station('b',4), station('c',5), station('d',6)], 'regular');
    expect(tiers.get('a')).toBe(tiers.get('b'));
  });
  it('excludes missing, zero, NaN, and negative prices', () => {
    const data = [station('missing'), station('zero',0), station('nan',NaN), station('negative',-1),station('good',4)];
    expect([...classifyPrices(data,'regular').keys()]).toEqual(['good']);
    expect(classifyPrices(data, 'premium').size).toBe(0);
  });
});
describe('filtering, sorting, and geometry', () => {
  const data = [station('missing',undefined,33.6846), station('near',5,33.6847), station('cheap',4,33.69), { ...station('arco',4.5,33.69), brand: 'ARCO' },station('far',3,34)];
  it('sorts cheapest first with missing prices last', () => expect(selectStations(data,center,DEFAULT_PREFERENCES).map(s => s.id)).toEqual(['cheap','arco','near','missing']));
  it('sorts nearest first but still keeps missing prices last', () => expect(selectStations(data,center,{ ...DEFAULT_PREFERENCES, sort: 'nearest' }).map(s => s.id)).toEqual(['near','arco','cheap','missing']));
  it('filters multiple brands locally and treats empty brands as unrestricted', () => {
    expect(selectStations(data,center,{ ...DEFAULT_PREFERENCES, brands: ['ARCO'] }).map(s => s.id)).toEqual(['arco']);
    expect(selectStations(data,center,{ ...DEFAULT_PREFERENCES, brands: ['ARCO','Shell'] })).toHaveLength(4);
  });
  it('uses deterministic tie-breaking and selected grade', () => {
    expect(selectStations([station('b',4),station('a',4)],center,DEFAULT_PREFERENCES).map(s => s.id)).toEqual(['a','b']);
    expect(selectStations(data,center,{ ...DEFAULT_PREFERENCES, fuel: 'premium' })[0].id).toBe('missing');
  });
  it('deduplicates pages by station id', () => expect(mergeStations([station('a',4)], [station('a',5), station('b')])).toHaveLength(2));
  it('computes great-circle miles and bounds rounding displacement', () => {
    expect(distanceMiles(center,center)).toBe(0);
    expect(distanceMiles({lat:0,lng:0},{lat:0,lng:1})).toBeCloseTo(69.093,2);
    for (const lat of [0,20,34,48,70]) {
      const p = { lat: lat + 0.00499, lng: -117.82501 };
      expect(distanceMiles(p,coarseCenter(p)) * 1609.344).toBeLessThan(800);
    }
    expect(coarseCenter(center)).toEqual({lat:33.68,lng:-117.83});
  });
});
describe('price freshness', () => {
  const ago = (hours: number) => new Date(now - hours * 3_600_000).toISOString();
  it.each([[23.9,'fresh'],[24,'fresh'],[24.01,'stale'],[48,'stale'],[48.01,'old']])('classifies %s hours as %s', (hours,level) => expect(freshness(ago(Number(hours)),now).level).toBe(level));
  it('shows unavailable timestamps honestly', () => {
    for (const value of [null,undefined,'bad',new Date(now + 3600_000).toISOString()]) expect(freshness(value,now).label).toBe('Update time unavailable');
  });
  it('formats recent updates without a negative age', () => {
    expect(freshness(new Date(now + 1000).toISOString(),now).label).toBe('Updated just now');
    expect(freshness(new Date(now - 42 * 60_000).toISOString(),now).label).toBe('Updated 42 min ago');
  });
});
describe('preference storage boundary', () => {
  it('recovers from malformed and unavailable storage', () => {
    for (const raw of ['{', 'null', null]) expect(parsePreferences(raw)).toEqual(DEFAULT_PREFERENCES);
  });
  it('whitelists fields and rejects unknown values and location history', () => {
    expect(parsePreferences(JSON.stringify({ radius: 500, fuel: 'diesel', brands: ['Shell','Shell','Unknown'], sort: 'nearest', location: center }))).toEqual({ radius:5, fuel:'regular', brands:['Shell'], sort:'nearest' });
  });
});
