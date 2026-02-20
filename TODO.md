# TODO

## Deferred Features (Phase 2+)

- [ ] Customer accounts — see [implementation phases](#customer-accounts-implementation) below
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

## Customer Accounts Implementation

**Branch:** `feat/customer-accounts` (already created via Graphite)

**What's already built:**
- `lib/medusa/cookies.ts` — `setAuthToken`, `removeAuthToken`, `getAuthToken`, `getAuthHeaders` are implemented and ready
- All cart operations already pass auth headers (currently `{}`, will auto-populate once JWT is set)
- `lib/medusa/error.ts` — error formatting ready for auth errors

**Reference:** `references/nextjs-starter-medusa/src/lib/data/customer.ts` — full implementation of signup, login, signout, transferCart, address CRUD

### Phase 1: Auth data layer
- [ ] Create `lib/medusa/customer.ts` — `signup`, `login`, `signout`, `retrieveCustomer`, `transferCart`
- [ ] `signup` flow: `sdk.auth.register` → `setAuthToken` → `sdk.store.customer.create` → `sdk.auth.login` → `setAuthToken` → `transferCart`
- [ ] `login` flow: `sdk.auth.login` → `setAuthToken` → `transferCart` (associate anonymous cart with customer)
- [ ] `signout` flow: `sdk.auth.logout` → `removeAuthToken` → `removeCartId` → revalidate caches → redirect
- [ ] `retrieveCustomer`: fetch `/store/customers/me` with auth headers, return `null` if unauthenticated

### Phase 2: Auth UI (login/register pages)
- [ ] Create `/account/login` page with login + register forms (Tailwind UI form components)
- [ ] Server Actions for form submission (using `useActionState` for error display)
- [ ] Redirect to account page on success, show errors inline on failure
- [ ] Add account link to navigation (conditionally show Login vs account name)

### Phase 3: Account pages
- [ ] Create `/account` page — profile overview (name, email)
- [ ] Create `/account/orders` page — order history via `sdk.store.order.list`
- [ ] Create `/account/addresses` page — address CRUD (`addCustomerAddress`, `updateCustomerAddress`, `deleteCustomerAddress`)
- [ ] Profile edit form (`updateCustomer`)

### Phase 4: Auth-aware cart + navigation
- [ ] Cart transfer on login (anonymous cart → customer cart) — `transferCart` in reference
- [ ] Show customer name in nav header when logged in
- [ ] Protect account routes (redirect to login if unauthenticated)
- [ ] Logout button in account dropdown

## Known Limitations

- [ ] `checkoutUrl` on Cart type is always empty string
- [ ] Image dimensions are 0x0 (Medusa doesn't provide them)
- [ ] `descriptionHtml` is same as plain description (no HTML from Medusa)
