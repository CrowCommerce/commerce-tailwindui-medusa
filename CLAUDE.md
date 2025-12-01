# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 16 ecommerce application built on Vercel's Commerce template, enhanced with premium Tailwind UI components. It integrates with Shopify via the Storefront API to provide a polished, production-ready shopping experience.

**Tech Stack:**

- Next.js 16 (canary) with App Router
- React 19 (Server Components, Server Actions, useOptimistic)
- TypeScript (strict mode enabled)
- Tailwind CSS 4.x + Tailwind UI components
- Headless UI for accessible components
- Shopify Storefront API

## Development Commands

```bash
# Development
pnpm dev              # Start dev server with Turbopack

# Production
pnpm build            # Build for production
pnpm start            # Start production server

# Code Quality
pnpm prettier         # Format all files
pnpm prettier:check   # Check formatting
pnpm test             # Runs prettier:check (no test suite currently)
```

## Environment Setup

Required environment variables (see `.env.example`):

```
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_STOREFRONT_ACCESS_TOKEN=your_token
SITE_NAME=Your Store Name
COMPANY_NAME=Your Company
SHOPIFY_REVALIDATION_SECRET=your_webhook_secret
```

The app validates these on startup via `validateEnvironmentVariables()` in `lib/utils.ts`.

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
├── [page]/                # Dynamic Shopify pages
├── page.tsx               # Home page
└── layout.tsx             # Root layout
```

**Key routing notes:**

- Product pages use `generateStaticParams` for static generation at build time
- Collections are mapped to `/products/[collection]` paths
- Shopify `/collections/*` URLs are rewritten to `/products/*`

### Data Layer Architecture

**Shopify Integration** (`lib/shopify/`):

- `index.ts` - Core Shopify API client with `shopifyFetch()` helper
- `queries/` - GraphQL queries for fetching data
- `mutations/` - GraphQL mutations for cart operations
- `fragments/` - Reusable GraphQL fragments
- `types.ts` - TypeScript types for Shopify data

**Data Transformation** (`lib/utils.ts`):
The app transforms Shopify data into Tailwind UI component formats:

- `transformShopifyProductToTailwind()` - Grid/catalog product format
- `transformShopifyProductToTailwindDetail()` - Product detail page format
- `transformShopifyProductsToRelatedProducts()` - Related products format
- `transformShopifyCollectionToTailwind()` - Collection format
- `getColorHex()` - Maps color names to hex codes for variant display

**Why this matters:** When working with products, you'll need to use the appropriate transformer based on the UI context (grid vs detail page vs related products).

### Caching Strategy

The app uses Next.js 16's experimental caching features:

```typescript
// In lib/shopify/index.ts
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
- Shopify webhooks trigger revalidation via `/api/revalidate`
- Cache tags: `collections`, `products`, `cart` (defined in `lib/constants.ts`)

### Cart State Management

**Critical implementation detail:** Cart updates require **both** tag revalidation **and** path revalidation to ensure UI updates without hard refresh.

In `components/cart/actions.ts`, all cart mutations follow this pattern:

```typescript
await addToCart([{ merchandiseId, quantity }]);
revalidateTag(TAGS.cart, "max");
revalidatePath("/", "layout"); // ← Essential for immediate UI updates
```

**Cart flow:**

1. Cart ID stored in cookies (`cartId`)
2. Server Actions (`addItem`, `removeItem`, `updateItemQuantity`) handle mutations
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
- Uses Shopify Navigation metaobjects or falls back to `DEFAULT_NAVIGATION` in `lib/shopify/index.ts`
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
- **baseUrl: "."** - Absolute imports from project root (e.g., `import { Cart } from 'lib/shopify/types'`)

### GraphQL Patterns

All Shopify queries use GraphQL fragments for consistency:

- `cartFragment` - Cart data structure
- `imageFragment` - Image fields
- `productFragment` - Product data structure
- `seoFragment` - SEO metadata

When adding new queries, reuse these fragments to maintain type consistency.

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

- `cdn.shopify.com` - Shopify product images
- `via.placeholder.com` - Placeholder images
- `tailwindcss.com` - Tailwind UI demo assets

Formats: AVIF and WebP for optimal performance.

## Navigation Metaobjects

The app supports custom navigation via Shopify metaobjects:

- Falls back to `DEFAULT_NAVIGATION` if metaobjects are empty
- Navigation query in `lib/shopify/queries/navigation.ts`
- Transformed in `getNavigation()` function

When navigation appears broken, check if metaobjects are properly configured in Shopify admin.

## Common Gotchas

1. **Cart not updating:** Ensure both `revalidateTag()` and `revalidatePath('/', 'layout')` are called
2. **Products not showing:** Check for `HIDDEN_PRODUCT_TAG` ('nextjs-frontend-hidden') in product tags
3. **Color variants not displaying:** Verify variants have a "Color" option and use `getColorHex()` mapping
4. **Navigation empty:** Likely missing Shopify metaobjects, will use `DEFAULT_NAVIGATION` fallback
5. **Build failures:** Missing environment variables - they're validated at startup

## Performance Features

- Static generation for product pages
- Optimistic UI updates in cart
- Next.js Image with AVIF/WebP
- Route-based code splitting
- Granular cache control with tags and lifecycles
- Turbopack in development for fast refresh
