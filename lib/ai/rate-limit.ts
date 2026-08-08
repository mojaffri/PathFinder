interface Bucket { count: number; resetAt: number }
const buckets = new Map<string, Bucket>();

export function checkRateLimit(key: string, limit = 10, windowMs = 60_000): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }
  if (current.count >= limit) return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) };
  current.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

export function requestRateLimitKey(request: Request, feature: string): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return `${feature}:${forwarded || "local"}`;
}
