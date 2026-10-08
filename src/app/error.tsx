'use client';
export default function ErrorPage({ reset }: { reset: () => void }) { return <main className="main-shell empty-state"><h1>We hit a bump in the road.</h1><p>Please try loading Price Pump again.</p><button className="button primary" onClick={reset}>Try again</button></main>; }
