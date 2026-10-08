import { describe, expect, it } from 'vitest';
import { directionsLinks } from '@/lib/domain/directions';

describe('navigation destinations', () => {
  const station = { position: { lat: 33.652328, lng: -117.644861 }, address: { label: '27875 Santa Margarita Pkwy, Mission Viejo, CA 92691' } };
  it('passes the precise station to both providers with a documented current-location handoff and unchanged Google behavior', () => {
    const links = directionsLinks(station);
    for (const link of Object.values(links)) {
      const url = new URL(link);
      expect(url.searchParams.get('destination')).toBe('33.652328,-117.644861');
      expect(url.searchParams.has('origin')).toBe(false); expect(url.searchParams.has('saddr')).toBe(false);
    }
    expect(new URL(links.apple).searchParams.has('source')).toBe(false);
    expect(new URL(links.apple).searchParams.has('source-place-id')).toBe(false);
    expect(new URL(links.google).searchParams.has('source')).toBe(false);
    expect(new URL(links.apple).pathname).toBe('/directions');
    expect(new URL(links.apple).searchParams.get('mode')).toBe('driving');
    expect(new URL(links.google).searchParams.get('travelmode')).toBe('driving');
  });
  it.each([undefined, null, {lat:NaN,lng:0}, {lat:33,lng:181}])('falls back to the address when coordinates are unusable (%j)', position => {
    for (const link of Object.values(directionsLinks({...station,position}))) expect(new URL(link).searchParams.get('destination')).toBe(station.address.label);
  });
});
