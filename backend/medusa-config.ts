import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

if (!process.env.STRIPE_API_KEY) {
  console.warn("[medusa-config] STRIPE_API_KEY is not set — Stripe payments will not work")
}

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
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
                    ...(process.env.STRIPE_WEBHOOK_SECRET && {
                      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
                    }),
                    capture: false,
                    automatic_payment_methods: true,
                  },
                },
              ],
            },
          },
        ]
      : []),
  ],
})
