// Local development only. No credentials, request bodies, or child output are logged.
import { spawn } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { createServer } from 'node:net';

const root = fileURLToPath(new URL('../', import.meta.url));
const statePath = join(root, '.local', 'dev-server.json');
const url = 'http://127.0.0.1:3000/';
const action = process.argv[2] ?? 'status';

async function state() {
  try { return JSON.parse(await readFile(statePath, 'utf8')); } catch { return null; }
}
async function health() {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    return response.ok && (await response.text()).includes('Use My Location');
  } catch { return false; }
}
async function portFree() {
  return new Promise(resolve => {
    const server = createServer();
    server.once('error', () => resolve(false));
    server.listen(3000, '127.0.0.1', () => server.close(() => resolve(true)));
  });
}
async function control(current, command) {
  if (!current?.controlPort || !current?.token) return false;
  try {
    const response = await fetch(`http://127.0.0.1:${current.controlPort}/${command}`, {
      method: 'POST', headers: { Authorization: `Bearer ${current.token}` }, signal: AbortSignal.timeout(2000),
    });
    return response.ok;
  } catch { return false; }
}

async function main() {
  const current = await state();
  if (action === 'status') {
    const managed = await control(current, 'status');
    console.log(JSON.stringify({ url, managed, pageHealthy: await health() }));
    return;
  }
  if (action === 'stop') {
    if (await control(current, 'stop')) console.log('Background development server is stopping.');
    else console.log('No managed server responded. No unrelated process was stopped.');
    return;
  }
  if (action !== 'start') throw new Error('Use start, status, or stop.');
  if (await control(current, 'status')) {
    console.log(`Background development server is already running at ${url}`);
    return;
  }
  if (!(await portFree())) throw new Error('Port 3000 is already occupied. No process was stopped.');
  await mkdir(join(root, '.local'), { recursive: true });
  const child = spawn(process.execPath, [join(root, 'scripts', 'dev-supervisor.mjs')], {
    cwd: root, detached: true, stdio: 'ignore', windowsHide: true,
  });
  child.once('error', () => { console.error('Could not launch background server. Run pnpm dev in a terminal.'); process.exitCode = 1; });
  child.unref();
  for (let attempt = 0; attempt < 30; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    if (await control(await state(), 'status')) {
      console.log(`Background Webpack server started at ${url}`);
      console.log((await health()) ? 'Homepage verified: ready.' : 'Server is starting; use pnpm dev:status to check readiness.');
      return;
    }
  }
  throw new Error('Background startup did not complete. Run pnpm dev in a terminal for diagnostics.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
