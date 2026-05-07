import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { globalRatelimit, ipRatelimit } from '@/lib/rateLimit';

export async function proxy(request: NextRequest) {
  // If Upstash isn't configured, bypass rate limiting (useful for local dev without env vars)
  if (!globalRatelimit || !ipRatelimit) {
    return NextResponse.next();
  }

  // Retrieve client IP from headers
  const ip = request.headers.get('x-forwarded-for') || 'anonymous';

  // 1. Check IP Limit
  const { success: ipSuccess, reset: ipReset } = await ipRatelimit.limit(ip);
  if (!ipSuccess) {
    return new NextResponse(
      JSON.stringify({ error: 'Too Many Requests', message: '本日のIP別API利用上限に達しました。', reset: ipReset }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 2. Check Global Limit
  const { success: globalSuccess, reset: globalReset } = await globalRatelimit.limit('global');
  if (!globalSuccess) {
    return new NextResponse(
      JSON.stringify({ error: 'Too Many Requests', message: '本日の全体API利用上限に達しました。', reset: globalReset }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return NextResponse.next();
}

// Ensure middleware only runs for specific API routes
export const config = {
  matcher: ['/api/generate', '/api/enrich'],
};
