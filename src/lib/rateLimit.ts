import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Initialize Redis only if environment variables are present (prevents crash in local dev without env vars)
let redis: Redis | null = null;
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

const GLOBAL_LIMIT = parseInt(process.env.DAILY_GLOBAL_LIMIT || "2450", 10);
const IP_LIMIT = parseInt(process.env.DAILY_IP_LIMIT || "200", 10);

// Global ratelimit instance (e.g., 2450 requests per day across all users)
export const globalRatelimit = redis ? new Ratelimit({
  redis: redis,
  limiter: Ratelimit.fixedWindow(GLOBAL_LIMIT, "1 d"),
  ephemeralCache: new Map(),
  analytics: true,
  prefix: "global_api_limit"
}) : null;

// IP-based ratelimit instance (e.g., 200 requests per day per IP)
export const ipRatelimit = redis ? new Ratelimit({
  redis: redis,
  limiter: Ratelimit.fixedWindow(IP_LIMIT, "1 d"),
  ephemeralCache: new Map(),
  analytics: true,
  prefix: "ip_api_limit"
}) : null;
