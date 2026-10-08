import 'server-only';
import { createHmac, randomBytes } from 'node:crypto';
export class RateLimiter {
  private records = new Map<string, { count: number; expires: number }>();
  private salt = randomBytes(32);
  constructor(private limit = 30, private windowMs = 60_000, private maximum = 10_000, private clock = Date.now) {}
  check(identifier: string): { allowed: boolean; retryAfter: number } {
    const now = this.clock();
    for (const [key, record] of this.records) if (record.expires <= now) this.records.delete(key);
    const key = createHmac('sha256', this.salt).update(identifier).digest('hex');
    const record = this.records.get(key);
    if (!record) {
      if (this.records.size >= this.maximum) return { allowed: false, retryAfter: Math.ceil(this.windowMs / 1000) };
      this.records.set(key, { count: 1, expires: now + this.windowMs });
      return { allowed: true, retryAfter: 0 };
    }
    if (record.count >= this.limit) return { allowed: false, retryAfter: Math.max(1, Math.ceil((record.expires - now) / 1000)) };
    record.count++;
    return { allowed: true, retryAfter: 0 };
  }
}
