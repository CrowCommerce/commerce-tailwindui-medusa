// backend/src/subscribers/apply-first-purchase.ts
import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import * as Sentry from "@sentry/node"
import { applyFirstPurchasePromoWorkflow } from "../workflows/apply-first-purchase-promo"

export default async function applyFirstPurchaseHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve("logger")

  try {
    await applyFirstPurchasePromoWorkflow(container).run({
      input: { cart_id: data.id },
    })
    logger.info(`[first-purchase] Checked cart ${data.id} for first-purchase promo`)
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        subscriber: "apply_first_purchase",
        cart_id: data.id,
      },
    })
    logger.error(
      `[first-purchase] Failed to apply first-purchase promo to cart ${data.id}`,
      error
    )
  }
}

export const config: SubscriberConfig = {
  // "cart.created" fires when any cart is created.
  // The second event fires when a guest cart is transferred to a logged-in customer.
  event: ["cart.created", "cart.customer_transferred"],
}

// Load the validation hooks so Medusa registers them at startup.
// This side-effect import is required — Medusa does not auto-scan workflows/hooks/.
import "../workflows/hooks/validate-promotion"
