import type { RequestHandler } from "express"
import Redis from "ioredis"

const MAX_REQUESTS = 5
const WINDOW_SECONDS = 60 // 1 minute

let redis: Redis | null = null
let warned = false

function getRedis(): Redis | null {
  if (redis) return redis
  const url = process.env.REDIS_URL
  if (!url) {
    if (!warned) {
      console.warn("[newsletter-rate-limit] REDIS_URL not set — rate limiting disabled")
      warned = true
    }
    return null
  }
  try {
    redis = new Redis(url, { maxRetriesPerRequest: 1 })
    redis.on("error", (err) => {
      console.warn("[newsletter-rate-limit] Redis error:", err.message)
    })
    return redis
  } catch {
    return null
  }
}

export function newsletterRateLimit(): RequestHandler {
  return async (req, res, next) => {
    const client = getRedis()
    if (!client) return next()

    const ip = req.ip || req.socket.remoteAddress
    if (!ip) return next()

    const key = `newsletter_sub:${ip}`

    try {
      const count = await client.get(key)
      if (count && parseInt(count, 10) >= MAX_REQUESTS) {
        const ttl = await client.ttl(key)
        res.set("Retry-After", String(ttl > 0 ? ttl : WINDOW_SECONDS))
        res.status(429).json({
          message: "Too many requests. Please try again later.",
          type: "too_many_requests",
        })
        return
      }

      // Increment counter and set expiry on every request
      await client.multi().incr(key).expire(key, WINDOW_SECONDS).exec()
    } catch {
      // Redis error — pass through
      return next()
    }

    next()
  }
}
