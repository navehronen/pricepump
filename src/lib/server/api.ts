import 'server-only';
import { z } from 'zod';
import { RateLimiter } from './limiter';
import { ExpiringCache } from './cache';
import { getProvider, providerMode } from '@/lib/providers';
import { coarseCenter } from '@/lib/domain/stations';
import type { StationPage } from '@/lib/domain/types';
const point = z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }).strict();
export const searchSchema = z.object({ center: point, radius: z.union([z.literal(5), z.literal(10), z.literal(15)]), offset: z.number().int().min(0).max(10_000).default(0), outer: z.boolean().optional() }).strict().refine(input => !input.outer || (input.offset === 0 && input.radius > 5), { message: 'Outer samples are a single page for wider searches' });
export const geocodeSchema = z.object({ query: z.string().trim().min(2).max(200) }).strict();
export const reverseSchema = z.object({ center: point }).strict();
const globals = globalThis as typeof globalThis & { pricePumpServices?: { limiter: RateLimiter; cache: ExpiringCache<StationPage> } };
const services = globals.pricePumpServices ??= { limiter: new RateLimiter(), cache: new ExpiringCache<StationPage>() };
function response(data: unknown, status = 200, headers: Record<string, string> = {}) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store', ...headers } });
}
async function boundedJSON(request: Request): Promise<unknown> {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) throw new Error('Invalid content type');
  if (Number(request.headers.get('content-length') ?? 0) > 2048) throw new Error('Body too large');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('Missing body');
  const decoder = new TextDecoder();
  let total = 0, text = '';
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > 2048) { await reader.cancel(); throw new Error('Body too large'); }
      text += decoder.decode(value, { stream: true });
    }
    return JSON.parse(text + decoder.decode());
  } finally { reader.releaseLock(); }
}
export function endpoint<T>(schema: z.ZodType<T>, handler: (input: T) => Promise<unknown>) {
  return async (request: Request) => {
    const origin = request.headers.get('origin');
    // Next can canonicalize request.url to localhost internally. Compare the
    // browser's Origin to the HTTP Host rather than that internal URL.
    let sameOrigin = !origin;
    try { const parsed = new URL(origin!); sameOrigin = ['http:', 'https:'].includes(parsed.protocol) && parsed.host === (request.headers.get('host') ?? new URL(request.url).host); } catch { /* Missing Origin is allowed for server clients; malformed Origins are not. */ }
    if (!sameOrigin || request.headers.get('sec-fetch-site') === 'cross-site') return response({ error: 'This request is not allowed.' }, 403);
    // Vercel owns this header. Locally, all callers share a bucket; arbitrary forwarded headers are not trusted.
    const identifier = process.env.VERCEL ? request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() || 'unknown' : 'local';
    const rate = services.limiter.check(identifier);
    if (!rate.allowed) return response({ error: 'Too many searches. Please wait a minute and try again.' }, 429, { 'Retry-After': String(rate.retryAfter) });
    let input: T;
    try { input = schema.parse(await boundedJSON(request)); }
    catch { return response({ error: 'Please check your search and try again.' }, 400); }
    try { return response(await handler(input)); }
    catch { return response({ error: "We couldn't load current prices. Try again." }, 503); }
  };
}
export const searchHandler = endpoint(searchSchema, async input => {
  const center = coarseCenter(input.center);
  // Live responses are neither retained nor coalesced across requests/users.
  // Do not infer caching permission from the five-minute demo TTL.
  if (providerMode() === 'here') return getProvider().search({ ...input, center });
  const key = JSON.stringify([providerMode(), center.lat, center.lng, input.radius, input.offset, !!input.outer]);
  return services.cache.get(key, () => getProvider().search({ ...input, center }));
});
export const geocodeHandler = endpoint(geocodeSchema, async ({ query }) => ({ locations: await getProvider().geocode(query) }));
export const reverseHandler = endpoint(reverseSchema, async ({ center }) => getProvider().reverse(coarseCenter(center)));
