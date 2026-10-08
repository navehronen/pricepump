import { List, Map } from 'lucide-react';
export function ListMapToggle({ view, onChange }: { view: 'list' | 'map'; onChange: (view: 'list' | 'map') => void }) {
  return <div className="view-toggle" role="group" aria-label="Result view"><button aria-pressed={view === 'list'} onClick={() => onChange('list')}><List size={17} />List</button><button aria-pressed={view === 'map'} onClick={() => onChange('map')}><Map size={17} />Map</button></div>;
}
