'use client';
import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { formatPrice, validPrice } from '@/lib/domain/stations';
import { TIER_LABELS, type Coordinates, type FuelGrade, type LocatedStation, type PriceTier } from '@/lib/domain/types';
export default function StationMap({ stations, center, fuel, tiers, searchId, radius, onDetails }: { stations: LocatedStation[]; center: Coordinates; fuel: FuelGrade; tiers: Map<string, PriceTier>; searchId: number; radius: number; onDetails: (station: LocatedStation) => void }) {
  const element = useRef<HTMLDivElement>(null), map = useRef<L.Map | null>(null), layer = useRef<L.LayerGroup | null>(null), fitted = useRef('');
  const [tileError, setTileError] = useState(false);
  useEffect(() => {
    if (!element.current) return;
    const instance = L.map(element.current, { scrollWheelZoom: false }).setView([center.lat, center.lng], 12);
    map.current = instance;
    const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }).addTo(instance);
    tiles.on('tileerror', () => setTileError(true));
    layer.current = L.layerGroup().addTo(instance);
    const observer = new ResizeObserver(() => instance.invalidateSize());
    observer.observe(element.current);
    return () => { observer.disconnect(); instance.remove(); map.current = null; fitted.current = ''; };
    // A single map instance preserves the user's pan/zoom as filters change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!map.current || !layer.current) return;
    layer.current.clearLayers();
    for (const station of stations) {
      const price = validPrice(station, fuel), tier = tiers.get(station.id);
      const pin = document.createElement('span');
      pin.className = `map-price-pin ${tier ? `pin-${tier}` : 'pin-unavailable'}`;
      pin.textContent = price === null ? 'N/A' : formatPrice(price);
      const marker = L.marker([station.position.lat, station.position.lng], { icon: L.divIcon({ html: pin, className: 'price-marker', iconSize: [68, 36], iconAnchor: [34, 36] }), title: `${station.name}: ${price === null ? 'Price unavailable' : `${formatPrice(price)}, ${tier ? TIER_LABELS[tier] : ''}`}`, keyboard: true });
      const popup = document.createElement('div'); popup.className = 'station-popup';
      const name = document.createElement('strong'); name.textContent = station.name;
      const detail = document.createElement('p'); detail.textContent = `${price === null ? 'Price unavailable' : formatPrice(price) + '/gal'} · ${station.distanceMiles.toFixed(1)} mi away`;
      const category = document.createElement('p'); category.textContent = tier ? `${TIER_LABELS[tier]} price` : '';
      const button = document.createElement('button'); button.textContent = 'View station'; button.addEventListener('click', () => { button.focus(); onDetails(station); });
      popup.append(name, detail, category, button); marker.bindPopup(popup).addTo(layer.current);
    }
    if (fitted.current !== `${searchId}:${radius}`) {
      // Explicit radius changes frame the requested area, even in sparse locations.
      const bounds = L.latLng(center.lat, center.lng).toBounds(radius * 1609.344 * 2);
      map.current.fitBounds(bounds, { padding: [35,35], maxZoom: 14 });
      fitted.current = `${searchId}:${radius}`;
    }
  }, [stations, center, fuel, tiers, searchId, radius, onDetails]);
  return <div className="map-shell">{tileError && <p className="map-warning" role="status">The map background couldn’t load. Station pins and List view are still available.</p>}<div ref={element} className="station-map" role="region" aria-label="Map of matching gas stations" /><div className="map-footnote">Move the map freely. Prices only load when you search or choose Show More.</div></div>;
}
