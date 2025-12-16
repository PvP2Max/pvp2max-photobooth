const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

type RateLimitConfig = {
  windowMs: number;  // Time window in ms
  max: number;       // Max requests per window
};

export function rateLimit(ip: string, config: RateLimitConfig): { success: boolean; retryAfter?: number } {
  const now = Date.now();
  const key = ip;
  const existing = rateLimitMap.get(key);

  if (!existing || now > existing.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + config.windowMs });
    return { success: true };
  }

  if (existing.count >= config.max) {
    const retryAfter = Math.ceil((existing.resetAt - now) / 1000);
    return { success: false, retryAfter };
  }

  existing.count++;
  return { success: true };
}

export function getClientIp(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
}

// Legacy compatibility functions for existing code
export function rateLimiter(key: string, limit = 30, windowMs = 60_000) {
  const result = rateLimit(key, { windowMs, max: limit });
  return {
    allowed: result.success,
    remaining: result.success ? limit - 1 : 0,
  };
}

export function requestKey(headers: Headers) {
  return (
    headers.get("x-real-ip") ||
    headers.get("x-forwarded-for") ||
    headers.get("cf-connecting-ip") ||
    "anon"
  );
}
