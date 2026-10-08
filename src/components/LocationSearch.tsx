'use client';
import { useRef, useState } from 'react';
import { LocateFixed, Search, MapPin, LoaderCircle } from 'lucide-react';
import type { Coordinates, LocationResult, ProviderMode } from '@/lib/domain/types';
import { api } from '@/lib/client';
import { DEMO_LOCATION } from '@/lib/providers/demo';
export function LocationSearch({ mode, onSelect, onLocate, busy, compact = false }: { mode: ProviderMode; onSelect: (location: LocationResult) => void; onLocate: (point: Coordinates) => void; busy: boolean; compact?: boolean }) {
  const [query, setQuery] = useState(''), [error, setError] = useState(''), [working, setWorking] = useState(false), [choices, setChoices] = useState<LocationResult[]>([]);
  const operation = useRef(0);
  async function search(event: React.FormEvent) {
    event.preventDefault();
    const sequence = ++operation.current;
    setError(''); setChoices([]); setWorking(true);
    try {
      const { locations } = await api<{ locations: LocationResult[] }>('/api/geocode', { query: query.trim() });
      if (sequence !== operation.current) return;
      if (locations.length === 1) onSelect(locations[0]);
      else if (locations.length) setChoices(locations);
      else setError(mode === 'demo' ? 'This demo covers Irvine and Tustin, CA. Try “Irvine” or “92606”.' : 'No matching location found. Try a US city, ZIP, or full address.');
    } catch (e) { if (sequence === operation.current) setError(e instanceof Error ? e.message : 'Location search failed. Try again.'); }
    finally { if (sequence === operation.current) setWorking(false); }
  }
  function locate() {
    setError(''); setChoices([]);
    if (!navigator.geolocation) { setError('Location is unavailable in this browser. Search by city, ZIP, or address instead.'); return; }
    setWorking(true);
    navigator.geolocation.getCurrentPosition(position => { setWorking(false); onLocate({ lat: position.coords.latitude, lng: position.coords.longitude }); }, reason => {
      setWorking(false);
      setError(reason.code === 1 ? 'Location access is off. Search by city, ZIP, or address instead.' : reason.code === 3 ? 'Location took too long. Try again or search by city, ZIP, or address.' : 'We couldn’t find your location. Search by city, ZIP, or address instead.');
    }, { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 });
  }
  return <div className={`location-search ${compact ? 'location-compact' : ''}`}>
    <button className="button primary locate-button" onClick={locate} disabled={busy || working}>{working ? <LoaderCircle className="spin" size={20} /> : <LocateFixed size={20} />} Use My Location</button>
    {!compact && <div className="divider-label"><span />or search somewhere else<span /></div>}
    <form onSubmit={search} className="address-form">
      <label htmlFor="location-query">Search by city, ZIP, or address</label>
      <div className="search-input-wrap"><MapPin size={19} aria-hidden="true" /><input id="location-query" value={query} onChange={e => { setQuery(e.target.value); setChoices([]); }} placeholder={mode === 'demo' ? 'Try Irvine, CA or 92606' : 'City, ZIP, or street address'} maxLength={200} minLength={2} required autoComplete="off" /><button className="search-submit" disabled={busy || working} aria-label="Search location"><Search size={20} /></button></div>
    </form>
    {choices.length > 0 && <div className="location-choices" aria-label="Matching locations"><p>Choose your location</p>{choices.map(choice => <button key={choice.id} onClick={() => onSelect(choice)}><MapPin size={17} />{choice.label}</button>)}</div>}
    {error && <p className="inline-error" role="alert">{error}</p>}
    {mode === 'demo' && !compact && <button className="text-button demo-link" onClick={() => onSelect(DEMO_LOCATION)} disabled={busy || working}>Explore the Irvine demo</button>}
  </div>;
}
