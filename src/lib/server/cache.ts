import 'server-only';
export class ExpiringCache<T> {
  private entries = new Map<string, { value: T; expires: number }>();
  private pending = new Map<string, Promise<T>>();
  constructor(private ttl = 300_000, private maximum = 300, private clock = Date.now) {}
  async get(key: string, load: () => Promise<T>): Promise<T> {
    const now = this.clock();
    for (const [k, v] of this.entries) if (v.expires <= now) this.entries.delete(k);
    const cached = this.entries.get(key);
    if (cached) return cached.value;
    const existing = this.pending.get(key);
    if (existing) return existing;
    if (this.pending.size >= this.maximum) throw new Error('Cache capacity exceeded');
    const job = Promise.resolve().then(load).then(value => {
      if (this.entries.size >= this.maximum) this.entries.delete(this.entries.keys().next().value!);
      this.entries.set(key, { value, expires: this.clock() + this.ttl });
      return value;
    }).finally(() => this.pending.delete(key));
    this.pending.set(key, job);
    return job;
  }
}
