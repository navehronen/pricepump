# HERE content notices — v1.0.1

Reviewed October 9, 2026 against the official published pages. This documents the scoped implementation review, not a certification of the owner's subscription or legal compliance.

- [Supplier terms](https://legal.here.com/us-en/terms/general-content-supplier-terms-and-notices), effective March 10, 2026: Fuel Prices prohibits aggregate price means and substantially complete bulk retrieval. The opening paragraph requires conspicuous notice of applicable restrictions and supplier credits. PricePump removes its aggregate calculation, summarizes the restrictions in live mode, and links the complete supplier notices. Deliberate, bounded pagination is unchanged.
- [Platform terms](https://legal.here.com/us-en/terms/here-platform-terms), effective September 18, 2023, section 6.2: provide end-user terms, privacy information, and notice of data transmission. Before a live search, PricePump explains the HERE data flow and links the terms and privacy policy beside the search controls; links remain accessible on results. Section 6.4(a)/(m) supports clearly distinguishing HERE station/search data from OpenStreetMap tiles.
- No Fuel Prices-specific logo or named supplier credit was found in the reviewed supplier list. No unrelated HERE map-rendering logo requirement has been applied to OpenStreetMap. Its existing attribution remains intact; the linked supplier page provides applicable location-content notices.

The middle percentile category is now **Typical**. Rank positions, ties, boundaries, colors, individual prices, and API behavior are unchanged. No arithmetic mean of fuel prices is computed. Documentation screenshots use fictional demo stations and have been refreshed.

## Account-specific follow-up

The owner must check the actual subscription/additional terms before declaring full contractual compliance. In particular, Platform section 6.4(l) restricts scaling one request to multiple end users; confirm whether the current five-minute shared cache is permitted by the account's agreement. This scoped notice fix does not change caching or claim that its duration alone establishes permission. HERE can clarify account-specific distribution rights and any additional end-user assent requirements. Keep the repository private pending that review and the patched deployment checks.

## Release handling

Use a follow-up `v1.0.1` commit/tag. Preserve the already-pushed `v1.0.0` tag and history. Old commits retain historical code and screenshots; the current source and screenshots remove the obsolete behavior. Do not force-push or deploy the older release. After pushing the patch, wait for GitHub Actions and Vercel, then check the live summary and notices on desktop and iPhone. No HERE credential or environment change is needed.
