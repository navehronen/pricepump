import { z } from 'zod';
import type { FuelGrade, LocationResult, Station, StationPage } from '@/lib/domain/types';
const position = z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) });
const priceSchema = z.object({ price: z.number().positive(), fuelType: z.union([z.string(), z.number()]), currency: z.string(), unit: z.string(), modified: z.string().nullish(), available: z.boolean().nullish() });
const stationSchema = z.object({
  id: z.string().min(1), name: z.string().nullish(), brand: z.string().nullish(), position,
  address: z.object({ label: z.string().nullish(), city: z.string().nullish(), state: z.string().nullish(), postalCode: z.string().nullish(), countryCode: z.string() }),
  prices: z.array(z.unknown()).nullish(),
});
const gradeMap: Record<string, FuelGrade> = { '2': 'regular', '3': 'midgrade', '4': 'premium' };
export function normalizeBrand(raw: string): string {
  const key = raw.toLowerCase().replace(/[^a-z0-9]/g, '');
  const aliases: Record<string, string> = { chevron: 'Chevron', arco: 'ARCO', shell: 'Shell', '76': '76', union76: '76', unocal76: '76', mobil: 'Mobil', exxonmobil: 'Mobil', costco: 'Costco', costcogasoline: 'Costco', sinclair: 'Sinclair', '7eleven': '7-Eleven', seveneleven: '7-Eleven' };
  return Object.hasOwn(aliases, key) ? aliases[key] : (raw.trim() || 'Independent');
}
export function normalizeTimestamp(value?: string | null): string | null {
  if (!value || !/(Z|[+-]\d{2}:?\d{2})$/i.test(value)) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}
export function normalizeStation(raw: unknown): Station | null {
  const parsed = stationSchema.safeParse(raw);
  if (!parsed.success || parsed.data.address.countryCode !== 'USA') return null;
  const s = parsed.data, prices: Station['prices'] = {};
  for (const entry of s.prices ?? []) {
    const parsedPrice = priceSchema.safeParse(entry);
    if (!parsedPrice.success) continue;
    const p = parsedPrice.data, gradeKey = String(p.fuelType);
    const grade = Object.hasOwn(gradeMap, gradeKey) ? gradeMap[gradeKey] : undefined;
    if (!grade || p.currency !== 'USD' || p.available === false) continue;
    // HERE's `gal` is interpreted as US gallons only after the USA country check.
    const factor = p.unit === 'gal' ? 1 : p.unit === 'l' ? 3.785411784 : null;
    if (factor === null) continue;
    const updatedAt = normalizeTimestamp(p.modified), prior = prices[grade];
    if (!prior || (updatedAt && (!prior.updatedAt || updatedAt > prior.updatedAt))) {
      prices[grade] = { amount: p.price * factor, currency: 'USD', unit: 'US_gal', updatedAt };
    }
  }
  const brand = normalizeBrand(s.brand ?? s.name ?? 'Independent');
  return { id: s.id, name: s.name?.trim() || brand, brand, position: s.position, address: { label: s.address.label || 'Address unavailable', city: s.address.city ?? '', state: s.address.state ?? '', postalCode: s.address.postalCode ?? '', countryCode: 'USA' }, prices };
}
export function normalizePage(raw: unknown, offset: number, now = Date.now()): StationPage {
  const result = z.object({ stations: z.array(z.unknown()), nextOffset: z.number().int().nonnegative().nullable().optional(), total: z.number().int().nonnegative().optional(), count: z.number().int().nonnegative().optional() }).parse(raw);
  const stations = [...new Map(result.stations.map(normalizeStation).filter((s): s is Station => s !== null).map(s => [s.id, s])).values()];
  const next = result.nextOffset !== undefined ? result.nextOffset : (result.total !== undefined && offset + result.stations.length < result.total && result.stations.length > 0 ? offset + result.stations.length : null);
  if (next !== null && next <= offset) throw new Error('Invalid provider pagination');
  const retrievedCount = offset + result.stations.length;
  const limitReason = next !== null && next > 10_000 ? 'safety' : next === null && result.total !== undefined && retrievedCount < result.total ? 'provider' : undefined;
  return { stations, nextOffset: limitReason ? null : next, complete: next === null && !limitReason, fetchedAt: new Date(now).toISOString(), total: result.total, retrievedCount, limitReason };
}
export function normalizeLocations(raw: unknown): LocationResult[] {
  const envelope = z.object({ items: z.array(z.unknown()) }).parse(raw);
  return envelope.items.flatMap(item => {
    const result = z.object({ id: z.string(), title: z.string(), position, address: z.object({ label: z.string().optional(), city: z.string().optional(), stateCode: z.string().optional(), countryCode: z.string() }) }).safeParse(item);
    if (!result.success) return [];
    const s = result.data;
    return [{ id: s.id, label: s.address.label ?? s.title, displayName: [s.address.city, s.address.stateCode].filter(Boolean).join(', ') || s.title, position: s.position, countryCode: s.address.countryCode }];
  });
}
