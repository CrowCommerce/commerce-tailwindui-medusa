# Re-Order Feature — Design Spec

**Date:** 2026-03-25
**Status:** Approved
**Reference:** https://docs.medusajs.com/resources/how-to-tutorials/tutorials/re-order

---

## Overview

Allow authenticated customers to re-order any previous order with a single click. The feature creates a new cart pre-populated with the original order's items, addresses, and shipping method, then redirects the customer to checkout. Unavailable items are handled by Medusa's native cart validation (errors surface as a generic failure message). Implementation follows the Medusa tutorial with one addition: Zod validation on the API route input.

---

## Backend

### Workflow

**File:** `backend/src/workflows/reorder.ts`

A `createWorkflow` using `@medusajs/framework/workflows-sdk` with four sequential steps:

1. **Retrieve order** — fetch the original order by ID including items, shipping address, billing address, and shipping methods
2. **Create cart** — create a new cart with the order's `region_id` and authenticated customer context
3. **Add items** — add the original line items (variant IDs + quantities) to the new cart
4. **Apply shipping** — apply the original shipping method to the new cart

Returns the newly created cart.

### API Route

**File:** `backend/src/api/store/customers/me/orders/[id]/reorder/route.ts`

- Method: `POST`
- Auth: Protected via Medusa customer session middleware (existing `authenticate` middleware applied to the `/store/customers/me` route tree)
- Input validation: Zod schema validates `id` param matches `/^order_[a-z0-9]+$/`
- Invokes `reorderWorkflow(container).run({ input: { orderId: id, customerId } })`
- Response: `{ cart }` on success, standard Medusa error response on failure

---

## Storefront

### Server Action

**File:** `storefront/lib/medusa/reorder.ts`

```ts
export async function reorder(orderId: string): Promise<{ cart: HttpTypes.StoreCart } | { error: string }>
```

- Calls `POST /store/customers/me/orders/:id/reorder` via the Medusa SDK
- On success: stores the returned cart ID in cookies using the existing `setCartId` pattern from `lib/medusa/cookies.ts`, returns `{ cart }`
- On error: returns `{ error: string }` — message surfaced from Medusa's error response

### ReorderButton Component

**File:** `storefront/components/account/reorder-button.tsx`

- `'use client'` component
- Props: `{ orderId: string; className?: string }`
- States: idle → loading → (success | error)
- On click: calls `reorder(orderId)`, tracks `reorder_initiated` PostHog event
- On success: calls `router.push('/checkout')`
- On error: displays inline error message beneath the button; tracks `reorder_failed` PostHog event
- Renders a spinner during loading state using existing project spinner pattern
- Accepts `className` for flexible placement in list vs. detail contexts

### Order Detail Page

**File:** `storefront/components/account/order-detail.tsx`

Add `<ReorderButton orderId={order.id} />` to the order summary header area, alongside existing order metadata.

### Order List Page

**File:** `storefront/app/account/orders/page.tsx`

Add `<ReorderButton orderId={order.id} />` as a small secondary button on each order row, alongside the existing "View order" link.

---

## Analytics

Two new events added to the `AnalyticsEvents` type map:

| Event | Properties | Trigger |
|-------|-----------|---------|
| `reorder_initiated` | `order_id: string` | Button clicked (before action resolves) |
| `reorder_failed` | `order_id: string, error: string` | Action returns an error |

Success is already covered by existing checkout flow events (`checkout_started`, etc.).

---

## Error Handling

- **Item unavailable / variant deleted:** Medusa's cart validation rejects the cart creation and returns an error. `ReorderButton` surfaces this as: _"Some items from this order are no longer available."_
- **Network/backend error:** Generic fallback: _"Something went wrong. Please try again."_
- **Unauthenticated:** Cannot reach the button (order detail/list pages are already behind auth). The API route's middleware provides a second layer of protection.

---

## Sentry

- Capture in the `reorder` server action's catch block with `tags: { order_id }` — consistent with other commerce-critical server action error capture patterns

---

## Out of Scope

- Partial re-order (selecting a subset of items)
- Applying original discount codes
- Shipping method unavailability handling (beyond Medusa's native error)
- Guest re-order (requires an account)
