# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 16 ecommerce application built on Vercel's Commerce template, enhanced with premium Tailwind UI components. It integrates with Medusa.js via the Store API to provide a polished, production-ready shopping experience.

**Tech Stack:**

- Next.js 16 (canary) with App Router
- React 19 (Server Components, Server Actions, useOptimistic)
- TypeScript (strict mode enabled)
- Tailwind CSS 4.x + Tailwind UI components
- Headless UI for accessible components
- Medusa.js v2 (via @medusajs/js-sdk)

## Development Commands

```bash
# Development
pnpm dev              # Start dev server with Turbopack (port 3000)

# Production
pnpm build            # Build for production
pnpm start            # Start production server

# Code Quality
pnpm prettier         # Format all files
pnpm prettier:check   # Check formatting
pnpm test             # Runs prettier:check (no test suite currently)
```

## Medusa Backend

The Medusa v2 backend lives at `../medusa-backend` (sibling directory). It uses PostgreSQL 17 with a `medusa_db` database.

### Starting the Full Dev Environment

```bash
# 1. Start PostgreSQL (if not already running)
brew services start postgresql@17

# 2. Start Medusa backend (in a separate terminal)
cd ../medusa-backend && npm run dev
# Runs on http://localhost:9000
# Admin UI at http://localhost:9000/app

# 3. Start the storefront
pnpm dev
# Runs on http://localhost:3000
```

### Stopping Everything

```bash
# Stop the storefront: Ctrl+C in its terminal
# Stop Medusa: Ctrl+C in its terminal
# Stop PostgreSQL (optional):
brew services stop postgresql@17
```

### Medusa Admin

Access the Medusa admin dashboard at `http://localhost:9000/app` to manage products, collections, orders, and settings. The initial admin invite was generated during setup.

### Useful Medusa Commands

```bash
cd ../medusa-backend

npm run dev                    # Start dev server
npx medusa db:migrate          # Run pending migrations
npx medusa user -e admin@example.com -p password  # Create admin user
```

### Getting the Publishable API Key

If you need to retrieve the publishable key from the database:

```bash
export PATH="/opt/homebrew/opt/postgresql@17/bin:$PATH"
psql medusa_db -t -c "SELECT token FROM api_key WHERE type = 'publishable' LIMIT 1;"
```

## Environment Setup

Required environment variables (see `.env.example`):

```
MEDUSA_BACKEND_URL=http://localhost:9000
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=your_publishable_key
SITE_NAME=Your Store Name
COMPANY_NAME=Your Company
REVALIDATE_SECRET=your_webhook_secret
```

The app validates `MEDUSA_BACKEND_URL` and `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` on startup via `validateEnvironmentVariables()` in `lib/utils.ts`.

## Architecture

### Route Structure

The app uses Next.js App Router with a `(store)` route group for organization:

```
app/
├── (store)/               # Store route group (shares layout)
│   ├── layout.tsx         # Store-specific layout
│   ├── products/          # Product catalog
│   │   ├── page.tsx       # All products
│   │   └── [collection]/  # Collection-filtered products
│   └── search/            # Search functionality
│       ├── page.tsx       # Search results
│       └── [collection]/  # Collection-specific search
├── product/[handle]/      # Individual product pages (static generation)
├── [page]/                # Dynamic pages
├── page.tsx               # Home page
└── layout.tsx             # Root layout
```

**Key routing notes:**

- Product pages use `generateStaticParams` for static generation at build time
- Collections are mapped to `/products/[collection]` paths
- `/collections/*` URLs are rewritten to `/products/*`

### Data Layer Architecture

**Medusa Integration** (`lib/medusa/`):

- `index.ts` — Medusa SDK client + all data-fetching functions (REST via @medusajs/js-sdk)
- `transforms.ts` — Functions to convert Medusa API types (`HttpTypes.StoreProduct`, etc.) to internal types

**Types** (`lib/types.ts`):
Backend-agnostic TypeScript types (`Product`, `Cart`, `Collection`, etc.) used throughout the app.

**Data Transformation** (`lib/medusa/transforms.ts`):
The app transforms Medusa data into internal types consumed by Tailwind UI components:

- `transformProduct()` — Converts `HttpTypes.StoreProduct` to `Product`
- `transformCollection()` — Converts `HttpTypes.StoreCollection` to `Collection`
- `transformCart()` — Converts `HttpTypes.StoreCart` to `Cart`

**UI Transformation** (`lib/utils.ts`):
Additional helpers convert internal types to Tailwind UI component formats:

- `transformProductToTailwind()` — Grid/catalog product format
- `transformProductToTailwindDetail()` — Product detail page format
- `transformProductsToRelatedProducts()` — Related products format
- `transformCollectionToTailwind()` — Collection format
- `getColorHex()` — Maps color names to hex codes for variant display

### Caching Strategy

The app uses Next.js 16's experimental caching features:

```typescript
// In lib/medusa/index.ts
export async function getProduct(handle: string) {
  "use cache";
  cacheTag(TAGS.products);
  cacheLife("days");
  // ... fetch logic
}
```

**Cache configuration** (next.config.ts):

```typescript
experimental: {
  cacheComponents: true,
  inlineCss: true,
  useCache: true
}
```

**Cache invalidation:**

- Cart actions call `revalidateTag(TAGS.cart, 'max')` and `revalidatePath('/', 'layout')`
- Medusa webhooks trigger revalidation via `/api/revalidate`
- Cache tags: `collections`, `products`, `cart` (defined in `lib/constants.ts`)

### Cart State Management

**Critical implementation detail:** Cart updates require **both** tag revalidation **and** path revalidation to ensure UI updates without hard refresh.

In `components/cart/actions.ts`, all cart mutations follow this pattern:

```typescript
await addToCart([{ merchandiseId: selectedVariantId, quantity: 1 }]);
revalidateTag(TAGS.cart, "max");
revalidatePath("/", "layout"); // ← Essential for immediate UI updates
```

**Cart flow:**

1. Cart ID stored in cookies (`cartId`)
2. Server Actions (`addItem`, `removeItem`, `updateItemQuantity`) handle mutations via Medusa SDK (`sdk.store.cart.*`)
3. `useOptimistic` in cart components provides instant UI feedback
4. `revalidatePath` ensures cart count/state updates globally

### Component Organization

**Context-specific price components** (`components/price/`):

- `ProductGridPrice.tsx` - Grid/catalog views
- `ProductDetailPrice.tsx` - Product detail pages
- `CartPrice.tsx` - Shopping cart

These exist because different UI contexts require different styling and formatting.

**Navigation** (`components/layout/`):

- Desktop/mobile split navigation
- Built from Medusa collections with fallback to `DEFAULT_NAVIGATION` in `lib/constants/navigation.ts`
- Navigation structure includes categories, featured items, collections, brands, and pages

**Cart** (`components/cart/`):

- Sliding drawer using Headless UI Dialog
- Auto-opens on add to cart
- Optimistic updates for instant feedback

**Search** (`components/search-command/`):

- Command palette (⌘K / Ctrl+K)
- Real-time product search with debouncing
- Keyboard navigation support

### TypeScript Configuration

- **Strict mode enabled** - All strict checks on
- **noUncheckedIndexedAccess: true** - Array/object access requires null checks
- **baseUrl: "."** - Absolute imports from project root (e.g., `import { Cart } from 'lib/types'`)

### REST API via Medusa SDK

The app uses the Medusa JS SDK (`@medusajs/js-sdk`) which communicates via REST endpoints (`/store/*`). There are no GraphQL queries. The SDK client is configured in `lib/medusa/index.ts`.

## Key Implementation Patterns

### Static Generation

Product pages are pre-rendered at build time:

```typescript
export async function generateStaticParams() {
  const products = await getProducts({});
  return products.map((product) => ({
    handle: product.handle,
  }));
}
```

### Server Actions

Cart operations use Server Actions with proper revalidation:

```typescript
"use server";

export async function addItem(
  prevState: any,
  selectedVariantId: string | undefined,
) {
  // ... mutation logic
  revalidateTag(TAGS.cart, "max");
  revalidatePath("/", "layout");
}
```

### Optimistic Updates

Cart components use React 19's `useOptimistic` for instant feedback:

```typescript
const [optimisticCart, addOptimisticItem] = useOptimistic(
  cart,
  (state, newItem) => ({
    ...state,
    lines: [...state.lines, newItem],
  }),
);
```

## Next.js Coding Rules

- Use the App Router structure with `page.tsx` files in route directories.
- Client components must be explicitly marked with `'use client'` at the top of the file.
- Use kebab-case for directory names (e.g., `components/auth-form`) and PascalCase for component files.
- Prefer named exports over default exports, i.e. `export function Button() { /* ... */ }` instead of `export default function Button() { /* ... */ }`.
- Minimize `'use client'` directives:
  - Keep most components as React Server Components (RSC)
  - Only use client components when you need interactivity and wrap in `Suspense` with fallback UI
  - Create small client component wrappers around interactive elements
- Avoid unnecessary `useState` and `useEffect` when possible:
  - Use server components for data fetching
  - Use React Server Actions for form handling
  - Use URL search params for shareable state
- Use `nuqs` for URL search param state management

## Image Optimization

Remote image patterns configured in `next.config.ts`:

- `localhost` - Local Medusa backend images
- `medusa-public-images.s3.eu-west-1.amazonaws.com` - Medusa hosted images
- `medusa-server-testing.s3.amazonaws.com` - Medusa testing images
- `via.placeholder.com` - Placeholder images
- `tailwindcss.com` - Tailwind UI demo assets

Formats: AVIF and WebP for optimal performance.

## Navigation

Navigation is built dynamically from Medusa collections via `getNavigation()` in `lib/medusa/index.ts`:

- If collections exist, they populate the navigation categories
- Falls back to `DEFAULT_NAVIGATION` from `lib/constants/navigation.ts` when no collections are found
- Footer menus are also derived from collections via `getMenu()`

## Common Gotchas

1. **Cart not updating:** Ensure `revalidateTag(TAGS.cart, "max")` and `revalidatePath("/", "layout")` are both called
2. **Products not showing:** Check if Medusa backend is running and at least one region is configured
3. **Color variants not displaying:** Verify variants have a "Color" option
4. **Navigation empty:** Falls back to `DEFAULT_NAVIGATION` from `lib/constants/navigation.ts`
5. **Build failures:** Missing environment variables or Medusa backend not reachable
6. **Prices showing $0.00:** Ensure products have `calculated_price` set (requires `region_id` in API calls)
7. **Pages returning empty:** Medusa has no native CMS pages — `getPage()`/`getPages()` return stubs
8. **Price amounts:** Medusa v2 `calculated_amount` is in the main currency unit (10 = $10.00), NOT cents. The `toMoney()` helper in `transforms.ts` does NOT divide by 100.
9. **Stale prices after transform changes:** Clear the Next.js cache (`rm -rf .next`) and restart the dev server

## Performance Features

- Static generation for product pages
- Optimistic UI updates in cart
- Next.js Image with AVIF/WebP
- Route-based code splitting
- Granular cache control with tags and lifecycles
- Turbopack in development for fast refresh
