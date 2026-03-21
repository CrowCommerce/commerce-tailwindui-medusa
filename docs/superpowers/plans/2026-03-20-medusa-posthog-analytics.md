# Medusa PostHog Analytics Module — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate the official `@medusajs/analytics-posthog` module into the Medusa backend to track 8 server-side commerce events in PostHog.

**Architecture:** Register the Analytics Module conditionally in `medusa-config.ts`. Create a shared `trackAnalyticsEventStep` workflow step that resolves the module and calls `.track()` with graceful fallbacks. Each event gets a thin tracking workflow invoked from existing subscribers. Invoice tracking extends the existing workflow; abandoned cart tracking is inline in the scheduled job.

**Tech Stack:** Medusa v2 (`@medusajs/medusa` 2.13.x), `@medusajs/analytics-posthog`, PostHog (server-side events)

**Spec:** `docs/superpowers/specs/2026-03-20-medusa-posthog-analytics-design.md`

---

## File Map

### New files

| File | Responsibility |
|------|---------------|
| `backend/src/workflows/steps/track-analytics-event.ts` | Shared step: resolve Analytics Module, call `.track()` with actor fallback |
| `backend/src/workflows/analytics/track-order-placed.ts` | Fetch order + cart, build properties, call tracking step |
| `backend/src/workflows/analytics/track-order-canceled.ts` | Fetch order, build properties, call tracking step |
| `backend/src/workflows/analytics/track-customer-created.ts` | Fetch customer, build properties, call tracking step |
| `backend/src/workflows/analytics/track-payment-refunded.ts` | Fetch payment → order, build properties, call tracking step |
| `backend/src/workflows/analytics/track-shipment-created.ts` | Fetch fulfillment → order, build properties, call tracking step |
| `backend/src/workflows/analytics/track-review-created.ts` | Fetch review via module service, build properties, call tracking step |

### Modified files

| File | Change |
|------|--------|
| `backend/medusa-config.ts` | Add Analytics Module (conditional), startup warning |
| `backend/package.json` | Add `@medusajs/analytics-posthog` dependency |
| `backend/src/subscribers/order-placed.ts` | Add `trackOrderPlacedWorkflow` call |
| `backend/src/subscribers/order-canceled.ts` | Add `trackOrderCanceledWorkflow` call |
| `backend/src/subscribers/customer-created.ts` | Add `trackCustomerCreatedWorkflow` call |
| `backend/src/subscribers/payment-refunded.ts` | Add `trackPaymentRefundedWorkflow` call |
| `backend/src/subscribers/shipment-created.ts` | Restructure: analytics before `no_notification` check, add tracking workflow |
| `backend/src/subscribers/review-created.ts` | Add `trackReviewCreatedWorkflow` call |
| `backend/src/workflows/generate-invoice-pdf.ts` | Extend input type with optional `delivery_method`, add tracking step |
| `backend/src/workflows/steps/try-generate-invoice-pdf.ts` | Forward `delivery_method` through input type |
| `backend/src/workflows/notifications/send-order-confirmation.ts` | Pass `delivery_method: "attachment"` to invoice step |
| `backend/src/api/store/orders/[id]/invoice/route.ts` | Pass `delivery_method: "link"` to invoice workflow |
| `backend/src/api/admin/orders/[id]/invoice/route.ts` | Pass `delivery_method: "link"` to invoice workflow |
| `backend/src/jobs/send-abandoned-cart-emails.ts` | Add inline analytics tracking after each email send |

---

## Task 1: Install dependency and configure module

**Files:**
- Modify: `backend/package.json`
- Modify: `backend/medusa-config.ts`

- [ ] **Step 1: Install the analytics PostHog package**

```bash
cd backend && bun add @medusajs/analytics-posthog@^2.13.1
```

- [ ] **Step 2: Add the startup warning and module config to `medusa-config.ts`**

After the existing S3 warning block (line 40-45), add:

```typescript
if (!process.env.POSTHOG_EVENTS_API_KEY) {
  console.warn("[medusa-config] POSTHOG_EVENTS_API_KEY is not set — backend analytics will be disabled")
}
```

In the `modules` array, after the Redis block (before the closing `]` of modules on line 191), add:

```typescript
    // PostHog analytics (conditional on POSTHOG_EVENTS_API_KEY)
    ...(process.env.POSTHOG_EVENTS_API_KEY
      ? [
          {
            resolve: "@medusajs/medusa/analytics",
            options: {
              providers: [
                {
                  resolve: "@medusajs/analytics-posthog",
                  id: "posthog",
                  options: {
                    posthogEventsKey: process.env.POSTHOG_EVENTS_API_KEY,
                    posthogHost: process.env.POSTHOG_HOST,
                  },
                },
              ],
            },
          },
        ]
      : []),
```

- [ ] **Step 3: Verify build**

```bash
cd backend && bun run build
```

Expected: Build succeeds with no type errors.

- [ ] **Step 4: Commit**

```bash
git add backend/package.json backend/bun.lock backend/medusa-config.ts
git commit -m "chore(backend): add @medusajs/analytics-posthog module (conditional on env var)"
```

---

## Task 2: Create shared tracking step

**Files:**
- Create: `backend/src/workflows/steps/track-analytics-event.ts`

- [ ] **Step 1: Create the shared analytics tracking step**

```typescript
import {
  createStep,
  StepResponse,
} from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"

type TrackAnalyticsEventInput = {
  event: string
  actor_id: string | null | undefined
  actor_fallback: string | null | undefined
  properties: Record<string, unknown>
}

export const trackAnalyticsEventStep = createStep(
  "track-analytics-event",
  async (
    input: TrackAnalyticsEventInput,
    { container }
  ): Promise<StepResponse<void>> => {
    // Graceful no-op when analytics module is not registered
    let analytics
    try {
      analytics = container.resolve(Modules.ANALYTICS)
    } catch {
      return new StepResponse()
    }

    const resolvedActorId = input.actor_id || input.actor_fallback
    if (!resolvedActorId) {
      const logger = container.resolve("logger")
      logger.warn(
        `[analytics] Skipping ${input.event}: no actor_id or fallback`
      )
      return new StepResponse()
    }

    await analytics.track({
      event: input.event,
      actor_id: resolvedActorId,
      properties: input.properties,
    })

    return new StepResponse()
  }
)
```

- [ ] **Step 2: Verify build**

```bash
cd backend && bun run build
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add backend/src/workflows/steps/track-analytics-event.ts
git commit -m "feat(backend): add shared trackAnalyticsEventStep with graceful fallbacks"
```

---

## Task 3: Create `track-order-placed` workflow and wire subscriber

**Files:**
- Create: `backend/src/workflows/analytics/track-order-placed.ts`
- Modify: `backend/src/subscribers/order-placed.ts`

- [ ] **Step 1: Create the tracking workflow**

```typescript
import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { useQueryGraphStep } from "@medusajs/medusa/core-flows"
import { trackAnalyticsEventStep } from "../steps/track-analytics-event"

type TrackOrderPlacedInput = {
  order_id: string
}

export const trackOrderPlacedWorkflow = createWorkflow(
  "track-order-placed",
  function (input: TrackOrderPlacedInput) {
    const { data: orders } = useQueryGraphStep({
      entity: "order",
      fields: [
        "id",
        "customer_id",
        "email",
        "total",
        "currency_code",
        "items.id",
        "cart_id",
      ],
      filters: { id: input.order_id },
    })

    // Fetch cart to check abandoned_cart_notified metadata
    const { data: carts } = useQueryGraphStep({
      entity: "cart",
      fields: ["id", "metadata"],
      filters: { id: transform({ orders }, (d) => d.orders[0]?.cart_id) },
    }).config({ name: "fetch-cart-for-recovery-check" })

    const trackingInput = transform(
      { orders, carts },
      ({ orders: orderResult, carts: cartResult }) => {
        const order = orderResult[0]
        if (!order) return null

        const cart = cartResult[0] as Record<string, any> | undefined
        const isRecoveredCart =
          cart?.metadata?.abandoned_cart_notified === true

        return {
          event: "order_placed",
          actor_id: order.customer_id ?? null,
          actor_fallback: order.email ?? null,
          properties: {
            order_id: order.id,
            total: order.total,
            item_count: order.items?.length ?? 0,
            currency_code: order.currency_code,
            customer_id: order.customer_id ?? null,
            is_recovered_cart: isRecoveredCart,
          },
        }
      }
    )

    trackAnalyticsEventStep(trackingInput)

    return new WorkflowResponse({})
  }
)
```

- [ ] **Step 2: Update the order-placed subscriber**

Replace `backend/src/subscribers/order-placed.ts` with:

```typescript
import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { sendOrderConfirmationWorkflow } from "../workflows/notifications/send-order-confirmation"
import { trackOrderPlacedWorkflow } from "../workflows/analytics/track-order-placed"

export default async function orderPlacedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve("logger")

  try {
    await sendOrderConfirmationWorkflow(container).run({
      input: { id: data.id },
    })
    logger.info(`Order confirmation email sent for order ${data.id}`)
  } catch (error) {
    logger.error(
      `Failed to send order confirmation email for order ${data.id}`,
      error
    )
  }

  try {
    await trackOrderPlacedWorkflow(container).run({
      input: { order_id: data.id },
    })
  } catch (error) {
    logger.warn(`[analytics] Failed to track order_placed for ${data.id}`, error)
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
```

- [ ] **Step 3: Verify build**

```bash
cd backend && bun run build
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/workflows/analytics/track-order-placed.ts backend/src/subscribers/order-placed.ts
git commit -m "feat(backend): track order_placed event in PostHog with abandoned cart recovery flag"
```

---

## Task 4: Create `track-order-canceled` workflow and wire subscriber

**Files:**
- Create: `backend/src/workflows/analytics/track-order-canceled.ts`
- Modify: `backend/src/subscribers/order-canceled.ts`

- [ ] **Step 1: Create the tracking workflow**

```typescript
import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { useQueryGraphStep } from "@medusajs/medusa/core-flows"
import { trackAnalyticsEventStep } from "../steps/track-analytics-event"

type TrackOrderCanceledInput = {
  order_id: string
}

export const trackOrderCanceledWorkflow = createWorkflow(
  "track-order-canceled",
  function (input: TrackOrderCanceledInput) {
    const { data: orders } = useQueryGraphStep({
      entity: "order",
      fields: ["id", "customer_id", "email", "total", "currency_code"],
      filters: { id: input.order_id },
    })

    const trackingInput = transform({ orders }, ({ orders: result }) => {
      const order = result[0]
      if (!order) return null

      return {
        event: "order_canceled",
        actor_id: order.customer_id ?? null,
        actor_fallback: order.email ?? null,
        properties: {
          order_id: order.id,
          total: order.total,
          currency_code: order.currency_code,
          customer_id: order.customer_id ?? null,
        },
      }
    })

    trackAnalyticsEventStep(trackingInput)

    return new WorkflowResponse({})
  }
)
```

- [ ] **Step 2: Update the order-canceled subscriber**

Replace `backend/src/subscribers/order-canceled.ts` with:

```typescript
import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { sendOrderCanceledWorkflow } from "../workflows/notifications/send-order-canceled"
import { trackOrderCanceledWorkflow } from "../workflows/analytics/track-order-canceled"

export default async function orderCanceledHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve("logger")

  try {
    await sendOrderCanceledWorkflow(container).run({
      input: { orderId: data.id },
    })
    logger.info(`Order canceled email sent for order ${data.id}`)
  } catch (error) {
    logger.error(
      `Failed to send order canceled email for order ${data.id}`,
      error
    )
  }

  try {
    await trackOrderCanceledWorkflow(container).run({
      input: { order_id: data.id },
    })
  } catch (error) {
    logger.warn(`[analytics] Failed to track order_canceled for ${data.id}`, error)
  }
}

export const config: SubscriberConfig = {
  event: "order.canceled",
}
```

- [ ] **Step 3: Verify build**

```bash
cd backend && bun run build
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/workflows/analytics/track-order-canceled.ts backend/src/subscribers/order-canceled.ts
git commit -m "feat(backend): track order_canceled event in PostHog"
```

---

## Task 5: Create `track-customer-created` workflow and wire subscriber

**Files:**
- Create: `backend/src/workflows/analytics/track-customer-created.ts`
- Modify: `backend/src/subscribers/customer-created.ts`

- [ ] **Step 1: Create the tracking workflow**

```typescript
import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { useQueryGraphStep } from "@medusajs/medusa/core-flows"
import { trackAnalyticsEventStep } from "../steps/track-analytics-event"

type TrackCustomerCreatedInput = {
  customer_id: string
}

export const trackCustomerCreatedWorkflow = createWorkflow(
  "track-customer-created",
  function (input: TrackCustomerCreatedInput) {
    const { data: customers } = useQueryGraphStep({
      entity: "customer",
      fields: ["id", "has_account"],
      filters: { id: input.customer_id },
    })

    const trackingInput = transform(
      { customers },
      ({ customers: result }) => {
        const customer = result[0]
        if (!customer) return null

        return {
          event: "customer_created",
          actor_id: customer.id,
          actor_fallback: null,
          properties: {
            customer_id: customer.id,
            has_account: customer.has_account ?? false,
          },
        }
      }
    )

    trackAnalyticsEventStep(trackingInput)

    return new WorkflowResponse({})
  }
)
```

- [ ] **Step 2: Update the customer-created subscriber**

Replace `backend/src/subscribers/customer-created.ts` with:

```typescript
import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { sendWelcomeEmailWorkflow } from "../workflows/notifications/send-welcome-email"
import { trackCustomerCreatedWorkflow } from "../workflows/analytics/track-customer-created"

export default async function customerCreatedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve("logger")

  try {
    await sendWelcomeEmailWorkflow(container).run({
      input: { id: data.id },
    })
    logger.info(`Welcome email sent (customer ${data.id})`)
  } catch (error) {
    logger.error(
      `Failed to send welcome email for customer ${data.id}`,
      error
    )
  }

  try {
    await trackCustomerCreatedWorkflow(container).run({
      input: { customer_id: data.id },
    })
  } catch (error) {
    logger.warn(`[analytics] Failed to track customer_created for ${data.id}`, error)
  }
}

export const config: SubscriberConfig = {
  event: "customer.created",
}
```

- [ ] **Step 3: Verify build**

```bash
cd backend && bun run build
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/workflows/analytics/track-customer-created.ts backend/src/subscribers/customer-created.ts
git commit -m "feat(backend): track customer_created event in PostHog with has_account flag"
```

---

## Task 6: Create `track-payment-refunded` workflow and wire subscriber

**Files:**
- Create: `backend/src/workflows/analytics/track-payment-refunded.ts`
- Modify: `backend/src/subscribers/payment-refunded.ts`

- [ ] **Step 1: Create the tracking workflow**

The payment → order relationship requires querying through payment_collection. Check the Medusa docs MCP for the correct query graph path if needed.

```typescript
import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { useQueryGraphStep } from "@medusajs/medusa/core-flows"
import { trackAnalyticsEventStep } from "../steps/track-analytics-event"

type TrackPaymentRefundedInput = {
  payment_id: string
}

export const trackPaymentRefundedWorkflow = createWorkflow(
  "track-payment-refunded",
  function (input: TrackPaymentRefundedInput) {
    // Fetch payment with its collection's order link
    const { data: payments } = useQueryGraphStep({
      entity: "payment",
      fields: [
        "id",
        "amount",
        "currency_code",
        "payment_collection.order.id",
        "payment_collection.order.customer_id",
        "payment_collection.order.email",
      ],
      filters: { id: input.payment_id },
    })

    const trackingInput = transform({ payments }, ({ payments: result }) => {
      const payment = result[0] as Record<string, any> | undefined
      if (!payment) return null

      const order = payment.payment_collection?.order
      return {
        event: "payment_refunded",
        actor_id: order?.customer_id ?? null,
        actor_fallback: order?.email ?? null,
        properties: {
          payment_id: payment.id,
          order_id: order?.id ?? null,
          amount: payment.amount,
          currency_code: payment.currency_code,
        },
      }
    })

    trackAnalyticsEventStep(trackingInput)

    return new WorkflowResponse({})
  }
)
```

> **Note for implementer:** The `payment_collection.order` query graph path assumes Medusa v2's default link between payment collections and orders. If the build fails with a query graph error, use the Medusa MCP server (`mcp__medusa__ask_medusa_question`) to verify the correct path. Alternatives: `payment_collection.orders` (plural) or fetch the payment collection first, then the order separately.

- [ ] **Step 2: Update the payment-refunded subscriber**

Replace `backend/src/subscribers/payment-refunded.ts` with:

```typescript
import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { sendRefundConfirmationWorkflow } from "../workflows/notifications/send-refund-confirmation"
import { trackPaymentRefundedWorkflow } from "../workflows/analytics/track-payment-refunded"

export default async function paymentRefundedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve("logger")

  try {
    await sendRefundConfirmationWorkflow(container).run({
      input: { paymentId: data.id },
    })
    logger.info(`Refund confirmation email sent for payment ${data.id}`)
  } catch (error) {
    logger.error(
      `Failed to send refund confirmation for payment ${data.id}`,
      error
    )
  }

  try {
    await trackPaymentRefundedWorkflow(container).run({
      input: { payment_id: data.id },
    })
  } catch (error) {
    logger.warn(`[analytics] Failed to track payment_refunded for ${data.id}`, error)
  }
}

export const config: SubscriberConfig = {
  event: "payment.refunded",
}
```

- [ ] **Step 3: Verify build**

```bash
cd backend && bun run build
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/workflows/analytics/track-payment-refunded.ts backend/src/subscribers/payment-refunded.ts
git commit -m "feat(backend): track payment_refunded event in PostHog"
```

---

## Task 7: Create `track-shipment-created` workflow and wire subscriber

**Files:**
- Create: `backend/src/workflows/analytics/track-shipment-created.ts`
- Modify: `backend/src/subscribers/shipment-created.ts`

- [ ] **Step 1: Create the tracking workflow**

```typescript
import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { useQueryGraphStep } from "@medusajs/medusa/core-flows"
import { trackAnalyticsEventStep } from "../steps/track-analytics-event"

type TrackShipmentCreatedInput = {
  fulfillment_id: string
}

export const trackShipmentCreatedWorkflow = createWorkflow(
  "track-shipment-created",
  function (input: TrackShipmentCreatedInput) {
    // Fetch fulfillment with its order link
    const { data: fulfillments } = useQueryGraphStep({
      entity: "fulfillment",
      fields: [
        "id",
        "items.id",
        "order.id",
        "order.customer_id",
        "order.email",
      ],
      filters: { id: input.fulfillment_id },
    })

    const trackingInput = transform(
      { fulfillments },
      ({ fulfillments: result }) => {
        const fulfillment = result[0] as Record<string, any> | undefined
        if (!fulfillment) return null

        const order = fulfillment.order
        return {
          event: "shipment_created",
          actor_id: order?.customer_id ?? null,
          actor_fallback: order?.email ?? null,
          properties: {
            order_id: order?.id ?? null,
            fulfillment_id: fulfillment.id,
            item_count: fulfillment.items?.length ?? 0,
          },
        }
      }
    )

    trackAnalyticsEventStep(trackingInput)

    return new WorkflowResponse({})
  }
)
```

> **Note for implementer:** The `fulfillment.order` query graph path assumes Medusa v2's default link between fulfillments and orders. If the build fails, try `order_id` as a direct field on the fulfillment entity instead, and fetch the order separately.

- [ ] **Step 2: Restructure the shipment-created subscriber**

**Critical:** Analytics must come BEFORE the `no_notification` early return. Replace `backend/src/subscribers/shipment-created.ts` with:

```typescript
import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { sendShippingConfirmationWorkflow } from "../workflows/notifications/send-shipping-confirmation"
import { trackShipmentCreatedWorkflow } from "../workflows/analytics/track-shipment-created"

type ShipmentCreatedPayload = {
  id: string
  no_notification: boolean
}

export default async function shipmentCreatedHandler({
  event: { data },
  container,
}: SubscriberArgs<ShipmentCreatedPayload>) {
  const logger = container.resolve("logger")

  // Analytics first — always track regardless of notification preference
  try {
    await trackShipmentCreatedWorkflow(container).run({
      input: { fulfillment_id: data.id },
    })
  } catch (error) {
    logger.warn(`[analytics] Failed to track shipment_created for ${data.id}`, error)
  }

  // Then handle notification
  if (data.no_notification) {
    logger.debug(`Shipment ${data.id}: no_notification=true, skipping email`)
    return
  }

  try {
    await sendShippingConfirmationWorkflow(container).run({
      input: { fulfillmentId: data.id },
    })
    logger.info(`Shipping confirmation email sent for fulfillment ${data.id}`)
  } catch (error) {
    logger.error(
      `Failed to send shipping confirmation for fulfillment ${data.id}`,
      error
    )
  }
}

export const config: SubscriberConfig = {
  event: "shipment.created",
}
```

- [ ] **Step 3: Verify build**

```bash
cd backend && bun run build
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/workflows/analytics/track-shipment-created.ts backend/src/subscribers/shipment-created.ts
git commit -m "feat(backend): track shipment_created event in PostHog (analytics before no_notification check)"
```

---

## Task 8: Create `track-review-created` workflow and wire subscriber

**Files:**
- Create: `backend/src/workflows/analytics/track-review-created.ts`
- Modify: `backend/src/subscribers/review-created.ts`

- [ ] **Step 1: Create the tracking workflow**

This workflow resolves the custom module service directly (not `useQueryGraphStep`) because `product_review` is a custom module.

```typescript
import {
  createWorkflow,
  createStep,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { PRODUCT_REVIEW_MODULE } from "../../modules/product-review"
import { trackAnalyticsEventStep } from "../steps/track-analytics-event"

type TrackReviewCreatedInput = {
  review_id: string
  product_id: string
}

const fetchReviewStep = createStep(
  "fetch-review-for-analytics",
  async (
    input: TrackReviewCreatedInput,
    { container }
  ): Promise<StepResponse<{
    event: string
    actor_id: string | null
    actor_fallback: null
    properties: Record<string, unknown>
  } | null>> => {
    const reviewService = container.resolve(PRODUCT_REVIEW_MODULE)

    try {
      const review = await reviewService.retrieveReview(input.review_id, {
        relations: ["images"],
      })

      return new StepResponse({
        event: "review_created",
        actor_id: review.customer_id ?? null,
        actor_fallback: null,
        properties: {
          product_id: input.product_id,
          rating: review.rating,
          has_images: (review.images?.length ?? 0) > 0,
        },
      })
    } catch {
      return new StepResponse(null)
    }
  }
)

export const trackReviewCreatedWorkflow = createWorkflow(
  "track-review-created",
  function (input: TrackReviewCreatedInput) {
    const trackingInput = fetchReviewStep(input)

    trackAnalyticsEventStep(trackingInput)

    return new WorkflowResponse({})
  }
)
```

- [ ] **Step 2: Update the review-created subscriber**

Replace `backend/src/subscribers/review-created.ts` with:

```typescript
import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { trackReviewCreatedWorkflow } from "../workflows/analytics/track-review-created"

export default async function reviewCreatedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string; product_id: string }>) {
  const logger = container.resolve("logger")

  logger.info(
    `[ProductReview] Review created — review ${data.id} for product ${data.product_id}`
  )

  try {
    await trackReviewCreatedWorkflow(container).run({
      input: { review_id: data.id, product_id: data.product_id },
    })
  } catch (error) {
    logger.warn(`[analytics] Failed to track review_created for ${data.id}`, error)
  }
}

export const config: SubscriberConfig = {
  event: "product_review.created",
}
```

- [ ] **Step 3: Verify build**

```bash
cd backend && bun run build
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/workflows/analytics/track-review-created.ts backend/src/subscribers/review-created.ts
git commit -m "feat(backend): track review_created event in PostHog via custom module service"
```

---

## Task 9: Add `invoice_generated` tracking to existing invoice workflow

**Files:**
- Modify: `backend/src/workflows/generate-invoice-pdf.ts`
- Modify: `backend/src/workflows/steps/try-generate-invoice-pdf.ts`
- Modify: `backend/src/workflows/notifications/send-order-confirmation.ts`
- Modify: `backend/src/api/store/orders/[id]/invoice/route.ts`
- Modify: `backend/src/api/admin/orders/[id]/invoice/route.ts`

- [ ] **Step 1: Extend `generateInvoicePdfWorkflow` input type and add tracking step**

In `backend/src/workflows/generate-invoice-pdf.ts`:

1. Update the input type:

```typescript
type GenerateInvoicePdfInput = {
  order_id: string
  delivery_method?: "attachment" | "link"
}
```

2. Add the import for `trackAnalyticsEventStep`:

```typescript
import { trackAnalyticsEventStep } from "./steps/track-analytics-event"
```

3. After the `renderInvoicePdfStep` call (before the `return`), add the tracking step:

```typescript
    const trackingInput = transform(
      { order, invoice, input },
      (data) => ({
        event: "invoice_generated",
        actor_id: (data.order as any).customer_id ?? null,
        actor_fallback: (data.order as any).email ?? null,
        properties: {
          order_id: data.input.order_id,
          invoice_number: `${(data as any).invoice.year}-${(data as any).invoice.display_id}`,
          delivery_method: data.input.delivery_method ?? "unknown",
        },
      })
    )

    trackAnalyticsEventStep(trackingInput)
```

Also add `customer_id` and `email` to the order query fields list (line 26 area):

```typescript
        "customer_id",
        "email",
```

- [ ] **Step 2: Extend `tryGenerateInvoicePdfStep` input type**

In `backend/src/workflows/steps/try-generate-invoice-pdf.ts`, update the input type:

```typescript
type TryGenerateInvoicePdfInput = {
  order_id: string
  order: Record<string, any>
  delivery_method?: "attachment" | "link"
}
```

No other changes needed — `tryGenerateInvoicePdfStep` calls `generateInvoicePdfWorkflow` internally or handles invoice generation itself. The `delivery_method` is forwarded.

- [ ] **Step 3: Pass `delivery_method: "attachment"` from order confirmation workflow**

In `backend/src/workflows/notifications/send-order-confirmation.ts`, update the `tryGenerateInvoicePdfStep` call (around line 79):

```typescript
      return tryGenerateInvoicePdfStep({
        order_id: input.id,
        order,
        delivery_method: "attachment",
      })
```

- [ ] **Step 4: Pass `delivery_method: "link"` from store invoice route**

In `backend/src/api/store/orders/[id]/invoice/route.ts`, update the workflow call (around line 47):

```typescript
  const { result } = await generateInvoicePdfWorkflow(req.scope).run({
    input: { order_id: orderId, delivery_method: "link" },
  })
```

- [ ] **Step 5: Pass `delivery_method: "link"` from admin invoice route**

In `backend/src/api/admin/orders/[id]/invoice/route.ts`, update the workflow call (around line 34):

```typescript
  const { result } = await generateInvoicePdfWorkflow(req.scope).run({
    input: { order_id: orderId, delivery_method: "link" },
  })
```

- [ ] **Step 6: Verify build**

```bash
cd backend && bun run build
```

- [ ] **Step 7: Commit**

```bash
git add backend/src/workflows/generate-invoice-pdf.ts backend/src/workflows/steps/try-generate-invoice-pdf.ts backend/src/workflows/notifications/send-order-confirmation.ts backend/src/api/store/orders/\[id\]/invoice/route.ts backend/src/api/admin/orders/\[id\]/invoice/route.ts
git commit -m "feat(backend): track invoice_generated event in PostHog with delivery_method"
```

---

## Task 10: Add `abandoned_cart_email_sent` tracking to scheduled job

**Files:**
- Modify: `backend/src/jobs/send-abandoned-cart-emails.ts`

- [ ] **Step 1: Add inline analytics tracking after each successful email send**

In `backend/src/jobs/send-abandoned-cart-emails.ts`:

1. Add import at top:

```typescript
import { Modules } from "@medusajs/framework/utils"
```

2. After `totalSent++` (line 63), inside the `try` block for each cart, add:

```typescript
          // Track analytics (fire-and-forget)
          try {
            const analytics = container.resolve(Modules.ANALYTICS)
            const hoursAbandoned = Math.round(
              (Date.now() - new Date(cart.updated_at).getTime()) / (1000 * 60 * 60)
            )
            await analytics.track({
              event: "abandoned_cart_email_sent",
              actor_id: (cart as any).customer_id || cart.email,
              properties: {
                cart_id: cart.id,
                hours_abandoned: hoursAbandoned,
                item_count: cart.items?.length ?? 0,
              },
            })
          } catch {
            // Analytics module not registered or tracking failed — ignore
          }
```

3. Also add `customer_id` to the `AbandonedCartRow` type:

```typescript
type AbandonedCartRow = {
  id: string
  email: string
  customer_id: string | null
  items: unknown[]
  metadata: Record<string, unknown> | null
  updated_at: string
}
```

4. And add `"customer_id"` to the query fields array (after `"email"` on line 36):

```typescript
          "customer_id",
```

- [ ] **Step 2: Verify build**

```bash
cd backend && bun run build
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/jobs/send-abandoned-cart-emails.ts
git commit -m "feat(backend): track abandoned_cart_email_sent event in PostHog"
```

---

## Task 11: Final build verification and documentation

**Files:**
- Modify: `backend/.env.template` (or `.env` — add example env vars)

- [ ] **Step 1: Full build verification**

```bash
cd backend && bun run build
```

Expected: Clean build, zero errors.

- [ ] **Step 2: Verify graceful degradation (no POSTHOG_EVENTS_API_KEY)**

```bash
cd backend && bun run dev
```

Check logs for: `[medusa-config] POSTHOG_EVENTS_API_KEY is not set — backend analytics will be disabled`

Verify no crash, then Ctrl+C.

- [ ] **Step 3: Commit any remaining changes**

If there's a `.env.template` or `.env.example` to update:

```bash
git add -p
git commit -m "docs(backend): add PostHog env var examples"
```

---

## Summary

| Task | What | Files touched |
|------|------|---------------|
| 1 | Install dep + configure module | `package.json`, `medusa-config.ts` |
| 2 | Shared tracking step | `steps/track-analytics-event.ts` (new) |
| 3 | `order_placed` tracking | `analytics/track-order-placed.ts` (new), `subscribers/order-placed.ts` |
| 4 | `order_canceled` tracking | `analytics/track-order-canceled.ts` (new), `subscribers/order-canceled.ts` |
| 5 | `customer_created` tracking | `analytics/track-customer-created.ts` (new), `subscribers/customer-created.ts` |
| 6 | `payment_refunded` tracking | `analytics/track-payment-refunded.ts` (new), `subscribers/payment-refunded.ts` |
| 7 | `shipment_created` tracking | `analytics/track-shipment-created.ts` (new), `subscribers/shipment-created.ts` |
| 8 | `review_created` tracking | `analytics/track-review-created.ts` (new), `subscribers/review-created.ts` |
| 9 | `invoice_generated` tracking | `generate-invoice-pdf.ts`, `try-generate-invoice-pdf.ts`, `send-order-confirmation.ts`, 2 route files |
| 10 | `abandoned_cart_email_sent` | `jobs/send-abandoned-cart-emails.ts` |
| 11 | Final verification | Build check, graceful degradation test |
