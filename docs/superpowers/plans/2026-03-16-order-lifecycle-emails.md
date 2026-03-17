# Order Lifecycle Emails (Stack 3) Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement shipping confirmation, order canceled, refund confirmation, and admin new order alert emails following the established subscriber → workflow → template pattern.

**Architecture:** Four independent email pipelines, each with its own subscriber (event listener), workflow (data fetching + formatting via `useQueryGraphStep`), and React Email template. Reuses existing `formatOrderForEmailStep` for 3 of 4 workflows.

**Tech Stack:** Medusa v2 workflows + subscribers, React Email + Resend, `@react-email/components`, `@react-email/render`

**Spec:** `docs/superpowers/specs/2026-03-16-order-lifecycle-emails-design.md`

---

## Task 1: Shipping Confirmation — Subscriber + Workflow

**Files:**
- Create: `backend/src/subscribers/shipment-created.ts`
- Create: `backend/src/workflows/notifications/send-shipping-confirmation.ts`

- [ ] **Step 1: Create the subscriber**

```typescript
// backend/src/subscribers/shipment-created.ts
import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { sendShippingConfirmationWorkflow } from "../workflows/notifications/send-shipping-confirmation"

type ShipmentCreatedPayload = {
  id: string          // fulfillment ID
  no_notification: boolean
}

export default async function shipmentCreatedHandler({
  event: { data },
  container,
}: SubscriberArgs<ShipmentCreatedPayload>) {
  const logger = container.resolve("logger")

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

- [ ] **Step 2: Create the workflow**

```typescript
// backend/src/workflows/notifications/send-shipping-confirmation.ts
import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { MedusaError } from "@medusajs/framework/utils"
import {
  useQueryGraphStep,
  sendNotificationsStep,
} from "@medusajs/medusa/core-flows"
import { formatOrderForEmailStep } from "../steps/format-order-for-email"

type SendShippingConfirmationInput = {
  fulfillmentId: string
}

export const sendShippingConfirmationWorkflow = createWorkflow(
  "send-shipping-confirmation",
  function (input: SendShippingConfirmationInput) {
    // Fetch fulfillment with tracking + linked order data
    // fulfillment → order is a cross-module link; query graph resolves it.
    // If this fails at runtime, fall back to two separate queries.
    const { data: fulfillments } = useQueryGraphStep({
      entity: "fulfillment",
      fields: [
        "id",
        "tracking_numbers",
        "labels.*",
        "order.id",
        "order.display_id",
        "order.email",
        "order.created_at",
        "order.currency_code",
        "order.items.*",
        "order.shipping_address.*",
        "order.total",
        "order.subtotal",
        "order.item_total",
        "order.item_subtotal",
        "order.shipping_total",
        "order.tax_total",
      ],
      filters: { id: input.fulfillmentId },
    })

    const orderAndTracking = transform(
      { fulfillments },
      ({ fulfillments: result }) => {
        const fulfillment = result[0]
        if (!fulfillment) {
          throw new MedusaError(
            MedusaError.Types.NOT_FOUND,
            "Fulfillment not found"
          )
        }

        const order = (fulfillment as any).order
        if (!order?.email) {
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            "Order has no email address, cannot send shipping confirmation"
          )
        }

        return {
          order,
          trackingNumbers: (fulfillment as any).tracking_numbers || [],
        }
      }
    )

    const formatted = formatOrderForEmailStep({
      order: orderAndTracking.order,
    })

    const notifications = transform(
      { formatted, orderAndTracking },
      ({ formatted: data, orderAndTracking: ot }) => {
        const storefrontUrl =
          process.env.STOREFRONT_URL || "http://localhost:3000"

        const trackingNumber = ot.trackingNumbers[0] || null

        return [
          {
            to: data.email,
            channel: "email" as const,
            template: "shipping-confirmation",
            data: {
              subject: `Your order #${data.orderNumber} has shipped`,
              customerName: data.customerName,
              orderNumber: data.orderNumber,
              orderDate: data.orderDate,
              items: data.items,
              subtotal: data.subtotal,
              shipping: data.shipping,
              tax: data.tax,
              discount: data.discount,
              total: data.total,
              shippingAddress: data.shippingAddress,
              trackingNumber,
              trackingUrl: trackingNumber
                ? `${storefrontUrl}/account/orders/${data.orderId}`
                : null,
              orderStatusUrl: `${storefrontUrl}/account/orders/${data.orderId}`,
            },
            trigger_type: "shipment.created",
            resource_id: data.orderId,
            resource_type: "order",
          },
        ]
      }
    )

    sendNotificationsStep(notifications)

    return new WorkflowResponse({
      fulfillmentId: input.fulfillmentId,
    })
  }
)
```

- [ ] **Step 3: Build to verify no type errors**

Run: `cd backend && bun run build`
Expected: Build succeeds (template not registered yet, but workflow + subscriber should compile)

- [ ] **Step 4: Commit**

```bash
git add backend/src/subscribers/shipment-created.ts backend/src/workflows/notifications/send-shipping-confirmation.ts
git commit -m "$(cat <<'EOF'
feat(email): add shipping confirmation subscriber and workflow

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Order Canceled — Subscriber + Workflow

**Files:**
- Create: `backend/src/subscribers/order-canceled.ts`
- Create: `backend/src/workflows/notifications/send-order-canceled.ts`

- [ ] **Step 1: Create the subscriber**

```typescript
// backend/src/subscribers/order-canceled.ts
import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { sendOrderCanceledWorkflow } from "../workflows/notifications/send-order-canceled"

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
}

export const config: SubscriberConfig = {
  event: "order.canceled",
}
```

- [ ] **Step 2: Create the workflow**

```typescript
// backend/src/workflows/notifications/send-order-canceled.ts
import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { MedusaError } from "@medusajs/framework/utils"
import {
  useQueryGraphStep,
  sendNotificationsStep,
} from "@medusajs/medusa/core-flows"
import { formatOrderForEmailStep } from "../steps/format-order-for-email"

type SendOrderCanceledInput = {
  orderId: string
}

export const sendOrderCanceledWorkflow = createWorkflow(
  "send-order-canceled",
  function (input: SendOrderCanceledInput) {
    const { data: orders } = useQueryGraphStep({
      entity: "order",
      fields: [
        "id",
        "display_id",
        "email",
        "created_at",
        "currency_code",
        "items.*",
        "shipping_address.*",
        "total",
        "item_total",
        "item_subtotal",
        "shipping_total",
        "tax_total",
        "discount_total",
        "payment_collections.payments.refunds.*",
        "payment_collections.payments.amount",
        "payment_collections.payments.currency_code",
      ],
      filters: { id: input.orderId },
    })

    const order = transform({ orders }, ({ orders: result }) => {
      const o = result[0]
      if (!o?.email) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "Order has no email, cannot send cancellation email"
        )
      }
      return o
    })

    const formatted = formatOrderForEmailStep({ order })

    const notifications = transform(
      { formatted, order },
      ({ formatted: data, order: rawOrder }) => {
        const storefrontUrl =
          process.env.STOREFRONT_URL || "http://localhost:3000"

        // Compute refund status from payment data
        const currencyFormatter = new Intl.NumberFormat([], {
          style: "currency",
          currency: rawOrder.currency_code || "USD",
          currencyDisplay: "narrowSymbol",
        })

        let refundTotal = 0
        const paymentCollections =
          (rawOrder as any).payment_collections || []
        for (const pc of paymentCollections) {
          for (const payment of pc.payments || []) {
            for (const refund of payment.refunds || []) {
              refundTotal += Number(refund.amount) || 0
            }
          }
        }

        const refundMessage =
          refundTotal > 0
            ? `A refund of ${currencyFormatter.format(refundTotal)} has been issued to your original payment method.`
            : "If you were charged, a refund will be processed shortly."

        return [
          {
            to: data.email,
            channel: "email" as const,
            template: "order-canceled",
            data: {
              subject: `Your order #${data.orderNumber} has been canceled`,
              customerName: data.customerName,
              orderNumber: data.orderNumber,
              orderDate: data.orderDate,
              items: data.items,
              subtotal: data.subtotal,
              shipping: data.shipping,
              tax: data.tax,
              discount: data.discount,
              total: data.total,
              refundMessage,
              shopUrl: storefrontUrl,
            },
            trigger_type: "order.canceled",
            resource_id: data.orderId,
            resource_type: "order",
          },
        ]
      }
    )

    sendNotificationsStep(notifications)

    return new WorkflowResponse({
      orderId: input.orderId,
    })
  }
)
```

- [ ] **Step 3: Build to verify**

Run: `cd backend && bun run build`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add backend/src/subscribers/order-canceled.ts backend/src/workflows/notifications/send-order-canceled.ts
git commit -m "$(cat <<'EOF'
feat(email): add order canceled subscriber and workflow

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Refund Confirmation — Subscriber + Workflow + New Step

**Files:**
- Create: `backend/src/subscribers/payment-refunded.ts`
- Create: `backend/src/workflows/notifications/send-refund-confirmation.ts`
- Create: `backend/src/workflows/steps/format-refund-for-email.ts`

- [ ] **Step 1: Create the format refund step**

```typescript
// backend/src/workflows/steps/format-refund-for-email.ts
import {
  createStep,
  StepResponse,
} from "@medusajs/framework/workflows-sdk"

export type FormattedRefundEmailData = {
  paymentId: string
  orderId: string
  orderNumber: string
  email: string
  refundAmount: string
  refundDate: string
  refundReason?: string
  currencyCode: string
}

type FormatRefundForEmailInput = {
  payment: Record<string, any>
}

export const formatRefundForEmailStep = createStep(
  "format-refund-for-email",
  async (input: FormatRefundForEmailInput) => {
    const { payment } = input

    const currencyCode = payment.currency_code || "USD"
    const currencyFormatter = new Intl.NumberFormat([], {
      style: "currency",
      currency: currencyCode,
      currencyDisplay: "narrowSymbol",
    })

    // Get the most recent refund (last in array)
    const refunds = payment.refunds || []
    const latestRefund = refunds[refunds.length - 1]

    if (!latestRefund) {
      throw new Error("No refunds found on payment")
    }

    const order =
      payment.payment_collection?.order ||
      (payment as any).payment_collections?.[0]?.order

    const refundDate = new Date(
      latestRefund.created_at
    ).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })

    const formatted: FormattedRefundEmailData = {
      paymentId: payment.id,
      orderId: order?.id || "",
      orderNumber: String(order?.display_id || order?.id || ""),
      email: order?.email || "",
      refundAmount: currencyFormatter.format(
        Number(latestRefund.amount) || 0
      ),
      refundDate,
      refundReason: latestRefund.refund_reason?.label || undefined,
      currencyCode,
    }

    return new StepResponse(formatted)
  }
)
```

- [ ] **Step 2: Create the subscriber**

```typescript
// backend/src/subscribers/payment-refunded.ts
import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { sendRefundConfirmationWorkflow } from "../workflows/notifications/send-refund-confirmation"

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
}

export const config: SubscriberConfig = {
  event: "payment.refunded",
}
```

- [ ] **Step 3: Create the workflow**

```typescript
// backend/src/workflows/notifications/send-refund-confirmation.ts
import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { MedusaError } from "@medusajs/framework/utils"
import {
  useQueryGraphStep,
  sendNotificationsStep,
} from "@medusajs/medusa/core-flows"
import { formatRefundForEmailStep } from "../steps/format-refund-for-email"

type SendRefundConfirmationInput = {
  paymentId: string
}

export const sendRefundConfirmationWorkflow = createWorkflow(
  "send-refund-confirmation",
  function (input: SendRefundConfirmationInput) {
    const { data: payments } = useQueryGraphStep({
      entity: "payment",
      fields: [
        "id",
        "amount",
        "currency_code",
        "refunds.id",
        "refunds.amount",
        "refunds.created_at",
        "refunds.note",
        "refunds.refund_reason.label",
        "payment_collection.order.id",
        "payment_collection.order.display_id",
        "payment_collection.order.email",
      ],
      filters: { id: input.paymentId },
    })

    const payment = transform({ payments }, ({ payments: result }) => {
      const p = result[0]
      if (!p) {
        throw new MedusaError(
          MedusaError.Types.NOT_FOUND,
          "Payment not found"
        )
      }
      return p
    })

    const formatted = formatRefundForEmailStep({ payment })

    // Gracefully skip if payment can't be traced to an order (orphan payment).
    // Per spec: "Don't throw — refunds can exist without orders in edge cases."
    const notifications = transform(
      { formatted },
      ({ formatted: data }) => {
        if (!data.email) {
          // Return empty array — sendNotificationsStep will no-op
          return []
        }

        const storefrontUrl =
          process.env.STOREFRONT_URL || "http://localhost:3000"

        return [
          {
            to: data.email,
            channel: "email" as const,
            template: "refund-confirmation",
            data: {
              subject: `Refund issued for order #${data.orderNumber}`,
              orderNumber: data.orderNumber,
              refundAmount: data.refundAmount,
              refundDate: data.refundDate,
              refundReason: data.refundReason,
              orderUrl: data.orderId
                ? `${storefrontUrl}/account/orders/${data.orderId}`
                : undefined,
            },
            trigger_type: "payment.refunded",
            resource_id: data.paymentId,
            resource_type: "payment",
          },
        ]
      }
    )

    sendNotificationsStep(notifications)

    return new WorkflowResponse({
      paymentId: input.paymentId,
    })
  }
)
```

- [ ] **Step 4: Build to verify**

Run: `cd backend && bun run build`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add backend/src/workflows/steps/format-refund-for-email.ts backend/src/subscribers/payment-refunded.ts backend/src/workflows/notifications/send-refund-confirmation.ts
git commit -m "$(cat <<'EOF'
feat(email): add refund confirmation subscriber, workflow, and format step

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Admin New Order Alert — Subscriber + Workflow

**Files:**
- Create: `backend/src/subscribers/admin-order-alert.ts`
- Create: `backend/src/workflows/notifications/send-admin-order-alert.ts`

- [ ] **Step 1: Create the subscriber**

```typescript
// backend/src/subscribers/admin-order-alert.ts
import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { sendAdminOrderAlertWorkflow } from "../workflows/notifications/send-admin-order-alert"
import { resolveAdminUrl } from "./_helpers/resolve-urls"

export default async function adminOrderAlertHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve("logger")

  const rawEmails = process.env.ADMIN_ORDER_EMAILS
  if (!rawEmails || !rawEmails.trim()) {
    logger.debug(
      "ADMIN_ORDER_EMAILS not configured, skipping admin order alert"
    )
    return
  }

  const adminEmails = rawEmails
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)

  if (adminEmails.length === 0) {
    logger.debug(
      "ADMIN_ORDER_EMAILS is empty after parsing, skipping admin order alert"
    )
    return
  }

  // Resolve admin URL from configModule (needs container, so done here)
  const adminUrl = resolveAdminUrl(container) || "http://localhost:9000/app"

  try {
    await sendAdminOrderAlertWorkflow(container).run({
      input: { orderId: data.id, adminEmails, adminUrl },
    })
    logger.info(
      `Admin order alert sent for order ${data.id} to ${adminEmails.join(", ")}`
    )
  } catch (error) {
    logger.error(
      `Failed to send admin order alert for order ${data.id}`,
      error
    )
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
```

- [ ] **Step 2: Create the workflow**

```typescript
// backend/src/workflows/notifications/send-admin-order-alert.ts
import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { MedusaError } from "@medusajs/framework/utils"
import {
  useQueryGraphStep,
  sendNotificationsStep,
} from "@medusajs/medusa/core-flows"
import {
  formatOrderForEmailStep,
  type Address,
} from "../steps/format-order-for-email"

type SendAdminOrderAlertInput = {
  orderId: string
  adminEmails: string[]
  adminUrl: string
}

export const sendAdminOrderAlertWorkflow = createWorkflow(
  "send-admin-order-alert",
  function (input: SendAdminOrderAlertInput) {
    const { data: orders } = useQueryGraphStep({
      entity: "order",
      fields: [
        "id",
        "display_id",
        "email",
        "created_at",
        "currency_code",
        "items.*",
        "shipping_address.*",
        "billing_address.*",
        "total",
        "item_total",
        "item_subtotal",
        "shipping_total",
        "tax_total",
        "discount_total",
      ],
      filters: { id: input.orderId },
    })

    const order = transform({ orders }, ({ orders: result }) => {
      const o = result[0]
      if (!o) {
        throw new MedusaError(
          MedusaError.Types.NOT_FOUND,
          "Order not found for admin alert"
        )
      }
      return o
    })

    const formatted = formatOrderForEmailStep({ order })

    const notifications = transform(
      { formatted, order, adminEmails: input.adminEmails, adminUrl: input.adminUrl },
      ({ formatted: data, order: rawOrder, adminEmails, adminUrl }) => {
        // Extract billing address (formatOrderForEmailStep only outputs shippingAddress)
        const ba = (rawOrder as any).billing_address
        const billingAddress: Address | undefined = ba
          ? {
              name: `${ba.first_name || ""} ${ba.last_name || ""}`.trim(),
              line1: ba.address_1 || "",
              line2: ba.address_2 || undefined,
              city: ba.city || "",
              state: ba.province || undefined,
              postalCode: ba.postal_code || "",
              country: ba.country_code?.toUpperCase() || "",
              phone: ba.phone || undefined,
            }
          : undefined

        return adminEmails.map((adminEmail) => ({
          to: adminEmail,
          channel: "email" as const,
          template: "admin-order-alert",
          data: {
            subject: `New order #${data.orderNumber} — ${data.total}`,
            orderNumber: data.orderNumber,
            orderDate: data.orderDate,
            customerEmail: data.email,
            customerName: data.customerName,
            items: data.items,
            subtotal: data.subtotal,
            shipping: data.shipping,
            tax: data.tax,
            discount: data.discount,
            total: data.total,
            shippingAddress: data.shippingAddress,
            billingAddress,
            adminOrderUrl: `${adminUrl}/orders/${data.orderId}`,
          },
          trigger_type: "order.placed",
          resource_id: data.orderId,
          resource_type: "order",
        }))
      }
    )

    sendNotificationsStep(notifications)

    return new WorkflowResponse({
      orderId: input.orderId,
    })
  }
)
```

- [ ] **Step 3: Build to verify**

Run: `cd backend && bun run build`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add backend/src/subscribers/admin-order-alert.ts backend/src/workflows/notifications/send-admin-order-alert.ts
git commit -m "$(cat <<'EOF'
feat(email): add admin new order alert subscriber and workflow

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Shipping Confirmation Template

**Files:**
- Create: `backend/src/modules/resend/templates/shipping-confirmation.tsx`

- [ ] **Step 1: Create the template**

```tsx
// backend/src/modules/resend/templates/shipping-confirmation.tsx
import {
  Container,
  Html,
  Preview,
  Row,
  Section,
  Column,
} from "@react-email/components"
import { Body } from "./_components/body"
import { Button } from "./_components/button"
import { LeftAligned as Footer } from "./_components/footer"
import { Head } from "./_components/head"
import { LeftAligned as Header } from "./_components/header"
import { Tailwind } from "./_components/tailwind"
import { Text } from "./_components/text"
import { OrderSummary } from "./_commerce/order-summary"
import { AddressBlock } from "./_commerce/address-block"
import { getEmailConfig } from "./_config/email-config"
import type { CommerceLineItem, Address, BaseTemplateProps } from "./types"

export interface ShippingConfirmationProps extends BaseTemplateProps {
  customerName?: string
  orderNumber: string
  orderDate: string
  items: CommerceLineItem[]
  subtotal: string
  shipping: string
  tax?: string
  discount?: string
  total: string
  shippingAddress: Address
  trackingNumber?: string | null
  trackingUrl?: string | null
  orderStatusUrl?: string
}

export const ShippingConfirmation = ({
  theme,
  customerName,
  orderNumber,
  orderDate,
  items,
  subtotal,
  shipping,
  tax,
  total,
  discount,
  shippingAddress,
  trackingNumber,
  trackingUrl,
  orderStatusUrl,
  brandConfig,
}: ShippingConfirmationProps) => {
  const config = getEmailConfig(brandConfig)
  const greeting = customerName ? `Hi ${customerName},` : "Hi there,"

  return (
    <Html>
      <Tailwind theme={theme}>
        <Head />
        <Preview>
          Order #{orderNumber} has shipped
        </Preview>
        <Body>
          <Container
            align="center"
            className="w-full max-w-160 bg-primary md:p-8"
          >
            <Header logoUrl={config.logoUrl} logoAlt={config.logoAlt} />
            <Section align="left" className="max-w-full px-6 py-8">
              <Row className="mb-6">
                <Text className="text-display-xs font-semibold text-primary">
                  Your order is on its way!
                </Text>
              </Row>
              <Row className="mb-6">
                <Text className="text-tertiary">
                  {greeting}
                  <br />
                  <br />
                  Great news — your order #{orderNumber} has shipped
                  {trackingNumber
                    ? " and is on its way to you."
                    : ". Tracking details will be available soon."}
                </Text>
              </Row>

              {trackingNumber && (
                <Section className="mb-6 rounded-lg border border-solid border-secondary bg-secondary px-4 py-4">
                  <Row>
                    <Column>
                      <Text className="m-0 text-xs font-medium uppercase text-tertiary">
                        Tracking Number
                      </Text>
                      <Text className="m-0 mt-1 text-sm font-semibold text-primary">
                        {trackingNumber}
                      </Text>
                    </Column>
                  </Row>
                </Section>
              )}

              <Row className="mb-2">
                <Column>
                  <Text className="m-0 text-xs font-medium uppercase text-tertiary">
                    Order Number
                  </Text>
                  <Text className="m-0 mt-1 text-sm font-semibold text-primary">
                    #{orderNumber}
                  </Text>
                </Column>
                <Column align="right">
                  <Text className="m-0 text-xs font-medium uppercase text-tertiary">
                    Order Date
                  </Text>
                  <Text className="m-0 mt-1 text-sm text-primary">
                    {orderDate}
                  </Text>
                </Column>
              </Row>

              {/* Item list — inline rendering matching order-confirmation pattern */}
              <Section className="my-6 rounded-lg border border-solid border-secondary">
                <Row className="border-b border-solid border-secondary bg-secondary px-4 py-3">
                  <Column className="w-[50%]">
                    <Text className="m-0 text-xs font-medium uppercase text-tertiary">
                      Item
                    </Text>
                  </Column>
                  <Column className="w-[15%]" align="center">
                    <Text className="m-0 text-xs font-medium uppercase text-tertiary">
                      Qty
                    </Text>
                  </Column>
                  <Column className="w-[20%]" align="right">
                    <Text className="m-0 text-xs font-medium uppercase text-tertiary">
                      Price
                    </Text>
                  </Column>
                </Row>
                {items.map((item, index) => (
                  <Row
                    key={index}
                    className={`px-4 py-3 ${
                      index < items.length - 1
                        ? "border-b border-solid border-secondary"
                        : ""
                    }`}
                  >
                    <Column className="w-[50%]">
                      <Text className="m-0 text-sm text-primary">
                        {item.name}
                      </Text>
                      {item.variant && (
                        <Text className="m-0 text-xs text-tertiary">
                          {item.variant}
                        </Text>
                      )}
                    </Column>
                    <Column className="w-[15%]" align="center">
                      <Text className="m-0 text-sm text-tertiary">
                        {item.quantity || 1}
                      </Text>
                    </Column>
                    <Column className="w-[20%]" align="right">
                      <Text className="m-0 text-sm text-primary">
                        {item.price}
                      </Text>
                    </Column>
                  </Row>
                ))}
              </Section>

              <OrderSummary
                subtotal={subtotal}
                shipping={shipping}
                discount={discount}
                tax={tax}
                total={total}
              />

              <AddressBlock label="Shipping Address" address={shippingAddress} />

              <Row className="mt-6 mb-6">
                <Button href={trackingUrl || orderStatusUrl || "#"}>
                  <Text className="text-md font-semibold">
                    {trackingNumber ? "Track your order" : "View your order"}
                  </Text>
                </Button>
              </Row>

              <Row>
                <Text className="text-md text-tertiary">
                  If you have any questions, contact us at{" "}
                  <a
                    href={`mailto:${config.supportEmail}`}
                    className="text-brand-secondary"
                  >
                    {config.supportEmail}
                  </a>
                  .
                </Text>
              </Row>
            </Section>
            <Footer
              companyName={config.companyName}
              copyrightYear={config.copyrightYear}
              legalLinks={config.legalLinks}
            />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}

ShippingConfirmation.PreviewProps = {
  customerName: "Sarah",
  orderNumber: "1042",
  orderDate: "March 14, 2026",
  items: [
    {
      name: "Leather Crossbody Bag",
      variant: "Tan / One Size",
      quantity: 1,
      price: "$128.00",
    },
    {
      name: "Merino Wool Scarf",
      variant: "Charcoal",
      quantity: 2,
      price: "$98.00",
    },
  ],
  subtotal: "$226.00",
  shipping: "$8.00",
  tax: "$18.72",
  total: "$252.72",
  shippingAddress: {
    name: "Sarah Chen",
    line1: "123 Market Street",
    line2: "Apt 4B",
    city: "San Francisco",
    state: "CA",
    postalCode: "94105",
    country: "US",
  },
  trackingNumber: "1Z999AA10123456784",
  trackingUrl: "http://localhost:3000/account/orders/order_01ABC",
  orderStatusUrl: "http://localhost:3000/account/orders/order_01ABC",
} satisfies ShippingConfirmationProps

export default ShippingConfirmation
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/modules/resend/templates/shipping-confirmation.tsx
git commit -m "$(cat <<'EOF'
feat(email): add shipping confirmation template

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Order Canceled Template

**Files:**
- Create: `backend/src/modules/resend/templates/order-canceled.tsx`

- [ ] **Step 1: Create the template**

```tsx
// backend/src/modules/resend/templates/order-canceled.tsx
import {
  Container,
  Html,
  Preview,
  Row,
  Section,
  Column,
} from "@react-email/components"
import { Body } from "./_components/body"
import { Button } from "./_components/button"
import { LeftAligned as Footer } from "./_components/footer"
import { Head } from "./_components/head"
import { LeftAligned as Header } from "./_components/header"
import { Tailwind } from "./_components/tailwind"
import { Text } from "./_components/text"
import { OrderSummary } from "./_commerce/order-summary"
import { getEmailConfig } from "./_config/email-config"
import type { CommerceLineItem, BaseTemplateProps } from "./types"

export interface OrderCanceledProps extends BaseTemplateProps {
  customerName?: string
  orderNumber: string
  orderDate: string
  items: CommerceLineItem[]
  subtotal: string
  shipping: string
  tax?: string
  discount?: string
  total: string
  refundMessage: string
  shopUrl?: string
}

export const OrderCanceled = ({
  theme,
  customerName,
  orderNumber,
  orderDate,
  items,
  subtotal,
  shipping,
  tax,
  discount,
  total,
  refundMessage,
  shopUrl,
  brandConfig,
}: OrderCanceledProps) => {
  const config = getEmailConfig(brandConfig)
  const greeting = customerName ? `Hi ${customerName},` : "Hi there,"

  return (
    <Html>
      <Tailwind theme={theme}>
        <Head />
        <Preview>Order #{orderNumber} has been canceled</Preview>
        <Body>
          <Container
            align="center"
            className="w-full max-w-160 bg-primary md:p-8"
          >
            <Header logoUrl={config.logoUrl} logoAlt={config.logoAlt} />
            <Section align="left" className="max-w-full px-6 py-8">
              <Row className="mb-6">
                <Text className="text-display-xs font-semibold text-primary">
                  Your order has been canceled
                </Text>
              </Row>
              <Row className="mb-6">
                <Text className="text-tertiary">
                  {greeting}
                  <br />
                  <br />
                  Your order #{orderNumber} placed on {orderDate} has been
                  canceled.
                </Text>
              </Row>

              {/* Refund status */}
              <Section className="mb-6 rounded-lg border border-solid border-secondary bg-secondary px-4 py-4">
                <Row>
                  <Text className="m-0 text-sm text-primary">
                    {refundMessage}
                  </Text>
                </Row>
              </Section>

              {/* Item list */}
              <Section className="my-6 rounded-lg border border-solid border-secondary">
                <Row className="border-b border-solid border-secondary bg-secondary px-4 py-3">
                  <Column className="w-[50%]">
                    <Text className="m-0 text-xs font-medium uppercase text-tertiary">
                      Item
                    </Text>
                  </Column>
                  <Column className="w-[15%]" align="center">
                    <Text className="m-0 text-xs font-medium uppercase text-tertiary">
                      Qty
                    </Text>
                  </Column>
                  <Column className="w-[20%]" align="right">
                    <Text className="m-0 text-xs font-medium uppercase text-tertiary">
                      Price
                    </Text>
                  </Column>
                </Row>
                {items.map((item, index) => (
                  <Row
                    key={index}
                    className={`px-4 py-3 ${
                      index < items.length - 1
                        ? "border-b border-solid border-secondary"
                        : ""
                    }`}
                  >
                    <Column className="w-[50%]">
                      <Text className="m-0 text-sm text-primary">
                        {item.name}
                      </Text>
                      {item.variant && (
                        <Text className="m-0 text-xs text-tertiary">
                          {item.variant}
                        </Text>
                      )}
                    </Column>
                    <Column className="w-[15%]" align="center">
                      <Text className="m-0 text-sm text-tertiary">
                        {item.quantity || 1}
                      </Text>
                    </Column>
                    <Column className="w-[20%]" align="right">
                      <Text className="m-0 text-sm text-primary">
                        {item.price}
                      </Text>
                    </Column>
                  </Row>
                ))}
              </Section>

              <OrderSummary
                subtotal={subtotal}
                shipping={shipping}
                discount={discount}
                tax={tax}
                total={total}
              />

              <Row>
                <Text className="text-md text-tertiary">
                  If you have any questions, contact us at{" "}
                  <a
                    href={`mailto:${config.supportEmail}`}
                    className="text-brand-secondary"
                  >
                    {config.supportEmail}
                  </a>
                  .
                </Text>
              </Row>

              {shopUrl && (
                <Row className="mt-6 mb-6">
                  <Button href={shopUrl}>
                    <Text className="text-md font-semibold">
                      Continue shopping
                    </Text>
                  </Button>
                </Row>
              )}
            </Section>
            <Footer
              companyName={config.companyName}
              copyrightYear={config.copyrightYear}
              legalLinks={config.legalLinks}
            />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}

OrderCanceled.PreviewProps = {
  customerName: "Sarah",
  orderNumber: "1042",
  orderDate: "March 14, 2026",
  items: [
    {
      name: "Leather Crossbody Bag",
      variant: "Tan / One Size",
      quantity: 1,
      price: "$128.00",
    },
    {
      name: "Merino Wool Scarf",
      variant: "Charcoal",
      quantity: 2,
      price: "$98.00",
    },
  ],
  subtotal: "$226.00",
  shipping: "$8.00",
  tax: "$18.72",
  discount: "$10.00",
  total: "$242.72",
  refundMessage:
    "A refund of $242.72 has been issued to your original payment method.",
  shopUrl: "http://localhost:3000",
} satisfies OrderCanceledProps

export default OrderCanceled
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/modules/resend/templates/order-canceled.tsx
git commit -m "$(cat <<'EOF'
feat(email): add order canceled template

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Refund Confirmation Template

**Files:**
- Create: `backend/src/modules/resend/templates/refund-confirmation.tsx`

- [ ] **Step 1: Create the template**

```tsx
// backend/src/modules/resend/templates/refund-confirmation.tsx
import {
  Container,
  Html,
  Preview,
  Row,
  Section,
} from "@react-email/components"
import { Body } from "./_components/body"
import { Button } from "./_components/button"
import { LeftAligned as Footer } from "./_components/footer"
import { Head } from "./_components/head"
import { LeftAligned as Header } from "./_components/header"
import { Tailwind } from "./_components/tailwind"
import { Text } from "./_components/text"
import { getEmailConfig } from "./_config/email-config"
import type { BaseTemplateProps } from "./types"

export interface RefundConfirmationProps extends BaseTemplateProps {
  orderNumber: string
  refundAmount: string
  refundDate: string
  refundReason?: string
  orderUrl?: string
}

export const RefundConfirmation = ({
  theme,
  orderNumber,
  refundAmount,
  refundDate,
  refundReason,
  orderUrl,
  brandConfig,
}: RefundConfirmationProps) => {
  const config = getEmailConfig(brandConfig)

  return (
    <Html>
      <Tailwind theme={theme}>
        <Head />
        <Preview>
          Refund of {refundAmount} issued for order #{orderNumber}
        </Preview>
        <Body>
          <Container
            align="center"
            className="w-full max-w-160 bg-primary md:p-8"
          >
            <Header logoUrl={config.logoUrl} logoAlt={config.logoAlt} />
            <Section align="left" className="max-w-full px-6 py-8">
              <Row className="mb-6">
                <Text className="text-display-xs font-semibold text-primary">
                  Your refund has been processed
                </Text>
              </Row>
              <Row className="mb-6">
                <Text className="text-tertiary">
                  We've issued a refund for your order #{orderNumber}. Here
                  are the details:
                </Text>
              </Row>

              {/* Refund details */}
              <Section className="mb-6 rounded-lg border border-solid border-secondary bg-secondary px-4 py-4">
                <Row className="mb-2">
                  <Text className="m-0 text-xs font-medium uppercase text-tertiary">
                    Refund Amount
                  </Text>
                  <Text className="m-0 mt-1 text-lg font-semibold text-primary">
                    {refundAmount}
                  </Text>
                </Row>
                <Row className="mb-2">
                  <Text className="m-0 text-xs font-medium uppercase text-tertiary">
                    Date Processed
                  </Text>
                  <Text className="m-0 mt-1 text-sm text-primary">
                    {refundDate}
                  </Text>
                </Row>
                {refundReason && (
                  <Row>
                    <Text className="m-0 text-xs font-medium uppercase text-tertiary">
                      Reason
                    </Text>
                    <Text className="m-0 mt-1 text-sm text-primary">
                      {refundReason}
                    </Text>
                  </Row>
                )}
                <Row>
                  <Text className="m-0 text-xs font-medium uppercase text-tertiary">
                    Order
                  </Text>
                  <Text className="m-0 mt-1 text-sm font-semibold text-primary">
                    #{orderNumber}
                  </Text>
                </Row>
              </Section>

              <Row className="mb-6">
                <Text className="text-sm text-tertiary">
                  Refunds typically appear on your statement within 5–10
                  business days depending on your bank.
                </Text>
              </Row>

              {orderUrl && (
                <Row className="mt-2 mb-6">
                  <Button href={orderUrl}>
                    <Text className="text-md font-semibold">
                      View your order
                    </Text>
                  </Button>
                </Row>
              )}

              <Row>
                <Text className="text-md text-tertiary">
                  If you have any questions, contact us at{" "}
                  <a
                    href={`mailto:${config.supportEmail}`}
                    className="text-brand-secondary"
                  >
                    {config.supportEmail}
                  </a>
                  .
                </Text>
              </Row>
            </Section>
            <Footer
              companyName={config.companyName}
              copyrightYear={config.copyrightYear}
              legalLinks={config.legalLinks}
            />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}

RefundConfirmation.PreviewProps = {
  orderNumber: "1042",
  refundAmount: "$25.00",
  refundDate: "March 16, 2026",
  refundReason: "Item damaged",
  orderUrl: "http://localhost:3000/account/orders/order_01ABC",
} satisfies RefundConfirmationProps

export default RefundConfirmation
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/modules/resend/templates/refund-confirmation.tsx
git commit -m "$(cat <<'EOF'
feat(email): add refund confirmation template

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Admin New Order Alert Template

**Files:**
- Create: `backend/src/modules/resend/templates/admin-order-alert.tsx`

- [ ] **Step 1: Create the template**

```tsx
// backend/src/modules/resend/templates/admin-order-alert.tsx
import {
  Container,
  Html,
  Preview,
  Row,
  Section,
  Column,
} from "@react-email/components"
import { Body } from "./_components/body"
import { Button } from "./_components/button"
import { LeftAligned as Footer } from "./_components/footer"
import { Head } from "./_components/head"
import { LeftAligned as Header } from "./_components/header"
import { Tailwind } from "./_components/tailwind"
import { Text } from "./_components/text"
import { OrderSummary } from "./_commerce/order-summary"
import { AddressBlock } from "./_commerce/address-block"
import { getEmailConfig } from "./_config/email-config"
import type { CommerceLineItem, Address, BaseTemplateProps } from "./types"

export interface AdminOrderAlertProps extends BaseTemplateProps {
  orderNumber: string
  orderDate: string
  customerEmail: string
  customerName?: string
  items: CommerceLineItem[]
  subtotal: string
  shipping: string
  tax?: string
  discount?: string
  total: string
  shippingAddress: Address
  billingAddress?: Address
  adminOrderUrl?: string
}

export const AdminOrderAlert = ({
  theme,
  orderNumber,
  orderDate,
  customerEmail,
  customerName,
  items,
  subtotal,
  shipping,
  tax,
  total,
  discount,
  shippingAddress,
  billingAddress,
  adminOrderUrl,
  brandConfig,
}: AdminOrderAlertProps) => {
  const config = getEmailConfig(brandConfig)

  return (
    <Html>
      <Tailwind theme={theme}>
        <Head />
        <Preview>
          New order #{orderNumber} — {total}
        </Preview>
        <Body>
          <Container
            align="center"
            className="w-full max-w-160 bg-primary md:p-8"
          >
            <Header logoUrl={config.logoUrl} logoAlt={config.logoAlt} />
            <Section align="left" className="max-w-full px-6 py-8">
              <Row className="mb-6">
                <Text className="text-display-xs font-semibold text-primary">
                  New order received
                </Text>
              </Row>

              {/* Customer + order summary */}
              <Section className="mb-6 rounded-lg border border-solid border-secondary bg-secondary px-4 py-4">
                <Row className="mb-2">
                  <Column>
                    <Text className="m-0 text-xs font-medium uppercase text-tertiary">
                      Customer
                    </Text>
                    <Text className="m-0 mt-1 text-sm text-primary">
                      {customerName
                        ? `${customerName} (${customerEmail})`
                        : customerEmail}
                    </Text>
                  </Column>
                </Row>
                <Row>
                  <Column>
                    <Text className="m-0 text-xs font-medium uppercase text-tertiary">
                      Order
                    </Text>
                    <Text className="m-0 mt-1 text-sm font-semibold text-primary">
                      #{orderNumber}
                    </Text>
                  </Column>
                  <Column align="right">
                    <Text className="m-0 text-xs font-medium uppercase text-tertiary">
                      Date
                    </Text>
                    <Text className="m-0 mt-1 text-sm text-primary">
                      {orderDate}
                    </Text>
                  </Column>
                </Row>
              </Section>

              {/* Item list */}
              <Section className="my-6 rounded-lg border border-solid border-secondary">
                <Row className="border-b border-solid border-secondary bg-secondary px-4 py-3">
                  <Column className="w-[50%]">
                    <Text className="m-0 text-xs font-medium uppercase text-tertiary">
                      Item
                    </Text>
                  </Column>
                  <Column className="w-[15%]" align="center">
                    <Text className="m-0 text-xs font-medium uppercase text-tertiary">
                      Qty
                    </Text>
                  </Column>
                  <Column className="w-[20%]" align="right">
                    <Text className="m-0 text-xs font-medium uppercase text-tertiary">
                      Price
                    </Text>
                  </Column>
                </Row>
                {items.map((item, index) => (
                  <Row
                    key={index}
                    className={`px-4 py-3 ${
                      index < items.length - 1
                        ? "border-b border-solid border-secondary"
                        : ""
                    }`}
                  >
                    <Column className="w-[50%]">
                      <Text className="m-0 text-sm text-primary">
                        {item.name}
                      </Text>
                      {item.variant && (
                        <Text className="m-0 text-xs text-tertiary">
                          {item.variant}
                        </Text>
                      )}
                    </Column>
                    <Column className="w-[15%]" align="center">
                      <Text className="m-0 text-sm text-tertiary">
                        {item.quantity || 1}
                      </Text>
                    </Column>
                    <Column className="w-[20%]" align="right">
                      <Text className="m-0 text-sm text-primary">
                        {item.price}
                      </Text>
                    </Column>
                  </Row>
                ))}
              </Section>

              <OrderSummary
                subtotal={subtotal}
                shipping={shipping}
                discount={discount}
                tax={tax}
                total={total}
              />

              <Row>
                <Column className="w-1/2">
                  <AddressBlock
                    label="Shipping Address"
                    address={shippingAddress}
                  />
                </Column>
                {billingAddress && (
                  <Column className="w-1/2">
                    <AddressBlock
                      label="Billing Address"
                      address={billingAddress}
                    />
                  </Column>
                )}
              </Row>

              {adminOrderUrl && (
                <Row className="mt-6 mb-6">
                  <Button href={adminOrderUrl}>
                    <Text className="text-md font-semibold">
                      View in admin
                    </Text>
                  </Button>
                </Row>
              )}
            </Section>
            {/* Minimal footer for internal email — no social links or legal */}
            <Section className="px-6 pb-6">
              <Text className="text-xs text-quaternary">
                This is an automated notification from {config.companyName}.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}

AdminOrderAlert.PreviewProps = {
  orderNumber: "1042",
  orderDate: "March 14, 2026",
  customerEmail: "sarah@example.com",
  customerName: "Sarah Chen",
  items: [
    {
      name: "Leather Crossbody Bag",
      variant: "Tan / One Size",
      quantity: 1,
      price: "$128.00",
    },
    {
      name: "Merino Wool Scarf",
      variant: "Charcoal",
      quantity: 2,
      price: "$98.00",
    },
  ],
  subtotal: "$226.00",
  shipping: "$8.00",
  tax: "$18.72",
  discount: "$10.00",
  total: "$242.72",
  shippingAddress: {
    name: "Sarah Chen",
    line1: "123 Market Street",
    line2: "Apt 4B",
    city: "San Francisco",
    state: "CA",
    postalCode: "94105",
    country: "US",
  },
  billingAddress: {
    name: "Sarah Chen",
    line1: "123 Market Street",
    line2: "Apt 4B",
    city: "San Francisco",
    state: "CA",
    postalCode: "94105",
    country: "US",
  },
  adminOrderUrl: "http://localhost:9000/app/orders/order_01ABC",
} satisfies AdminOrderAlertProps

export default AdminOrderAlert
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/modules/resend/templates/admin-order-alert.tsx
git commit -m "$(cat <<'EOF'
feat(email): add admin new order alert template

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Register Templates + Build + Verify

**Files:**
- Modify: `backend/src/modules/resend/service.ts:12-38` (imports + template map)

- [ ] **Step 1: Add imports and register templates in service.ts**

Add after line 15 (after the `Welcome` import):

```typescript
import { ShippingConfirmation } from "./templates/shipping-confirmation"
import { OrderCanceled } from "./templates/order-canceled"
import { RefundConfirmation } from "./templates/refund-confirmation"
import { AdminOrderAlert } from "./templates/admin-order-alert"
```

Update the template map (line 34-39) to include the new templates:

```typescript
  private templates: Record<string, React.FC<any>> = {
    "order-confirmation": OrderConfirmation,
    "password-reset": PasswordReset,
    "invite-user": InviteUser,
    "welcome": Welcome,
    "shipping-confirmation": ShippingConfirmation,
    "order-canceled": OrderCanceled,
    "refund-confirmation": RefundConfirmation,
    "admin-order-alert": AdminOrderAlert,
  }
```

- [ ] **Step 2: Full build**

Run: `cd backend && bun run build`
Expected: Build succeeds with no type errors

- [ ] **Step 3: Verify email preview works**

Run: `bun run dev:emails`
Expected: Preview server starts, all 8 templates visible in the sidebar with preview data

- [ ] **Step 4: Commit**

```bash
git add backend/src/modules/resend/service.ts
git commit -m "$(cat <<'EOF'
feat(email): register 4 new email templates in Resend provider

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: Documentation + Final Verification

**Files:**
- Modify: `TODO.md`

- [ ] **Step 1: Update TODO.md**

Add under "Content & Communications" section:

```markdown
- [x] Shipping confirmation email (`shipment.created` → subscriber → workflow → template)
- [x] Order canceled email with refund status (`order.canceled`)
- [x] Refund confirmation email (`payment.refunded`)
- [x] Admin new order alert (dual subscriber on `order.placed`, `ADMIN_ORDER_EMAILS` env var)
```

- [ ] **Step 2: Final full build from root**

Run: `bun run build`
Expected: All workspaces build successfully

- [ ] **Step 3: Commit**

```bash
git add TODO.md
git commit -m "$(cat <<'EOF'
docs: mark order lifecycle emails complete in TODO.md

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```
