# Personalized Products — Design Spec

**Date:** 2026-03-25
**Status:** Approved
**Reference:** [Medusa Personalized Products Recipe](https://docs.medusajs.com/resources/recipes/personalized-products/example)

---

## Overview

Implement the Medusa personalized products reference pattern. Products can be flagged as personalized via the `is_personalized` metadata flag in the admin. When a customer visits a personalized product page, they enter custom dimensions (height × width in cm). The price updates dynamically based on a linear formula. The personalization data is stored in line item metadata and flows through to orders and the admin dashboard.

This is a reference implementation intended to be adapted per client. All business logic (pricing formula, field labels, validation rules) is localized in clearly identified constants and steps.

---

## Architecture

```
Storefront                           Backend
─────────────────────────────────    ─────────────────────────────────────────
ProductDetail
  └─ dimension inputs (h × w)   ──►  POST /store/variants/:id/price
  └─ live price display                 └─ getCustomPriceWorkflow
                                              └─ getCustomPriceStep

AddToCart (with metadata)       ──►  POST /store/carts/:id/line-items-custom
                                        └─ customAddToCartWorkflow
                                              ├─ getCustomPriceWorkflow (reuse)
                                              ├─ acquireLockStep
                                              ├─ addToCartWorkflow (standard)
                                              └─ releaseLockStep

                                     addToCartWorkflow.hooks.validate
                                       └─ enforce height/width present + numeric

Cart item display
  └─ Width: Xcm / Height: Xcm from metadata

Order item display
  └─ same as cart

                                     Admin widget (order.details.after)
                                       └─ personalized items table
```

---

## Backend

### Pricing constant

```
DIMENSION_PRICE_FACTOR = 0.01
customPrice = basePrice + (height × width × DIMENSION_PRICE_FACTOR)
```

Defined as a named constant in `get-custom-price.ts` — single location to update for any client.

### Workflow: `getCustomPriceWorkflow`

File: `backend/src/workflows/get-custom-price.ts`

Steps:
1. `getCustomPriceStep` — uses `QueryGraph` to retrieve the region's currency code, fetches the variant's calculated price for that region, applies the pricing formula, returns `{ amount: number, currency_code: string }`.

Input: `{ variantId: string, regionId: string, metadata: { height: number, width: number } }`
Output: `{ amount: number, currency_code: string }`

### Workflow: `customAddToCartWorkflow`

File: `backend/src/workflows/custom-add-to-cart.ts`

Steps:
1. Query cart to get `region_id`.
2. Call `getCustomPriceWorkflow` with variant + region + metadata.
3. `acquireLockStep` on the cart (timeout: 2s, TTL: 10s).
4. Transform line item: `{ variant_id, quantity, unit_price: customPrice.amount, metadata }`.
5. Call standard `addToCartWorkflow`.
6. `releaseLockStep`.
7. Re-fetch and return updated cart.

Also registers `addToCartWorkflow.hooks.validate` to reject cart additions where a personalized product is missing valid numeric `height` / `width` in metadata. Throws `MedusaError(INVALID_DATA, "Please set height and width metadata for each item.")`.

### API route: `POST /store/variants/:id/price`

File: `backend/src/api/store/variants/[id]/price/route.ts`

Request body (Zod-validated):
```ts
{ region_id: string; metadata: { height: number; width: number } }
```

Response:
```ts
{ amount: number; currency_code: string }
```

Runs `getCustomPriceWorkflow`. Errors propagate as standard Medusa HTTP errors.

### API route: `POST /store/carts/:id/line-items-custom`

File: `backend/src/api/store/carts/[id]/line-items-custom/route.ts`

Request body (Zod-validated):
```ts
{ variant_id: string; quantity?: number; metadata: { height: number; width: number } }
```

Response: updated cart.

Runs `customAddToCartWorkflow`. Cart ID comes from the URL param.

### Admin widget: `PersonalizedOrderItemsWidget`

File: `backend/src/admin/widgets/order-personalized.tsx`

- Zone: `order.details.after`
- Filters `order.items` where `item.metadata?.is_personalized === true`
- If no personalized items: renders nothing
- If personalized items found: renders a `@medusajs/ui` container with a table showing product thumbnail, title, width, and height for each item

---

## Storefront

### Type changes

File: `storefront/lib/types.ts`
- `Product`: add `metadata?: Record<string, unknown>`
- `CartItem`: add `metadata?: Record<string, unknown>` to the `merchandise` object (for line item metadata display)

### Transforms

File: `storefront/lib/medusa/transforms.ts`
- `transformProduct`: thread `product.metadata` through to the returned `Product` object
- `transformCart` / cart line item transform: thread `lineItem.metadata` through to `CartItem`

### Lib: `storefront/lib/medusa/index.ts`

New function: `getCustomVariantPrice(variantId, regionId, metadata: { height: number, width: number })`
- POSTs to `/store/variants/${variantId}/price`
- Returns `{ amount: string, currency_code: string }` (amount as string to match existing `Money` type convention)

Modified: `addToCart`
- Gains optional `metadata?: Record<string, unknown>` param per line item
- When `metadata` present: calls `/store/carts/${cartId}/line-items-custom` instead of `sdk.store.cart.createLineItem`
- Falls back to standard endpoint when no metadata

### Server action: `storefront/components/cart/actions.ts`

`addItem` gains optional `metadata?: Record<string, unknown>` param. Passes to `addToCart`.

### Component: `storefront/components/product/product-detail.tsx`

When `sourceProduct.metadata?.is_personalized === true`:

1. Two controlled number inputs rendered above the Add to Cart button: **Height (cm)** and **Width (cm)**.
2. `useEffect` watching `[height, width, selectedVariant]` — when both are valid numbers and a variant is selected, calls `getCustomVariantPrice` (debounced ~300ms). Updates local price state.
3. `ProductDetailPrice` receives the custom price amount when available; falls back to variant's base price.
4. Add to Cart button disabled until both dimensions are > 0 and a variant is selected.
5. `addItem` receives `metadata: { height, width, is_personalized: true }`.

Non-personalized products: zero changes to existing rendering path.

### Component: Cart item display

File: `storefront/components/cart/index.tsx`

Below the existing variant option pills, conditionally render:
```
Width: {metadata.width}cm   Height: {metadata.height}cm
```
Only when `item.metadata?.is_personalized` is truthy.

### Component: Order item display

Same pattern as cart display, applied to order confirmation line items.

---

## Analytics Events

| Event | Trigger | Properties |
|---|---|---|
| `personalized_price_calculated` | Successful price fetch in ProductDetail | `variant_id`, `height`, `width`, `calculated_price` |
| `personalized_product_added_to_cart` | `addItem` completes with metadata | `variant_id`, `height`, `width`, `price` |

Both events must be added to the `AnalyticsEvents` type map before use.

---

## Error Handling

| Scenario | Handling |
|---|---|
| Price fetch fails (network/backend error) | Show base price, log to Sentry, do not block add-to-cart |
| Add to cart fails (missing dimensions) | Surface Medusa error message to user |
| Dimensions are 0 or negative | Disabled state on button — client-side guard before any fetch |
| Backend unavailable | `getCustomVariantPrice` throws — catch and fall back to base price silently |

---

## Testing

- Unit: `getCustomPriceStep` — given base price 1000, height 10, width 5 → expect 1500
- Integration: `POST /store/variants/:id/price` with valid region + metadata → assert `amount` matches formula
- Integration: `POST /store/carts/:id/line-items-custom` → assert cart line item carries `metadata.height` and `metadata.width`
- Validation: `POST /store/carts/:id/line-items-custom` without dimensions on personalized product → expect 400 with `INVALID_DATA`
- Storefront: `getCustomVariantPrice` unit test — mocks fetch, asserts correct URL + body

---

## Subagent Parallelism

The implementation splits into two largely independent tracks that can run in parallel in separate git worktrees:

**Track A — Backend**
- `get-custom-price.ts` workflow
- `custom-add-to-cart.ts` workflow (including `addToCartWorkflow.hooks.validate`)
- `POST /store/variants/:id/price` route
- `POST /store/carts/:id/line-items-custom` route
- `order-personalized.tsx` admin widget

**Track B — Storefront**
- Types + transforms (metadata threading)
- `getCustomVariantPrice` lib function + `addToCart` modification
- `addItem` server action update
- `ProductDetail` dimension inputs + dynamic pricing
- Cart item metadata display
- Order item metadata display
- Analytics events

Track B depends on the API contract from Track A (two endpoint shapes), not on Track A's files. The contract is defined above and fixed — Track B can be implemented against it independently.

---

## Files Created / Modified

### New files
- `backend/src/workflows/get-custom-price.ts`
- `backend/src/workflows/custom-add-to-cart.ts`
- `backend/src/api/store/variants/[id]/price/route.ts`
- `backend/src/api/store/carts/[id]/line-items-custom/route.ts`
- `backend/src/admin/widgets/order-personalized.tsx`

### Modified files
- `storefront/lib/types.ts` — add `metadata` to `Product` and `CartItem`
- `storefront/lib/medusa/transforms.ts` — thread metadata through transforms
- `storefront/lib/medusa/index.ts` — add `getCustomVariantPrice`, modify `addToCart`
- `storefront/components/cart/actions.ts` — add `metadata` param to `addItem`
- `storefront/components/product/product-detail.tsx` — dimension inputs + dynamic price
- `storefront/components/cart/index.tsx` — metadata display on cart items
- `storefront/lib/analytics.ts` (or analytics type map) — add two new events
- Order item component — metadata display (path TBD during implementation)
