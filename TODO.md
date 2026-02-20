# TODO

## Deferred Features (Phase 2+)

- [ ] Checkout flow (`redirectToCheckout` is a stub — redirects to `/cart`)
- [ ] Customer accounts (login, registration, order history)
- [ ] Multi-region / multi-currency support
- [ ] Product categories (Medusa nested category tree)
- [ ] Wishlist / saved items
- [ ] CMS pages (`getPage`/`getPages` return stubs)

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
