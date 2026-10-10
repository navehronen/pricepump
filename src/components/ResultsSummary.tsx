export function ResultsSummary({ count, hasPrices, complete, radius, total, retrievedCount, limitReason, outerStatus = 'none' }: { count: number; hasPrices: boolean; complete: boolean; radius?: number; total?: number; retrievedCount?: number; limitReason?: 'provider' | 'safety'; outerStatus?: 'none' | 'loaded' | 'failed' }) {
  const detail = limitReason
    ? limitReason === 'provider' ? 'The provider ended pagination before returning all results. Try a more specific location.' : 'The search reached its safety limit. Try a more specific location.'
    : outerStatus === 'loaded'
      ? `Searching within ${radius} miles. Nearby stations and an outer-area sample are shown; coverage is partial. Show More fills in remaining stations.`
      : outerStatus === 'failed'
        ? `Searching within ${radius} miles. The outer-area sample could not load. Nearby results are shown; use Show More to reach farther stations.`
        : `Searching within ${radius} miles. Nearby stations load first; use Show More to reach farther stations.`;
  return <div className="results-summary" aria-live="polite"><p><strong>{count} stations {complete ? 'found' : 'loaded'}</strong>{!hasPrices && <><span className="summary-dot">·</span>No prices available</>}</p><span className="summary-note">{complete ? 'Prices compared across matching stations.' : 'Prices and rankings reflect loaded stations. More may be available.'}</span>{!complete && <span className="summary-note">{detail}{total !== undefined && retrievedCount !== undefined && (outerStatus === 'loaded' ? ` Provider reports ${total} nearby results before exact-radius and brand filtering.` : ` ${retrievedCount} of ${total} nearby results retrieved before exact-radius and brand filtering.`)}</span>}</div>;
}
