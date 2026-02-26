import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

const isProd = process.env.NODE_ENV === "production"

if (isProd && (!process.env.JWT_SECRET || process.env.JWT_SECRET === "supersecret")) {
  throw new Error("JWT_SECRET must be set to a secure value in production")
}
if (isProd && (!process.env.COOKIE_SECRET || process.env.COOKIE_SECRET === "supersecret")) {
  throw new Error("COOKIE_SECRET must be set to a secure value in production")
}
if (isProd && process.env.STRIPE_API_KEY && !process.env.STRIPE_WEBHOOK_SECRET) {
  throw new Error("STRIPE_WEBHOOK_SECRET must be set when Stripe is enabled in production")
}

if (!isProd) {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === "supersecret") {
    console.warn("[medusa-config] JWT_SECRET is using default value — set a secure secret before deploying")
  }
  if (!process.env.COOKIE_SECRET || process.env.COOKIE_SECRET === "supersecret") {
    console.warn("[medusa-config] COOKIE_SECRET is using default value — set a secure secret before deploying")
  }
}

const redisUrl = process.env.REDIS_URL

if (!process.env.STRIPE_API_KEY) {
  console.warn("[medusa-config] STRIPE_API_KEY is not set — Stripe payments will not work")
}

if (process.env.STRIPE_API_KEY && !process.env.STRIPE_WEBHOOK_SECRET) {
  console.warn(
    "[medusa-config] STRIPE_WEBHOOK_SECRET is not set — Stripe webhooks will not be verified. " +
    "Set STRIPE_WEBHOOK_SECRET before going live."
  )
}

module.exports = defineConfig({
  admin: {
    backendUrl: process.env.MEDUSA_BACKEND_URL,
  },
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    }
  },
  modules: [
    {
      resolve: "./src/modules/product-review",
    },
    {
      resolve: "./src/modules/wishlist",
    },
    // Stripe payment provider (conditional on STRIPE_API_KEY)
    ...(process.env.STRIPE_API_KEY
      ? [
          {
            resolve: "@medusajs/medusa/payment",
            options: {
              providers: [
                {
                  resolve: "@medusajs/medusa/payment-stripe",
                  id: "stripe",
                  options: {
                    apiKey: process.env.STRIPE_API_KEY,
                    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
                    capture: false,
                    automatic_payment_methods: true,
                  },
                },
              ],
            },
          },
        ]
      : []),
    // Redis-backed production modules (conditional on REDIS_URL)
    ...(redisUrl
      ? [
          {
            resolve: "@medusajs/medusa/caching",
            options: {
              providers: [
                {
                  resolve: "@medusajs/caching-redis",
                  id: "caching-redis",
                  is_default: true,
                  options: {
                    redisUrl,
                  },
                },
              ],
            },
          },
          {
            resolve: "@medusajs/medusa/event-bus-redis",
            options: {
              redisUrl,
            },
          },
          {
            resolve: "@medusajs/medusa/workflow-engine-redis",
            options: {
              redis: {
                redisUrl,
              },
            },
          },
          {
            resolve: "@medusajs/medusa/locking",
            options: {
              providers: [
                {
                  resolve: "@medusajs/medusa/locking-redis",
                  id: "locking-redis",
                  is_default: true,
                  options: {
                    redisUrl,
                  },
                },
              ],
            },
          },
        ]
      : []),
  ],
})
