import type { Coordinates } from './types';

export function directionsLinks(station: { position?: Coordinates | null; address: { label: string } }) {
  const p = station.position;
  const coordinatesValid = p && Number.isFinite(p.lat) && Number.isFinite(p.lng) && Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180;
  // Do not round station destinations like the privacy-preserving search center.
  const destination = coordinatesValid ? `${p.lat},${p.lng}` : station.address.label.trim();
  const encoded = encodeURIComponent(destination);
  return {
    google: `https://www.google.com/maps/dir/?api=1&destination=${encoded}&travelmode=driving`,
    // Apple's documented current-location handoff omits source. A literal
    // "Current Location" is only text on Maps web, not a geolocation instruction.
    // Maps web may require selecting My Location and granting location access.
    apple: `https://maps.apple.com/directions?destination=${encoded}&mode=driving`,
  };
}
