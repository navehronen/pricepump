export function freshness(timestamp: string | null | undefined, now = Date.now()) {
  const updated = timestamp ? Date.parse(timestamp) : NaN;
  if (!Number.isFinite(updated) || updated > now + 5 * 60_000) return { label: 'Update time unavailable', warning: null, level: 'unknown' } as const;
  const age = Math.max(0, now - updated), minutes = Math.floor(age / 60_000);
  const days = Math.floor(minutes / 1440);
  const label = minutes < 1 ? 'Updated just now' : minutes < 60 ? `Updated ${minutes} min ago` : minutes < 1440 ? `Updated ${Math.floor(minutes / 60)} hr ago` : `Updated ${days} ${days === 1 ? 'day' : 'days'} ago`;
  if (age > 48 * 3_600_000) return { label, warning: 'Price is over 2 days old', level: 'old' } as const;
  if (age > 24 * 3_600_000) return { label, warning: 'Price may be outdated', level: 'stale' } as const;
  return { label, warning: null, level: 'fresh' } as const;
}
