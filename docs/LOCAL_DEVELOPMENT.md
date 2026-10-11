# Keeping the local preview available

The development URL is http://127.0.0.1:3000/. A browser tab does not host the app: a Node server must stay running while you test it.

## Stable startup

From this project's directory in your own PowerShell terminal:

```powershell
pnpm dev
```

Keep that terminal open. This command now explicitly uses **Webpack**, binds only to your computer, and fixes the port at **3000**. It does not alter production builds. `.env.local` is loaded privately by Next.js as before.

Optional background operation from your own terminal:

```powershell
pnpm dev:background
pnpm dev:status
pnpm dev:stop
```

The local supervisor can restart a terminated Next process up to three times, five seconds apart. It does not refresh prices or make HERE calls. It does not restart after reboot and cannot survive an operating-system or parent-environment action that terminates the entire process tree. It does not poll or restart a server merely because a request returns an error.

The background launcher checks port availability and will not kill an unrelated process. Stop/status use a random local control token, not a PID-only kill. State and lifecycle metadata are stored in Git-ignored `.local/`. No child output, API key, request addresses, or credential-bearing URLs are logged. For compiler diagnostics, stop the supervisor and use `pnpm dev` interactively. Do not share environment files.

## Physical iPhone testing over Wi-Fi

For physical-device testing on the same Wi-Fi, stop the existing server first, then run in your own PowerShell terminal:

```powershell
pnpm dev:stop
$env:PRICE_PUMP_DEV_HOST = '172.16.137.32' # Replace with your current Wi-Fi IPv4 address from ipconfig.
pnpm exec next dev --webpack --hostname 0.0.0.0 --port 3000
```

Keep the terminal open and visit `http://172.16.137.32:3000` on your phone (substitute the current address if it changes). The optional hostname setting permits Next.js development assets for that exact host. HTTP on a LAN IP is not a secure context, so browser geolocation requires HTTPS; use manual location search for this local test. This does not change production behavior or the HERE credential.

## Investigation on October 6, 2026


- The prior tool terminal session was absent, there was no visible Node server process, and the local request returned ECONNREFUSED. No retained log established the exact cause of that earlier process termination.
- A previous Turbopack failure involved CSS processing and a worker process exiting before connecting. Webpack avoids that observed development compiler failure. The old `pnpm dev` command still selected Turbopack, so the earlier workaround was not repeatable by default; it now is.
- In this restricted execution environment, both Node detached launch and hidden Windows Start-Process launch disappeared after the launching command completed. A supervisor kept in an active tool session responded successfully across separate commands. This is evidence of a process-lifetime/environment issue in addition to the earlier compiler issue; it is not proof of an app feature defect.
- Background lifetime outside that environment has not been verified. If the tool-managed server disappears again, run `pnpm dev` in your own persistent terminal. Do not rely on a chat-managed process as permanent hosting.
- Managed stop was tested: it closed port 3000, and restart served the homepage again. App features/UI were not modified.

For future diagnosis, `.local/dev-events.jsonl` records supervisor starts, Next exit codes/signals, and bounded restart attempts only. Sudden disappearance without an exit record may indicate termination of the whole process tree. Never print `.local/dev-server.json` publicly: it contains the local management token (not the HERE key).


## Environment setup

## Environment variables and your HERE key

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATA_PROVIDER` | `demo` | Set to `here` for live data; no automatic fallback. |
| `HERE_API_KEY` | Empty | Your server-side HERE API key. Required only in live mode. |

**You personally add the key in `.env.local`, next to `package.json`.** Do not put it in a component, README, screenshot, chat message, or GitHub file. Never rename it to `NEXT_PUBLIC_HERE_API_KEY`.

1. Sign in to the [HERE platform](https://platform.here.com/).
2. Register an application in Access Manager and create an API key using the [official setup instructions](https://docs.here.com/fuel-prices/docs/get-started).
3. Verify your account/app is entitled to **Fuel Prices** and **Geocoding & Search**, including US coverage. A valid general HERE key does not by itself prove Fuel Prices access.
4. In your ignored `.env.local`, set:

   ```dotenv
   DATA_PROVIDER=here
   HERE_API_KEY=replace_with_your_actual_key_locally
   ```

5. Restart the development server. Search a known US ZIP code. Confirm station prices, grade mappings, update timestamps, and coverage against your entitled HERE response.
6. If live calls fail, the app displays a safe error. Check service entitlement, credentials, billing, and coverage in HERE; the app deliberately does not print raw request URLs or provider responses into logs.

Only `demo` and `here` are supported modes; an unset mode selects demo. No key is required for builds or automated tests.


## Test and verify

For local preview restarts and persistent manual testing, see the local preview instructions above. `pnpm dev` uses Webpack on port 3000; optional background start/status/stop commands are documented there.

```bash
pnpm typecheck
pnpm test
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```

The browser suite starts the production build in demo mode on `127.0.0.1:3100` and HERE UI mode on `127.0.0.1:3101`, both with empty HERE keys. All HERE UI test API calls are intercepted with fixtures. It never automatically reuses the live development server on port 3000. Build first. A preflight check rejects a live-mode test server before searches. Screenshots are generated in `docs/screenshots`. CI runs checks on pull requests and pushes. Controlled fixtures test failures without spending HERE credits; actual demo endpoints are also tested.

On Windows environments where Playwright hangs during child-server shutdown, use two separate terminals: start the demo server on port 3100 with `DATA_PROVIDER=demo`, and the HERE UI fixture server on port 3101 with `DATA_PROVIDER=here`. Set `HERE_API_KEY` to an empty string in both terminal environments, then run `pnpm exec next start --hostname 127.0.0.1 --port 3100` or `3101`, respectively. In the test terminal set `$env:PRICE_PUMP_EXTERNAL_DEMO_SERVER='1'` before `pnpm test:e2e`. The HERE UI suite intercepts all API calls. Stop both dedicated servers afterward; CI manages them automatically.

Live coverage checks are deliberately skipped by default. With a live server on port 3000, opt in using `$env:PRICE_PUMP_LIVE_QA='1'` and `pnpm exec vitest run tests/live-qa.test.ts --configLoader runner`. This makes up to 21 local API requests (live responses are not cached). Remove that environment variable afterward. Live results can change; this suite is not part of CI.

See [verification notes](VERIFICATION.md) for the checks actually run and their limitations.
