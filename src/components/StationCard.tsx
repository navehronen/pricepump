import { Clock3, MapPin, Navigation, ChevronRight, AlertTriangle } from 'lucide-react';
import { TIER_LABELS, type FuelGrade, type LocatedStation, type PriceTier } from '@/lib/domain/types';
import { formatPrice, validPrice } from '@/lib/domain/stations';
import { freshness } from '@/lib/domain/freshness';
export function TierBadge({ tier }: { tier?: PriceTier }) { return tier ? <span className={`tier-badge tier-${tier}`}>{TIER_LABELS[tier]}</span> : null; }
export function StationCard({ station, fuel, tier, onDetails, onDirections }: { station: LocatedStation; fuel: FuelGrade; tier?: PriceTier; onDetails: () => void; onDirections: () => void }) {
  const price = validPrice(station, fuel), age = freshness(station.prices[fuel]?.updatedAt);
  return <article className={`station-card ${tier ? `station-${tier}` : 'station-unavailable'}`}>
    <div className="station-card-main">
      <div className={`station-monogram brand-${station.brand.toLowerCase().replace(/[^a-z0-9]/g, '')}`} aria-hidden="true">{station.brand === '7-Eleven' ? '7' : station.brand === '76' ? '76' : station.brand.slice(0,1)}</div>
      <div className="station-info"><button className="station-title" onClick={onDetails} aria-label={`View details for ${station.name} at ${station.address.label}`}>{station.name}<ChevronRight size={16} /></button><p className="station-address">{station.address.label}</p><div className="station-meta"><span><MapPin size={13} />{station.distanceMiles.toFixed(1)} mi away</span>{price !== null && <span><Clock3 size={13} />{age.label}</span>}</div></div>
      <div className="station-price">{price === null ? <span className="unavailable-price">Price unavailable</span> : <><div className={`price-number price-${tier ?? 'average'}`}>{formatPrice(price)}<span>/gal</span></div><TierBadge tier={tier} /></>}</div>
    </div>
    <div className="station-card-bottom"><div>{price !== null && age.warning ? <span className={`freshness-warning ${age.level}`}><AlertTriangle size={14} />{age.warning}</span> : <span className="station-brand-label">{station.brand}{station.brand === 'Costco' ? ' · Membership may be required' : ''}</span>}</div><button className="directions-button" onClick={onDirections}><Navigation size={15} />Directions</button></div>
  </article>;
}
