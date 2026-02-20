# AGENTS.md

Comprehensive technical reference for the commerce-tailwindui-medusa storefront. For agent behavior and workflow, see **[CLAUDE.md](./CLAUDE.md)**.

## Project Overview

Next.js 16 ecommerce storefront built on Vercel's Commerce template, enhanced with premium Tailwind UI components. Integrates with a local Medusa.js v2 backend via the Store REST API. Designed for a polished, production-ready shopping experience with static generation, optimistic cart updates, and granular caching.

## Tech Stack

| Technology       | Version         | Purpose                                      |
| ---------------- | --------------- | -------------------------------------------- |
| Next.js          | 16.0.7 (canary) | App Router, RSC, Server Actions              |
| React            | 19.0.0          | Server Components, `useOptimistic`           |
| TypeScript       | 5.8.2           | Strict mode, `noUncheckedIndexedAccess`      |
| Tailwind CSS     | 4.x             | CSS-first config, `@theme` tokens            |
| Headless UI      | 2.2.x           | Accessible interactive components            |
| @medusajs/js-sdk | 2.13.x          | REST client for Medusa Store API             |
| @medusajs/types  | 2.13.x          | TypeScript types for Medusa responses        |
| clsx             | 2.1.x           | Conditional class composition                |
| Geist            | 1.3.x           | Font family                                  |
| Vitest           | 4.x             | Unit testing (installed, not configured yet) |
| Playwright       | 1.56.x          | E2E testing (installed, not configured yet)  |

## Directory Structure

```
app/
├── (store)/                   # Route group — shares store layout
│   ├── layout.tsx             # Store-specific layout (nav + footer)
│   ├── products/
│   │   ├── page.tsx           # All products grid
│   │   └── [collection]/      # Collection-filtered products
│   └── search/
│       ├── page.tsx           # Search results
│       └── [collection]/      # Collection-specific search
├── product/[handle]/          # Product detail pages (static generation)
├── [page]/                    # Dynamic CMS pages (stub)
├── api/revalidate/            # Webhook endpoint for cache invalidation
├── page.tsx                   # Home page
├── layout.tsx                 # Root layout
└── globals.css                # Tailwind v4 theme tokens

components/
├── cart/                      # Cart drawer, actions (Server Actions), optimistic UI
├── home/                      # Home page sections, Tailwind UI product/collection types
├── layout/                    # Desktop/mobile navigation, footer
├── price/                     # Context-specific price components (grid, detail, cart)
├── product/                   # Product detail components
└── search-command/            # Command palette (Cmd+K) with debounced search

lib/
├── medusa/
│   ├── index.ts               # SDK client + all data-fetching functions
│   ├── cookies.ts             # Secure cookie management + auth headers
│   ├── error.ts               # Centralized Medusa SDK error formatting
│   └── transforms.ts          # Medusa → internal type transformations
├── constants.ts               # Cache tags, sort options, hidden product tag
├── constants/navigation.ts    # DEFAULT_NAVIGATION fallback, UTILITY_NAV
├── types.ts                   # Backend-agnostic internal types
└── utils.ts                   # URL helpers, env validation, Tailwind UI transforms
```

## Route Structure

| Route                    | Purpose                  | Notes                                |
| ------------------------ | ------------------------ | ------------------------------------ |
| `/`                      | Home page                | Static                               |
| `/products`              | All products grid        | Collection-filtered                  |
| `/products/[collection]` | Products by collection   | Dynamic                              |
| `/product/[handle]`      | Product detail           | `generateStaticParams` at build time |
| `/search`                | Search results           | Query-based                          |
| `/search/[collection]`   | Search within collection | Dynamic                              |
| `/collections/*`         | Rewrite                  | Rewrites to `/products/*`            |
| `/[page]`                | CMS pages                | Stub — Medusa has no CMS             |
| `/api/revalidate`        | Webhook                  | Cache invalidation endpoint          |

## Data Layer Architecture

Three-layer type system with explicit transform boundaries:

### Layer 1: Medusa SDK Types

`HttpTypes.StoreProduct`, `HttpTypes.StoreCollection`, `HttpTypes.StoreCart` — raw REST responses from `@medusajs/types`.

### Layer 2: Internal Types (`lib/types.ts`)

Backend-agnostic types: `Product`, `Cart`, `Collection`, `Menu`, `Page`, `Navigation`. Used throughout the app. Could be backed by any commerce API.

### Layer 3: Tailwind UI Types (`components/home/types.ts`)

Component-specific types matching Tailwind UI component props: `Product` (grid format), `Collection` (card format).

Also in `lib/utils.ts`: `TailwindProductDetail`, `TailwindRelatedProduct`.

### Transform Chain

```
Medusa SDK → transforms.ts → Internal Types → utils.ts → Tailwind UI Types
  (Layer 1)                    (Layer 2)                   (Layer 3)
```

**`lib/medusa/transforms.ts`** (Layer 1 → Layer 2):

- `transformProduct()` — `HttpTypes.StoreProduct` → `Product`
- `transformCollection()` — `HttpTypes.StoreCollection` → `Collection`
- `transformCart()` — `HttpTypes.StoreCart` → `Cart`

**`lib/utils.ts`** (Layer 2 → Layer 3):

- `transformProductToTailwind()` — Grid/catalog format
- `transformProductToTailwindDetail()` — Product detail page
- `transformProductsToRelatedProducts()` — Related products section
- `transformCollectionToTailwind()` — Collection card format
- `getColorHex()` — Maps color names to hex codes for variant swatches

## Medusa SDK Client

Configured in `lib/medusa/index.ts`:

```typescript
const sdk = new Medusa({
  baseUrl: process.env.MEDUSA_BACKEND_URL || "http://localhost:9000",
  debug: false,
  publishableKey: process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
});
```

**Single-region mode:** `getDefaultRegion()` fetches the first region and caches it in memory. All product queries include `region_id` to get `calculated_price`.

**Field expansion:** Products use `PRODUCT_FIELDS` to get calculated prices, inventory, and variant images. Carts use `CART_FIELDS` to get items with product/variant/thumbnail data, plus promotions and shipping methods.

**Cookie management (`lib/medusa/cookies.ts`):** All cookie access goes through dedicated functions (`getCartId`, `setCartId`, `removeCartId`, `getAuthToken`, `setAuthToken`, `removeAuthToken`). Cart cookie is `_medusa_cart_id` with `httpOnly`, `sameSite: strict`, `secure` (in prod), 30-day expiry. Auth token cookie is `_medusa_jwt` (infrastructure — not populated until customer accounts are implemented).

**Auth headers:** `getAuthHeaders()` returns `{ authorization: "Bearer ..." }` when a JWT exists, or `{}` otherwise. All cart mutations pass auth headers to the SDK. This is infrastructure for customer accounts — currently returns `{}`.

**Error handling (`lib/medusa/error.ts`):** `medusaError()` formats `FetchError` from `@medusajs/js-sdk` (shape: `{ status, statusText, message }`) into user-readable `Error` objects with server-side logging.

## Exported Data Functions

| Function                                   | Cache         | Tags                    | Lifetime |
| ------------------------------------------ | ------------- | ----------------------- | -------- |
| `getProduct(handle)`                       | `"use cache"` | `products`              | `days`   |
| `getProducts({query, reverse, sortKey})`   | `"use cache"` | `products`              | `days`   |
| `getProductRecommendations(productId)`     | `"use cache"` | `products`              | `days`   |
| `getCollection(handle)`                    | `"use cache"` | `collections`           | `days`   |
| `getCollectionProducts({collection, ...})` | `"use cache"` | `collections, products` | `days`   |
| `getCollections()`                         | `"use cache"` | `collections`           | `days`   |
| `getNavigation()`                          | `"use cache"` | `collections`           | `days`   |
| `getMenu(handle)`                          | `"use cache"` | `collections`           | `days`   |
| `getCart()`                                | No cache      | —                       | —        |
| `getOrSetCart()`                           | No cache      | —                       | —        |
| `createCart()`                             | No cache      | —                       | —        |
| `addToCart(lines)`                         | No cache      | —                       | —        |
| `removeFromCart(lineIds)`                  | No cache      | —                       | —        |
| `updateCart(lines)`                        | No cache      | —                       | —        |
| `getPage(handle)`                          | No cache      | —                       | Stub     |
| `getPages()`                               | No cache      | —                       | Stub     |

## Caching Strategy

Uses Next.js 16 experimental caching with `"use cache"` directive:

```typescript
export async function getProduct(handle: string) {
  "use cache";
  cacheTag(TAGS.products);
  cacheLife("days");
  // ...
}
```

**next.config.ts:**

```typescript
{
  cacheComponents: true;
}
```

**Cache tags** (defined in `lib/constants.ts`): `collections`, `products`, `cart`.

**Invalidation:**

- Cart mutations: `revalidateTag(TAGS.cart, "max")` + `revalidatePath("/", "layout")`
- Webhook (`/api/revalidate`): Revalidates all three tags
- Manual: `rm -rf .next` and restart dev server

## Cart State Management

**Critical:** Cart updates require **both** tag revalidation **and** path revalidation for UI to update without hard refresh.

### Flow

1. **Storage:** Cart ID stored in `_medusa_cart_id` cookie (secure, httpOnly) via `lib/medusa/cookies.ts`
2. **Creation:** `createCartAndSetCookie()` → `createCart()` (sets cookie internally)
3. **Mutations:** Server Actions in `components/cart/actions.ts`:
   - `addItem(prevState, variantId)` — Add to cart
   - `removeItem(prevState, lineItemId)` — Remove from cart (uses line item ID directly)
   - `updateItemQuantity(prevState, {merchandiseId, quantity})` — Update quantity
   - `redirectToCheckout()` — Stub, redirects to `/cart`
4. **Optimistic UI:** Cart components use `useOptimistic` for instant feedback
5. **Revalidation pattern** (every mutation, in `finally` block):
   ```typescript
   revalidateTag(TAGS.cart, "max");
   revalidatePath("/", "layout"); // Essential for immediate UI updates
   ```
6. **Error recovery:** Revalidation runs in `finally` blocks — ensures optimistic state re-syncs even on failure

### Cart UI

- Sliding drawer using Headless UI `Dialog`
- Auto-opens when item is added
- Optimistic updates for instant feedback on add/remove/quantity changes

## Navigation System

`getNavigation()` builds nav from Medusa collections:

1. Fetches all collections via `getCollections()`
2. If collections exist (>1, since "All" is always added), maps them to nav links
3. Merges with `DEFAULT_NAVIGATION` categories structure
4. Falls back entirely to `DEFAULT_NAVIGATION` when no collections found

**Constants** (`lib/constants/navigation.ts`):

- `DEFAULT_NAVIGATION` — Full fallback with Women/Men categories, featured, brands
- `UTILITY_NAV` — Account, Support links

**Footer:** `getMenu("footer")` returns first 6 collections as footer links.

## Component Patterns

### RSC vs Client Split

Most components are Server Components. Client components are used only for:

- Cart drawer (Dialog interaction)
- Search command palette (keyboard shortcuts, input state)
- Add-to-cart button (optimistic updates via `useActionState`)
- Mobile menu (Dialog interaction)

### Price Components (`components/price/`)

Three context-specific components instead of one flexible component:

- `ProductGridPrice.tsx` — Grid/catalog views
- `ProductDetailPrice.tsx` — Product detail page
- `CartPrice.tsx` — Cart drawer

### Search Command Palette (`components/search-command/`)

- Opens with Cmd+K / Ctrl+K
- Real-time product search with debouncing
- Keyboard navigation support
- Uses `getProducts({ query })` for search

## Tailwind CSS v4

**CSS-first configuration** — no `tailwind.config.ts`. Everything in `app/globals.css`:

```css
@import "tailwindcss";
@plugin "@tailwindcss/container-queries";
@plugin "@tailwindcss/typography";

@theme {
  --color-primary-50: #eef2ff;
  --color-primary-500: #6366f1;
  --color-primary-600: #4f46e5;
  /* ... full primary + secondary scales */
}
```

**Theming:** Change `--color-primary-*` values in `@theme` to retheme the site. See [RETHEME.md](./RETHEME.md) for full guide.

## Environment Variables

| Variable                             | Required | Default                 | Purpose                               |
| ------------------------------------ | -------- | ----------------------- | ------------------------------------- |
| `MEDUSA_BACKEND_URL`                 | Yes      | `http://localhost:9000` | Medusa REST API URL                   |
| `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` | Yes      | —                       | Medusa publishable API key            |
| `SITE_NAME`                          | No       | —                       | Store name in metadata                |
| `COMPANY_NAME`                       | No       | —                       | Company name in footer                |
| `REVALIDATE_SECRET`                  | No       | —                       | Webhook secret for cache invalidation |
| `VERCEL_PROJECT_PRODUCTION_URL`      | No       | —                       | Auto-set by Vercel for `baseUrl`      |

Validated on startup by `validateEnvironmentVariables()` in `lib/utils.ts`. Only `MEDUSA_BACKEND_URL` and `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` are required.

## Medusa Backend

Lives at `../medusa-backend` (sibling directory). Uses PostgreSQL 17 with `medusa_db` database.

### Starting

```bash
brew services start postgresql@17          # 1. Start PostgreSQL
cd ../medusa-backend && npm run dev        # 2. Start Medusa (port 9000)
bun dev                                     # 3. Start storefront (port 3000)
```

### Stopping

```bash
# Ctrl+C in storefront terminal
# Ctrl+C in Medusa terminal
brew services stop postgresql@17            # Optional
```

### Admin

Dashboard at `http://localhost:9000/app`. Manages products, collections, orders, regions, settings.

### Useful Commands

```bash
cd ../medusa-backend
npm run dev                                                  # Start dev server
npx medusa db:migrate                                        # Run pending migrations
npx medusa user -e admin@example.com -p password             # Create admin user
```

### Retrieving the Publishable API Key

```bash
export PATH="/opt/homebrew/opt/postgresql@17/bin:$PATH"
psql medusa_db -t -c "SELECT token FROM api_key WHERE type = 'publishable' LIMIT 1;"
```

## Testing Infrastructure

**Installed but not configured:**

- **Vitest** 4.x — Unit testing (`bun run test:unit`)
- **Playwright** 1.56.x — E2E testing (`bun run test:e2e`)
- **Testing Library** — React component testing (`@testing-library/react`, `@testing-library/jest-dom`)
- **happy-dom** — Lightweight DOM implementation for Vitest

**TODO:** Create `vitest.config.ts`, `playwright.config.ts`, and initial test suites.

## Common Pitfalls

1. **Cart not updating:** Both `revalidateTag(TAGS.cart, "max")` AND `revalidatePath("/", "layout")` are required. Missing either causes stale UI.

2. **Products not showing:** Medusa backend must be running with at least one region configured.

3. **Prices showing $0.00:** Products need `calculated_price` — ensure `region_id` is passed in API queries.

4. **Price amounts are NOT in cents:** Medusa v2 `calculated_amount` is in the main currency unit (10 = $10.00). The `toMoney()` helper does NOT divide by 100.

5. **Stale prices after transform changes:** Clear the Next.js cache (`rm -rf .next`) and restart dev.

6. **Color variants not displaying:** Variants must have a "Color" option (case-insensitive match).

7. **Navigation empty:** Falls back to `DEFAULT_NAVIGATION` from `lib/constants/navigation.ts`. This is expected when no collections exist in Medusa.

8. **Build failures:** Usually missing env vars or Medusa backend unreachable.

9. **Pages returning empty:** Medusa has no native CMS. `getPage()` / `getPages()` return stubs.

## TypeScript Configuration

| Setting                    | Value    | Effect                                                                  |
| -------------------------- | -------- | ----------------------------------------------------------------------- |
| `strict`                   | `true`   | All strict checks enabled                                               |
| `noUncheckedIndexedAccess` | `true`   | Array/object access requires null checks                                |
| `baseUrl`                  | `"."`    | Absolute imports from project root (`import { Cart } from 'lib/types'`) |
| `target`                   | `es2015` | Output target                                                           |
| `moduleResolution`         | `node`   | Node-style module resolution                                            |

## Image Optimization

Remote patterns configured in `next.config.ts`:

| Hostname                                          | Purpose                     |
| ------------------------------------------------- | --------------------------- |
| `localhost`                                       | Local Medusa backend images |
| `medusa-public-images.s3.eu-west-1.amazonaws.com` | Medusa hosted images        |
| `medusa-server-testing.s3.amazonaws.com`          | Medusa testing images       |
| `via.placeholder.com`                             | Placeholder images          |
| `tailwindcss.com`                                 | Tailwind UI demo assets     |

Formats: AVIF and WebP.
