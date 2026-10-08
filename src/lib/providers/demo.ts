import type { DataProvider } from './types';
import { BRANDS, type LocationResult, type Station } from '@/lib/domain/types';
import { distanceMiles, METERS_PER_MILE } from '@/lib/domain/stations';
export const DEMO_LOCATION: LocationResult = { id: 'demo-irvine', label: 'Irvine, CA, USA', displayName: 'Irvine, CA', position: { lat: 33.6846, lng: -117.8265 }, countryCode: 'USA' };
// Fictional stations and prices, not claims about real businesses or addresses.
// Stable geometry and price values exercise pagination, missing data, and ties.
export function demoStations(now = Date.now()): Station[] {
  const streets = ['Sample Way', 'Demo Avenue', 'Example Road', 'Preview Lane'];
  return Array.from({ length: 76 }, (_, i) => {
    const angle = i * 2.399963, miles = 0.35 + i * 0.105;
    const brand = BRANDS[i % BRANDS.length];
    const amount = 4.09 + ((i * 7) % 31) * 0.03;
    const hours = i % 13 === 0 ? 60 : i % 9 === 0 ? 30 : 0.3 + (i % 8) * 0.7;
    const updatedAt = i % 17 === 0 ? null : new Date(now - hours * 3_600_000).toISOString();
    const price = (extra: number) => ({ amount: Number((amount + extra).toFixed(2)), currency: 'USD' as const, unit: 'US_gal' as const, updatedAt });
    return {
      id: `demo-${i + 1}`, name: brand, brand,
      position: { lat: DEMO_LOCATION.position.lat + Math.sin(angle) * miles / 69, lng: DEMO_LOCATION.position.lng + Math.cos(angle) * miles / (69 * Math.cos(DEMO_LOCATION.position.lat * Math.PI / 180)) },
      address: { label: `${100 + i * 17} ${streets[i % 4]}, Irvine, CA 92606`, city: 'Irvine', state: 'CA', postalCode: '92606', countryCode: 'USA' },
      prices: i % 11 === 0 ? {} : { regular: price(0), ...(i % 7 ? { midgrade: price(0.22) } : {}), premium: price(0.42) },
    };
  });
}
export const demoProvider: DataProvider = {
  async search({ center, radius, offset, outer = false }) {
    const all = demoStations().filter(s => distanceMiles(center, s.position) <= radius + (outer ? -800 : 800) / METERS_PER_MILE).sort((a,b) => (outer ? -1 : 1) * (distanceMiles(center, a.position) - distanceMiles(center, b.position)));
    const nextOffset = offset + 50 < all.length ? offset + 50 : null;
    return { total: all.length, retrievedCount: Math.min(offset + 50, all.length), stations: all.slice(offset, offset + 50), nextOffset, complete: nextOffset === null, fetchedAt: new Date().toISOString() };
  },
  async geocode(query) {
    const q = query.toLowerCase();
    if (/irvine|926|sample|demo|example|preview/.test(q)) return [DEMO_LOCATION];
    if (/orange|california/.test(q)) return [DEMO_LOCATION, { ...DEMO_LOCATION, id: 'demo-tustin', label: 'Tustin, CA, USA', displayName: 'Tustin, CA', position: { lat: 33.7458, lng: -117.8262 } }];
    if (/tustin|92780/.test(q)) return [{ ...DEMO_LOCATION, id: 'demo-tustin', label: 'Tustin, CA, USA', displayName: 'Tustin, CA', position: { lat: 33.7458, lng: -117.8262 } }];
    return [];
  },
  async reverse(center) {
    return distanceMiles(center, DEMO_LOCATION.position) < 30 ? { label: 'Near Irvine, CA', countryCode: 'USA' } : { label: 'Current location', countryCode: '' };
  },
};
