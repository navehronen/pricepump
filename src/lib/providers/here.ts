import 'server-only';
import type { DataProvider } from './types';
import { normalizeLocations, normalizePage } from './normalize';
import { METERS_PER_MILE } from '@/lib/domain/stations';
export async function hereRequest(path: string, parameters: Record<string, string>): Promise<unknown> {
  const key = process.env.HERE_API_KEY;
  if (!key) throw new Error('Provider not configured');
  const url = new URL(path);
  for (const [name, value] of Object.entries(parameters)) url.searchParams.set(name, value);
  url.searchParams.set('apiKey', key);
  // No logging: URLs contain credentials; geocoding queries may contain addresses.
  const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(10_000), headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error('Provider unavailable');
  return response.json();
}
export const hereProvider: DataProvider = {
  async search({ center, radius, offset, outer = false }) {
    return normalizePage(await hereRequest('https://fuel.hereapi.com/v3/stations', {
      // Keep the outer sample inside the exact user's radius despite center rounding.
      // Normal pagination still covers the full expanded circle, including the rim.
      in: `circle:${center.lat},${center.lng};r=${Math.ceil(radius * METERS_PER_MILE + (outer ? -800 : 800))}`,
      returnAllStations: 'true', limit: '50', offset: String(offset), sort: outer ? 'distance:desc' : 'distance:asc',
    }), offset);
  },
  async geocode(query) {
    const data = await hereRequest('https://geocode.search.hereapi.com/v1/geocode', { q: query, in: 'countryCode:USA', limit: '5', lang: 'en-US' });
    return normalizeLocations(data).filter(l => l.countryCode === 'USA');
  },
  async reverse(center) {
    const data = await hereRequest('https://revgeocode.search.hereapi.com/v1/revgeocode', { at: `${center.lat},${center.lng}`, limit: '1', lang: 'en-US' });
    const location = normalizeLocations(data)[0];
    return { label: location?.displayName ?? 'Current location', countryCode: location?.countryCode ?? '' };
  },
};
