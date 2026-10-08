'use client';
import { SlidersHorizontal } from 'lucide-react';
import { FUELS, type Preferences, type Radius, type FuelGrade, type Sort } from '@/lib/domain/types';
import { BrandSelector } from './BrandSelector';
export function Filters({ prefs, onChange }: { prefs: Preferences; onChange: (value: Preferences) => void }) {
  return <section className="filters" aria-label="Search filters">
    <div className="filters-title"><SlidersHorizontal size={18} /><span>Make it your stop</span></div>
    <div className="filter-fields">
      <label><span className="field-label">Radius</span><select aria-label="Radius" value={prefs.radius} onChange={e => onChange({ ...prefs, radius: Number(e.target.value) as Radius })}>{[5,10,15].map(r => <option key={r} value={r}>{r} mi</option>)}</select></label>
      <label><span className="field-label">Fuel grade</span><select aria-label="Fuel grade" value={prefs.fuel} onChange={e => onChange({ ...prefs, fuel: e.target.value as FuelGrade })}>{Object.entries(FUELS).map(([value,label]) => <option value={value} key={value}>{label}</option>)}</select></label>
      <BrandSelector selected={prefs.brands} onChange={brands => onChange({ ...prefs, brands })} />
      <label><span className="field-label">Sort by</span><select aria-label="Sort by" value={prefs.sort} onChange={e => onChange({ ...prefs, sort: e.target.value as Sort })}><option value="cheapest">Cheapest</option><option value="nearest">Nearest</option></select></label>
    </div>
  </section>;
}
