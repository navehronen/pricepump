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
