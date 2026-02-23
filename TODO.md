# TODO

## Deferred Features (Phase 2+)

- [x] Customer accounts — see [implementation phases](#customer-accounts-implementation) below
- [ ] Checkout flow (`redirectToCheckout` is a stub — redirects to `/cart`) — cart now fetches promotions + shipping methods
- [ ] Multi-region / multi-currency support
- [ ] Product categories (Medusa nested category tree)
- [x] Wishlist / saved items
- [ ] CMS pages (`getPage`/`getPages` return stubs)

## Product Reviews

### Completed (Phase 1)

- [x] Product reviews backend module (model, service, workflows, API routes)
- [x] Storefront UI (form, list, summary, star ratings, Suspense streaming)
- [x] Admin moderation table with bulk actions
- [x] Denormalized `ReviewStats` table — pre-calculated stats refreshed on write
- [x] Default review status "pending" (requires admin approval)
- [x] Soft deletes on review rollback
- [x] Event emission (`product_review.created`, `product_review.updated`)

### Phase 2: Admin Responses & Review Images

- [x] `ProductReviewResponse` entity — admin replies to reviews (full CRUD)
- [x] `ProductReviewImage` entity — image upload endpoint for review photos
- [x] Display admin responses on storefront review list
- [x] Review image lightbox with prev/next navigation
- [x] Admin response management drawer (create/edit/delete)
- [x] Image upload UI in review form dialog (max 3, JPEG/PNG/WebP)

### Phase 3: Verified Purchase & Search

- [ ] Order linking (`order_id`, `order_line_item_id`) for verified purchase badge
- [ ] Full-text search on review content + name in admin
- [ ] Review editing (upsert pattern — one review per customer per product)

## Wishlist

### Completed

- [x] Wishlist backend module (models, service, migration, module links)
- [x] Workflow steps (10) with compensation for saga rollback
- [x] Workflows (6): create, add/delete item, delete, update, transfer
- [x] Customer API routes (8 endpoints) with Zod validation and ownership checks
- [x] Guest API routes (4 endpoints) with cookie-based tracking
- [x] Shared wishlist routes (JWT sharing with 7-day expiry, import/clone)
- [x] Admin wishlist count widget on product detail pages
- [x] Storefront server actions (12 functions) with cache tags and revalidation
- [x] Auth integration (transfer on login/signup, cleanup on signout)
- [x] Heart toggle button component (product cards and PDP)
- [x] Account wishlist page with multi-tab navigation, grid, empty state, share, create
- [x] Shared wishlist page with read-only view and import

### Phase 2: Polish

- [x] Nav badge — heart icon in header with item count, links to `/account/wishlist`, mobile menu entry
- [x] Heart button server state — product cards pass state from server, PDP auto-checks on mount via server action
- [x] Rename/delete wishlist UI — actions dropdown with rename dialog and delete confirmation
- [x] Store product wishlist count route — `GET /store/products/:id/wishlist-count` for social proof ("X people saved this")
- [x] Guest route hardening — `GET /store/wishlists/:id` now filters by `customer_id: null`; guest item routes also verify guest ownership
- [x] Fix `cookies()` inside `"use cache"` crash — `getWishlists()` and `getWishlist()` used `cookies()` inside `"use cache"` scope, crashing product pages after adding to wishlist. Removed incompatible cache directives.
- [x] Product images in wishlist cards — TailwindUI card design with variant/product thumbnails
- [x] JWT security — explicit `jwtSecret` guard on all 3 JWT-using routes (share, shared view, import)
- [x] Code simplification — extracted shared helpers (`verifyShareToken`, `requireGuestWishlist`, `requireSalesChannelId`), merged duplicate Zod schemas, consolidated auth middleware, added `wishlistMutation` helper on storefront. Net -179 lines.

## Agentic Commerce

- [ ] AI-powered product recommendations (conversational shopping assistant)
- [ ] Natural language search and product discovery
- [ ] Automated cart building from customer intent ("I need an outfit for a summer wedding")
- [ ] Personalized re-order suggestions based on purchase history
- [ ] AI-assisted customer support (order status, returns, FAQ)

## Completed

- [x] Harden cart infrastructure — secure cookies, auth headers, error handling, input validation
- [x] Replace raw `cookies()` calls with `lib/medusa/cookies.ts` utility
- [x] Add centralized Medusa SDK error formatting (`lib/medusa/error.ts`)
- [x] Pass auth headers to all cart SDK operations (infrastructure for customer accounts)
- [x] Revalidate cache on error to re-sync optimistic state (`finally` blocks)
- [x] Pass `lineItemId` directly in delete button (skip extra `getCart()` call)
- [x] Clear stale cart cookies on retrieval failure
- [x] Expand `CART_FIELDS` with `*promotions,+shipping_methods.name`
- [x] Fix global input focus styling — removed `outline: none !important` override in `globals.css` breaking all TailwindUI outline/ring utilities; standardized all inputs to TailwindUI v4 outline pattern

## Testing

- [ ] Create `vitest.config.ts`
- [x] Create `playwright.config.ts`
- [ ] Unit tests for `lib/medusa/transforms.ts`
- [ ] E2E test: browse products → add to cart flow
- [x] Wishlist E2E test suite (40 tests across 10 spec files — guest, authenticated, heart-button, heart-state, sharing, import, transfer, nav-badge, rename-delete, social-proof; 80 total with Firefox)

## Infrastructure

- [x] Convert `<img>` tags to Next.js `<Image>` components
- [x] Convert monorepo to Turborepo with bun workspaces
- [x] Shared TypeScript tooling (`@repo/typescript`)
- [x] Enable React Compiler
- [ ] Set up CI/CD (GitHub Actions)
- [ ] Configure Medusa webhooks for cache revalidation
- [ ] Update `DEFAULT_NAVIGATION` with real store categories

## Customer Accounts (Completed)

- [x] Auth data layer (signup, login, signout, retrieveCustomer, transferCart)
- [x] Auth UI (login/register pages with Server Actions)
- [x] Account pages (profile, orders, addresses with CRUD)
- [x] Auth-aware cart + navigation (cart transfer, account dropdown, route protection)

## Known Limitations

- [ ] `checkoutUrl` on Cart type is always empty string
- [ ] Image dimensions are 0x0 (Medusa doesn't provide them)
- [ ] `descriptionHtml` is same as plain description (no HTML from Medusa)
