import type { Coordinates, LocationResult, StationPage, StationSearch } from '@/lib/domain/types';
export interface FuelProvider { search(input: StationSearch): Promise<StationPage> }
export interface LocationProvider {
  geocode(query: string): Promise<LocationResult[]>;
  reverse(center: Coordinates): Promise<{ label: string; countryCode: string }>;
}
export type DataProvider = FuelProvider & LocationProvider;
