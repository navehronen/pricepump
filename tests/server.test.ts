import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { ExpiringCache } from '@/lib/server/cache';
import { RateLimiter } from '@/lib/server/limiter';
import { endpoint, searchHandler, searchSchema, geocodeSchema } from '@/lib/server/api';
import { hereProvider, hereRequest } from '@/lib/providers/here';
import { demoProvider } from '@/lib/providers/demo';
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
describe('provider-specific response reuse', () => {
  const request = (client: string) => new Request('https://pricepump.example/api/stations', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-vercel-forwarded-for': client },
    body: JSON.stringify({ center: { lat: 33.68, lng: -117.83 }, radius: 5, offset: 0 }),
  });
  it.each([undefined, 'no-store', 'public, max-age=300'])('never caches or coalesces HERE searches, even with upstream %s', async header => {
    vi.stubEnv('DATA_PROVIDER', 'here'); vi.stubEnv('HERE_API_KEY', 'unit-test-placeholder'); vi.stubEnv('VERCEL', '1');
    const fetcher = vi.fn(async () => Response.json({ stations: [], total: 0 }, { headers: header ? { 'Cache-Control': header } : {} }));
    vi.stubGlobal('fetch', fetcher);
    const results = await Promise.all([searchHandler(request('198.51.100.10')), searchHandler(request('198.51.100.11'))]);
    results.push(await searchHandler(request('198.51.100.10')));
    expect(fetcher).toHaveBeenCalledTimes(3);
    for (const result of results) { expect(result.status).toBe(200); expect(result.headers.get('cache-control')).toBe('no-store'); }
    for (const call of fetcher.mock.calls) expect((call as unknown as [URL, RequestInit])[1].cache).toBe('no-store');
  });
  it('still caches and coalesces demo searches', async () => {
    vi.stubEnv('DATA_PROVIDER', 'demo'); vi.stubEnv('VERCEL', '1');
    const search = vi.spyOn(demoProvider, 'search');
    const results = await Promise.all([searchHandler(request('198.51.100.20')), searchHandler(request('198.51.100.21'))]);
    results.push(await searchHandler(request('198.51.100.20')));
    expect(search).toHaveBeenCalledTimes(1);
    for (const result of results) expect(result.status).toBe(200);
  });
});
describe('short-term cache', () => {
  it('coalesces concurrent requests, caches successes, and expires entries', async () => {
    let now = 0; const cache = new ExpiringCache<number>(300_000,2,() => now), load = vi.fn(async () => 42);
    expect(await Promise.all([cache.get('a',load),cache.get('a',load)])).toEqual([42,42]); expect(load).toHaveBeenCalledTimes(1);
    await cache.get('a',load); expect(load).toHaveBeenCalledTimes(1);
    now = 300_001; await cache.get('a',load); expect(load).toHaveBeenCalledTimes(2);
  });
  it('does not cache failures and bounds retained entries', async () => {
    const cache = new ExpiringCache<number>(300_000,1), load = vi.fn(async () => 1);
    await expect(cache.get('a',async () => { throw new Error('failure'); })).rejects.toThrow();
    await cache.get('a',load); await cache.get('b',load); await cache.get('a',load); expect(load).toHaveBeenCalledTimes(3);
  });
});
describe('rate limiting', () => {
  it('blocks the 31st call and resets at the window boundary', () => {
    let now = 0; const limiter = new RateLimiter(30,60_000,100,() => now);
    for (let i=0;i<30;i++) expect(limiter.check('client').allowed).toBe(true);
    expect(limiter.check('client')).toEqual({allowed:false,retryAfter:60}); expect(limiter.check('other').allowed).toBe(true);
    now=60_000; expect(limiter.check('client').allowed).toBe(true);
  });
  it('fails closed when identifier capacity is reached', () => { const limiter = new RateLimiter(30,60_000,1); limiter.check('a'); expect(limiter.check('b').allowed).toBe(false); });
});
describe('API boundary', () => {
  const request = (body: unknown, headers?: Record<string,string>) => new Request('http://localhost/api/test',{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
  it('rejects invalid radii, coordinates, and arbitrary page offsets', () => {
    expect(searchSchema.safeParse({center:{lat:34,lng:-118},radius:5,offset:0}).success).toBe(true);
    for (const input of [{center:{lat:100,lng:0},radius:5},{center:{lat:0,lng:0},radius:100},{center:{lat:0,lng:0},radius:5,offset:10001}]) expect(searchSchema.safeParse(input).success).toBe(false);
  });
  it('bounds manual location text', () => { expect(geocodeSchema.safeParse({query:'a'}).success).toBe(false); expect(geocodeSchema.safeParse({query:'a'.repeat(201)}).success).toBe(false); });
  it('rejects bad JSON, oversized bodies, and cross-site requests before the provider', async () => {
    const handler = vi.fn(async () => ({})), route = endpoint(z.object({query:z.string()}),handler);
    expect((await route(request({query:'x'.repeat(2050)}))).status).toBe(400);
    expect((await route(new Request('http://localhost/api/test',{method:'POST',headers:{'content-type':'application/json'},body:'{'}))).status).toBe(400);
    expect((await route(request({query:'ok'},{origin:'https://evil.example'}))).status).toBe(403);
    expect(handler).not.toHaveBeenCalled();
  });
  it('sanitizes provider failures and marks responses no-store', async () => {
    const result = await endpoint(z.object({}),async () => { throw new Error('private provider credential'); })(request({}));
    expect(result.status).toBe(503); expect(await result.text()).not.toContain('credential'); expect(result.headers.get('cache-control')).toBe('no-store');
  });
  it('accepts the public HTTP Host when Next uses a different internal hostname', async () => {
    const route = endpoint(z.object({}),async () => ({ok:true}));
    const result = await route(request({}, {origin:'http://127.0.0.1:3000',host:'127.0.0.1:3000'}));
    expect(result.status).toBe(200);
  });
});
describe('HERE transport', () => {
  it('bounds wider-radius outer sampling to one inward-padded farthest-first page', async () => {
    vi.stubEnv('HERE_API_KEY','unit-test-placeholder');
    const fetcher=vi.fn(async () => Response.json({stations:[],total:0})); vi.stubGlobal('fetch',fetcher);
    for (const radius of [10,15] as const) await hereProvider.search({center:{lat:33.68,lng:-117.83},radius,offset:0,outer:true});
    const urls=fetcher.mock.calls.map(call=>new URL((call as unknown as [URL])[0]));
    expect(urls.map(u=>u.searchParams.get('in'))).toEqual(['circle:33.68,-117.83;r=15294','circle:33.68,-117.83;r=23341']);
    for(const url of urls) { expect(url.searchParams.get('sort')).toBe('distance:desc'); expect(url.searchParams.get('limit')).toBe('50'); expect(url.searchParams.get('offset')).toBe('0'); }
    expect(searchSchema.safeParse({center:{lat:0,lng:0},radius:15,offset:50,outer:true}).success).toBe(false);
    expect(searchSchema.safeParse({center:{lat:0,lng:0},radius:5,offset:0,outer:true}).success).toBe(false);
  });
  it('sends distinct full 10/15-mile radii and supports offsets beyond 150', async () => {
    vi.stubEnv('HERE_API_KEY','unit-test-placeholder');
    const fetcher=vi.fn(async () => Response.json({stations:[],total:0})); vi.stubGlobal('fetch',fetcher);
    for(const radius of [10,15] as const) await hereProvider.search({center:{lat:33.68,lng:-117.83},radius,offset:350});
    const urls=fetcher.mock.calls.map(call=>new URL((call as unknown as [URL])[0]));
    expect(urls[0].searchParams.get('in')).toBe('circle:33.68,-117.83;r=16894');
    expect(urls[1].searchParams.get('in')).toBe('circle:33.68,-117.83;r=24941');
    expect(urls[1].searchParams.get('offset')).toBe('350');
  });
  it('keeps the key on server requests with caching disabled and an abort deadline', async () => {
    vi.stubEnv('HERE_API_KEY','unit-test-placeholder'); const fetcher = vi.fn(async () => Response.json({stations:[],total:0})); vi.stubGlobal('fetch',fetcher);
    await hereProvider.search({center:{lat:33.68,lng:-117.83},radius:5,offset:50});
    const [url,options] = fetcher.mock.calls[0] as unknown as [URL,RequestInit];
    expect(url.hostname).toBe('fuel.hereapi.com'); expect(url.searchParams.get('returnAllStations')).toBe('true'); expect(url.searchParams.get('offset')).toBe('50'); expect(url.searchParams.get('apiKey')).toBe('unit-test-placeholder'); expect(options.cache).toBe('no-store'); expect(options.signal).toBeInstanceOf(AbortSignal);
  });
  it('does not retry upstream errors or timeouts', async () => {
    vi.stubEnv('HERE_API_KEY','unit-test-placeholder'); const fetcher = vi.fn().mockResolvedValueOnce(new Response(null,{status:429})).mockRejectedValueOnce(new DOMException('Timed out','TimeoutError')); vi.stubGlobal('fetch',fetcher);
    await expect(hereRequest('https://fuel.hereapi.com/v3/stations',{})).rejects.toThrow('Provider unavailable');
    await expect(hereRequest('https://fuel.hereapi.com/v3/stations',{})).rejects.toThrow('Timed out'); expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('requires a key in live mode rather than switching to sample prices', async () => { vi.stubEnv('HERE_API_KEY',''); const fetcher=vi.fn(); vi.stubGlobal('fetch',fetcher); await expect(hereProvider.search({center:{lat:0,lng:0},radius:5,offset:0})).rejects.toThrow(); expect(fetcher).not.toHaveBeenCalled(); });
});
