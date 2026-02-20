# TODO

## Deferred Features (Phase 2+)

- [ ] Customer accounts (login, registration, order history) — cookie infrastructure ready in `lib/medusa/cookies.ts`
- [ ] Checkout flow (`redirectToCheckout` is a stub — redirects to `/cart`) — cart now fetches promotions + shipping methods
- [ ] Multi-region / multi-currency support
- [ ] Product categories (Medusa nested category tree)
- [ ] Wishlist / saved items
- [ ] CMS pages (`getPage`/`getPages` return stubs)

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

- [ ] Set up CI/CD (GitHub Actions)
- [ ] Configure Medusa webhooks for cache revalidation
- [ ] Update `DEFAULT_NAVIGATION` with real store categories

## Known Limitations

- [ ] `checkoutUrl` on Cart type is always empty string
- [ ] Image dimensions are 0x0 (Medusa doesn't provide them)
- [ ] `descriptionHtml` is same as plain description (no HTML from Medusa)
