# HERE content notices — v1.0.1

Reviewed October 9, 2026 against the official published pages. This documents the scoped implementation review, not a certification of the owner's subscription or legal compliance.

- [Supplier terms](https://legal.here.com/us-en/terms/general-content-supplier-terms-and-notices), effective March 10, 2026: Fuel Prices prohibits aggregate price means and substantially complete bulk retrieval. The opening paragraph requires conspicuous notice of applicable restrictions and supplier credits. PricePump removes its aggregate calculation, summarizes the restrictions in live mode, and links the complete supplier notices. Deliberate, bounded pagination is unchanged.
- [Platform terms](https://legal.here.com/us-en/terms/here-platform-terms), effective September 18, 2023, section 6.2: provide end-user terms, privacy information, and notice of data transmission. Before a live search, PricePump explains the HERE data flow and links the terms and privacy policy beside the search controls; links remain accessible on results. Section 6.4(a)/(m) supports clearly distinguishing HERE station/search data from OpenStreetMap tiles.
- No Fuel Prices-specific logo or named supplier credit was found in the reviewed supplier list. No unrelated HERE map-rendering logo requirement has been applied to OpenStreetMap. Its existing attribution remains intact; the linked supplier page provides applicable location-content notices.

The middle percentile category is now **Mid-range**. Rank positions, ties, boundaries, colors, individual prices, and unrelated API behavior are unchanged. No arithmetic mean of fuel prices is computed. Documentation screenshots use fictional demo stations and have been refreshed.

## Live caching policy

Inspection confirmed the former global station cache could serve one HERE request to different users, including concurrent request coalescing. Live mode now bypasses both. Location Services Exhibit 2 section 1.3 ties caching permission to returned headers; this MVP takes the conservative approach of **not caching live responses at all**, even when headers allow it. HERE fetches and API responses use no-store. No user identity or cookies are needed to partition a cache that does not exist.

The browser’s five-minute radius-search cache is also demo-only. Every explicit live radius/location search fetches again. Current-screen results remain in memory for rendering, filtering, sorting, details, map/list switching, and displaying loaded pages; they are replaced on a new search. No results are persisted or shared across browser sessions. Geocoding/reverse lookups remain uncached. Demo caching and rate limits are unchanged.

This resolves the identified shared-cache mechanism without relying on an account-specific caching exception. Other subscription and distribution terms remain the owner’s responsibility; this is not a blanket compliance certification.

## Release handling

Release `v1.0.1` at commit `822e18f` includes the live cache revision and Mid-range wording. The owner confirmed successful final GitHub Actions, Vercel deployment, desktop testing, and physical-iPhone QA on October 10, 2026. The published firewall rule is 15 requests per 60 seconds per IP. Earlier commits and the v1.0.0 tag remain historical records; repository visibility is controlled separately by the owner.
