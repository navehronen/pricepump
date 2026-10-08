import PricePumpApp from '@/components/PricePumpApp';
import { providerMode } from '@/lib/providers';
export const dynamic = 'force-dynamic';
export default function Home() { return <PricePumpApp mode={providerMode()} />; }
