import type { Coordinates, FuelGrade, LocatedStation, Preferences, PriceTier, Station } from './types';
export const METERS_PER_MILE = 1609.344;
export function coarseCenter(point: Coordinates): Coordinates {
  return { lat: Math.round(point.lat * 100) / 100, lng: Math.round(point.lng * 100) / 100 };
}
export function distanceMiles(a: Coordinates, b: Coordinates): number {
  const radians = (v: number) => v * Math.PI / 180;
  const dLat = radians(b.lat - a.lat), dLng = radians(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 3958.7613 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
}
export function validPrice(station: Station, fuel: FuelGrade): number | null {
  const price = station.prices[fuel];
  return price && price.currency === 'USD' && price.unit === 'US_gal' && Number.isFinite(price.amount) && price.amount > 0 ? price.amount : null;
}
export function selectStations(stations: Station[], center: Coordinates, prefs: Preferences): LocatedStation[] {
  return stations.map(s => ({ ...s, distanceMiles: distanceMiles(center, s.position) }))
    .filter(s => s.distanceMiles <= prefs.radius && (!prefs.brands.length || prefs.brands.some(b => b === s.brand)))
    .sort((a, b) => {
      const ap = validPrice(a, prefs.fuel), bp = validPrice(b, prefs.fuel);
      if ((ap === null) !== (bp === null)) return ap === null ? 1 : -1;
      return (prefs.sort === 'cheapest' && ap !== null && bp !== null ? ap - bp : 0) || a.distanceMiles - b.distanceMiles || a.id.localeCompare(b.id);
    });
}
export function classifyPrices(stations: Station[], fuel: FuelGrade): Map<string, PriceTier> {
  const values = stations.map(s => validPrice(s, fuel)).filter((v): v is number => v !== null).sort((a,b) => a-b);
  const result = new Map<string, PriceTier>();
  if (!values.length) return result;
  const ranks = new Map<number, number>();
  for (let i = 0; i < values.length;) {
    let end = i;
    while (end + 1 < values.length && values[end + 1] === values[i]) end++;
    ranks.set(values[i], ((i + end) / 2 + 0.5) / values.length);
    i = end + 1;
  }
  for (const station of stations) {
    const price = validPrice(station, fuel);
    if (price === null) continue;
    const p = ranks.get(price)!;
    result.set(station.id, p < 0.25 ? 'low' : p < 0.75 ? 'typical' : p < 0.9 ? 'high' : 'very-high');
  }
  return result;
}
export function mergeStations(previous: Station[], incoming: Station[]): Station[] {
  return [...new Map([...previous, ...incoming].map(s => [s.id, s])).values()];
}
export const formatPrice = (amount: number) => `$${amount.toFixed(2)}`;
