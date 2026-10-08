import { BRANDS, DEFAULT_PREFERENCES, FUELS, type Brand, type FuelGrade, type Preferences } from './types';
export const PREFERENCE_KEY = 'price-pump.preferences.v1';
export function parsePreferences(raw: string | null): Preferences {
  try {
    const p = JSON.parse(raw ?? '{}');
    if (!p || typeof p !== 'object') return { ...DEFAULT_PREFERENCES };
    return {
      radius: [5, 10, 15].includes(p.radius) ? p.radius : 5,
      fuel: Object.hasOwn(FUELS, p.fuel) ? p.fuel as FuelGrade : 'regular',
      brands: Array.isArray(p.brands) ? [...new Set(p.brands.filter((b: unknown): b is Brand => BRANDS.includes(b as Brand)))] as Brand[] : [],
      sort: p.sort === 'nearest' ? 'nearest' : 'cheapest',
    };
  } catch { return { ...DEFAULT_PREFERENCES }; }
}
export function savePreferences(p: Preferences): void {
  try { localStorage.setItem(PREFERENCE_KEY, JSON.stringify({ radius: p.radius, fuel: p.fuel, brands: p.brands, sort: p.sort })); } catch { /* Storage is optional, including in private browsing. */ }
}
