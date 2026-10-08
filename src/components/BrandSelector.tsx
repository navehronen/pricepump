'use client';
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { BRANDS, type Brand } from '@/lib/domain/types';
export function BrandSelector({ selected, onChange }: { selected: Brand[]; onChange: (brands: Brand[]) => void }) {
  const [open, setOpen] = useState(false), ref = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<CSSProperties>({ left: 16, top: 16 });
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      if (!trigger.current || !menu.current) return;
      const viewport = window.visualViewport;
      const width = viewport?.width ?? window.innerWidth, height = viewport?.height ?? window.innerHeight;
      const x = viewport?.offsetLeft ?? 0, y = viewport?.offsetTop ?? 0;
      const anchor = trigger.current.getBoundingClientRect();
      const panelWidth = Math.min(Math.max(240, anchor.width), width - 32);
      const panelHeight = Math.min(menu.current.scrollHeight, height - 32);
      setPosition({ width: panelWidth, maxHeight: height - 32, left: Math.max(x + 16, Math.min(anchor.right - panelWidth, x + width - panelWidth - 16)), top: Math.max(y + 16, Math.min(anchor.bottom + 8, y + height - panelHeight - 16)) });
    };
    place();
    window.addEventListener('resize', place); window.addEventListener('scroll', place, true);
    window.visualViewport?.addEventListener('resize', place);
    window.visualViewport?.addEventListener('scroll', place);
    return () => {
      window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true);
      window.visualViewport?.removeEventListener('resize', place);
      window.visualViewport?.removeEventListener('scroll', place);
    };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);
  return <div ref={ref} className="brand-selector" onKeyDown={e => { if (e.key === 'Escape') { setOpen(false); trigger.current?.focus(); } }}>
    <span className="field-label" id="brand-label">Brands</span>
    <button ref={trigger} className={`filter-button ${open ? 'active' : ''}`} aria-labelledby="brand-label brand-value" aria-expanded={open} aria-controls="brand-options" onClick={() => setOpen(!open)}><span id="brand-value">{selected.length ? selected.length === 1 ? selected[0] : `${selected.length} Brands` : 'Any Brand'}</span><ChevronDown size={16} /></button>
    {open && <div ref={menu} style={position} className="brand-menu" id="brand-options" role="group" aria-label="Choose station brands">
      <div className="brand-options-list">
      <label className="brand-option"><input type="checkbox" checked={!selected.length} onChange={() => onChange([])} /><span>Any Brand</span>{!selected.length && <Check size={16} />}</label>
      <div className="menu-rule" />
      {BRANDS.map(brand => <label key={brand} className="brand-option"><input type="checkbox" checked={selected.includes(brand)} onChange={() => onChange(selected.includes(brand) ? selected.filter(b => b !== brand) : [...selected, brand])} /><span>{brand}</span></label>)}
      </div>
      <div className="brand-actions"><button onClick={() => onChange([...BRANDS])}>Select All</button><button onClick={() => onChange([])}>Clear</button><button onClick={() => { setOpen(false); trigger.current?.focus(); }}>Done</button></div>
    </div>}
  </div>;
}
