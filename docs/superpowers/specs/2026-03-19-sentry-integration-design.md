# Sentry Integration Design Spec

## Overview

Add Sentry error monitoring, performance tracing, session replay, and profiling to both apps in the monorepo. Each app gets its own Sentry project and DSN within the same Sentry organization.

## Approach

**Native Sentry SDKs** — `@sentry/nextjs` for the storefront, `@sentry/node` v9 for the backend. This gives the tightest integration with each runtime, access to Sentry-specific features (Session Replay, local variable snapshots, enriched error grouping), and automatic distributed tracing across both apps via W3C `traceparent`/`baggage` headers.

Alternatives considered:
- **OTel-first with Sentry as backend** — more vendor-agnostic but loses Session Replay, local variable snapshots, and enriched error grouping.
- **Hybrid** (native SDK on storefront, OTel-only on backend) — inconsistent patterns across the monorepo.

## Features Enabled

| Feature | Storefront | Backend |
|---------|-----------|---------|
| Error monitoring | Yes | Yes |
| Performance tracing | Yes | Yes |
| Session Replay | Yes (browser only) | N/A |
| Profiling | Yes (browser + server) | Yes |
| Distributed tracing | Yes (propagates to backend) | Yes (receives from storefront) |

## Backend Integration (Medusa v2)

### SDK

`@sentry/node` v9 with native OpenTelemetry support. No legacy packages (`@sentry/opentelemetry-node`, `@opentelemetry/exporter-trace-otlp-grpc`) needed — v9 ships its own `SentrySpanProcessor` and `SentryPropagator`.

### Architecture

Sentry initializes before Medusa's `registerOtel()` and passes its span processor and propagator. The error handler middleware wraps Medusa's default handler to capture all HTTP-layer exceptions.

### Files Changed

#### `backend/instrumentation.ts` (replace commented-out stub)

Initialize Sentry, then call `registerOtel()` with Sentry's span processor and propagator. Enable tracing for HTTP, workflows, queries, and DB operations. Add `nodeProfilingIntegration()`.

```ts
import * as Sentry from "@sentry/node"
import { nodeProfilingIntegration } from "@sentry/profiling-node"
import { registerOtel } from "@medusajs/medusa"

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
  profilesSampleRate: 0.1,
  integrations: [nodeProfilingIntegration()],
})

export function register() {
  registerOtel({
    serviceName: "crowcommerce-backend",
    spanProcessors: [Sentry.getSpanProcessor()],
    propagator: Sentry.getPropagator(),
    instrument: {
      http: true,
      workflows: true,
      query: true,
      db: true,
    },
  })
}
```

> **Note:** The exact Sentry v9 API for retrieving the span processor and propagator (`getSpanProcessor()`, `getPropagator()`) must be verified against current `@sentry/node` docs at implementation time. The v9 API may use different method names or a different pattern for OTel integration.

#### `backend/src/api/middlewares.ts` (add error handler)

Add a top-level `errorHandler` property to the existing `defineMiddlewares()` call. This is separate from the `routes` array — it wraps Medusa's entire error handling layer and catches errors from all routes.

```ts
import * as Sentry from "@sentry/node"
// ... existing imports ...

const originalErrorHandler = errorHandler()

export default defineMiddlewares({
  errorHandler: (
    error: MedusaError | any,
    req: MedusaRequest,
    res: MedusaResponse,
    next: MedusaNextFunction
  ) => {
    Sentry.captureException(error)
    return originalErrorHandler(error, req, res, next)
  },
  routes: [
    // ... all existing routes unchanged ...
  ],
})
```

> **Import note:** `errorHandler`, `MedusaNextFunction`, `MedusaRequest`, and `MedusaResponse` must be imported from `@medusajs/framework/http`. The existing file already imports `defineMiddlewares` from there — add the others to the same import.

#### `backend/package.json` (add dependencies)

```
@sentry/node: ^9
@sentry/profiling-node: ^9
```

#### `backend/.env` (add variable)

```
SENTRY_DSN=  # Backend Sentry project DSN
```

### Profiling on Railway

`@sentry/profiling-node` is a native addon (compiles C++ bindings). If it causes build or cold-start issues on Railway, drop `nodeProfilingIntegration()` from the integrations array and remove the dependency. Error monitoring and tracing will continue to work without it.

## Storefront Integration (Next.js 16)

### SDK

`@sentry/nextjs` — purpose-built for Next.js, handles browser, Node.js server, and edge runtimes.

### Architecture

Four config files cover the three runtimes. `withSentryConfig()` wraps `next.config.ts` for automatic source map upload. A `global-error.tsx` boundary catches unhandled App Router errors.

### Files Created

#### `storefront/instrumentation-client.ts` (new — browser runtime)

Browser-side error monitoring, performance tracing, Session Replay, and browser profiling.

```ts
import * as Sentry from "@sentry/nextjs"
import { browserProfilingIntegration } from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  profilesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
    browserProfilingIntegration(),
  ],
})
```

#### `storefront/sentry.server.config.ts` (new — Node.js server runtime)

Server-side error monitoring with local variable snapshots for richer debugging context. Performance tracing and profiling.

```ts
import * as Sentry from "@sentry/nextjs"
import { nodeProfilingIntegration } from "@sentry/profiling-node"

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  profilesSampleRate: 0.1,
  integrations: [nodeProfilingIntegration()],
})
```

#### `storefront/sentry.edge.config.ts` (new — edge runtime)

Minimal config — error monitoring and tracing only. No profiling (native addons not supported on edge).

```ts
import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
})
```

#### `storefront/instrumentation.ts` (new — Next.js instrumentation hook)

Dispatches to the correct Sentry config based on runtime.

```ts
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config")
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config")
  }
}
```

#### `storefront/app/global-error.tsx` (new — error boundary)

Catches unhandled errors in App Router layouts and pages, reports to Sentry, shows fallback UI.

> **Scope caveat:** `global-error.tsx` only catches errors in layouts and pages, not in server actions or route handlers. Server action errors are captured automatically by the Sentry server-side instrumentation — no gap in coverage.

### Files Modified

#### `storefront/next.config.ts` (wrap with `withSentryConfig`)

Wrap the existing config export with `withSentryConfig()` for automatic source map upload during builds. Configure tunneling route to avoid ad blockers if desired.

```ts
import { withSentryConfig } from "@sentry/nextjs"

export default withSentryConfig({
  // ... existing config ...
}, {
  org: "crowcommerce",
  project: "storefront",
  silent: !process.env.CI,
})
```

> **Compatibility note:** Verify that `withSentryConfig()` works with Next.js 16's `cacheComponents: true` and `reactCompiler: true`. If there are conflicts, these can be resolved at implementation time — Sentry's Next.js SDK typically tracks Next.js releases closely.

#### `storefront/package.json` (add dependencies)

```
@sentry/nextjs: ^9
@sentry/profiling-node: ^9
```

### Environment Variables

**Runtime (both local and production):**
```
NEXT_PUBLIC_SENTRY_DSN=  # Storefront Sentry project DSN (public, embedded in client bundle)
```

**Build-time only (`storefront/.env.sentry-build-plugin`, gitignored):**
```
SENTRY_AUTH_TOKEN=  # For source map uploads — generate at sentry.io/settings/auth-tokens/
SENTRY_ORG=crowcommerce
SENTRY_PROJECT=storefront
```

The auth token is only needed at build time for source map uploads, not at runtime. On Vercel, set `SENTRY_AUTH_TOKEN` as an environment variable for production builds. Do not put it in the runtime `.env` alongside `SENTRY_DSN`.

### Profiling on Vercel

Same native addon concern as Railway. `@sentry/profiling-node` may not work in Vercel's serverless Node.js runtime without additional configuration. Test after first deploy — if it causes build or cold-start issues, drop `nodeProfilingIntegration()` from `sentry.server.config.ts`. Browser profiling in `instrumentation-client.ts` is pure JS and will not have this problem.

## Distributed Tracing

Both SDKs propagate W3C `traceparent` and `baggage` headers automatically. When the storefront makes HTTP calls to the Medusa backend (via the Medusa JS SDK), Sentry correlates traces across both projects. A single user action (e.g., "add to cart") can be followed from browser click through storefront server action to backend API route to database query.

**Requirement:** Both Sentry projects must be in the same Sentry organization.

## Sample Rates

| Rate | Storefront | Backend |
|------|-----------|---------|
| `tracesSampleRate` | 1.0 (100%) | 1.0 (100%) |
| `profilesSampleRate` | 0.1 (10%) | 0.1 (10%) |
| `replaysSessionSampleRate` | 0.1 (10%) | N/A |
| `replaysOnErrorSampleRate` | 1.0 (100%) | N/A |

These are starting values. Adjust downward as traffic increases to manage Sentry quota.

## Documentation Updates

- Add `SENTRY_DSN` to both backend and storefront sections of `SETUP.md` env var tables (local dev and production)
- Add `SENTRY_AUTH_TOKEN` to storefront production section of `SETUP.md`
- Add `.env.sentry-build-plugin` to storefront `.gitignore`
- Update `README.md` infrastructure table with Sentry status

## Verification

1. **Backend:** Start dev server, hit a route that throws an error, confirm it appears in the backend Sentry project within 30 seconds. Check traces page for HTTP/workflow/DB spans.
2. **Storefront:** Start dev server, trigger a client-side error (e.g., throw in a component), confirm it appears in the storefront Sentry project. Check for Session Replay recording. Trigger a server action error and confirm server-side capture.
3. **Distributed tracing:** Add item to cart from the storefront, find the trace in the storefront Sentry project, confirm it links to the corresponding backend trace.
