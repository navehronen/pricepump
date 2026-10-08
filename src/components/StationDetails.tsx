'use client';
import { useEffect, useRef, useState } from 'react';
import { X, Navigation, MapPin, Clock3, ExternalLink } from 'lucide-react';
import { FUELS, type FuelGrade, type LocatedStation, type PriceTier } from '@/lib/domain/types';
import { formatPrice, validPrice } from '@/lib/domain/stations';
import { freshness } from '@/lib/domain/freshness';
import { directionsLinks } from '@/lib/domain/directions';
import { TierBadge } from './StationCard';
function DirectionsOptions({ station, demo }: { station: LocatedStation; demo: boolean }) {
  const [apple, setApple] = useState(false);
  useEffect(() => { setApple(/Mac|iPhone|iPad|iPod/.test(navigator.userAgent)); }, []);
  const links = directionsLinks(station);
  const options = [
    { name: 'Google Maps', href: links.google, preferred: !apple },
    { name: 'Apple Maps', href: links.apple, preferred: apple },
  ].sort((a,b) => Number(b.preferred) - Number(a.preferred));
  return <div className="navigation-options"><h3><Navigation size={19} />Get directions</h3>{demo && <p className="demo-direction-note">Demo stations are fictional. These links open sample map coordinates.</p>}{options.map(option => <a key={option.name} className={`button ${option.preferred ? 'primary' : 'secondary'}`} href={option.href} target="_blank" rel="noopener noreferrer">{option.name}<ExternalLink size={17} /></a>)}<p className="muted">Apple Maps web may need you to select My Location in the From field and allow location access.</p></div>;
}
export function StationDetails({ station, fuel, tier, directionsOnly, demo, onClose }: { station: LocatedStation; fuel: FuelGrade; tier?: PriceTier; directionsOnly: boolean; demo: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current, prior = document.activeElement as HTMLElement | null;
    dialog?.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { dialog?.close(); document.body.style.overflow = previousOverflow; prior?.focus(); };
  }, []);
  const price = validPrice(station, fuel), age = freshness(station.prices[fuel]?.updatedAt);
  return <dialog ref={ref} className="station-dialog" aria-labelledby="detail-title" onCancel={onClose} onClick={e => { if (e.target === ref.current) { const box = ref.current.getBoundingClientRect(); if (e.clientX < box.left || e.clientX > box.right || e.clientY < box.top || e.clientY > box.bottom) onClose(); } }}>
    <div className="dialog-head"><span className="eyebrow">{directionsOnly ? 'YOUR NEXT STOP' : 'STATION DETAILS'}</span><button autoFocus className="icon-button" aria-label="Close station details" onClick={onClose}><X size={22} /></button></div>
    <h2 id="detail-title">{station.name}</h2><p className="detail-brand">{station.brand} · {station.distanceMiles.toFixed(1)} mi away</p>
    <p className="detail-address"><MapPin size={18} />{station.address.label}</p>
    {!directionsOnly && <><div className="detail-feature-price"><span>{FUELS[fuel]}</span><div>{price === null ? <strong>Price unavailable</strong> : <strong>{formatPrice(price)}<small>/gal</small></strong>}<TierBadge tier={tier} /></div>{price !== null && <p><Clock3 size={14} />{age.label}</p>}{price !== null && age.warning && <p className="freshness-warning">{age.warning}</p>}</div>
      <div className="all-prices">{Object.entries(FUELS).map(([grade,label]) => { const amount = validPrice(station, grade as FuelGrade); const update = freshness(station.prices[grade as FuelGrade]?.updatedAt); return <div key={grade}><span>{label}</span><div><strong>{amount === null ? 'Unavailable' : `${formatPrice(amount)}/gal`}</strong>{amount !== null && <small>{update.warning ?? update.label}</small>}</div></div>; })}</div>
    </>}
    <DirectionsOptions station={station} demo={demo} />
  </dialog>;
}
