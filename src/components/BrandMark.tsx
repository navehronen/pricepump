import { Fuel } from 'lucide-react';
export function BrandMark({ compact = false }: { compact?: boolean }) {
  return <span className={`brandmark ${compact ? 'compact' : ''}`}><span className="brand-icon"><Fuel size={23} strokeWidth={2.2} aria-hidden="true" /></span><span>Price<span className="brand-pump">Pump</span><span className="brand-period">.</span></span></span>;
}
