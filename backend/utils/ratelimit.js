import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// This creates ONE Redis connection, reused across requests
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// 2 requests per 30 days per user (free tier cap for hackathon)
export const monthlyLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(2, "30 d"),
  prefix: "monthly", // keys stored as "monthly:<userId>"
  analytics: true, // enables usage dashboard on Upstash
});
