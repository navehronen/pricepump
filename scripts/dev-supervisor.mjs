// A detached local supervisor keeps Next independent of the launching terminal.
// Child output is discarded so keys/upstream URLs cannot enter diagnostic logs.
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { mkdir, writeFile, unlink, appendFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const statePath = join(root, '.local', 'dev-server.json');
const token = randomBytes(32).toString('hex');
let child, stopping = false, restarts = 0, retry;
const record = (event, details = {}) => appendFile(join(root, '.local', 'dev-events.jsonl'), JSON.stringify({ at: new Date().toISOString(), event, ...details }) + '\n').catch(() => {});
const env = { ...process.env };
// Let Next read this project's .env.local rather than inherit a test-mode override.
delete env.HERE_API_KEY;
delete env.DATA_PROVIDER;
delete env.NODE_ENV;
const control = createServer((request, response) => {
  if (request.method !== 'POST' || request.headers.authorization !== `Bearer ${token}`) {
    response.writeHead(403).end(); return;
  }
  if (request.url === '/status') { response.writeHead(200).end('running'); return; }
  if (request.url === '/stop') { response.writeHead(200).end('stopping'); void stop(); return; }
  response.writeHead(404).end();
});
async function stop() {
  if (stopping) return;
  stopping = true;
  await record('supervisor-stopping');
  clearTimeout(retry);
  // Next's CLI owns its worker and terminates it when the parent exits.
  child?.kill();
  control.close();
  await unlink(statePath).catch(() => {});
  setTimeout(() => process.exit(0), 2000).unref();
}
function launch() {
  child = spawn(process.execPath, [join(root, 'node_modules/next/dist/bin/next'), 'dev', '--webpack', '--hostname', '127.0.0.1', '--port', '3000'], {
    cwd: root, env, stdio: 'ignore', windowsHide: true,
  });
  const ended = (code, signal) => {
    void record('next-exited', { code, signal });
    if (stopping) return;
    // Bounded recovery: do not create an unlimited crash/restart loop.
    if (++restarts > 3) { void stop(); return; }
    void record('restart-scheduled', { attempt: restarts });
    retry = setTimeout(launch, 5000);
  };
  child.once('error', () => { void stop(); });
  child.once('exit', ended);
}
process.on('SIGINT', () => { void stop(); });
process.on('SIGTERM', () => { void stop(); });
control.listen(0, '127.0.0.1', async () => {
  try {
    await mkdir(join(root, '.local'), { recursive: true });
    await writeFile(statePath, JSON.stringify({ pid: process.pid, controlPort: control.address().port, token }), { mode: 0o600 });
    await record('supervisor-started', { pid: process.pid });
    launch();
  } catch { await stop(); }
});
