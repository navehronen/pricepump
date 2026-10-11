# PricePump release verification

## Current release — v1.0.1

On October 10, 2026, the owner confirmed that v1.0.1 passed final GitHub Actions, Vercel deployment, live desktop testing, and physical-iPhone QA. Production: [pricepump.vercel.app](https://pricepump.vercel.app). Source release: `822e18f`. Device/iOS versions were not supplied; this does not establish broad device certification. The records below describe earlier verification stages and are superseded by this completed-release status where they describe outstanding release steps.

## Final v1.0.1 release preparation — October 10, 2026

- Owner confirmed the existing Vercel PricePump API rate-limit rule is published at **15 requests per 60 seconds per IP**. This pass records that confirmation; it did not independently access the firewall dashboard or repeat a production request burst. The separate application limiter remains 30/minute.
- Final rerun: type checking passed; **62 unit/component/server tests passed**, six paid live tests skipped; **30 browser tests passed** with clean exit; Webpack production build passed. Windows generated-directory permissions required local repair, with no source workaround.
- Verified live requests bypass shared response caching/coalescing, previous live radius searches are not cached, and demo caching remains intact. Mid-range is the displayed middle tier, numerical aggregate prices remain absent, and HERE notices remain present.
- Secret scan: zero exact-key matches across 76 publishable files, 110 existing historical blobs, and 197 generated build/test files. Server-only credential access and no-store headers remain intact; real environment files remain ignored. Staged contents are checked again before commit.
- The local v1.0.1 tag is updated to the final release commit under the owner's release authorization; the prior notice-only commit stays in history and v1.0.0 is unchanged. GitHub remote inspection was unavailable because the sandbox credential helper failed; no push or remote mutation was attempted. Manual push must not use force.
- Subsequently completed: the owner confirmed the v1.0.1 push/CI, Vercel deployment, desktop testing, and physical-iPhone QA passed. Repository visibility is unchanged.


## Live cache revision — October 9, 2026 (historical pre-commit verification)

- Confirmed the old process-global cache reused/coalesced HERE requests across users. Live station requests now bypass that cache; transport and API responses remain no-store. Geocode and reverse routes were already uncached.
- Live browser radius-search caching is disabled. Explicit searches, including returning to a previous radius, fetch fresh data. Only active-screen results remain for local interactions and pagination display. Fictional demo server/browser caching is unchanged.
- Display label changed from Typical to **Mid-range**; tier keys, rank calculations, and colors are unchanged. Numerical aggregate price displays remain absent. Screenshots were regenerated.
- Type checking, 62 unit/component/server tests, and Webpack production build passed. Six paid live tests remain opt-in/skipped. New server tests exercise concurrent different users and sequential same-user calls with absent, no-store, and permissive upstream cache headers; all independently call HERE. Demo caching/coalescing still passes.
- **30 browser tests passed with a clean exit**, including the 29 established demo tests plus one live-mode UI test with all API responses intercepted and no real credential. It verifies fresh radius/repeated searches, active-result local interactions, pagination, and the new label. The test servers on 3100/3101 use demo/here respectively with empty credentials.
- Exact-key scan: zero matches across 76 publishable files, 110 historical Git blobs, and 195 generated build/test files. No real environment or generated artifact paths are publishable; .env.local remains ignored.
- Vercel firewall configuration, app limiter, credentials, dependency versions, and unrelated UI behavior are unchanged. No tag or remote was changed. Hosted deployment and physical-iPhone QA subsequently passed for v1.0.1.


## v1.0.1 supplier-notice patch — October 9, 2026

- Removed the numerical aggregate fuel-price helper, UI prop/memo, display, and obsolete test assertions. Missing-price messaging remains. The middle percentile label is Typical; ranking math and colors are unchanged.
- Added live-mode HERE source attribution, supplier restriction notices, and end-user/privacy links, including a data-transfer notice before search. See [review scope and account-specific follow-up](HERE_NOTICES.md).
- Type checking and the Webpack production build passed. Unit/component/server suite: **58 passed**, with the **6 opt-in paid live tests skipped**. No dependencies changed.
- Browser suite: **29 passed** with a clean runner exit against a separately managed demo server. It covers the existing 29 workflows, including radius sampling, directions, pagination, keyboard focus, accessibility, and phone/desktop bounds. Refreshed app screenshots contain fictional data and no aggregate price display. The historical Apple Maps image is unchanged.
- Additional live-mode UI checks used an empty credential and intercepted API responses at 390×844 and 1440×844: notices/links visible before search and on results, no horizontal overflow, no aggregate price in the summary. No paid HERE requests were made. Visually inspected phone notices and mobile/desktop results.
- Exact-key scan found **zero matches** in publishable files, all existing Git-history blobs, generated build output, and test artifacts. Real environment files remain ignored; HERE credential access remains server-only. Key values and matching lines were never printed.
- The radius browser test now waits for final pagination completion before changing radius. This removes a test race between an in-flight mocked response and the cached-radius assertion; application behavior is unchanged. The initially managed server shutdown stalled on Windows, so final verification uses the existing external-demo-server option.
- Windows sandbox EPERM issues were resolved by using the project-local temporary directory and precreating the required generated build folders; no application workaround was introduced.
- Physical-iPhone success reported by the owner and GitHub CI success for main/v1.0.0 predate this patch. The new tag is v1.0.1; v1.0.0 is preserved. These release checks subsequently passed for v1.0.1, as recorded above. Repository visibility is unchanged.


Live site: [https://pricepump.vercel.app](https://pricepump.vercel.app).

## Hosted and physical-device verification

- GitHub Actions run [37728401108](https://github.com/navehronen/pricepump/actions/runs/37728401108) passed for release candidate `fffbc14e4901cf0104acb14046911d140c160ecd`.
- Hosted demo was verified over public HTTPS, then Production was redeployed with live HERE data. Controlled live checks resolved Irvine, returned 50 stations (46 regular prices), confirmed USD per US gallon, partial pagination, and a cached repeat response. This is a smoke check, not nationwide coverage or a price-accuracy guarantee.
- The owner reported successful manual desktop/mobile tests and final physical-iPhone QA on the live production site. Device model and iOS/browser versions were not supplied. This report distinguishes owner-reported physical testing from automated Chromium checks; it does not claim comprehensive device certification.
- Vercel dashboard inspection confirms Production `DATA_PROVIDER=here` and `HERE_API_KEY` scoped to Production only. Preview `DATA_PROVIDER` is a write-only secret scoped to Preview; the owner explicitly confirmed its value remains `demo`. Its value was not extracted or exposed. No Preview HERE key appears in the project environment inventory.
- The enabled Vercel `PricePump API rate limit` rule matches paths starting `/api/`, with a fixed 60-second window, 30 requests per IP, and HTTP 429. Enforcement was verified in demo mode and again after live deployment using GET probes that cannot invoke HERE or the app's POST-only limiter. API access recovered after the window; the homepage remained available. The final release pass rechecked the enabled configuration without repeating a request burst.

## Final local regression and publication checks

- Type generation and TypeScript passed; **55 unit/server tests passed**, six opt-in paid live checks skipped; **Webpack production build passed**; **29 production Chromium browser tests passed** in 26.3 seconds.
- Tests used demo mode and an empty HERE key. Coverage includes 390/393px phones and desktop, keyboard/dialog accessibility, price tiers, stale/missing prices, radius samples and cached switching, pagination, List/Map, and shared directions destinations.
- Exact-key scan found no matches in 72 tracked files, 81 historical Git blobs, 180 generated build/test files, nine deployed page-linked JS/CSS assets, HTML, or the checked validation response. Earlier controlled successful live API responses also had zero matches. These checks use the locally configured HERE key without printing it; they do not retrieve Vercel's write-only key.
- Source review confirms `server-only` provider imports and server route handlers; no HERE credential is configured as `NEXT_PUBLIC_`. Real `.env.local` remains ignored and untracked; the public `.env` and `.env.local` paths return 404. Ignored environment files intentionally retain the local key and are excluded from publication.
- Final dependency audit reported zero vulnerabilities. Only release documentation changed in this final pass. Existing documentation screenshots were preserved after tests regenerated disposable copies. No application features, design, dependencies, or provider behavior changed.

GitHub visibility remains private. Publication is a separate owner action after the final push. HERE account-specific public-display terms, attribution obligations, and usage alerts must be confirmed by the owner; application tests do not audit those account settings. Remaining MVP limits include regional/process-local abuse controls, partial station coverage, stale/missing prices, straight-line distances, and unverified physical Android/screen-reader/load coverage.

The historical entries below retain their original dates and are superseded by this release status where applicable.

---
# Deployment preparation — October 7, 2026

- Original verified MVP preserved at `b523923eb287362228d7dbb9e0b00ba8afd12c85`, tag `mvp-verified-local`.
- With explicit owner approval, patched Next.js 16.3.6 → 16.3.8 (including its required same-version `@next/env` and platform compiler packages) and source-map-js 1.2.1 → 1.2.2. Reviewed lockfile: no unrelated dependency versions changed. pnpm audit reports **zero vulnerabilities** after these patches.
- Deployment-only settings: Node 24.x, pinned pnpm 11.25.0, explicit Webpack build, generated type checking, ignored next-env.d.ts, and Node setup before pnpm in CI.
- Clean detached checkout from the original commit plus the reviewed release configuration: no copied node_modules, .next, or .env.local. Frozen-lockfile installation completed with pnpm 11.25.0; type generation/TypeScript passed; **55 unit/server tests passed**, six paid live tests skipped; **Webpack production build passed**; **29 Chromium browser tests passed** against that production build in demo mode with an empty HERE key.
- Windows sandbox permissions required a local pnpm store and hoisted install layout, granting generated-output write access, and precreating generated directories. pnpm's automatic dependency reinstallation was disabled only in the test command environment after frozen installation. These are local execution workarounds, not repository or application changes. Linux GitHub Actions with the normal install remains a required external gate.
- Also reran type checking and 55 unit/server tests in the primary checkout after installation.
- Exact-key scan: zero matches in 72 tracked source/documentation/assets and 32 newly built browser assets. Real environment files remain ignored and untracked. No HERE key was copied to the clean checkout.
- Existing screenshot files were preserved; regenerated test captures remain only in the disposable checkout. The Apple Maps screenshot uses a simulated public Irvine origin, as documented below.
- No feature, UI, radius, geolocation, or directions code changed. Hosted checks, firewall enforcement, GitHub CI, and physical-iPhone testing are not established by these local results.

---
# Verification report

## Final Apple Maps handoff — October 7, 2026

This entry supersedes the experimental Apple origin parameters in the earlier follow-up below. The verified radius implementation is unchanged.

Apple's [unified Maps URL documentation](https://developer.apple.com/documentation/mapkit/unified-map-urls) demonstrates current-location directions by omitting source. The documented my-location place identifier is shown for the /place endpoint; it is not documented as a portable way to force the directions origin. The experimental source=Current Location and source-place-id=my-location parameters were removed: on desktop web they merely filled text and did not initiate a route.

The final link uses /directions?destination=<precise latitude,longitude>&mode=driving, with full address as the fallback for invalid/missing coordinates. It leaves Maps responsible for resolving the current origin and permissions. Google Maps URLs are unchanged. The existing directions note now explains that Apple Maps web may need From → My Location and location permission. No extra geolocation request, fabricated origin, Apple credential, or new navigation UI was added.

### Desktop Apple Maps verification

An isolated Chromium context used a **simulated**, public Irvine location (33.6846, -117.8265), not the user's real position. The final destination-only link resolved 33.652328, -117.644861 to **27875 Santa Margarita Pkwy**, the selected Shell station's street address. Initially the From field was blank. Selecting Apple's **My Location** option populated My Location, and Apple calculated three driving routes, approximately 25, 30, and 32 minutes. The resulting Apple-owned URL preserved the precise destination and used the simulated origin coordinates. [Screenshot](screenshots/apple-web-origin.png).

This verifies a usable desktop web route after Apple's own location control is selected. It does **not** establish that every Apple Maps web session auto-populates the origin on arrival; in this test it did not. No documented URL switch was found that reliably forces that web action. Current-location use in native Maps follows Apple's documented handoff, but physical iPhone behavior remains unverified.

### Final regression results

- 55 unit/server tests passed again; six opt-in geographic tests skipped.
- All 29 production Chromium browser tests passed again, including shared Google/Apple destinations, the Apple web fallback note, 390/393px phones and desktop, 5/10/15-mile samples, cached radius switching, Show More, and error recovery.
- TypeScript and the production Webpack build passed. The recurring Windows generated-directory permission issue was resolved by preserving the prior .next output and creating the denied generated directories before rebuilding; no application behavior was changed for it.
- Private key scan found zero matches in publishable source and generated production client assets. .env.local remains Git-ignored.

### Physical iPhone check still required

1. In Safari on the actual iPhone, open PricePump and choose a station with a known address.
2. Tap Apple Maps; confirm it opens native Maps and the destination matches that station's street address/pin.
3. Allow Maps location access if requested. Confirm My Location is the origin and driving route options appear. If a web view opens instead, choose From → My Location.
4. Repeat once from a map pin and once from a list card. Compare the destination in Google Maps. Do not use the manually searched city as a substitute for the phone's current location.



## Radius coverage and Apple origin follow-up — October 7, 2026

This entry supersedes the nearest-first-only initial loading and destination-only Apple URL described below.

- A partial 10/15-mile search now loads the nearest page plus one farthest-first outer-area page (at most 100 raw stations across two requests). The outer request uses a radius 800 meters smaller than the selected radius to account for the rounded center; normal nearest-first pagination retains the original 800-meter-expanded radius so boundary stations are still reachable. Both streams use the same five-minute server cache and 30-request/minute limiter. The outer endpoint only accepts offset zero and a 10/15-mile radius. No automatic sample retry, pan requests, or fuel/brand/sort requests were added.
- Stations are merged by ID and exact-radius filtered in the browser. The initial outer page is a sample, not exhaustive coverage: intermediate stations and the narrow boundary strip remain accessible through Show More. The UI states this explicitly. Recent radius searches are reused in browser memory for five minutes, cleared when the search location changes; no coordinates are written to localStorage. Complete wider searches can still be narrowed locally.
- The map frames the selected radius on explicit radius changes, including shrinking. Ordinary pan/zoom and sorting keep their existing behavior.
- Apple URLs now include source=Current Location and source-place-id=my-location, while retaining the exact unrounded destination coordinates and the address fallback. Google URLs are unchanged. Apple Maps web resolved the test coordinate to **27875 Santa Margarita Pkwy**, matching the station, and populated **Current Location**. Selecting Apple's My Location control did not provide a usable browser location in this embedded environment, so automatic route calculation and native iPhone handoff remain **unverified**, not claimed as passing. The web service controls permission handling and its destination display label; PricePump does not invent an Apple place ID or replace precise coordinates with a station-name search.

### Verified results

- **55 unit/server tests passed**; six opt-in live geographic tests skipped in the ordinary suite.
- **29 production Chromium browser tests passed**, including 390/393px phones and desktop, unchanged Brands/dialog accessibility, Google/Apple coordinate equality, bounded outer sampling, radius switching without repeat network calls, local filtering, pagination beyond 150, deduplication, and failure of the optional outer page retaining nearby results.
- Production Webpack build and TypeScript passed. The browser suite caught an unattached Leaflet-circle bounds error in the new framing code; this was fixed using geographic LatLng bounds before the successful final run.
- Manual live Irvine map checks: 5 miles displayed 50 stations (farthest 3.49 miles); 10 miles displayed 100 with 50 outer samples at **8.36–9.75 miles**; 15 miles displayed 100 with 50 outer samples at **13.05–14.69 miles**. No station outside the selected radius was displayed. Repeating identical nearest pages reused fetchedAt values from cache. These are snapshots, not guarantees of nationwide coverage or price accuracy.

Before declaring the Apple experience complete, verify on an actual iPhone that Maps recognizes the current-location origin, prompts for permission if needed, and computes the route to the chosen station. A web prefilled field and a valid URL are not proof of native routing behavior.



## Mobile fixes and final verification — October 7, 2026

- Existing fixes retained: viewport-clamped Brands menu with a scrollable options area; centered, contained station dialog with internal scrolling; one shared pair of navigation links with no duplicate Directions button.
- Both map services receive the selected station's precise coordinates, with an address fallback when coordinates are invalid. Neither link specifies the user's starting location. Apple Maps web was checked against a live Shell station: its destination displayed 27875 Santa Margarita Pkwy, matching the station at 33.652328, -117.644861. Physical iPhone app handoff remains a manual check.
- There is no 150-station cap in the current application or observed HERE response. HERE returns nearest-first pages of 50, so the first 150 can be identical for 10- and 15-mile searches. Live Irvine probes reported 329 and 543 provider results respectively (including the privacy-rounding radius padding, before exact filtering). The 15-mile application endpoint at offset 350 returned 50 stations approximately 10.7–12.4 miles from the exact search center.
- Normalized pages now preserve provider totals/retrieved counts and distinguish incomplete provider/safety cutoffs. The summary explains nearest-first loading and partial results; Show More continues beyond 150. Existing request caching, rate limiting, and explicit-only pagination remain in place.

### Final checks

- Production build: **passed**, using Next.js Webpack. Windows sandbox EPERM errors affected creation of generated .next folders, not application compilation. Preserved previous generated output in ignored .local, used project-local test temporary files, and granted explicit filesystem access to .next and that temp directory. No runtime configuration or features were changed for this environment issue.
- TypeScript: **passed** again after the production build.
- Unit/server: **54 passed** in the completed fix pass; six opt-in live tests skipped in that ordinary run. This continuation retained those results without repeating completed work.
- Production Chromium browser suite: **28 passed** again, exit code 0. Includes 390×844 and 393×844 phone layouts, 1440×844 desktop, shortened 480px dialogs with internal scrolling, all Brands actions, list/map navigation parity, precise destination URLs, absent duplicate controls, pagination past 150, and honest provider-cutoff messaging. Existing accessibility, keyboard, API-cost, error-state, and privacy regressions also passed.
- Visually reviewed the phone Brands menu and desktop station dialog screenshots. Browser assertions verify dialog/menu viewport bounds at all three sizes. Screenshots: [phone Brands](screenshots/brands-390.png), [phone details](screenshots/station-dialog-390.png), [desktop details](screenshots/station-dialog-1440.png).
- Private credential scan: **zero matches** in 71 publishable files and 32 generated production client assets. .env.local remains ignored and untracked. The credential was not printed or committed.

Remaining manual validation: physical iOS/Safari behavior and opening the native Apple Maps app from an actual phone, including its current-location permission flow. Chromium viewport testing and Apple Maps web destination verification do not prove native-device behavior. No deployment or GitHub publication was performed.


## Final V1 QA — September 29, 2026

**Result:** suitable for a controlled V1 launch after the [release checklist](RELEASE_CHECKLIST.md). No GitHub push or Vercel deployment was performed.

### Live geographic coverage

All six city lookups and fuel searches returned HTTP 200. These are first-page provider counts before the browser applies exact distance and brand filters, not total stations in each city. Counts are a snapshot and will change.

| Search | Loaded stations | Regular prices | Mid-grade prices | Premium prices | Missing regular | Further page |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Seattle, WA | 50 | 47 | 40 | 44 | 3 | Yes |
| Houston, TX | 50 | 46 | 39 | 42 | 4 | Yes |
| Chicago, IL | 50 | 28 | 35 | 35 | 22 | Yes |
| New York, NY | 50 | 35 | 35 | 34 | 15 | Yes |
| Honolulu, HI | 50 | 46 | 37 | 39 | 4 | Yes |
| Lusk, WY | 3 | 2 | 1 | 1 | 1 | No |

The opt-in live suite passed six location tests. It applied the real domain functions to each location's data: all grades, all named brand filters, cheapest/nearest ordering, missing prices last, valid-only rankings, and exact five-mile filtering. Seattle additionally exercised 10/15-mile requests and a second page without duplicate IDs. Lusk verified complete/final-page handling. Repeat identical station requests preserved the cached fetchedAt timestamp. The five urban samples each contained prices older than 48 hours; the rural sample contained missing grades. The application retains and labels these conditions.

### Fixes and regression coverage

- Fixed Show More after a fetched page: it now adds at most 20 displayed matches even when the previous local reveal ended partway through a batch (50 → 70 → 76 instead of 50 → 76).
- Network failures now use the friendly recovery message rather than exposing the browser's `Failed to fetch` text. Intentional aborts remain distinguishable.
- Browser regression tests now use an isolated production demo server on port 3100 with an empty HERE credential, leaving the live server on port 3000 alone. A demo-mode preflight prevents accidental live test traffic. An explicit external-demo-server option handles Windows child-server shutdown limitations; the successful final run used this option.
- Expanded browser coverage for failed-page result retention/retry, offline and 429 errors, geolocation unavailable, manual lookup no-match/failure, tile failure with usable pins, 320px layout, and Apple navigation preference.
- Four initial new assertions matched both Next's route-announcer and the app alert. Scoping assertions to the main content corrected the test ambiguity; final tests pass.

### Final check results

- TypeScript check and optimized Next.js production build: passed.
- Unit/server suite: **45 passed**; six live tests intentionally skipped in ordinary runs.
- Opt-in live suite: **6 passed**.
- Production Chromium browser suite: **22 passed**, clean exit code 0.
- Responsive checks: 320px and 390px phone widths, 1440px desktop, and 200% text; checked screenshots. Keyboard/dialog focus and automated axe scans pass in tested states.
- Dependency audit including development dependencies: **zero known vulnerabilities**.
- Credential scan: actual private key absent from 66 generated client assets and the publishable source inventory. `.env.local` is ignored and untracked. Only aggregate scan results were printed; the key was never output or committed.

Directions checks validate destination-only Google/Apple links and preference ordering; they do not launch physical navigation apps. Browser tests use Chromium, with Apple user-agent simulation only. Full nationwide coverage, load testing, physical iOS/Android, human screen-reader review, hosted HTTPS behavior, Vercel firewall enforcement, and monitoring remain outside locally verified scope. Historical verification entries below retain their original dates and limitations.

## Live integration follow-up — September 29, 2026

Restarted the development server with the user's privately configured `.env.local` in `here` mode. No application code changes were needed.

- HERE geocoding for the public query `Irvine, CA`: HTTP 200, one US result.
- Reverse geocoding: HTTP 200, a location label and USA country code.
- Fuel Prices: HTTP 200 on the first two pages, 50 stations each and 100 distinct station IDs. Continuation offsets were 50 and 100; the entire result set was not exhausted.
- Across those pages, 87 stations had regular prices, 82 mid-grade, and 84 premium. All 253 normalized prices were positive USD-per-US-gallon values with parseable update timestamps. 21 price records were older than 24 hours, confirming freshness cannot be assumed from a successful live request.
- An identical station request reused the cached fetchedAt value.
- The browser rendered real station results, partial-result messaging, and stale-price warnings after manual lookup. Saved preferences were respected.
- The actual credential was absent from the tested API responses and all 66 generated client assets scanned. `.env.local` remained Git-ignored. The credential was never printed or committed.

These checks verify the current account's access and the integration for one US area; they do not prove nationwide completeness, exact pump-price accuracy, last-page behavior, or public deployment readiness. Vercel deployment/firewall configuration and physical-device checks remain outstanding. The earlier demo-only report below is retained as historical verification evidence.

Verified locally on September 28, 2026, using Windows, Node.js 24, and Chromium. The application ran in explicit **demo mode**. No real HERE credential was supplied, no live price request was made, and no public deployment was created.

## Final results

| Check | Result |
| --- | --- |
| TypeScript (`pnpm typecheck`) | Passed |
| Unit/server tests (`pnpm test`) | 45 passed across 3 files |
| Production build (`pnpm build`) | Passed; all three API routes build as server endpoints |
| Browser suite against the production server | 15 passed |
| Dependency audit, including development dependencies | Zero known vulnerabilities reported |
| Automated axe accessibility scans | Zero detected violations in tested home, results, brand selector, details, map and popup states |
| Responsive layout | Checked at 390 × 844 and 1440 × 1000; enlarged text checked at 200% |
| Public-repository checks | Passed the checks described below |

The final browser run used `next start`, not just the development server. Browser tests combine the actual demo API with controlled response fixtures for error and edge cases. Test commands and installation instructions are in the README. The checked-in lockfile pins the tested dependency resolution.

## Behaviors exercised

- Submitted manual location lookup, ambiguous results chooser, and initial 20 cards.
- Browser geolocation success, permission denial, timeout, manual recovery, rounded request coordinates, and no location persistence.
- Radius, fuel, multi-brand filtering, Any Brand, Select All, Clear, cheapest/nearest sorting, and preference restoration.
- Cached Show More and one-page-at-a-time provider pagination. Request counts verify that local filters, sorting, cached card reveals, details, view changes, and map movement do not request new prices.
- Price percentile boundaries, ties, single/all-equal sets, invalid/missing prices, freshness boundaries, distance, supported HERE normalization, USD/liter conversion, null fields, and unsupported units/currencies.
- API input limits, origin checks, safe errors, timeouts, caching/expiry, simultaneous request deduplication, and rate limiting.
- No matching results, API failures, retained results, missing prices last, and visible stale-price warnings.
- Station details, both navigation choices, keyboard dialog focus, Escape dismissal, and focus restoration from both cards and map previews.
- Leaflet markers/popups, neutral missing-price pins, OpenStreetMap attribution, and responsive map layout. OSM tiles loaded in the final screenshot run; tile availability remains an external dependency.

## Issues corrected during verification

- Increased insufficient contrast on unavailable-price map pins.
- Preserved valid prices when HERE supplies null update timestamps; guarded provider dictionaries against inherited property names.
- Corrected same-origin validation for the deployed request host versus an internal Next.js URL.
- Fixed mobile text overflow at enlarged font sizes and a hidden line break joining two words.
- Explicitly restored map-preview button focus after closing station details.
- Updated Vitest to 4.1.11 after the full dependency audit identified a moderate development dependency advisory. The subsequent full audit reported zero known vulnerabilities.

## Secret and repository safety

- HERE modules are marked server-only; no public environment variable carries the credential.
- Built with a fake credential sentinel and scanned generated `.next/static` client assets: the sentinel was absent.
- Verified `.env`, `.env.local`, `.env.production`, generated builds, dependencies, test traces/reports, and Vercel files are ignored. `.env.example` is intentionally included and its HERE key is blank.
- Inspected publishable file names and scanned source for common private-key/token patterns; no real credential was found. No credential was provided during implementation.
- Served endpoint checks confirm environment files return 404, unsupported methods return 405, cross-site requests are blocked, and API responses use no-store.
- A local Git repository exists on `main`. No commit, remote repository, push, or deployment was performed. Inspect staged files before your first public push; a pattern scan cannot guarantee detection of every possible secret.

## Remaining external verification

1. Obtain HERE Fuel Prices entitlement and privately configure `HERE_API_KEY` with `DATA_PROVIDER=here`. Verify live US coverage, actual pagination, fuel identifiers, units, and timestamps against your account. Contract fixtures are not live integration proof.
2. Configure the Vercel environment and `/api/*` firewall rule described in the README, deploy, and repeat HTTPS geolocation/manual-search smoke tests. Local process limits are not a distributed spending cap.
3. Test physical iOS/Safari and Android devices. The current phone checks emulate dimensions and browser location in Chromium; they do not establish native mobile browser compatibility.
4. Perform a human screen-reader accessibility review before making a comprehensive WCAG conformance claim. Automated scans and keyboard tests cover important regressions but cannot prove full accessibility.

## Screenshots

All screenshots show fictional demo stations and prices.

- [Mobile welcome](screenshots/mobile-home.png)
- [Mobile results](screenshots/mobile-results.png)
- [Desktop results](screenshots/desktop-results.png)
- [Mobile map](screenshots/mobile-map.png)

The source is ready for a portfolio/demo deployment. Live service readiness remains conditional on the external checks above.
