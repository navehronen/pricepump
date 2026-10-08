import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Price Pump — Find your better fill-up', description: 'Compare nearby gas prices by fuel grade, brand, and distance. No account required.', icons: { icon: '/favicon.svg' } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
