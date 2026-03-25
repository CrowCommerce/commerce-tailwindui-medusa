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

A `createWorkflow` using `@medusajs/framework/workflows-sdk` with four sequential steps, following the tutorial exactly:

1. **Retrieve order** — `useQueryGraphStep` to fetch the original order including items, shipping address, billing address, region, sales channel, shipping methods, and customer info
2. **Create cart** — `createCartWorkflow` (from `@medusajs/medusa/core-flows`) with customer, region, sales channel, addresses, and items transformed from the original order
3. **Apply shipping** — `addShippingMethodToCartWorkflow` (from `@medusajs/medusa/core-flows`) to apply the original order's shipping method(s) to the new cart
4. **Retrieve new cart** — `useQueryGraphStep` to fetch the newly created cart's full details

Returns the newly created cart.

### API Route

**File:** `backend/src/api/store/customers/me/orders/[id]/reorder/route.ts`

- Method: `POST`
- Auth: Protected via Medusa customer session middleware (existing `authenticate` middleware applied to the `/store/customers/me` route tree)
- Input validation: Zod schema defined inline in the route file — validates `id` path param matches `/^order_[a-z0-9]+$/`, returns 400 if invalid
- Invokes `reorderWorkflow(container).run({ input: { orderId: id, customerId } })`
- Response: `{ cart }` on success, standard Medusa error response on failure

---

## Storefront

### Server Action

**File:** `storefront/lib/medusa/reorder.ts`

```ts
export async function reorder(orderId: string): Promise<{ cart: HttpTypes.StoreCart } | { error: string }>
```

- This is a custom backend route, not a native Medusa SDK endpoint. Call it using `sdk.client.fetch<{ cart: HttpTypes.StoreCart }>(\`/store/customers/me/orders/${orderId}/reorder\`, { method: 'POST' })`
- On success: silently overwrites the cart cookie by calling `setCartId(cart.id)` from `lib/medusa/cookies.ts`. Any existing cart in the cookie is abandoned — this is acceptable because the customer's intent is to start a new purchase. Returns `{ cart }`.
- On error: catches the error, passes a sanitized message (not the raw Medusa error string) to `{ error }`, and re-throws to Sentry. See Error Handling section for the two message strings.

### ReorderButton Component

**File:** `storefront/components/account/reorder-button.tsx`

- `'use client'` component
- Props: `{ orderId: string; className?: string }`
- States: idle → loading → (success redirects away | error shows message)
- On click: disables only this button instance (not sibling `ReorderButton` instances on the list page), calls `reorder(orderId)`, tracks `reorder_initiated` PostHog event
- On success: calls `router.push('/checkout')`. The cart cookie has already been set; if navigation fails or the user closes the tab before the redirect completes, their next visit will open with the reorder cart — this is acceptable.
- On error: displays inline error message beneath the button; tracks `reorder_failed` PostHog event; re-enables the button
- Renders a spinner during loading state using the existing project spinner pattern
- Accepts `className` for flexible placement in list vs. detail contexts

### Order Detail Page

**File:** `storefront/components/account/order-detail.tsx`

Add `<ReorderButton orderId={order.id} />` to the order summary header area, alongside existing order metadata.

### Order List Page

**File:** `storefront/app/account/orders/page.tsx`

Add `<ReorderButton orderId={order.id} />` as a small secondary button on each order row, alongside the existing "View order" link.

---

## Analytics

Two new events added to the `AnalyticsEvents` type map. Both fire client-side in `ReorderButton`:

| Event | Properties | Trigger |
|-------|-----------|---------|
| `reorder_initiated` | `order_id: string` | On button click, before the action resolves |
| `reorder_failed` | `order_id: string, error_code: string` | When the action returns an error |

`error_code` is a fixed classification string (e.g., `"cart_creation_failed"`, `"network_error"`) — never a raw Medusa error message, to avoid leaking internal details to PostHog.

Success is already covered by existing checkout flow events (`checkout_started`, etc.).

---

## Error Handling

The `reorder` server action maps errors to one of two user-facing strings before returning `{ error }`:

- **Item/variant unavailable:** _"Some items from this order are no longer available."_
- **All other failures:** _"Something went wrong. Please try again."_

Detection: check if the Medusa error message/type indicates a variant or inventory issue; otherwise fall through to the generic message.

- **Unauthenticated:** Cannot reach the button (order detail/list pages are already behind auth). The API route's middleware provides a second layer of protection.

---

## Sentry

- Capture raw error in the `reorder` server action's catch block with `tags: { order_id }` — consistent with other commerce-critical server action error capture patterns
- The raw error goes to Sentry; only the sanitized message goes to the client and PostHog

---

## Out of Scope

- Partial re-order (selecting a subset of items)
- Applying original discount codes
- Shipping method unavailability handling (beyond Medusa's native error)
- Guest re-order (requires an account)
- Merging an existing active cart with a reorder cart
