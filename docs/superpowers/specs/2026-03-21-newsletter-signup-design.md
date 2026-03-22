# Newsletter Signup & Subscription System — Design Spec

**Date:** 2026-03-21
**Status:** Approved

## Overview

Newsletter signup for the CrowCommerce storefront. Subscribers are stored in a Medusa custom module (source of truth) and synced to Resend's Audience/Contacts API for delivery. Single opt-in with a welcome email on first subscription. The data model supports future double opt-in (status enum includes `"pending"`) and provider switching (DB owns the list, provider is just a delivery channel).

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Opt-in model | Single opt-in + welcome email | Simplest for V1; `"pending"` status in enum for future double opt-in upgrade |
| Subscriber storage | Own DB + sync to provider | DB is source of truth; switching from Resend to Mailchimp means replacing one sync workflow |
| Logged-in behavior | Pre-fill email, auto-link `customer_id` | Better UX; backfills `customer_id` on resubscribe/idempotent hits too |
| Provider abstraction | None (direct Resend calls) | DB decouples already; formal interface is YAGNI for V1 |
| Welcome email trigger | Event-driven (subscriber handler) | Not inline in the route — follows `order.placed` → subscriber → workflow pattern |
| Unsubscribe auth | HMAC-signed token | Bare email on public endpoint is an IDOR risk |

## Data Model

### Module: `newsletter`

```
backend/src/modules/newsletter/
├── index.ts              # NEWSLETTER_MODULE = "newsletter"
├── service.ts            # NewsletterModuleService extends MedusaService({ Subscriber })
├── models/
│   └── subscriber.ts     # Subscriber data model
└── migrations/           # Auto-generated
```

### Subscriber Model

| Field | Type | Notes |
|-------|------|-------|
| `id` | `model.id({ prefix: "nsub" })` | Primary key |
| `email` | `model.text()` | Normalized to lowercase, unique index |
| `status` | `model.enum(["active", "pending", "unsubscribed"])` | Default: `"active"` |
| `source` | `model.enum(["footer", "checkout", "account", "import"])` | Where they signed up |
| `customer_id` | `model.text().nullable()` | Linked to customer if logged in |
| `resend_contact_id` | `model.text().nullable()` | Resend contact ID for sync tracking |
| `unsubscribed_at` | `model.dateTime().nullable()` | Set when status changes to `"unsubscribed"` |

Plus free `created_at` / `updated_at` from Medusa DML.

**Indexes:**
- Unique index on `email`

## Backend API

### Routes

| Route | Method | Auth | Purpose |
|-------|--------|------|---------|
| `/store/newsletter/subscribe` | POST | Public (optional auth) | Subscribe to newsletter |
| `/store/newsletter/unsubscribe` | POST | Public (signed token) | Unsubscribe via email link |

### Middleware Registration

In `src/api/middlewares.ts`:
- `POST /store/newsletter/subscribe` → `authenticate("customer", ["session", "bearer"], { allowUnauthenticated: true })` + `validateAndTransformBody(SubscribeSchema)`
- `POST /store/newsletter/unsubscribe` → `validateAndTransformBody(UnsubscribeSchema)`
- `POST /store/newsletter/subscribe` → rate limit: 5 requests per minute per IP (reuse `authRateLimit` pattern to prevent abuse on this public endpoint)

### Zod Schemas

File: `src/api/store/newsletter/validators.ts`

- `SubscribeSchema`: `{ email: z.string().email(), source: z.enum(["footer", "checkout", "account", "import"]).default("footer") }`
- `UnsubscribeSchema`: `{ token: z.string() }`

### Subscribe Route Handler

File: `src/api/store/newsletter/subscribe/route.ts`

1. Extract validated body (`email` and `source` already validated by middleware)
2. Determine `customer_id` from auth context if present (`req.auth_context?.actor_id` — populated by `authenticate` middleware with `allowUnauthenticated: true`)
3. Call `subscribeToNewsletterWorkflow` with `{ email, customer_id?, source }`
4. Return `{ subscriber, isNewSubscriber }`

### Unsubscribe Route Handler

File: `src/api/store/newsletter/unsubscribe/route.ts`

1. Extract validated body (token)
2. Validate HMAC token signature using shared secret
3. Extract email and verify token hasn't expired
4. Call `unsubscribeFromNewsletterWorkflow` with `{ email }`
5. Return `{ success: true }`

## Unsubscribe Token Format

**Algorithm:** HMAC-SHA256

**Token format:** `base64url(email):unix_timestamp:hmac_hex`
- `email` is base64url-encoded to avoid delimiter collisions
- `unix_timestamp` is the expiry time (creation time + 30 days)
- `hmac_hex` is `HMAC-SHA256(base64url(email):unix_timestamp, NEWSLETTER_HMAC_SECRET)`

**Token expiry:** 30 days from generation. Unsubscribe links appear in every newsletter email, so they need a long lifetime. Each new email sends a fresh token.

**Validation steps:**
1. Split token on `:` into `[encodedEmail, expiry, hmac]`
2. Recompute HMAC over `encodedEmail:expiry` using `NEWSLETTER_HMAC_SECRET`
3. Constant-time compare computed HMAC with provided HMAC
4. Check `expiry > Date.now() / 1000`
5. Decode `encodedEmail` from base64url to get the email address

**Helper location:** `backend/src/utils/newsletter-token.ts` — exports `signUnsubscribeToken(email)` and `verifyUnsubscribeToken(token)`.

## Event Flow

### Subscribe Flow

```
POST /store/newsletter/subscribe
  → subscribeToNewsletterWorkflow
    → normalize email to lowercase
    → check if subscriber exists:
      - active → idempotent success (isNewSubscriber: false)
        - backfill customer_id if provided and missing
      - unsubscribed → reactivate, clear unsubscribed_at (isNewSubscriber: false)
        - backfill customer_id if provided and missing
      - not found → create subscriber (isNewSubscriber: true)
    → emitEventStep("newsletter.subscribed", { id, email, isNewSubscriber })

newsletter.subscribed event
  → newsletter-subscribed subscriber
    → always: syncNewsletterToResendWorkflow (add/update Resend Audience contact)
    → if isNewSubscriber: sendNewsletterWelcomeWorkflow (welcome email)
```

### Unsubscribe Flow

```
POST /store/newsletter/unsubscribe (with signed token)
  → unsubscribeFromNewsletterWorkflow
    → find subscriber by email
    → set status to "unsubscribed", set unsubscribed_at
    → emitEventStep("newsletter.unsubscribed", { id, email })

newsletter.unsubscribed event
  → newsletter-unsubscribed subscriber
    → removeNewsletterFromResendWorkflow (remove from Resend Audience)
```

## Workflows

### `subscribeToNewsletterWorkflow`

**Input:** `{ email: string, customer_id?: string, source: "footer" | "checkout" | "account" | "import" }`

**Steps:**
1. Normalize email to lowercase
2. Query existing subscriber by email
3. Conditional upsert logic (create, reactivate, or idempotent return)
4. Backfill `customer_id` if provided and record doesn't have one
5. `emitEventStep("newsletter.subscribed", { id, email, isNewSubscriber })`

**Output:** `{ subscriber, isNewSubscriber: boolean }`

**Compensation:** None needed — subscriber creation is idempotent, and the event can be replayed manually if needed. A subscriber existing in the DB without a sync/welcome email is a benign state.

### `unsubscribeFromNewsletterWorkflow`

**Input:** `{ email: string }`

**Steps:**
1. Find subscriber by email
2. Update status to `"unsubscribed"`, set `unsubscribed_at` to current timestamp
3. `emitEventStep("newsletter.unsubscribed", { id, email })`

**Compensation:** Revert status to `"active"`, clear `unsubscribed_at`

### `syncNewsletterToResendWorkflow`

**Input:** `{ email: string, subscriber_id: string }`

**Steps:**
1. Call Resend Contacts API: `resend.contacts.create({ email, audienceId, unsubscribed: false })`
2. Store returned `contact_id` on subscriber record as `resend_contact_id`

**Conditional:** Skips silently if `RESEND_AUDIENCE_ID` env var is not set.

### `removeNewsletterFromResendWorkflow`

**Input:** `{ email: string, subscriber_id: string }`

**Steps:**
1. Look up `resend_contact_id` on subscriber record
2. Call Resend Contacts API: `resend.contacts.remove({ id: resend_contact_id, audienceId })`
3. Clear `resend_contact_id` on subscriber record

**Conditional:** Skips silently if `RESEND_AUDIENCE_ID` env var is not set.

### `sendNewsletterWelcomeWorkflow`

**Input:** `{ email: string, subscriber_id: string }`

**Steps:**
1. Resolve storefront URL via `resolveStorefrontUrl()` from `src/subscribers/_helpers/resolve-urls.ts` — skip sending if null
2. Generate HMAC-signed unsubscribe token via `signUnsubscribeToken(email)` from `src/utils/newsletter-token.ts`
3. Build unsubscribe URL: `${storefrontUrl}/newsletter/unsubscribe?token=${token}`
4. Call `sendNotificationsStep` with:
   - `to`: subscriber email
   - `channel`: `"email"`
   - `template`: `EmailTemplates.NEWSLETTER_WELCOME`
   - `data`: `{ email, unsubscribeUrl }`
   - `trigger_type`: `"newsletter.subscribed"`
   - `resource_id`: subscriber ID
   - `resource_type`: `"newsletter_subscriber"`

## Subscribers (Event Handlers)

### `newsletter-subscribed.ts`

**Event:** `newsletter.subscribed`
**Data:** `{ id: string, email: string, isNewSubscriber: boolean }`

**Handler:**
1. Always run `syncNewsletterToResendWorkflow({ email, subscriber_id: id })`
2. If `isNewSubscriber` is true, run `sendNewsletterWelcomeWorkflow({ email, subscriber_id: id })`
3. Each workflow call wrapped in independent try/catch with logger (same pattern as `order-placed.ts`)

### `newsletter-unsubscribed.ts`

**Event:** `newsletter.unsubscribed`
**Data:** `{ id: string, email: string }`

**Handler:**
1. Run `removeNewsletterFromResendWorkflow({ email, subscriber_id: id })`
2. Wrapped in try/catch with logger

## Welcome Email Template

### File: `backend/src/modules/resend/templates/newsletter-welcome.tsx`

**Props:**
```typescript
interface NewsletterWelcomeProps extends BaseTemplateProps {
  email: string
  unsubscribeUrl: string
}
```

**Content:**
- Header: brand logo (reuses `<Header />` component)
- Heading: "Welcome to the newsletter"
- Body: "Thanks for subscribing. We'll send you the latest deals and savings weekly."
- CTA button: link to storefront homepage
- Footer: unsubscribe link using `unsubscribeUrl` — pass `legalLinks={{ unsubscribe: unsubscribeUrl }}` to the `<Footer />` component via `getEmailConfig({ legalLinks: { unsubscribe: unsubscribeUrl } })`

**Validation function:** `isValidNewsletterWelcomeData` — checks `email` is string, `unsubscribeUrl` is string.

**Registry additions:**
- `EmailTemplates.NEWSLETTER_WELCOME = "newsletter-welcome"` in `template-registry.ts`
- Entry in `templateRegistry` in `service.ts`

## Storefront Integration

### Footer Newsletter Form

**Uncomment** `<FooterNewsletter />` in `storefront/components/layout/footer/index.tsx`.

**Server action:** `subscribeToNewsletter(email: string)` in `storefront/components/layout/footer/actions.ts`
- File starts with `"use server"` directive
- Normalizes email to lowercase
- Calls `sdk.client.fetch("/store/newsletter/subscribe", { method: "POST", headers, body: { email, source: "footer" } })` — uses the established SDK client pattern (same as wishlist/reviews) to automatically include the publishable key
- Passes auth headers if customer is logged in (via `getAuthHeaders()`)

**Pre-fill for logged-in customers:**
- Pass customer email as prop from server-rendered footer: `<FooterNewsletter customerEmail={customer?.email} />`
- Pre-fill input with `defaultValue={customerEmail}` — editable, not locked

**Input type fix:** Change `type="text"` to `type="email"` for native HTML5 validation.

### UX States

| State | Display |
|-------|---------|
| Idle | Email input + "Sign up" button (existing TailwindPlus markup) |
| Submitting | Button shows loading state, input disabled |
| Success | Replace form with "Thanks! Check your inbox." message |
| Already subscribed | Same success message (idempotent — don't reveal subscription status) |
| Error | Inline error below input ("Something went wrong. Please try again.") |
| Invalid email | Native HTML5 validation via `type="email"` |

### Unsubscribe Landing Page

**Route:** `storefront/app/newsletter/unsubscribe/page.tsx`

- Reads `token` from URL search params
- Calls `POST /store/newsletter/unsubscribe` with the token
- Displays confirmation: "You've been unsubscribed" or error if token is invalid/expired

## PostHog Analytics Events

| Event | When | Properties |
|-------|------|------------|
| `newsletter_subscribed` | Successful signup (storefront) | `{ source: "footer", is_new_subscriber: boolean }` |
| `newsletter_subscribe_failed` | Server action error (storefront) | `{ source: "footer", error: string }` |

Add both events to the `AnalyticsEvents` type map with typed properties.

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `RESEND_AUDIENCE_ID` | No | Resend Audience ID for contact sync. If not set, sync workflows skip silently. |
| `NEWSLETTER_HMAC_SECRET` | Yes | Shared secret for signing unsubscribe tokens. |

## Module Registration

Add to `medusa-config.ts` modules array:
```typescript
{
  resolve: "./src/modules/newsletter",
}
```

## File Inventory

### Backend — New Files

| File | Purpose |
|------|---------|
| `src/modules/newsletter/index.ts` | Module definition |
| `src/modules/newsletter/service.ts` | Service class |
| `src/modules/newsletter/models/subscriber.ts` | Subscriber data model |
| `src/api/store/newsletter/validators.ts` | Zod schemas |
| `src/api/store/newsletter/subscribe/route.ts` | Subscribe route handler |
| `src/api/store/newsletter/unsubscribe/route.ts` | Unsubscribe route handler |
| `src/workflows/newsletter/subscribe-to-newsletter.ts` | Subscribe workflow |
| `src/workflows/newsletter/unsubscribe-from-newsletter.ts` | Unsubscribe workflow |
| `src/workflows/newsletter/sync-newsletter-to-resend.ts` | Resend Audience sync workflow |
| `src/workflows/newsletter/remove-newsletter-from-resend.ts` | Resend Audience removal workflow |
| `src/workflows/notifications/send-newsletter-welcome.ts` | Welcome email workflow |
| `src/subscribers/newsletter-subscribed.ts` | Subscribe event handler |
| `src/subscribers/newsletter-unsubscribed.ts` | Unsubscribe event handler |
| `src/modules/resend/templates/newsletter-welcome.tsx` | Welcome email template |
| `src/utils/newsletter-token.ts` | HMAC token signing/verification helpers |

### Backend — Modified Files

| File | Change |
|------|--------|
| `medusa-config.ts` | Add newsletter module to modules array |
| `src/api/middlewares.ts` | Add newsletter route validation middleware |
| `src/modules/resend/templates/template-registry.ts` | Add `NEWSLETTER_WELCOME` constant |
| `src/modules/resend/service.ts` | Add newsletter-welcome to `templateRegistry` |

### Storefront — Modified Files

| File | Change |
|------|--------|
| `components/layout/footer/index.tsx` | Uncomment `<FooterNewsletter />`, pass `customerEmail` prop |
| `components/layout/footer/footer-newsletter.tsx` | Add `'use client'` directive, wire `useActionState` for form submission, add UX states, change input type to `"email"`, accept `customerEmail` prop |

### Storefront — New Files

| File | Purpose |
|------|---------|
| `components/layout/footer/actions.ts` | `subscribeToNewsletter` server action |
| `app/newsletter/unsubscribe/page.tsx` | Unsubscribe landing page |

## Out of Scope

- Double opt-in flow (enum supports it, no code for V1)
- Admin dashboard for managing subscribers
- Newsletter campaign sending / scheduling
- Checkout opt-in checkbox
- Account settings subscription toggle
- Mailchimp or other provider integrations
- Subscriber segmentation or tagging
