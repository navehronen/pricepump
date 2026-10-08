# Price Pump V1 release checklist

Local live integration and regression QA passed on September 29, 2026. This is a checklist for a controlled public V1 launch, not a claim that deployment is complete.

## 1. Publish source to GitHub

- Create an empty repository under your account. Use `outputs/price-pump` as the repository root (the folder containing `package.json`).
- Keep `.env.local` private. `.env.example` must contain a blank key. Never upload the whole workspace or test traces.
- From the project terminal, run `git check-ignore .env.local` and `git ls-files -- .env.local`: the first should print the filename, and the second should print nothing. These commands do not display the key.
- Stage source with `git add .`, then review `git diff --cached --name-only` before committing. No `.env.local`, `.next`, `node_modules`, `.vercel`, or test report/trace files should appear. Do not use `git add -f` on ignored files.
- Commit, add the remote URL from your new repository, and push `main`. No commit or push has been performed by this QA pass. If Git reports an ownership mismatch, verify you are using your own checkout rather than disabling ownership checks globally.
- Enable GitHub secret scanning/push protection where available. Confirm the included GitHub Actions workflow passes. CI requires no HERE secret and runs in demo mode.
- Add your actual deployment URL to the README after release. Choose a source-code license if you want to explicitly allow others to reuse the code; public visibility alone is not an open-source license.

## 2. Prepare accounts and cost controls

- Local HERE Fuel Prices and geocoding access are confirmed. Check that your subscription permits your intended public display and usage, including any required HERE attribution. Account-specific contractual conditions were not audited.
- Configure HERE usage alerts and any available limits. Observe the API usage dashboard during launch.
- Confirm your Vercel plan is appropriate for the project's intended use. Review the firewall pricing dialog when configuring rate limiting.
- Keep previews in demo mode unless deliberately testing live data. Do not grant a live key to untrusted preview builds or forks.

## 3. Configure Vercel

1. Import the GitHub repository. Choose Next.js and Node.js 24.x. The root must be the directory containing this app's `package.json`; if the repository contains only this app, leave the root at `.`.
2. Install command: `pnpm install --frozen-lockfile`. Build command: `pnpm build`. Keep default Next.js output settings; do not configure a static export.
3. Initially set Production `DATA_PROVIDER=demo`. This lets you establish the project and firewall before exposing paid live endpoints.
4. In **Firewall → Configure → New Rule**, match paths beginning `/api/`. Select **Rate Limit**, **Fixed Window**, **60 seconds**, **30 requests**, counting key **IP**, and the **Default (429)** action. Save, Review Changes, and Publish. Verify blocked traffic in the firewall view. A Log-only action does not enforce the limit.
5. In **Settings → Environment Variables**, privately set Production `DATA_PROVIDER=here` and `HERE_API_KEY` to your real value. Do not create `NEXT_PUBLIC_HERE_API_KEY`. Keep Preview `DATA_PROVIDER=demo` with no HERE credential unless intentionally needed.
6. Redeploy Production after changing environment variables.

[Vercel rate-limiting documentation](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting) confirms fixed windows and IP keys are available across plans. Counters are regional, so even the firewall is not a global HERE-spending cap. The app's own cache/limiter also resets with instances. Distributed quota enforcement is future work.

## 4. Validate the hosted release before announcing it

- On the HTTPS production URL, try a known city, ZIP, and address; inspect grades, directions, and freshness. Use a few searches, not a load test against paid HERE endpoints.
- Test Use My Location success and denial on physical iOS/Safari and Android. Confirm manual recovery works. Local Chromium geolocation simulation does not establish device compatibility.
- Test List/Map, filters, Show More, and a smaller radius. Inspect browser requests: HERE credential-bearing requests must never appear client-side; local filter changes and map movement must not call `/api/stations`.
- Confirm OSM attribution is visible and map tiles load. The public OSM tile service is best-effort; use a suitable tile provider if traffic grows. Comply with its [tile policy](https://operations.osmfoundation.org/policies/tiles/) and do not bulk-prefetch/offline-download tiles.
- Check production logs without adding address, coordinate, key, or upstream-URL logging. Set up error/availability monitoring that respects those boundaries.
- Confirm the WAF rule applies to the production domain and API paths, and watch HERE usage for unexpected increases.
- Record the deployment URL/date and any issues. If live requests fail or usage spikes, switch Production `DATA_PROVIDER` to `demo` and redeploy, or restrict access while investigating. Environment changes require a redeploy.

## Known V1 limits

Prices can be stale or missing, and some provider entries may have no gasoline prices. Cash/credit, membership eligibility, station access restrictions, and precise pump-price accuracy are not guaranteed. Distance is straight-line, including across water or state borders. Prices/rankings describe loaded matching stations, not an exhaustive cheapest-station guarantee. Only eight named brands are selectable; Any Brand includes all provider brands. No accounts, persistent location storage, history, or database exist. Automated accessibility checks do not replace a human screen-reader audit. No load test or physical-device certification has been performed.
