# Auth Security Hardening — Design Spec

**Date:** 2026-03-15
**Status:** Approved
**Origin:** Security audit during Stack 2 email implementation (PR #17)
**Scope:** Password reset flow, rate limiting, password complexity validation

---

## Context

During the Stack 2 email implementation, a security audit uncovered three auth gaps:

1. The password reset subscriber sends emails linking to `/reset-password`, but no such page exists on the storefront.
2. No rate limiting exists on auth endpoints, enabling brute-force attacks.
3. No password complexity validation exists on signup or password reset.

These are tracked in TODO.md under "Auth Security (from Stack 2 audit)."

---

## Issue 1: Password Reset Flow

### Problem

The `password-reset` subscriber (backend) sends emails with a link to `/reset-password?token=TOKEN&email=EMAIL`. This page doesn't exist. Additionally, there's no way for customers to request a reset from the storefront — no "Forgot password?" link on the login page.

### Solution

Build the complete forgot/reset password flow: three storefront changes and one minor backend edit.

**User journey:**

```
Login Page → "Forgot password?" → Forgot Password Page → Email Sent → (email link) → Reset Password Page → Login Page (success)
```

### Files

| Action | File | Description |
|--------|------|-------------|
| NEW | `app/(auth)/account/forgot-password/page.tsx` | Server component. Wraps `ForgotPasswordForm` in `AuthLayout`. |
| NEW | `components/account/forgot-password-form.tsx` | Client component. Email input → calls `requestPasswordReset()` Server Action. Shows "If an account exists..." confirmation on success (prevents email enumeration). Uses `useState` for success/submitted state toggling. |
| NEW | `app/(auth)/account/reset-password/page.tsx` | Server component. Reads `token` and `email` from `searchParams`. Wraps `ResetPasswordForm` in `AuthLayout`. |
| NEW | `components/account/reset-password-form.tsx` | Client component. New password + confirmation fields → calls `completePasswordReset()` Server Action. Validates password length (8+) and field match client-side. Uses `useState` for success state, redirects to login on success. |
| EDIT | `components/account/login-form.tsx` | Add "Forgot password?" link between password field and submit button. |
| EDIT | `backend/src/subscribers/password-reset.ts` | Update URL path from `/reset-password` to `/account/reset-password` to match the new route location in the `(auth)` route group. |

### Design Decisions

- **Route placement:** Both pages in `(auth)` route group using `AuthLayout`, consistent with login/register. The `(store)` layout has product browsing chrome (sidebar, filters) that would be wrong for auth forms.
- **Server Actions, not direct SDK calls:** The Medusa SDK (`lib/medusa/index.ts`) uses `process.env.MEDUSA_BACKEND_URL` (no `NEXT_PUBLIC_` prefix), making it server-only. Client components cannot import the SDK. Two new Server Actions in `customer.ts`: `requestPasswordReset(email)` calls `sdk.auth.resetPassword()`, and `completePasswordReset(token, email, password)` calls `sdk.auth.updateProvider()`. The token is passed in the `Authorization: Bearer` header (required since Medusa v2.6).
- **Client components use `useState` for local UI state:** Both forms need success/submitted state toggling (e.g., showing "Check your email" after submission). They call the Server Actions above, not the SDK directly. `useActionState` could work but `useState` is simpler here since we need custom success states beyond just error/pending.
- **Email enumeration prevention:** The forgot-password form always shows "If an account exists with this email, you'll receive reset instructions" regardless of whether the email exists. This matches Medusa's built-in behavior (the API always returns success).
- **Email normalization:** Apply `.toLowerCase()` to email in the Server Actions before SDK calls, consistent with the existing pattern in `login()` and `signup()`.
- **Error states:** Expired token, invalid token, password too short, password mismatch — all surface as inline errors in the red error box pattern used by existing auth forms.

### Medusa v2 Gotchas

- The `updateProvider` method requires the reset token in the `Authorization` header, not as a query parameter. The JS SDK handles this when you pass the token as the 4th argument.
- The `resetPassword` API always returns success (HTTP 200) even for nonexistent emails. This is by design.

---

## Issue 2: Rate Limiting on Auth Endpoints

### Problem

No rate limiting exists on login, signup, or password reset endpoints. This enables brute-force credential stuffing attacks.

### Solution

Redis-backed middleware that tracks failed auth attempts per IP. 5 failed attempts trigger a 15-minute lockout.

### How It Works

1. **Pre-check:** Read `auth_fail:{ip}` from Redis. If count >= 5, return HTTP 429 with `Retry-After` header (TTL of the key in seconds).
2. **Pass through:** Call `next()` to let the Medusa auth handler process the request.
3. **Post-check via `res.on('finish')`:**
   - On 401 response: `INCR auth_fail:{ip}` + `EXPIRE 900` (15 minutes).
   - On 200 response: `DEL auth_fail:{ip}` (successful login clears the counter).

This tracks **failed attempts only**, not all requests. A user who typos their password 4 times then succeeds on the 5th won't be locked out.

### Files

| Action | File | Description |
|--------|------|-------------|
| NEW | `backend/src/api/middlewares/rate-limit.ts` | ~50 lines. Creates `ioredis` client from `REDIS_URL`, exports `authRateLimit()` middleware. |
| EDIT | `backend/src/api/middlewares.ts` | Add `authRateLimit()` to auth route matchers. |
| EDIT | `storefront/lib/medusa/customer.ts` | Add `requestPasswordReset()` and `completePasswordReset()` Server Actions. Detect 429 status in `login()`, `signup()`, and both new actions' catch blocks, surface user-friendly lockout message. |

### Configuration

| Parameter | Value |
|-----------|-------|
| Max failed attempts | 5 |
| Lockout window | 15 minutes (900 seconds) |
| Redis key pattern | `auth_fail:{ip}` |
| HTTP response when locked | 429 Too Many Requests + `Retry-After` header |

### Routes Protected

- `POST /auth/customer/emailpass/*` — customer login, register, reset-password, update
- `POST /auth/user/emailpass/*` — admin login, reset

### Design Decisions

- **Failed-attempt tracking, not blunt rate limiting.** A naive rate limiter counting all requests would lock out legitimate users who typo once then succeed. By intercepting response status, we only penalize failures.
- **Redis storage.** Uses the same `REDIS_URL` already configured for caching, event bus, and workflow engine. No new infrastructure.
- **Explicit `ioredis` dependency.** While `ioredis` is available transitively through `@medusajs/caching-redis`, add it as an explicit dependency in `backend/package.json` to avoid breakage if the transitive path changes.
- **Graceful degradation.** If `REDIS_URL` isn't set or Redis is unreachable, the middleware passes through silently. Auth works without rate limiting. Logs a warning on startup.
- **Successful login clears counter.** A legitimate user who eventually succeeds gets their counter reset, so they aren't penalized for past typos.

### Considerations

- **Proxy IP forwarding (P0 — must verify before functional):** Behind a reverse proxy (Railway, Vercel), `req.ip` may return the proxy's IP unless `trust proxy` is configured. Medusa's Express instance may already set this. Must verify during implementation — if not set, one brute-forcer could lock out all users. The rate-limit middleware should not be considered functional until this is confirmed.
- **Storefront error handling:** The Medusa SDK throws a `FetchError` with status 429 when rate-limited. The `login()`, `signup()`, and password reset forms need to detect this and show "Too many attempts. Please try again in 15 minutes." instead of a generic error.

---

## Issue 3: Password Complexity Validation

### Problem

No minimum password length or complexity requirements exist on signup or password reset. Users can set single-character passwords.

### Solution

Shared validation function enforcing 8+ character minimum, applied at every password entry point except login.

### Validation Rule

**Minimum 8 characters.** No complexity requirements (uppercase, number, special char). This aligns with NIST SP 800-63B, which recommends length over complexity rules — complexity requirements push users toward predictable patterns like `Password1!`.

### Shared Function

```typescript
// storefront/lib/validation.ts
const MIN_PASSWORD_LENGTH = 8

export function validatePassword(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`
  }
  return null
}
```

### Enforcement Points

| Location | Layer | How |
|----------|-------|-----|
| `signup()` in `customer.ts` | Server | Call `validatePassword()` before SDK register call. Return error if invalid. |
| `completePasswordReset()` in `customer.ts` (new) | Server | Call `validatePassword()` before SDK `updateProvider` call. |
| `RegisterForm` component | Client | HTML `minLength={8}` on password input + hint text "Must be at least 8 characters." |
| `ResetPasswordForm` component (new) | Client | HTML `minLength={8}` on both password fields + hint text. Client-side mismatch check for confirmation. |

### NOT Applied To

**`login()` — intentionally skipped.** Existing accounts may have short passwords set before this rule existed. Validating on login would lock them out with no recourse. They can strengthen their password through the reset flow.

### Files

| Action | File | Description |
|--------|------|-------------|
| NEW | `storefront/lib/validation.ts` | `validatePassword()` function |
| EDIT | `storefront/lib/medusa/customer.ts` | Add validation to `signup()` |
| EDIT | `storefront/components/account/register-form.tsx` | Add `minLength={8}` + hint text |
| INCLUDED | `components/account/reset-password-form.tsx` | Built with validation from the start (Issue 1) |

---

## Complete File Inventory

### New Files (6)

| File | Workspace |
|------|-----------|
| `storefront/app/(auth)/account/forgot-password/page.tsx` | Storefront |
| `storefront/components/account/forgot-password-form.tsx` | Storefront |
| `storefront/app/(auth)/account/reset-password/page.tsx` | Storefront |
| `storefront/components/account/reset-password-form.tsx` | Storefront |
| `storefront/lib/validation.ts` | Storefront |
| `backend/src/api/middlewares/rate-limit.ts` | Backend |

### Edited Files (5)

| File | Workspace | Change |
|------|-----------|--------|
| `storefront/components/account/login-form.tsx` | Storefront | Add "Forgot password?" link |
| `storefront/components/account/register-form.tsx` | Storefront | Add `minLength` + hint text |
| `storefront/lib/medusa/customer.ts` | Storefront | Add `requestPasswordReset()` + `completePasswordReset()` actions, password validation in `signup()`, 429 handling in all auth actions |
| `backend/src/api/middlewares.ts` | Backend | Add rate-limit middleware to auth routes |
| `backend/src/subscribers/password-reset.ts` | Backend | Update reset URL path to `/account/reset-password` |

### Summary by Workspace

| Workspace | New | Edited | Backend changes? |
|-----------|-----|--------|------------------|
| Storefront | 5 | 3 | — |
| Backend | 1 | 2 | Rate limiting middleware + subscriber URL fix |
