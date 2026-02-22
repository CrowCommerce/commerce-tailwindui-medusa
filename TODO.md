# TODO

## Deferred Features (Phase 2+)

- [x] Customer accounts — see [implementation phases](#customer-accounts-implementation) below
- [ ] Checkout flow (`redirectToCheckout` is a stub — redirects to `/cart`) — cart now fetches promotions + shipping methods
- [ ] Multi-region / multi-currency support
- [ ] Product categories (Medusa nested category tree)
- [ ] Wishlist / saved items
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

- [ ] `ProductReviewResponse` entity — admin replies to reviews (full CRUD)
- [ ] `ProductReviewImage` entity — image upload endpoint for review photos
- [ ] Display admin responses on storefront review list

### Phase 3: Verified Purchase & Search

- [ ] Order linking (`order_id`, `order_line_item_id`) for verified purchase badge
- [ ] Full-text search on review content + name in admin
- [ ] Review editing (upsert pattern — one review per customer per product)

## Wishlist

- [ ] Wishlist / saved items (heart icon on product cards and detail pages)
- [ ] Persistent wishlist for authenticated customers (Medusa custom endpoint or metadata)
- [ ] Guest wishlist via localStorage with merge on login
- [ ] Wishlist page under `/account/wishlist`
- [ ] "Move to cart" action from wishlist

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

## Testing

- [ ] Create `vitest.config.ts`
- [ ] Create `playwright.config.ts`
- [ ] Unit tests for `lib/medusa/transforms.ts`
- [ ] E2E test: browse products → add to cart flow

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
