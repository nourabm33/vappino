export interface RateLimiter {
  check(key: string): { allowed: boolean; retryAfterSeconds: number };
  reset(): void;
}

/**
 * In-memory sliding-window limiter. State is per server instance, which is
 * enough to stop casual abuse without an external store.
 */
export function createRateLimiter(
  { limit, windowMs }: { limit: number; windowMs: number },
  now: () => number = Date.now,
): RateLimiter {
  const hits = new Map<string, number[]>();
  return {
    check(key) {
      const t = now();
      const recent = (hits.get(key) ?? []).filter((ts) => t - ts < windowMs);
      if (recent.length >= limit) {
        hits.set(key, recent);
        const oldest = recent[0] ?? t;
        return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((oldest + windowMs - t) / 1000)) };
      }
      recent.push(t);
      hits.set(key, recent);
      if (hits.size > 10_000) {
        for (const [k, v] of hits) if (!v.some((ts) => t - ts < windowMs)) hits.delete(k);
      }
      return { allowed: true, retryAfterSeconds: 0 };
    },
    reset() {
      hits.clear();
    },
  };
}
