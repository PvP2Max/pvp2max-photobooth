const buckets = new Map<string, { count: number; reset: number }>();

export function rateLimiter(key: string, limit = 30, windowMs = 60_000) {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.reset < now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }
  if (bucket.count >= limit) {
    return { allowed: false, remaining: 0 };
  }
  bucket.count += 1;
  return { allowed: true, remaining: limit - bucket.count };
}

export function requestKey(headers: Headers) {
  return (
    headers.get("x-real-ip") ||
    headers.get("x-forwarded-for") ||
    headers.get("cf-connecting-ip") ||
    "anon"
  );
}
