import { describe, expect, it } from 'vitest';
import { BRANDS, FUELS, DEFAULT_PREFERENCES, type StationPage, type LocationResult } from '@/lib/domain/types';
import { classifyPrices, coarseCenter, selectStations, validPrice } from '@/lib/domain/stations';

// Explicit opt-in only. Uses the already-running private server, never a key in this test.
// Budget: 3 requests per city, plus two radius searches and one next page for Seattle.
describe.skipIf(process.env.PRICE_PUMP_LIVE_QA !== '1')('live US coverage and domain behavior', () => {
  async function post<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(`http://127.0.0.1:3000${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(15_000) });
    expect(response.status).toBe(200);
    return response.json() as Promise<T>;
  }
  for (const city of ['Seattle, WA', 'Houston, TX', 'Chicago, IL', 'New York, NY', 'Honolulu, HI', 'Lusk, WY']) {
    it(city, async () => {
      const { locations } = await post<{ locations: LocationResult[] }>('/api/geocode', { query: city });
      expect(locations.length).toBeGreaterThan(0);
      const point = locations[0].position, center = coarseCenter(point);
      const input = { center, radius: 5, offset: 0 };
      const page = await post<StationPage>('/api/stations', input);
      expect(page.stations.length).toBeGreaterThan(0);
      expect(new Set(page.stations.map(s => s.id)).size).toBe(page.stations.length);
      expect((await post<StationPage>('/api/stations', input)).fetchedAt).toBe(page.fetchedAt);
      for (const fuel of Object.keys(FUELS) as (keyof typeof FUELS)[]) {
        for (const sort of ['cheapest', 'nearest'] as const) {
          const result = selectStations(page.stations, point, { ...DEFAULT_PREFERENCES, fuel, sort });
          expect(result.every(s => s.distanceMiles <= 5)).toBe(true);
          let missing = false;
          const tiers = classifyPrices(result, fuel);
          result.forEach((s, i) => {
            const p = validPrice(s, fuel);
            if (p === null) { missing = true; expect(tiers.has(s.id)).toBe(false); }
            else {
              expect(missing).toBe(false); expect(tiers.has(s.id)).toBe(true);
              const previous = i > 0 ? result[i - 1] : null;
              if (previous) expect(sort === 'cheapest' ? p >= validPrice(previous, fuel)! : s.distanceMiles >= previous.distanceMiles).toBe(true);
            }
          });
        }
        for (const brand of BRANDS) {
          expect(selectStations(page.stations, point, { ...DEFAULT_PREFERENCES, fuel, brands: [brand] }).every(s => s.brand === brand)).toBe(true);
        }
      }
      if (city === 'Seattle, WA') {
        for (const radius of [10, 15] as const) {
          const wider = await post<StationPage>('/api/stations', { ...input, radius });
          expect(wider.stations.length).toBeGreaterThan(0);
          expect(selectStations(wider.stations, point, { ...DEFAULT_PREFERENCES, radius }).every(s => s.distanceMiles <= radius)).toBe(true);
        }
        if (page.nextOffset !== null) {
          const next = await post<StationPage>('/api/stations', { ...input, offset: page.nextOffset });
          expect(next.stations.length).toBeGreaterThan(0);
          expect(new Set([...page.stations, ...next.stations].map(s => s.id)).size).toBe(page.stations.length + next.stations.length);
        }
      }
      if (city === 'Lusk, WY') { expect(page.complete).toBe(true); expect(page.nextOffset).toBeNull(); }
    }, 60_000);
  }
});
