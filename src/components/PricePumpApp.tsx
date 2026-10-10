'use client';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, Fuel, Leaf, MapPin, ShieldCheck, Sparkles, X } from 'lucide-react';
import { BrandMark } from './BrandMark';
import { LocationSearch } from './LocationSearch';
import { Filters } from './Filters';
import { ResultsSummary } from './ResultsSummary';
import { ListMapToggle } from './ListMapToggle';
import { StationCard } from './StationCard';
import { StationDetails } from './StationDetails';
import { EmptyState, ErrorState, LoadingState } from './States';
import { DEFAULT_PREFERENCES, FUELS, TIER_LABELS, type Coordinates, type LocatedStation, type LocationResult, type Preferences, type ProviderMode, type Radius, type Station, type StationPage } from '@/lib/domain/types';
import { HereNotice } from './HereNotice';
import { validPrice, classifyPrices, coarseCenter, mergeStations, selectStations } from '@/lib/domain/stations';
import { parsePreferences, PREFERENCE_KEY, savePreferences } from '@/lib/domain/preferences';
import { api } from '@/lib/client';
import { DEMO_LOCATION } from '@/lib/providers/demo';
const StationMap = dynamic(() => import('./StationMap'), { ssr: false, loading: () => <LoadingState /> });
function PriceGuide() {
  return <aside className="price-guide"><div className="guide-icon"><Fuel size={22} /></div><h3>A little color.<br /> A clearer choice.</h3><p>See how each price compares with the matching stations you’ve loaded.</p><div className="price-scale">{Object.entries(TIER_LABELS).map(([key,label]) => <div key={key}><span className={`scale-swatch swatch-${key}`} /><span>{label}</span><span>{key === 'low' ? 'Lower prices' : key === 'typical' ? 'Middle of the pack' : key === 'high' ? 'Higher prices' : 'Highest prices'}</span></div>)}</div><div className="guide-note"><ShieldCheck size={18} /><span>No accounts. No location history.<br />Just your next fill-up.</span></div></aside>;
}
export default function PricePumpApp({ mode }: { mode: ProviderMode }) {
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFERENCES), [ready, setReady] = useState(false);
  const prefsRef = useRef(prefs);
  const [location, setLocation] = useState<LocationResult | null>(null), [stations, setStations] = useState<Station[]>([]);
  const [nextOffset, setNextOffset] = useState<number | null>(null), [visible, setVisible] = useState(20), [loadedRadius, setLoadedRadius] = useState<Radius | null>(null);
  const [coverage, setCoverage] = useState<Pick<StationPage, 'complete' | 'total' | 'retrievedCount' | 'limitReason'>>({ complete: true });
  const [busy, setBusy] = useState(false), [moreBusy, setMoreBusy] = useState(false), [error, setError] = useState(''), [searchId, setSearchId] = useState(0);
  const [view, setView] = useState<'list' | 'map'>('list'), [mapVisited, setMapVisited] = useState(false), [changeLocation, setChangeLocation] = useState(false);
  const [details, setDetails] = useState<{ id: string; directionsOnly: boolean } | null>(null), [privacy, setPrivacy] = useState(false);
  const [outerStatus, setOuterStatus] = useState<'none' | 'loaded' | 'failed'>('none');
  const searchCache = useRef(new Map<string, { page: StationPage; outer: 'none' | 'loaded' | 'failed'; at: number }>());
  const cacheLocation = useRef('');
  const generation = useRef(0), controller = useRef<AbortController | null>(null), paging = useRef(false);
  useEffect(() => { let restored = DEFAULT_PREFERENCES; try { restored = parsePreferences(localStorage.getItem(PREFERENCE_KEY)); } catch {} prefsRef.current = restored; setPrefs(restored); setReady(true); return () => { controller.current?.abort(); }; }, []);
  const runSearch = useCallback(async (target: LocationResult, radius: Radius) => {
    const requestId = ++generation.current;
    controller.current?.abort(); controller.current = new AbortController(); paging.current = false;
    setLocation(target); setChangeLocation(false); setBusy(true); setMoreBusy(false); setError(''); setStations([]); setLoadedRadius(null); setNextOffset(null); setVisible(20); setDetails(null);
    setCoverage({ complete: false }); setOuterStatus('none');
    const locationKey = JSON.stringify(target.position);
    if (cacheLocation.current !== locationKey) { searchCache.current.clear(); cacheLocation.current = locationKey; }
    try {
      let cached = mode === 'demo' ? searchCache.current.get(String(radius)) : undefined;
      if (cached && Date.now() - cached.at >= 300_000) cached = undefined;
      let page: StationPage, outer: 'none' | 'loaded' | 'failed' = 'none';
      if (cached && Date.now() - cached.at < 300_000) { page = cached.page; outer = cached.outer; }
      else {
        page = await api<StationPage>('/api/stations', { center: coarseCenter(target.position), radius, offset: 0 }, controller.current.signal);
        if (generation.current !== requestId) return;
        if (radius > 5 && !page.complete && page.nextOffset !== null) {
          try {
            const sample = await api<StationPage>('/api/stations', { center: coarseCenter(target.position), radius, offset: 0, outer: true }, controller.current.signal);
            page = { ...page, stations: mergeStations(page.stations, sample.stations) }; outer = 'loaded';
            if (page.total !== undefined && page.stations.length >= page.total) page = { ...page, complete: true, nextOffset: null, retrievedCount: page.total };
          } catch { outer = 'failed'; } // Keep usable nearby results; never retry automatically.
        }
      }
      if (generation.current !== requestId) return;
      if (mode === 'demo') searchCache.current.set(String(radius), { page, outer, at: cached?.at ?? Date.now() });
      setOuterStatus(outer);
      setStations(page.stations); setNextOffset(page.nextOffset); setLoadedRadius(radius); setSearchId(requestId);
      setCoverage({ complete: page.complete, total: page.total, retrievedCount: page.retrievedCount, limitReason: page.limitReason });
    } catch (e) { if (generation.current === requestId && !(e instanceof DOMException && e.name === 'AbortError')) setError(e instanceof Error ? e.message : "We couldn't load current prices. Try again."); }
    finally { if (generation.current === requestId) setBusy(false); }
  }, [mode]);
  const chooseLocation = (target: LocationResult) => { void runSearch(target, prefsRef.current.radius); };
  function locate(point: Coordinates) {
    const target: LocationResult = { id: 'device', label: 'Current location', displayName: 'Current location', position: point, countryCode: '' };
    void runSearch(target, prefsRef.current.radius);
    const id = generation.current;
    void api<{ label: string; countryCode: string }>('/api/reverse', { center: coarseCenter(point) }).then(result => {
      if (id !== generation.current) return;
      if (result.countryCode && result.countryCode !== 'USA') { controller.current?.abort(); setStations([]); setNextOffset(null); setError('Price Pump currently supports US locations. Search for a US city or ZIP.'); setBusy(false); generation.current++; }
      else setLocation(current => current && ({ ...current, displayName: result.label, countryCode: result.countryCode }));
    }).catch(() => { /* The location label is optional; station search can still succeed. */ });
  }
  function updatePreferences(next: Preferences) {
    const prior = prefsRef.current; prefsRef.current = next; setPrefs(next); savePreferences(next); setVisible(20);
    if (location && prior.radius !== next.radius && (mode === 'here' || !loadedRadius || next.radius > loadedRadius || !coverage.complete)) void runSearch(location, next.radius);
  }
  const matching = useMemo(() => location ? selectStations(stations, location.position, prefs) : [], [stations, location, prefs]);
  const tiers = useMemo(() => classifyPrices(matching, prefs.fuel), [matching, prefs.fuel]);
  const hasPrices = useMemo(() => matching.some(station => validPrice(station, prefs.fuel) !== null), [matching, prefs.fuel]);
  const selected = details ? matching.find(s => s.id === details.id) : undefined;
  const openDetails = useCallback((station: LocatedStation) => setDetails({ id: station.id, directionsOnly: false }), []);
  async function showMore() {
    if (visible < matching.length && view === 'list') { setVisible(v => v + 20); return; }
    if (nextOffset === null || !location || !loadedRadius || paging.current) return;
    paging.current = true; setMoreBusy(true); setError('');
    const id = generation.current;
    try {
      const page = await api<StationPage>('/api/stations', { center: coarseCenter(location.position), radius: loadedRadius, offset: nextOffset }, controller.current?.signal);
      if (generation.current !== id) return;
      const combined = mergeStations(stations, page.stations);
      if (mode === 'demo') {
        const cached = searchCache.current.get(String(loadedRadius));
        searchCache.current.set(String(loadedRadius), { page: { ...page, stations: combined }, outer: outerStatus, at: cached?.at ?? Date.now() });
      }
      setStations(combined); setNextOffset(page.nextOffset); setVisible(v => Math.min(v, matching.length) + 20);
      setCoverage({ complete: page.complete, total: page.total, retrievedCount: page.retrievedCount, limitReason: page.limitReason });
    } catch (e) { if (generation.current === id) setError(e instanceof Error ? e.message : "We couldn't load current prices. Try again."); }
    finally { if (generation.current === id) { setMoreBusy(false); paging.current = false; } }
  }
  return <>
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="site-header"><div className="header-inner"><a className="home-link" href="/" aria-label="Price Pump home"><BrandMark /></a><div className="header-right"><span className="header-caption">A smarter way to fill up</span><span className="no-account"><ShieldCheck size={15} />No sign-up needed</span></div></div></header>
    {mode === 'demo' && <div className="demo-banner"><Sparkles size={15} /><span><strong>You’re exploring the demo.</strong> Fictional stations and prices near Irvine, CA.</span></div>}
    <main id="main" className={`main-shell ${location ? 'has-results' : 'welcome-shell'}`}>
      {!location ? <>
        <section className="welcome"><div className="welcome-copy"><span className="eyebrow"><span className="small-line" />GOOD STOPS START HERE</span><h1>Less at the pump.<br /><span>More for the road.</span></h1><p className="welcome-description">Find a better gas price around the corner.<br className="desktop-break" /> Your fuel. Your favorite stations. Your way.</p><div className="welcome-footnote"><Leaf size={19} /><span>Small savings. Every fill-up.</span></div></div>
          <div className="location-panel"><div className="panel-symbol"><MapPin size={26} /></div><h2>Where are you filling up?</h2><p>Let’s find the best prices nearby.</p><LocationSearch mode={mode} onSelect={chooseLocation} onLocate={locate} busy={!ready || busy} /><div className="location-privacy"><ShieldCheck size={15} /><span>No location history saved. Manual searches use HERE in live mode.</span></div></div>
        </section>
        <section className="welcome-bottom" aria-label="How Price Pump works"><div><span className="step-number">01</span><div><h3>Find your area</h3><p>Use your location or search a place.</p></div></div><div><span className="step-number">02</span><div><h3>Compare your options</h3><p>Pick a grade. Find your kind of station.</p></div></div><div><span className="step-number">03</span><div><h3>Go for the better price</h3><p>Open directions and get on your way.</p></div></div></section>
      </> : <>
        <section className="results-heading"><div><span className="eyebrow">YOUR NEXT FILL-UP</span><h1>Good prices. <span>Close by.</span></h1><button className="current-location" onClick={() => setChangeLocation(!changeLocation)} aria-expanded={changeLocation}><MapPin size={17} /><strong>{location.displayName}</strong><span>Change location</span></button></div><div className="results-heading-note"><Fuel size={19} /><span>A better stop starts<br />with a little comparison.</span></div></section>
        {changeLocation && <section className="change-location-panel" aria-label="Change location"><button className="icon-button close-location" aria-label="Close location search" onClick={() => setChangeLocation(false)}><X size={18} /></button><LocationSearch compact mode={mode} onSelect={chooseLocation} onLocate={locate} busy={busy} /></section>}
        <Filters prefs={prefs} onChange={updatePreferences} />
        <div className="results-layout"><section className="results-column" aria-label="Gas station results"><div className="results-toolbar"><ResultsSummary count={matching.length} hasPrices={hasPrices} radius={prefs.radius} outerStatus={outerStatus} {...coverage} /><ListMapToggle view={view} onChange={v => { setView(v); if (v === 'map') setMapVisited(true); }} /></div>
          {error && <ErrorState message={error} retry={() => { if (stations.length) void showMore(); else void runSearch(location, prefs.radius); }} />}
          {busy ? <LoadingState /> : <>
            {!matching.length && !error && <EmptyState radius={prefs.radius} partial={!coverage.complete} canLoadMore={nextOffset !== null} increase={prefs.radius < 15 ? () => updatePreferences({ ...prefs, radius: prefs.radius === 5 ? 10 : 15 }) : undefined} reset={prefs.brands.length ? () => updatePreferences({ ...prefs, brands: [] }) : undefined} />}
            {mode === 'demo' && !matching.length && !busy && <p className="demo-empty">Demo data is centered on Irvine. <button className="text-button" onClick={() => chooseLocation(DEMO_LOCATION)}>Explore Irvine</button></p>}
            <div hidden={view !== 'list'} className="station-list">{matching.slice(0, visible).map(station => <StationCard key={station.id} station={station} fuel={prefs.fuel} tier={tiers.get(station.id)} onDetails={() => openDetails(station)} onDirections={() => setDetails({ id: station.id, directionsOnly: true })} />)}</div>
            {mapVisited && <div hidden={view !== 'map'}><StationMap stations={matching} center={location.position} fuel={prefs.fuel} tiers={tiers} searchId={searchId} radius={prefs.radius} onDetails={openDetails} /></div>}
            {((view === 'list' && visible < matching.length) || nextOffset !== null) && <div className="show-more"><button className="button secondary" onClick={() => void showMore()} disabled={moreBusy}>{moreBusy ? 'Loading stations…' : 'Show More'}</button><span>{view === 'list' ? `Showing ${Math.min(visible, matching.length)} of ${matching.length} loaded matches` : `${matching.length} matching stations on the map`}</span></div>}
          </>}
          <p className="results-disclaimer">{FUELS[prefs.fuel]} · USD per US gallon · Straight-line distances<br />Prices can change. Check the price at the pump before filling up.</p>
        </section><PriceGuide /></div>
      </>}
      {mode === 'here' && <HereNotice />}
    </main>
    <footer className="site-footer"><div><BrandMark compact /><span>Find your better fill-up.</span></div><button className="footer-privacy" onClick={() => setPrivacy(!privacy)} aria-expanded={privacy}>Privacy & data<ArrowUpRight size={14} /></button></footer>
    {privacy && <section className="privacy-panel"><h2>Your location, your choice.</h2><p>Price Pump saves only your radius, fuel grade, brands, and sort preference on this device. It never saves your location history. Fuel searches use an approximate area center; your browser calculates exact distances.</p><p>Manual addresses are sent through our server to HERE for lookup, without application caching or logging. HERE processes live searches. OpenStreetMap receives map-tile requests, and your chosen maps app receives the destination when you ask for directions. Hosting and service providers may keep their own operational logs.</p><button className="text-button" onClick={() => setPrivacy(false)}>Close privacy details</button></section>}
    {selected && details && <StationDetails station={selected} fuel={prefs.fuel} tier={tiers.get(selected.id)} directionsOnly={details.directionsOnly} demo={mode === 'demo'} onClose={() => setDetails(null)} />}
  </>;
}

