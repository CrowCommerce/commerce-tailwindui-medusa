# TODO

> For feature status and project overview, see [README.md](README.md).
> For in-progress feature details, see [docs/features/](docs/features/).

## Parallel Execution Queue (2026-03-30 Audit)

Use these tasks as the handoff units for separate Codex sessions. Each task owns a mostly disjoint write scope. When starting a parallel session, point the agent at `TODO.md` and the specific task number.

### Task 1 — URL Persistence + Consent Foundation

- [ ] **Goal:** install `nuqs` site-wide, persist attribution params across navigation, and add the shared consent primitives that gate analytics.
- [ ] **Owns files:** `storefront/package.json`, `bun.lockb`, `storefront/app/layout.tsx`, `storefront/components/providers/posthog-provider.tsx`, new `storefront/components/*consent*`, new `storefront/lib/*utm*`, new `storefront/lib/*consent*`, related unit tests/docs.
- [ ] **Do not edit:** `storefront/next.config.ts`, `storefront/proxy.ts`, contact/newsletter backend routes, legal pages, `storefront/lib/structured-data.tsx`.
- [ ] **Required work:**
- [ ] Install `nuqs` and create a site-wide persistence strategy for `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `gclid`, and `fbclid`.
- [ ] Make the persisted attribution values readable from client and server code without scattering query parsing across the app.
- [ ] Add a cookie consent banner and consent storage primitives.
- [ ] Gate PostHog initialization, pageviews, and session replay behind consent. Keep the current bootstrap/identify/reset behavior intact after consent is granted.
- [ ] Ensure the solution is template-friendly: enabled by default only where legally safe, clearly documented where store owners need to make a jurisdiction choice.
- [ ] **Acceptance criteria:**
- [ ] Landing on a URL with UTMs/click IDs preserves them across internal navigation and form submissions.
- [ ] PostHog does not initialize before consent is granted.
- [ ] Consent state survives refreshes and can be changed later.
- [ ] `bun run test` and `cd storefront && bun run build` pass.
- [ ] **Suggested handoff prompt:** `Implement TODO.md Task 1 end-to-end. Follow AGENTS.md. Own only the files listed under Task 1 unless absolutely required.`

### Task 2 — Security + Attribution Headers

- [ ] **Goal:** make the storefront ad-friendly without leaving headers/security in a weakened default state.
- [ ] **Owns files:** `storefront/next.config.ts`, `storefront/proxy.ts`, `backend/src/api/middlewares.ts`, `backend/src/api/middlewares/newsletter-rate-limit.ts`, any small supporting header/rate-limit helpers.
- [ ] **Do not edit:** `storefront/app/layout.tsx`, PostHog provider, contact/newsletter form components, legal pages, structured-data files.
- [ ] **Required work:**
- [ ] Change `Referrer-Policy` to an ad-friendly value and document the tradeoff in code comments.
- [ ] Re-enable CSP with a deliberately minimal, template-safe policy that keeps Stripe, Sentry, PostHog proxying, Meilisearch, and Next runtime behavior working.
- [ ] Prefer the loosest policy that still closes obvious script injection holes; do not introduce a strict policy that breaks common integrations out of the box.
- [ ] Make newsletter IP-based rate limiting proxy-aware the same way auth routes already are.
- [ ] **Acceptance criteria:**
- [ ] Storefront responses include a real CSP header again.
- [ ] Referrer policy is ad-safe by default.
- [ ] Newsletter rate limiting keys off real client IPs behind reverse proxies.
- [ ] `cd storefront && bun run build` and `cd backend && bun run build` pass.
- [ ] **Suggested handoff prompt:** `Implement TODO.md Task 2 end-to-end. Keep the CSP intentionally template-friendly and ad-friendly, but do not leave CSP disabled.`

### Task 3 — Contact Form Production Pipeline

- [ ] **Goal:** replace the fake `/contact` success flow with a real message pipeline that fits the current Resend-backed architecture.
- [ ] **Owns files:** `storefront/components/contact/*`, `storefront/app/contact/page.tsx`, new contact action/route files, backend contact API/workflow/template files, relevant analytics/Sentry tests/docs.
- [ ] **Do not edit:** `storefront/next.config.ts`, `storefront/proxy.ts`, newsletter unsubscribe/token files, legal pages, global error page, root metadata.
- [ ] **Required work:**
- [ ] Build a real contact submission flow using the existing backend + Resend workflow architecture, not a one-off direct browser email send.
- [ ] Add input validation, honeypot protection, and rate limiting.
- [ ] Track `contact_form_submitted` and `contact_form_failed`.
- [ ] Capture failures in Sentry with non-PII context.
- [ ] If Task 1 has landed, thread persisted UTMs/click IDs through the submission path.
- [ ] **Acceptance criteria:**
- [ ] `/contact` only shows success after a real backend success path.
- [ ] Duplicate sends are prevented where reasonable.
- [ ] Spam protection exists without harming legitimate submits.
- [ ] Local/manual happy-path test and failure-path test are documented in the PR.
- [ ] **Suggested handoff prompt:** `Implement TODO.md Task 3 end-to-end. Use the current Resend subscriber/workflow architecture as the pattern.`

### Task 4 — Newsletter Hardening

- [ ] **Goal:** finish the newsletter security/compliance hardening without overlapping the contact work.
- [ ] **Owns files:** `backend/src/modules/newsletter/**/*`, `backend/src/workflows/newsletter/**/*`, `backend/src/api/store/newsletter/**/*`, `backend/src/utils/newsletter-token.ts`, `storefront/app/newsletter/unsubscribe/**/*`, `storefront/components/layout/footer/*newsletter*`, newsletter-related tests/migrations/docs.
- [ ] **Do not edit:** `backend/src/api/middlewares.ts`, `backend/src/api/middlewares/newsletter-rate-limit.ts`, `storefront/next.config.ts`, `storefront/proxy.ts`, contact form files.
- [ ] **Required work:**
- [ ] Replace the reversible HMAC unsubscribe token with an opaque server-stored nonce.
- [ ] Invalidate/re-issue unsubscribe credentials correctly on re-subscribe or re-send.
- [ ] Remove the live token from the browser URL/history after the unsubscribe page loads.
- [ ] Add honeypot protection to newsletter signup.
- [ ] Preserve the existing Medusa/Resend newsletter workflow behavior.
- [ ] **Acceptance criteria:**
- [ ] Unsubscribe links no longer expose the subscriber email.
- [ ] Unsubscribe tokens are not replayable indefinitely and are not left in pageview URLs.
- [ ] Newsletter signup has spam protection.
- [ ] Existing subscribe/unsubscribe happy paths still work.
- [ ] **Suggested handoff prompt:** `Implement TODO.md Task 4 end-to-end. Harden newsletter token handling and form protection without changing Task 2's header/rate-limit ownership.`

### Task 5 — Metadata + Structured Data Pack

- [ ] **Goal:** close the SEO/social metadata gaps in one coherent pass.
- [ ] **Owns files:** `storefront/lib/structured-data.tsx`, `storefront/app/page.tsx`, `storefront/app/faq/page.tsx`, `storefront/app/opengraph-image.tsx`, relevant OG/Twitter helper/components, and `storefront/app/layout.tsx` **only after Task 1 is merged**.
- [ ] **Do not edit:** contact/newsletter backend routes, legal page content, `storefront/proxy.ts`, backend middleware.
- [ ] **Required work:**
- [ ] Add WebSite JSON-LD where it belongs.
- [ ] Add FAQPage JSON-LD for `/faq`.
- [ ] Add root/default Twitter card metadata.
- [ ] Improve fallback Open Graph/Twitter metadata for non-product pages so generic pages do not fall back to weak defaults.
- [ ] Keep existing product schema and page-specific metadata intact.
- [ ] **Acceptance criteria:**
- [ ] Homepage emits Organization + WebSite JSON-LD.
- [ ] FAQ page emits FAQPage JSON-LD.
- [ ] Root metadata provides sane OG/Twitter fallbacks for static pages.
- [ ] Unit tests are added or updated for the new schema output.
- [ ] **Suggested handoff prompt:** `Implement TODO.md Task 5 end-to-end. Do not start until Task 1 has merged unless you intentionally coordinate ownership of app/layout.tsx.`

### Task 6 — Legal Indexing + Global Error Experience

- [ ] **Goal:** make the legal pages indexable and replace the unstyled global error fallback.
- [ ] **Owns files:** `storefront/app/privacy-policy/page.tsx`, `storefront/app/terms-of-service/page.tsx`, `storefront/app/cookie-policy/page.tsx`, `storefront/app/return-policy/page.tsx`, `storefront/app/shipping-policy/page.tsx`, `storefront/app/global-error.tsx`, any supporting UI components.
- [ ] **Do not edit:** newsletter/contact flows, PostHog provider, `storefront/lib/structured-data.tsx`, `storefront/next.config.ts`.
- [ ] **Required work:**
- [ ] Flip legal-page metadata to `robots: { index: true }` while leaving placeholder copy intact for now.
- [ ] Ensure the global error page uses a TailwindPlus/Tailwind UI style consistent with the storefront, keeps `Sentry.captureException`, and provides clear recovery actions.
- [ ] **Acceptance criteria:**
- [ ] All five legal pages are indexable.
- [ ] `global-error.tsx` is production-quality and matches the site design language.
- [ ] The error page still works without the normal app shell being available.
- [ ] **Suggested handoff prompt:** `Implement TODO.md Task 6 end-to-end. Keep scope limited to legal-page indexing and the global error experience.`

### Recommended Execution Waves

- [ ] **Wave 1 (parallel):** Task 1, Task 2, Task 3, Task 4, Task 6
- [ ] **Wave 2 (sequential after Task 1):** Task 5
- [ ] **Primary conflict to avoid:** `storefront/app/layout.tsx` is owned by Task 1 first, then Task 5.
- [ ] **Secondary conflict to avoid:** newsletter middleware/header files belong to Task 2; newsletter token/form hardening belongs to Task 4.

## Code Review Follow-ups

### From PR #8

- [x] Migrate admin review drawer to `@medusajs/ui` primitives (Drawer, Button, Textarea, Label) for consistency with admin UI conventions
- [x] Validate `images[].url` hostname against storage provider domain, or switch to opaque upload IDs instead of raw URLs (security hardening)
- [x] Refactor `uploadReviewImages` server action to accept `FormData` instead of `File[]` for proper Server Action serialization
- [x] Add `data-testid` attributes to review components and migrate E2E selectors from Tailwind classes to stable `data-testid` selectors
- [x] Extract ReviewList lightbox state into a thin client wrapper so the list itself can be a server component
- [x] Add regex validation for Medusa IDs in E2E fixture SQL interpolation (e.g. `/^rev_[a-z0-9]+$/`)
- [x] Add fail-fast env var checks in E2E fixtures for CI environments
- [x] Rename `prev_img` ID prefix to `revi` on ReviewImage model (requires migration)
- [x] Revoke `URL.createObjectURL` blobs in ReviewForm on file remove and component cleanup
- [x] Add explicit `multer` to backend `package.json` dependencies (currently works via transitive dep from `@medusajs/medusa`)

### From Invoice Generation

- [x] Refactor `tryGenerateInvoicePdfStep` to call existing workflow steps instead of duplicating invoice creation, formatting, and rendering logic
- [x] TS2590 `as any` casts in `generate-invoice-pdf.ts` — documented with explanatory comments (Medusa WorkflowData union complexity, not removable)
- [x] Admin invoice widget (`order-invoice.tsx`) — replaced `window.open` with blob-based download for cross-origin admin deployments
- [x] Narrow catch clause in `get-or-create-invoice.ts` retry to only catch unique constraint violations, not all errors
- [x] Add input sanitization (Medusa ID format check) to storefront invoice proxy route (`app/api/orders/[id]/invoice/route.ts`)

### From PR #9

- [x] Strip `payment_sessions` from checkout cart serialization — only pass `client_secret` to client via dedicated server action (Finding #1: broad payment-session exposure)
- [x] Add Zod schema validation to checkout server actions for `email`, address payloads, `providerId`, and `data` params (Finding #2: no input validation at action boundaries)

### From PR #61 (Company Pages)

- [x] Wire up contact form to send email via Resend — backend route, validation, rate limiting, analytics, and spam protection are now shipped for `/contact`

### From PR #33 (Newsletter Signup)

- [ ] Replace HMAC bearer unsubscribe token with opaque server-stored nonce — current token embeds email in reversible base64url and is replayable for 30 days. PostHog pageview captures the full tokenized URL, leaking the token to analytics pipelines. Fix: store a one-time nonce on the subscriber record, invalidate on re-subscribe, and strip the token from the address bar via `window.history.replaceState` after the unsubscribe page loads.
- [ ] Email preferences page — currently the "manage your email preferences" link is hidden in email footers because no page exists. Two approaches: (1) for logged-in customers, add an email preferences section to `/account/settings` where they can toggle newsletter, order updates, and marketing emails; (2) for account-agnostic access, create a standalone `/email-preferences` page that accepts a signed token (same pattern as unsubscribe) and lets anyone with a valid link manage preferences for their email address without requiring an account. Ideal: support both — account settings for logged-in users, token-based page for email links. Wire the `legalLinks.preferences` config in the email footer to point to the appropriate URL.

### From PR #32 (Meilisearch Integration)

- [ ] Faceted search results page — the current `meilisearch-results.tsx` was reverted because it conflicts with the shared `(store)` layout (duplicate sort dropdown, nested grid). The proper approach: integrate Meilisearch faceted filters (collections, price range, availability) INTO the existing `(store)` layout components (`components/layout/search/collections.tsx`, `sort-filter-menu.tsx`, `mobile-filters.tsx`) rather than rendering a separate InstantSearch layout. The Cmd+K palette Meilisearch integration works correctly — only the search results page needs this redesign.
- [ ] Investigate `variant_prices` indexing — price range filter shows $0–$0 in Meilisearch results, suggesting variant prices may not be indexed correctly. Check whether `variants.prices.*` in the `useQueryGraphStep` query returns the expected amounts. May need to use `variants.calculated_price.*` with a `QueryContext` instead.

### From PR #29 (PostHog Integration)

- [x] Redact PII from `search_performed` event query field — normalize, truncate to 80 chars, and redact strings matching email/phone patterns before sending to PostHog
- [x] Enrich `product_added_to_cart` event with `product_id` and `price` — currently empty/zero because `addItem()` only receives `selectedVariantId`. Either pass product context from the calling component or accept a second fetch.

## Maintenance / Docs

- [x] General codebase cleanup pass — audit recently touched storefront/backend files for duplication, dead code, inconsistent patterns, and obvious simplification opportunities before the next feature push
- [x] Update `README.md` to reflect current architecture, shipped scope, and the new fork-per-client ownership model
- [x] Install `nuqs`
- [ ] Audit cursor-pointer behavior across interactive UI elements — ensure buttons, links, and other clickable controls consistently show the expected pointer cursor where appropriate

## Template Hardening

- [ ] Add a root `LICENSE` covering the full monorepo and document downstream fork usage, Tailwind Plus licensing expectations, and inherited third-party licenses in `README.md`
- [ ] Harden newsletter unsubscribe for production-template use — replace the current tokenized URL flow with an opaque server-stored nonce, scrub the token from the address bar before analytics can observe it, and add regression coverage for replay/expiry behavior
- [ ] Build a real email preferences flow and wire the footer preferences link to it — support both logged-in account management and link-based access from emails
- [ ] Expand CI/CD from code quality to deploy confidence — add preview/health checks against the deployed storefront/backend, plus a documented failure triage path for preview-only regressions
- [ ] Fix Vercel Sentry env configuration and verify the next production build successfully creates releases and uploads sourcemaps
- [ ] Verify catalog revalidation end-to-end in production and write the operational runbook (trigger source, storefront webhook, cache invalidation expectations, failure checks)
- [ ] Complete template boundary adoption — move more client-owned branding/navigation/theme concerns behind `packages/site-config`, add at least one real `storefront/site` extension point used by shared code, and document a concrete `backend/src/site` extension example
- [ ] Add a docs hygiene checkpoint for shipped work — keep `TODO.md`, `README.md`, and feature docs in sync so template consumers are not misled by stale status claims

## Testing

- [ ] Discount / promo code UI — add a "Promo code" input to the checkout order summary (collapsible section below the line items). Use Medusa's `updateCart` with `promo_codes` to apply codes. Display applied discount as a removable chip/tag. The order summary already renders `discount_total` when present — this just needs the input to apply codes. Use TailwindPlus Ecommerce > Shopping Carts for input pattern reference. Server action: `applyPromoCode(cartId, code)` and `removePromoCode(cartId, code)`. Track: `promo_code_applied`, `promo_code_removed`, `promo_code_failed` events.
- [ ] Testing discounts (apply promo codes, verify discount display in checkout + order confirmation)
- [ ] Compare checkout page UI to TailwindUI components (ensure all checkout/order pages match TailwindUI patterns)
- [x] Order details page — build using TailwindPlus Ecommerce > Page Examples > Order Detail Pages > "With large images and progress bars" component. Features: product images, order progress bar (Order placed → Processing → Shipped → Delivered), delivery address, shipping updates, billing summary with payment info. Wire to Medusa order data (`/account/orders/[id]`). The TailwindPlus component includes a full navbar with mega menus, footer, and billing section — adapt to use existing layout components.
- [x] Create `playwright.config.ts`
- [x] Expand storefront Vitest coverage — add deterministic unit tests for `lib/medusa/transforms.ts`, `lib/analytics.ts` PII redaction, and `lib/validation.ts`
- [x] E2E test: browse products → add to cart flow
- [x] Wishlist E2E test suite (40 tests across 10 spec files — guest, authenticated, heart-button, heart-state, sharing, import, transfer, nav-badge, rename-delete, social-proof; 80 total with Firefox)
- [x] Review E2E test suite (27 tests across 4 spec files — form, display, image-upload, lightbox; 54 total with Firefox)

## Infrastructure

- [x] Configure S3 File Provider for Medusa — Cloudflare R2 via `@medusajs/medusa/file-s3`, conditional on `S3_BUCKET`, E2E tests, Railway + Vercel env vars configured
- [x] Convert `<img>` tags to Next.js `<Image>` components
- [x] Convert monorepo to Turborepo with bun workspaces
- [x] Shared TypeScript tooling (`@repo/typescript`)
- [x] Enable React Compiler
- [ ] React Compiler optimization (audit component boundaries, measure compile rate, fix bailouts)
- [ ] **[PRIORITY] Expand CI/CD with Playwright smoke tests and preview/health checks** — keep the existing storefront/backend quality gates, then add a separate PR smoke job for critical user flows plus deployment/preview health validation before merge.
- [x] **[PRIORITY] Sentry deep integration audit** — comprehensive error capture across 44 files: checkout/cart/payment/auth storefront catches, all 13 backend subscribers, jobs, workflow steps, rate-limit infrastructure, user context enrichment (client + server), environment separation, 5xx-only proxy policy. Remaining: source maps/releases (Phase 3a), OTEL bridge research (Phase 3b), Sentry Logs/replay tuning/profiling (Phase 4).
- [ ] **[PRIORITY] PostHog deep integration audit** — verify all PostHog features are working in production: pageview autocapture, custom events (check all `AnalyticsEvents` are firing), session replay (verify recordings appear), feature flags (set up at least one flag to verify the pipeline), web analytics dashboard, funnels (checkout funnel, search-to-purchase funnel). Test the PostHog reverse proxy is working (events should appear even with ad blockers). Verify server-side events from the backend (order placed, review created, etc.) appear in PostHog.
- [ ] **[PRIORITY] Fix Vercel Sentry env config** — production build logs show `sentry-cli` failing because `SENTRY_PROJECT` is stored as `crowcommerce-storefront\n` and the current `SENTRY_ORG` / `SENTRY_PROJECT` pairing does not resolve to a valid Sentry project. Confirm the correct Sentry org/project slugs for CrowCommerce, remove trailing newlines from both env vars in Vercel, then verify the next production build completes release creation and sourcemap upload without `Project not found` or `invalid value for --project` errors.
- [x] Configure automatic storefront catalog revalidation from backend product and collection events
- [ ] Verify catalog revalidation end-to-end in production — after a Medusa product/collection create or update, confirm the webhook reaches `/api/revalidate`, `revalidateTag(TAGS.products|collections)` invalidates both the outer cached catalog loaders and the nested tagged fetches, and the storefront reflects the change without waiting for TTL expiry.
- [ ] Update `DEFAULT_NAVIGATION` with real store categories
- [ ] Upgrade Turborepo: `bunx @turbo/codemod@latest update`
- [x] Set up PostHog reverse proxy — Next.js rewrites proxy `/api/ph/:path*` to `us.i.posthog.com` (avoids ad blockers that target `/ingest`). See [PostHog Next.js proxy docs](https://posthog.com/docs/advanced/proxy/nextjs).
- [ ] Switch PostHog proxy to managed proxy — the Next.js rewrite approach is vulnerable to DNS-level CNAME uncloaking (NextDNS, Pi-hole, ISP blockers follow the CNAME chain to `posthog.com` and block before the rewrite runs). PostHog's managed proxy uses randomized hash subdomains on rotating AWS infra that aren't on common blocklists. Also eliminates the rewrite config, `skipTrailingSlashRedirect` workaround, and Vercel edge invocations spent on analytics proxying — replace it all with one DNS CNAME record. Requires PostHog Teams+ plan. See [PostHog managed proxy docs](https://posthog.com/docs/advanced/proxy/managed-reverse-proxy).

## UI Consistency

- [ ] Audit codebase for features not using the `NotificationProvider` / `useNotification()` toast system — identify server actions and user-facing mutations that silently succeed/fail without toast feedback and wire them up for consistent UX
- [ ] Audit storefront components against the TailwindPlus component catalog (`/Users/itsjusteric/CrowCommerce/Resources/TailwindUI/tailwindplus-components.json`) — identify pages and sections using custom markup where a TailwindPlus UI block already exists (e.g., product pages, checkout steps, account settings, error pages). Reference the full catalog at https://tailwindcss.com/plus/ui-blocks/documentation

## Security Audits

- [ ] Run Codex security audit on custom modules — prioritize by attack surface: (1) **Invoice module** (financial data + PDF generation + public download routes), (2) **Review module** (user image uploads + user-generated content rendering), (3) **Wishlist module** (public endpoints like `/store/products/:id/wishlist-count`, JWT sharing tokens, guest routes). Focus on IDOR, SSRF in image uploads, JWT misconfiguration, and input validation gaps. Multiple passes recommended.

## Evaluate

- [ ] [Buttondown](https://buttondown.com/) for newsletter — evaluate as a potential upgrade/replacement for the current newsletter infrastructure. Supports RSS-to-email, markdown authoring, API-first design, paid subscriptions, and analytics. Could simplify the newsletter stack vs. rolling custom with Resend.

## Deferred Features

- [ ] Re-enable re-order after checkout hardening — keep it disabled until payment confirmation no longer relies on cross-step stored Stripe refs and reorder E2E covers the full `reorder -> payment -> confirmed order` path.
- [ ] Cookie consent banner — use TailwindPlus Marketing > Banners > "Privacy notice left-aligned" component, rendered inside a Headless UI `<Dialog>` so it behaves as a modal overlay on first visit. Persist consent in a cookie to avoid showing again. Track: `cookie_consent_accepted`, `cookie_consent_declined` events.
- [ ] Sticky add-to-cart bar on product pages — fixed to the bottom of the viewport, appears on scroll past the main add-to-cart button. Use TailwindPlus Marketing > Banners > full-width banner variant as the base layout. Show product name, selected variant, price, and "Add to Cart" button. Hide when the main add-to-cart button is back in viewport (IntersectionObserver).
- [ ] Search-focused layout option — brainstorm an alternative navbar/layout where search is the primary interaction (like the [Meilisearch ecommerce demo](https://github.com/meilisearch/ecommerce-demo)). Instant faceted filtering on `/products` and `/search` with the search bar front-and-center. This could be a swappable layout style alongside the current TailwindUI sidebar layout. Reference the demo for UX patterns (instant results, facet chips, filter counts).
- [ ] Express checkout (Apple Pay / Google Pay) — composite flow that chains email → address → shipping → payment → order completion in one step. Requires Stripe `PaymentRequestButton` or `ExpressCheckoutElement`. `express-checkout.tsx` component exists but needs implementation. Track with: `express_checkout_started`, `express_checkout_completed`, `express_checkout_failed` events.

## Known Limitations

- [x] Browser back button broken after navigating to a product page — fixed by using `router.replace` for variant URL updates to prevent back button cycling
- [ ] `checkoutUrl` on Cart type is always empty string
- [ ] Image dimensions are 0x0 (Medusa doesn't provide them)
- [ ] `descriptionHtml` is same as plain description (no HTML from Medusa)
