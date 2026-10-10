# Understanding Price Pump

## What happens when you search

1. You press **Use My Location**. The browser asks permission and returns coordinates. Alternatively, you submit text and HERE translates it into coordinates.
2. The browser keeps the precise search point in memory, rounds a copy, and sends that approximate point to your own Next.js server endpoint.
3. The server validates the request, checks its rate limiter, then checks a five-minute cache. If necessary, it calls HERE using the private environment key.
4. The HERE adapter translates raw data into Price Pump's `Station` type. Think of it as a translator: every component receives the same familiar vocabulary even if the provider changes later.
5. The browser computes straight-line distances from the precise point, excludes stations outside your chosen radius, filters brands, ranks prices, and renders cards or map pins.

Manual address lookup is the exception to “precise coordinates stay in the browser”: the server transiently processes the entered address and HERE's precise geocoding response to fulfill that lookup. Neither is saved by application code.

## Why there is a server without a database

The server's job is to protect the API key, validate requests, and reduce repeated paid calls. It does not need to remember users. A database stores durable records; this product doesn't need durable records for V1. Short-lived memory caches are temporary optimization, not durable user storage.

The absence of a database is a scope decision, not an assertion that databases are bad. Accounts, notifications, and price histories would justify durable storage later.

## The files to learn first

| File or folder | What to look for |
| --- | --- |
| `src/components/PricePumpApp.tsx` | Search lifecycle, selected filters, visible result batches, and stale-request cancellation |
| `src/components/LocationSearch.tsx` | Permission flow and submitted address lookup |
| `src/lib/domain/types.ts` | The internal data contract; UI components depend on this, not HERE JSON |
| `src/lib/providers/here.ts` | Private network requests to HERE |
| `src/lib/providers/normalize.ts` | Fuel IDs, units, brands, missing data, and timestamps |
| `src/lib/domain/stations.ts` | Distances, sorting, filtering and price tiers |
| `src/lib/server` | Cache, rate limiter, request validation, and safe errors |
| `src/components/StationMap.tsx` | Leaflet display, safe popup content, and map lifecycle |
| `tests` | Examples that specify expected behavior and protect changes |

## Price rankings in plain English

“Cheap” depends on the area. A $4.50 price might be low in one city and high in another, so hard-coding dollar thresholds would mislead people.

Price Pump compares each valid selected-grade price with the other currently loaded matching prices. Roughly the bottom quarter are Low, the middle half Typical, the next 15% High, and the top 10% Very High. Equal prices receive the same classification. If every price is equal, they are all Typical. Missing prices receive no tier and come last.

For example, with 100 distinct prices, 25 are Low, 50 Typical, 15 High, and 10 Very High. With two identical prices, both are Typical. Ties and very small groups make exact percentages impossible, which is why the algorithm prioritizes consistent treatment rather than perfect quotas.

Loading more stations can change a station's tier without its price changing. The comparison set changed. The interface explicitly explains this limitation.

## How costs are controlled

Caching means “we just answered this nearby search—reuse it briefly.” Rate limiting means “this caller is asking too often—wait a minute.” They solve different problems.

Fuel and brand filters, sorting, details, and map/list changes use data already in the browser. The first 50-provider-result page can serve several 20-card display batches. Partial 10/15-mile searches also request one outer-area sample page, so the map visibly covers the wider area without downloading every nearby station. This is capped at two initial requests, both cached and rate-limited. Further nearest-first pages require an explicit Show More click. No polling or map-pan fuel requests occur.

The memory limiter isn't sufficient for a large distributed deployment because different server instances have different memory. The Vercel Firewall rule adds platform-level protection. Even that is not an absolute provider spending cap; distributed abuse and provider terms still matter. These are honest MVP limits to discuss in an interview.

## Location, map, and localStorage

- Browser location works on localhost and HTTPS, after permission. Denial isn't a dead end: manual search remains available.
- A 0.01-degree area grid improves cache reuse and avoids sending the exact device coordinates. Adding 800 meters to the provider radius prevents losing stations near the rounding boundary. Exact filtering happens locally.
- Leaflet places pins on OpenStreetMap tiles. It doesn't discover station prices. Moving the map requests map images as needed, not HERE fuel data.
- Navigation links carry a destination only. The chosen maps app handles routes and the starting point.
- localStorage remembers only radius, grade, brands, and sorting on that device. It is not an account, cloud sync, or location history. A blocked storage API doesn't break searching.

## Run and deploy

Use Node 24.x and pnpm 11.25.0. `pnpm typecheck` generates Next.js types before checking TypeScript; `pnpm build` explicitly uses Webpack. For local demo use: `pnpm install --frozen-lockfile`, copy `.env.example` to `.env.local`, then `pnpm dev`. For a production build: `pnpm build` and `pnpm start`.

To enable HERE, put the key in the ignored `.env.local`, set `DATA_PROVIDER=here`, and restart. To deploy, follow the README: start with demo mode, enable Corepack for pinned pnpm, publish and verify the firewall rule, then privately enter the HERE key for Production only. Preview builds stay in demo mode without a key. Vercel needs a redeployment after environment changes. See the README for exact steps and the firewall configuration.

## Interview talking points

Describe what you actually did and understand; do not claim unverified production scale or independent authorship of generated code.

An honest opening:

> I defined the product requirements and used an AI coding assistant to implement Price Pump. I learned to structure the provider boundary, compare prices fairly, protect credentials, and test edge cases. I can explain the architecture and the tradeoffs we chose.

Useful questions to prepare for:

- **Why an adapter?** To keep HERE-specific response details out of the UI and make replacement providers manageable.
- **Why no database?** V1 has no durable user records; it needs transient search data and device preferences only.
- **Why not just sort by price?** Missing data, ties, stale timestamps, selected grades, and incomplete provider pagination require explicit rules.
- **Why are prices not always current?** Provider timestamps describe upstream observations. The app makes uncertainty visible instead of hiding old prices.
- **What was a concrete bug caught during testing?** Next.js's internal hostname differed from the browser-facing host, so an origin check initially rejected valid local requests. Comparing Origin with the HTTP Host fixed it; a regression test protects that boundary.
- **What else did testing improve?** Enlarged text exposed a mobile header overflow; the layout now wraps and reflows at 200% text size.
- **What would you improve before scale?** Shared abuse controls, usage monitoring, live provider validation, broader device QA, and a suitable map-tile service.
- **What product tradeoff did you make?** Progressive loading reduces paid calls, but Cheapest ranks the loaded subset until the search is complete. The summary says this explicitly.

Avoid claiming live data verification, actual savings, adoption, production uptime, or recruiter/customer outcomes until you have measured them.
