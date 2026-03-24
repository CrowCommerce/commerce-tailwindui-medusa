# Sentry Audit & Production Verification Report

Date: 2026-03-23

Scope:
- `storefront/` (`@sentry/nextjs` / Vercel / Next.js 16 App Router)
- `backend/` (`@sentry/node` / Railway / Medusa v2)

Method:
- Repository audit only.
- No requests were made to production.
- Installed SDKs in `node_modules` resolve to `@sentry/nextjs@10.45.0` and `@sentry/node@10.45.0`.

## 1. Configuration Correctness

**Status:** ⚠️ Partial

**Findings**

- The storefront file layout matches the current `@sentry/nextjs` manual setup pattern: `storefront/instrumentation.ts:3-12` registers server and edge init files and exports `onRequestError`, `storefront/instrumentation-client.ts:4-22` initializes the browser SDK and exports `onRouterTransitionStart`, and `storefront/app/global-error.tsx:15-17` captures the `error` prop.
- Storefront server, edge, and client init calls are present and syntactically valid, but all three set `environment` from `process.env.NODE_ENV` only: `storefront/sentry.server.config.ts:4-12`, `storefront/sentry.edge.config.ts:3-9`, `storefront/instrumentation-client.ts:6-22`. On Vercel, preview deployments also run with `NODE_ENV=production`, so preview and production events will collapse into the same Sentry environment unless an explicit `SENTRY_ENVIRONMENT`-style override is introduced.
- `withSentryConfig` is wired in `storefront/next.config.ts:3-71`, and `org` / `project` are read from env at `storefront/next.config.ts:67-70`. The repo documents build-time source map credentials in `storefront/.env.example:59-63`, but `SENTRY_AUTH_TOKEN` is not passed explicitly in `next.config.ts`, so storefront source map upload depends entirely on the Vercel build environment being configured correctly.
- Turborepo build env passthrough is incomplete for Sentry-related build inputs. `turbo.json:9-18` includes only `DATABASE_URL`, `MEDUSA_BACKEND_URL`, and `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` in `tasks.build.env`. If CI uses `turbo build`, Sentry build-time configuration is not explicitly part of the hashed build environment.
- The backend initializes Sentry correctly at a basic level in `backend/instrumentation.ts:5-11`, including DSN, traces sample rate, profiling integration, and environment. However, the same `NODE_ENV` environment-collapsing problem exists there too (`backend/instrumentation.ts:10`).
- Backend OpenTelemetry registration is only partially convincing for Sentry tracing. `backend/instrumentation.ts:13-22` enables Medusa OTEL instrumentation via `registerOtel`, but the repo does not pass an exporter or span processor, so there is no explicit evidence in repo code that Medusa workflow/query/db spans are being forwarded into Sentry rather than only being created locally.
- Production sampling defaults are broadly reasonable but not fully justified. Storefront traces are `0.2` on all runtimes (`storefront/sentry.server.config.ts:6-8`, `storefront/sentry.edge.config.ts:6-8`, `storefront/instrumentation-client.ts:9-11`), backend traces are `0.2` (`backend/instrumentation.ts:7`), and profiles are `0.1` on storefront server/client and backend (`storefront/sentry.server.config.ts:9`, `storefront/instrumentation-client.ts:12`, `backend/instrumentation.ts:8`). That is a sensible starting point, but profiling especially should be justified against actual usage and cost.

## 2. Error Capture Coverage

**Status:** ⚠️ Partial

**Findings**

- Uncaught storefront request/render errors should be captured. `storefront/instrumentation.ts:12` exports `onRequestError = Sentry.captureRequestError`, which is the correct App Router hook for uncaught request-time failures.
- That hook does not help with handled failures that are converted into return values or UI state. Important storefront commerce paths catch errors and return fallback values without any Sentry capture:
  - `storefront/lib/medusa/checkout.ts:37-52`, `storefront/lib/medusa/checkout.ts:64-74`, `storefront/lib/medusa/checkout.ts:89-107`, `storefront/lib/medusa/checkout.ts:119-144`, `storefront/lib/medusa/checkout.ts:153-163`, `storefront/lib/medusa/checkout.ts:177-195`, `storefront/lib/medusa/checkout.ts:207-218`, `storefront/lib/medusa/checkout.ts:228-262`, `storefront/lib/medusa/checkout.ts:317-328`
  - `storefront/components/cart/actions.ts:30-38`, `storefront/components/cart/actions.ts:49-57`, `storefront/components/cart/actions.ts:76-103`
  - `storefront/components/search-command/actions.ts:15-30`
  - `storefront/app/api/orders/[id]/invoice/route.ts:30-78`
  - `storefront/app/api/reviews/upload/route.ts:20-53`
- Client-side capture is incomplete. `storefront/app/global-error.tsx:15-17` reports root-level failures, but the app also has a segment-level boundary at `storefront/app/error.tsx:3-18` which renders a fallback and never calls Sentry. Route-segment failures handled by that boundary can therefore degrade the UI without an explicit Sentry event.
- Client event-handler failures are frequently handled locally with only `console.error` or component state updates, which means they may never reach Sentry as unhandled browser exceptions:
  - `storefront/components/checkout/express-checkout.tsx:142-177`
  - `storefront/components/checkout/checkout-shipping.tsx:56-73`, `storefront/components/checkout/checkout-shipping.tsx:82-95`
  - `storefront/components/wishlist/wishlist-button.tsx:50-56`
  - `storefront/components/wishlist/wishlist-count.tsx:10-14`
- Backend API route coverage is only good for errors that bubble to Medusa's middleware chain. `backend/src/api/middlewares.ts:45-47` captures exceptions in the global `errorHandler`, so request failures reaching that point should appear in Sentry.
- Backend async/background coverage is the largest gap in the monorepo. Jobs, subscribers, and workflow steps frequently catch and log errors without `Sentry.captureException(...)`, which means production failures can be completely absent from Sentry:
  - `backend/src/jobs/send-abandoned-cart-emails.ts:31-35`, `backend/src/jobs/send-abandoned-cart-emails.ts:69-111`
  - `backend/src/subscribers/order-placed.ts:11-29`
  - `backend/src/subscribers/newsletter-subscribed.ts:19-55`
  - `backend/src/subscribers/shipment-created.ts:17-40`
  - `backend/src/subscribers/meilisearch-product-sync.ts:10-25`
  - `backend/src/workflows/steps/try-generate-invoice-pdf.ts:35-101`
  - `backend/src/api/store/wishlists/import/route.ts:47-57`
- Unhandled promise rejections should be captured in both runtimes because none of the init calls disable Sentry default integrations: `storefront/sentry.server.config.ts:4-12`, `storefront/sentry.edge.config.ts:3-9`, `storefront/instrumentation-client.ts:6-22`, `backend/instrumentation.ts:5-11`. However, this only helps with truly unhandled failures; the repo currently catches many of the interesting ones before they can bubble that far.

### Silent / Swallowed Catch Inventory

Runtime code only; tests and third-party code excluded.

- `storefront/app/checkout/page.tsx:19-25`
- `storefront/app/cart/recover/[id]/route.ts:48-58`, `storefront/app/cart/recover/[id]/route.ts:64`
- `storefront/app/api/orders/[id]/invoice/route.ts:41`, `storefront/app/api/orders/[id]/invoice/route.ts:53`, `storefront/app/api/orders/[id]/invoice/route.ts:63-78`
- `storefront/app/api/reviews/upload/route.ts:8-15`, `storefront/app/api/reviews/upload/route.ts:20-53`
- `storefront/components/cart/actions.ts:30-38`, `storefront/components/cart/actions.ts:49-57`, `storefront/components/cart/actions.ts:76-103`
- `storefront/components/checkout/checkout-shipping.tsx:56-73`, `storefront/components/checkout/checkout-shipping.tsx:82-95`
- `storefront/components/checkout/express-checkout.tsx:142-177`
- `storefront/components/layout/footer/actions.ts:17-40`
- `storefront/components/search-command/actions.ts:15-30`
- `storefront/components/wishlist/wishlist-button.tsx:50-56`
- `storefront/components/wishlist/wishlist-count.tsx:10-14`
- `storefront/lib/medusa/checkout.ts:37-52`, `storefront/lib/medusa/checkout.ts:64-74`, `storefront/lib/medusa/checkout.ts:89-107`, `storefront/lib/medusa/checkout.ts:119-144`, `storefront/lib/medusa/checkout.ts:153-163`, `storefront/lib/medusa/checkout.ts:177-195`, `storefront/lib/medusa/checkout.ts:207-218`, `storefront/lib/medusa/checkout.ts:228-262`, `storefront/lib/medusa/checkout.ts:317-328`
- `storefront/lib/medusa/customer.ts:49-60`, `storefront/lib/medusa/customer.ts:73-85`, `storefront/lib/medusa/customer.ts:87-112`, `storefront/lib/medusa/customer.ts:143-190`, `storefront/lib/medusa/customer.ts:192-216`, `storefront/lib/medusa/customer.ts:223-238`, `storefront/lib/medusa/customer.ts:260-274`, `storefront/lib/medusa/customer.ts:288-304`, `storefront/lib/medusa/customer.ts:320-332`, `storefront/lib/medusa/customer.ts:361-374`, `storefront/lib/medusa/customer.ts:389-403`, `storefront/lib/medusa/customer.ts:413-420`
- `storefront/lib/medusa/index.ts:454-460`
- `storefront/lib/medusa/reviews.ts:17-22`, `storefront/lib/medusa/reviews.ts:41-60`, `storefront/lib/medusa/reviews.ts:112-134`
- `storefront/lib/medusa/wishlist.ts:61-82`, `storefront/lib/medusa/wishlist.ts:103-122`, `storefront/lib/medusa/wishlist.ts:134-141`, `storefront/lib/medusa/wishlist.ts:208-220`, `storefront/lib/medusa/wishlist.ts:243-250`, `storefront/lib/medusa/wishlist.ts:257-268`, `storefront/lib/medusa/wishlist.ts:275-298`, `storefront/lib/medusa/wishlist.ts:319-328`, `storefront/lib/medusa/wishlist.ts:340-351`, `storefront/lib/medusa/wishlist.ts:365-376`, `storefront/lib/medusa/wishlist.ts:385-395`, `storefront/lib/medusa/wishlist.ts:401-410`, `storefront/lib/medusa/wishlist.ts:420-431`
- `backend/src/api/store/wishlists/import/route.ts:47-57`
- `backend/src/api/middlewares/rate-limit.ts:63-66`, `backend/src/api/middlewares/rate-limit.ts:71-78`
- `backend/src/jobs/send-abandoned-cart-emails.ts:31-35`, `backend/src/jobs/send-abandoned-cart-emails.ts:69-111`
- `backend/src/subscribers/order-placed.ts:11-29`
- `backend/src/subscribers/newsletter-subscribed.ts:19-55`
- `backend/src/subscribers/shipment-created.ts:17-40`
- `backend/src/subscribers/meilisearch-product-sync.ts:10-25`
- `backend/src/workflows/steps/try-generate-invoice-pdf.ts:35-101`

## 3. Missing Integrations

**Status:** ⚠️ Partial

**Findings**

- There is no repo evidence of Sentry user enrichment. A repo-wide search found only two runtime capture calls, both plain `captureException`: `storefront/app/global-error.tsx:16` and `backend/src/api/middlewares.ts:46`. No `Sentry.setUser`, `setTag`, `setContext`, `setExtra`, or `withScope` usage was found.
- The best places to bind user context exist, but currently do not do so:
  - Storefront customer auth flows in `storefront/lib/medusa/customer.ts:63-250`
  - Storefront customer retrieval in `storefront/lib/medusa/customer.ts:43-61`
  - Backend authenticated route enforcement in `backend/src/api/middlewares.ts:85-92`, `backend/src/api/middlewares.ts:167-172`, `backend/src/api/middlewares.ts:205-219`
- There is no custom commerce context attached to failures. High-value identifiers such as cart ID, order ID, payment provider, region, and wishlist ID are available in flows like `storefront/lib/medusa/checkout.ts:223-262`, `storefront/app/api/orders/[id]/invoice/route.ts:30-78`, `storefront/lib/medusa/wishlist.ts:223-431`, and `backend/src/jobs/send-abandoned-cart-emails.ts:68-111`, but none of these paths attach tags or structured context to Sentry.
- Sentry Cron Monitoring is not configured. The backend has at least one scheduled job at `backend/src/jobs/send-abandoned-cart-emails.ts:114-116`, and a repo-wide search found no `Sentry.cron`, monitor config, or similar monitor instrumentation.
- Sentry's Vercel integration cannot be confirmed from the repo. There is no repo artifact showing release tracking, deploy notifications, or commit association from Vercel into Sentry. Treat this as unverified until checked in the Sentry/Vercel UI.
- Storefront source map upload is only partially evidenced by repo state (`storefront/next.config.ts:67-70`, `storefront/.env.example:59-63`). Backend source map upload is not evidenced at all; `backend/Dockerfile:10-27` has no Sentry build/upload step, and `backend/.env.example:79-84` exposes only runtime DSN/sample-rate variables.

## 4. Performance Monitoring

**Status:** ⚠️ Partial

**Findings**

- App Router transition instrumentation is wired correctly on the client. `storefront/instrumentation-client.ts:4` exports `onRouterTransitionStart = Sentry.captureRouterTransitionStart`.
- The storefront is currently relying on same-origin browser traffic for backend-adjacent flows. The browser fetches found in the repo target same-origin Next routes rather than the Railway API directly:
  - `storefront/components/reviews/ReviewForm.tsx:57`
  - `storefront/components/account/download-invoice-button.tsx:23`
  - `storefront/app/api/reviews/upload/route.ts:21-29`
  - `storefront/app/api/orders/[id]/invoice/route.ts:31-38`
  This means the current absence of an explicit `tracePropagationTargets` setting in `storefront/instrumentation-client.ts:6-22` is not obviously breaking today's browser traffic, but it would become a problem if the browser starts calling `https://api.medusa.crowcommerce.org` directly.
- The critical distributed-tracing hop is currently storefront server route -> backend API. Both proxy routes use `fetch(...)` to the Medusa backend:
  - `storefront/app/api/orders/[id]/invoice/route.ts:31-38`
  - `storefront/app/api/reviews/upload/route.ts:21-29`
  This is a plausible shape for a connected trace, but it still needs manual verification in Sentry because the repo does not log or assert propagation.
- The backend enables Medusa OTEL instrumentation in `backend/instrumentation.ts:13-22`, but there is no explicit bridge in repo code proving those spans are exported into Sentry. This is the main reason performance monitoring is only partial rather than working.

## 5. Session Replay & Profiling

**Status:** ⚠️ Partial

**Findings**

- Replay is configured for error-only capture in `storefront/instrumentation-client.ts:13-19` with `replaysSessionSampleRate: 0` and `replaysOnErrorSampleRate: 1.0`. That is cost-efficient and privacy-friendly, but it provides no baseline sampling for non-error journeys and only helps once an issue has already occurred.
- Replay privacy settings are likely too aggressive for an ecommerce storefront: `maskAllText: true` and `blockAllMedia: true` at `storefront/instrumentation-client.ts:16-19` will hide product names, prices, cart labels, and merchandising imagery that are often exactly what you need to debug storefront incidents.
- Profiling is enabled in all major runtimes:
  - `storefront/sentry.server.config.ts:9-10`
  - `storefront/instrumentation-client.ts:12-20`
  - `backend/instrumentation.ts:8-9`
  There is nothing obviously broken about this, but there is also no repo evidence that the team is actively using profile data. If profiles are not reviewed, the current setup is just extra ingest and bundle/runtime overhead.

## 6. Production Verification Checklist

**Status:** ⚠️ Not Yet Verified

Perform these checks in a preview, staging, or otherwise isolated deployment. Do not use live production traffic for first verification.

1. Verify storefront client error capture.
   Use a temporary client-side throw in a component rendered through the App Router, ideally one that exercises the segment-level boundary at `storefront/app/error.tsx:3-18` as well as the global boundary at `storefront/app/global-error.tsx:15-17`. Confirm that the resulting issue appears in the storefront Sentry project with the expected environment and URL.
2. Verify storefront server/request error capture.
   Trigger a temporary server-side throw in an App Router request path such as `storefront/app/api/orders/[id]/invoice/route.ts:30-78` or `storefront/app/api/reviews/upload/route.ts:20-53`. Confirm that the event is captured as a server-side Next.js error and not only as a browser failure.
3. Verify backend API error capture.
   Trigger a temporary exception in a backend API route that will bubble through Medusa middleware covered by `backend/src/api/middlewares.ts:45-47`. Confirm the issue lands in the backend Sentry project with request metadata attached.
4. Verify backend background-task capture.
   Trigger one scheduled job or subscriber failure from code paths currently outside API middleware, such as `backend/src/jobs/send-abandoned-cart-emails.ts:69-111` or `backend/src/subscribers/order-placed.ts:11-29`. Confirm that the failure is visible in Sentry. If it is not, that validates the async-coverage gap described above.
5. Verify source maps.
   For one storefront error and one backend error from built deployments, inspect the Sentry stack traces. They should resolve to readable source files like `storefront/...` and `backend/src/...`, not minified chunks, generated bundle filenames, or only `.medusa/server/*.js`.
6. Verify distributed traces.
   Use a flow that starts in the browser and passes through a storefront proxy route into the backend, such as invoice download (`storefront/components/account/download-invoice-button.tsx:23` -> `storefront/app/api/orders/[id]/invoice/route.ts:31-38`) or review image upload (`storefront/components/reviews/ReviewForm.tsx:57` -> `storefront/app/api/reviews/upload/route.ts:21-29`). In Sentry Performance, confirm the trace contains browser transaction/span, Next.js route span, outbound HTTP span, and backend transaction/spans under a shared trace.
7. Verify session replay on error.
   Trigger a client-side error after interacting with product and checkout UI. Confirm the issue links to a Replay, and confirm the replay still contains enough visible information to be diagnostically useful.
8. Verify release tracking and commit association.
   After a deploy, open the corresponding Sentry release. Confirm the release name matches the deployed git SHA, the Commits tab is populated, suspect commits are available, and the deployment is attached to the correct environment.

## 7. Gaps & Recommendations (Prioritized)

| Priority | Area | Gap | Recommendation | Files to modify |
|----------|------|-----|----------------|-----------------|
| P0 (critical) | Backend async coverage | Jobs, subscribers, and workflow fallbacks catch/log failures outside Medusa's API middleware, so production failures can be completely absent from Sentry. | Add explicit Sentry capture in async/background execution paths before logging or degrading gracefully. Start with scheduled jobs, notification subscribers, and workflow fallback steps. | `backend/src/jobs/send-abandoned-cart-emails.ts`, `backend/src/subscribers/order-placed.ts`, `backend/src/subscribers/newsletter-subscribed.ts`, `backend/src/subscribers/shipment-created.ts`, `backend/src/subscribers/meilisearch-product-sync.ts`, `backend/src/workflows/steps/try-generate-invoice-pdf.ts`, `backend/src/api/store/wishlists/import/route.ts` |
| P0 (critical) | Storefront handled failures | Checkout, cart, invoice, upload, search, wishlist, and auth flows catch and convert failures into return values/UI state without reporting them. These are exactly the flows most likely to impact revenue. | Capture handled exceptions in high-value commerce paths before returning fallback strings or component error state. Prioritize checkout, payment completion, invoice generation, login/signup, and cart mutations. | `storefront/lib/medusa/checkout.ts`, `storefront/components/checkout/express-checkout.tsx`, `storefront/components/checkout/checkout-shipping.tsx`, `storefront/components/cart/actions.ts`, `storefront/lib/medusa/customer.ts`, `storefront/app/api/orders/[id]/invoice/route.ts`, `storefront/app/api/reviews/upload/route.ts`, `storefront/components/search-command/actions.ts`, `storefront/lib/medusa/wishlist.ts` |
| P1 (important) | Client error boundaries | The app has a segment-level boundary at `storefront/app/error.tsx` that does not report anything to Sentry, so some handled App Router failures can render fallback UI without an event. | Make the route-segment boundary report the caught error, not just the global boundary. | `storefront/app/error.tsx`, `storefront/app/global-error.tsx` |
| P1 (important) | Environment hygiene | All init calls derive `environment` from `NODE_ENV`, which merges preview/staging deployments into `production`. | Introduce an explicit Sentry environment variable or host-aware mapping so preview, staging, and production are separated in Sentry. | `storefront/sentry.server.config.ts`, `storefront/sentry.edge.config.ts`, `storefront/instrumentation-client.ts`, `backend/instrumentation.ts`, `.env.example` files |
| P1 (important) | Distributed tracing / OTEL export | `registerOtel(...)` is enabled, but the repo does not explicitly bridge Medusa OTEL spans into Sentry, so workflow/query/db tracing may be incomplete. | Wire Medusa OTEL spans into Sentry using a supported exporter/span-processor integration and verify trace continuity in Sentry Performance. | `backend/instrumentation.ts` |
| P1 (important) | Source maps and releases | Storefront source map upload is env-dependent and backend upload/release handling is not explicit in the repo, making readable production stack traces and commit association uncertain. | Make build-time release/source-map configuration explicit for both deployments, then verify release naming and artifact upload in CI/deploy environments. | `storefront/next.config.ts`, `storefront/.env.example`, `turbo.json`, `backend/Dockerfile`, `backend/tsconfig.json`, `backend/.env.example`, deployment environment settings |
| P1 (important) | Debug context | There is no Sentry user, tag, or context enrichment anywhere in the repo, so even captured issues will be harder to debug in an ecommerce setting. | Attach safe, high-value context such as customer ID, cart ID, order ID, payment provider, wishlist ID, and route/action name at auth and commerce boundaries. Avoid PII-heavy payloads. | `storefront/lib/medusa/customer.ts`, `storefront/lib/medusa/checkout.ts`, `storefront/app/api/orders/[id]/invoice/route.ts`, `storefront/lib/medusa/wishlist.ts`, `backend/src/api/middlewares.ts`, `backend/src/jobs/send-abandoned-cart-emails.ts` |
| P2 (nice-to-have) | Replay usefulness | Replay is configured to record only on error and masks all text/media, which sharply limits merchandising and checkout debugging value. | Keep the privacy posture, but selectively unmask safe storefront content and consider a very small baseline replay sample if replay utility is low today. | `storefront/instrumentation-client.ts` |
| P2 (nice-to-have) | Profiling cost/value | Browser and Node profiling are enabled everywhere without repo evidence that the team reviews profile data. | Keep profiling only if the team actively uses it; otherwise lower sample rates or disable the least valuable runtime first. | `storefront/instrumentation-client.ts`, `storefront/sentry.server.config.ts`, `backend/instrumentation.ts` |
| P2 (nice-to-have) | Cron / deploy integrations | There is no repo evidence of Sentry Cron Monitoring or Sentry's Vercel integration. | Confirm both in the Sentry/Vercel UI and enable them if the team wants deploy markers, cron failures, and commit association inside Sentry. | External Sentry/Vercel configuration, `backend/src/jobs/send-abandoned-cart-emails.ts` |

