# Auth Security Hardening Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the password reset flow, add Redis-backed rate limiting to auth endpoints, and enforce password complexity validation.

**Architecture:** Three independent concerns — password reset pages (storefront), rate-limit middleware (backend), password validation (shared util consumed by storefront). The password reset flow adds two Server Actions to `customer.ts` and two new page/form pairs. Rate limiting is a standalone backend middleware using the existing Redis connection. Password validation is a tiny shared function used at signup and reset boundaries.

**Tech Stack:** Next.js 16 (App Router, Server Actions), Medusa JS SDK (`sdk.auth.resetPassword`, `sdk.auth.updateProvider`), ioredis, TailwindPlus form components.

**Spec:** `docs/superpowers/specs/2026-03-15-auth-security-hardening-design.md`

---

## Chunk 1: Password Validation + Server Actions Foundation

This chunk builds the shared validation function and the two new Server Actions in `customer.ts`. Everything else depends on these.

### Task 1: Create password validation utility

**Files:**
- Create: `storefront/lib/validation.ts`

- [ ] **Step 1: Create `storefront/lib/validation.ts`**

```typescript
const MIN_PASSWORD_LENGTH = 8
const MAX_PASSWORD_LENGTH = 128

export function validatePassword(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return `Password must be at most ${MAX_PASSWORD_LENGTH} characters`
  }
  return null
}
```

Note: Max length (128) prevents bcrypt DoS — bcrypt silently truncates at 72 bytes anyway.

- [ ] **Step 2: Verify the file compiles**

Run: `cd storefront && bun run typecheck 2>&1 | tail -5`
Expected: No errors

- [ ] **Step 3: Commit**

```
git add storefront/lib/validation.ts
git commit -m "feat(auth): add password validation utility

Enforces 8-128 character length. NIST SP 800-63B aligned (length over complexity).

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2: Add `requestPasswordReset` Server Action

**Files:**
- Modify: `storefront/lib/medusa/customer.ts`

- [ ] **Step 1: Add `requestPasswordReset` to `customer.ts`**

Add after the `signout` function (around line 191):

```typescript
export async function requestPasswordReset(
  email: string,
): Promise<{ error?: string; success?: boolean }> {
  const normalizedEmail = email?.trim().toLowerCase()

  if (!normalizedEmail) {
    return { error: "Email is required" }
  }

  try {
    await sdk.auth.resetPassword("customer", "emailpass", {
      identifier: normalizedEmail,
    })
  } catch (e) {
    // Medusa always returns 200 for valid requests (prevents enumeration).
    // Only surface errors for rate limiting (429) or server issues (5xx).
    if (e instanceof Error && "status" in e && (e as any).status === 429) {
      return { error: "Too many attempts. Please try again in 15 minutes." }
    }
    // Swallow other errors — always show success to prevent email enumeration
  }

  return { success: true }
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `cd storefront && bun run typecheck 2>&1 | tail -5`
Expected: No new errors

- [ ] **Step 3: Commit**

```
git add storefront/lib/medusa/customer.ts
git commit -m "feat(auth): add requestPasswordReset server action

Calls sdk.auth.resetPassword with email normalized to lowercase.
Always returns success to prevent email enumeration (matches Medusa behavior).
Detects 429 for rate-limit messaging.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3: Add `completePasswordReset` Server Action

**Files:**
- Modify: `storefront/lib/medusa/customer.ts`

- [ ] **Step 1: Add import for `validatePassword`**

At top of `customer.ts`, add:

```typescript
import { validatePassword } from "lib/validation";
```

- [ ] **Step 2: Add `completePasswordReset` after `requestPasswordReset`**

```typescript
export async function completePasswordReset(
  token: string,
  email: string,
  password: string,
): Promise<{ error?: string; success?: boolean }> {
  const normalizedEmail = email?.trim().toLowerCase()

  if (!token) return { error: "Reset token is missing" }
  if (!normalizedEmail) return { error: "Email is missing" }
  if (!password) return { error: "Password is required" }

  const passwordError = validatePassword(password)
  if (passwordError) return { error: passwordError }

  try {
    await sdk.auth.updateProvider(
      "customer",
      "emailpass",
      { email: normalizedEmail, password },
      token,
    )
  } catch (e) {
    if (e instanceof Error && "status" in e && (e as any).status === 429) {
      return { error: "Too many attempts. Please try again in 15 minutes." }
    }
    return {
      error: e instanceof Error ? e.message : "Unable to reset password. The link may have expired.",
    }
  }

  return { success: true }
}
```

- [ ] **Step 3: Verify typecheck passes**

Run: `cd storefront && bun run typecheck 2>&1 | tail -5`
Expected: No new errors

- [ ] **Step 4: Commit**

```
git add storefront/lib/medusa/customer.ts
git commit -m "feat(auth): add completePasswordReset server action

Validates password length (8-128 chars) before calling sdk.auth.updateProvider.
Token passed in Authorization header (Medusa v2.6+). Email normalized to lowercase.
Handles 429 rate-limit and expired/invalid token errors.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4: Add password validation to existing `signup` action

**Files:**
- Modify: `storefront/lib/medusa/customer.ts`

- [ ] **Step 1: Add validation check in `signup()`**

In the `signup` function, after the existing `if (!lastName)` check (around line 103) and before the `const customerForm` declaration, add:

```typescript
  const passwordError = validatePassword(password)
  if (passwordError) return passwordError
```

- [ ] **Step 2: Verify typecheck passes**

Run: `cd storefront && bun run typecheck 2>&1 | tail -5`
Expected: No new errors

- [ ] **Step 3: Commit**

```
git add storefront/lib/medusa/customer.ts
git commit -m "feat(auth): enforce password validation on signup

Validates 8-128 character length before calling Medusa SDK.
Uses shared validatePassword() from lib/validation.ts.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 5: Add 429 rate-limit handling to existing `login` and `signup` actions

**Files:**
- Modify: `storefront/lib/medusa/customer.ts`

- [ ] **Step 1: Update `login()` catch block**

In the `login` function, replace the catch block (around line 71-73):

```typescript
  } catch (e) {
    if (e instanceof Error && "status" in e && (e as any).status === 429) {
      return "Too many login attempts. Please try again in 15 minutes.";
    }
    return e instanceof Error ? e.message : "Invalid email or password";
  }
```

- [ ] **Step 2: Update `signup()` catch block**

In the `signup` function, replace the outer catch block (around line 153-156):

```typescript
  } catch (e) {
    if (tokenSet) await removeAuthToken();
    if (e instanceof Error && "status" in e && (e as any).status === 429) {
      return "Too many attempts. Please try again in 15 minutes.";
    }
    return e instanceof Error ? e.message : "Error creating account";
  }
```

- [ ] **Step 3: Verify typecheck passes**

Run: `cd storefront && bun run typecheck 2>&1 | tail -5`
Expected: No new errors

- [ ] **Step 4: Commit**

```
git add storefront/lib/medusa/customer.ts
git commit -m "feat(auth): handle 429 rate-limit responses in login and signup

Detects FetchError with status 429 and surfaces user-friendly lockout message.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Chunk 2: Password Reset Pages + Login Form Edit

This chunk builds the forgot-password and reset-password UI, and adds the "Forgot password?" link to the login form.

### Task 6: Add "Forgot password?" link to login form

**Files:**
- Modify: `storefront/components/account/login-form.tsx`

- [ ] **Step 1: Add Link import**

At the top of `login-form.tsx`, add:

```typescript
import Link from "next/link";
```

- [ ] **Step 2: Add "Forgot password?" link**

Between the password field's closing `</div>` (around line 52) and the submit button's `<div>` (around line 55), add:

```tsx
      <div className="flex items-center justify-end">
        <Link
          href="/account/forgot-password"
          className="text-sm/6 font-semibold text-primary-600 hover:text-primary-500"
        >
          Forgot password?
        </Link>
      </div>
```

- [ ] **Step 3: Verify the dev server renders correctly**

Navigate to: `http://localhost:3000/account/login`
Expected: "Forgot password?" link appears between the password field and the "Sign in" button.

- [ ] **Step 4: Commit**

```
git add storefront/components/account/login-form.tsx
git commit -m "feat(auth): add forgot password link to login form

Links to /account/forgot-password. Styled consistent with TailwindPlus auth forms.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 7: Create forgot-password form component

**Files:**
- Create: `storefront/components/account/forgot-password-form.tsx`

- [ ] **Step 1: Create `forgot-password-form.tsx`**

```tsx
"use client";

import { requestPasswordReset } from "lib/medusa/customer";
import { useState, useTransition } from "react";

export function ForgotPasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;

    setError(null);
    startTransition(async () => {
      const result = await requestPasswordReset(email);
      if (result.error) {
        setError(result.error);
      } else {
        setSubmitted(true);
      }
    });
  }

  if (submitted) {
    return (
      <div className="rounded-md bg-green-50 p-4">
        <p className="text-sm text-green-800">
          If an account exists with that email, you&apos;ll receive password
          reset instructions shortly. Check your inbox.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div>
        <label
          htmlFor="email"
          className="block text-sm/6 font-medium text-gray-900"
        >
          Email address
        </label>
        <div className="mt-2">
          <input
            id="email"
            type="email"
            name="email"
            required
            autoComplete="email"
            className="focus:outline-primary-600 block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline focus:outline-2 focus:-outline-offset-2 sm:text-sm/6"
          />
        </div>
      </div>

      <div>
        <button
          type="submit"
          disabled={isPending}
          className="bg-primary-600 hover:bg-primary-500 focus-visible:outline-primary-600 flex w-full justify-center rounded-md px-3 py-1.5 text-sm/6 font-semibold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Sending..." : "Send reset instructions"}
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `cd storefront && bun run typecheck 2>&1 | tail -5`
Expected: No new errors

- [ ] **Step 3: Commit**

```
git add storefront/components/account/forgot-password-form.tsx
git commit -m "feat(auth): add forgot-password form component

Email input calls requestPasswordReset server action.
Shows confirmation message on success (prevents email enumeration).
Uses useTransition for pending state.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 8: Create forgot-password page

**Files:**
- Create: `storefront/app/(auth)/account/forgot-password/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
import { retrieveCustomer } from "lib/medusa/customer";
import { redirect } from "next/navigation";
import { ForgotPasswordForm } from "components/account/forgot-password-form";
import { AuthLayout } from "components/account/auth-layout";
import Link from "next/link";

export const metadata = {
  title: "Forgot Password",
};

export default async function ForgotPasswordPage() {
  const customer = await retrieveCustomer();
  if (customer) redirect("/account");

  return (
    <AuthLayout
      heading="Reset your password"
      subtext={
        <>
          Remember your password?{" "}
          <Link
            href="/account/login"
            className="text-primary-600 hover:text-primary-500 font-semibold"
          >
            Sign in
          </Link>
        </>
      }
    >
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
```

- [ ] **Step 2: Verify the page renders**

Navigate to: `http://localhost:3000/account/forgot-password`
Expected: AuthLayout with "Reset your password" heading, email form, "Sign in" link.

- [ ] **Step 3: Verify login page link works**

Navigate to: `http://localhost:3000/account/login`
Click: "Forgot password?"
Expected: Navigates to `/account/forgot-password`

- [ ] **Step 4: Commit**

```
git add "storefront/app/(auth)/account/forgot-password/page.tsx"
git commit -m "feat(auth): add forgot-password page

Server component in (auth) route group. Redirects logged-in users to /account.
Wraps ForgotPasswordForm in AuthLayout. Links back to login.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 9: Create reset-password form component

**Files:**
- Create: `storefront/components/account/reset-password-form.tsx`

- [ ] **Step 1: Create `reset-password-form.tsx`**

```tsx
"use client";

import { completePasswordReset } from "lib/medusa/customer";
import { validatePassword } from "lib/validation";
import Link from "next/link";
import { useState, useTransition } from "react";

type ResetPasswordFormProps = {
  token: string;
  email: string;
};

export function ResetPasswordForm({ token, email }: ResetPasswordFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirm_password") as string;

    // Client-side validation
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await completePasswordReset(token, email, password);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
      }
    });
  }

  if (success) {
    return (
      <div className="space-y-6">
        <div className="rounded-md bg-green-50 p-4">
          <p className="text-sm text-green-800">
            Your password has been reset successfully.
          </p>
        </div>
        <Link
          href="/account/login"
          className="bg-primary-600 hover:bg-primary-500 focus-visible:outline-primary-600 flex w-full justify-center rounded-md px-3 py-1.5 text-sm/6 font-semibold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div>
        <label
          htmlFor="password"
          className="block text-sm/6 font-medium text-gray-900"
        >
          New password
        </label>
        <div className="mt-2">
          <input
            id="password"
            type="password"
            name="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="focus:outline-primary-600 block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline focus:outline-2 focus:-outline-offset-2 sm:text-sm/6"
          />
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Must be at least 8 characters
        </p>
      </div>

      <div>
        <label
          htmlFor="confirm_password"
          className="block text-sm/6 font-medium text-gray-900"
        >
          Confirm new password
        </label>
        <div className="mt-2">
          <input
            id="confirm_password"
            type="password"
            name="confirm_password"
            required
            minLength={8}
            autoComplete="new-password"
            className="focus:outline-primary-600 block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline focus:outline-2 focus:-outline-offset-2 sm:text-sm/6"
          />
        </div>
      </div>

      <div>
        <button
          type="submit"
          disabled={isPending}
          className="bg-primary-600 hover:bg-primary-500 focus-visible:outline-primary-600 flex w-full justify-center rounded-md px-3 py-1.5 text-sm/6 font-semibold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Resetting..." : "Reset password"}
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `cd storefront && bun run typecheck 2>&1 | tail -5`
Expected: No new errors

- [ ] **Step 3: Commit**

```
git add storefront/components/account/reset-password-form.tsx
git commit -m "feat(auth): add reset-password form component

New password + confirmation fields with client-side validation (match + 8 char min).
Calls completePasswordReset server action. Shows success state with sign-in link.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 10: Create reset-password page

**Files:**
- Create: `storefront/app/(auth)/account/reset-password/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
import { AuthLayout } from "components/account/auth-layout";
import { ResetPasswordForm } from "components/account/reset-password-form";
import Link from "next/link";

export const metadata = {
  title: "Reset Password",
};

type ResetPasswordPageProps = {
  searchParams: Promise<{ token?: string; email?: string }>;
};

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const { token, email } = await searchParams;

  if (!token || !email) {
    return (
      <AuthLayout
        heading="Invalid reset link"
        subtext={
          <>
            The password reset link is invalid or has expired.{" "}
            <Link
              href="/account/forgot-password"
              className="text-primary-600 hover:text-primary-500 font-semibold"
            >
              Request a new one
            </Link>
          </>
        }
      >
        <div />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      heading="Set a new password"
      subtext={
        <>
          Enter your new password for{" "}
          <span className="font-medium text-gray-900">{email}</span>
        </>
      }
    >
      <ResetPasswordForm token={token} email={email} />
    </AuthLayout>
  );
}
```

Note: Next.js 16 `searchParams` is a Promise — must be awaited.

- [ ] **Step 2: Verify the page renders**

Navigate to: `http://localhost:3000/account/reset-password`
Expected: "Invalid reset link" message (no token/email params)

Navigate to: `http://localhost:3000/account/reset-password?token=test&email=test@example.com`
Expected: "Set a new password" form with password and confirm fields

- [ ] **Step 3: Commit**

```
git add "storefront/app/(auth)/account/reset-password/page.tsx"
git commit -m "feat(auth): add reset-password page

Server component. Reads token/email from searchParams (async in Next.js 16).
Shows invalid-link message if params are missing. Wraps ResetPasswordForm in AuthLayout.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 11: Add `minLength` and hint to register form

**Files:**
- Modify: `storefront/components/account/register-form.tsx`

- [ ] **Step 1: Add `minLength` attribute to password input**

In `register-form.tsx`, on the password input (around line 106), add `minLength={8}` after the `required` attribute:

```tsx
            required
            minLength={8}
```

- [ ] **Step 2: Add hint text below the password field**

After the password input's closing `</div>` (around line 110), add:

```tsx
        <p className="mt-1 text-sm text-gray-500">
          Must be at least 8 characters
        </p>
```

- [ ] **Step 3: Verify the dev server renders**

Navigate to: `http://localhost:3000/account/register`
Expected: Password field shows hint text "Must be at least 8 characters"

- [ ] **Step 4: Commit**

```
git add storefront/components/account/register-form.tsx
git commit -m "feat(auth): add password length hint and minLength to register form

HTML minLength={8} for browser-native validation. Hint text below field.
Server-side validation in signup() is the real enforcement (Task 4).

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 12: Update password-reset subscriber URL

**Files:**
- Modify: `backend/src/subscribers/password-reset.ts`

- [ ] **Step 1: Update the customer reset URL path**

In `password-reset.ts`, change line 42 from:

```typescript
      resetUrl = `${storefrontUrl}/reset-password?${params}`
```

to:

```typescript
      resetUrl = `${storefrontUrl}/account/reset-password?${params}`
```

- [ ] **Step 2: Verify backend builds**

Run: `cd backend && bun run build 2>&1 | tail -10`
Expected: No errors

- [ ] **Step 3: Commit**

```
git add backend/src/subscribers/password-reset.ts
git commit -m "fix(auth): update password reset email URL to /account/reset-password

Matches new route location in (auth) route group. Admin URL unchanged (out of scope).

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Chunk 3: Rate Limiting Middleware

This chunk builds the Redis-backed rate limiting middleware and wires it into Medusa's middleware config.

### Task 13: Add `ioredis` as explicit backend dependency

**Files:**
- Modify: `backend/package.json`

- [ ] **Step 1: Check the currently installed ioredis version**

Run: `node -e "console.log(require(require.resolve('ioredis/package.json', { paths: ['$(pwd)/backend'] })).version)"`

Note the version (likely 5.x).

- [ ] **Step 2: Add ioredis as a dependency**

Run: `cd backend && bun add ioredis`

- [ ] **Step 3: Verify it installed**

Run: `grep ioredis backend/package.json`
Expected: `"ioredis": "^5.x.x"` in dependencies

- [ ] **Step 4: Commit**

```
git add backend/package.json bun.lock
git commit -m "chore(backend): add ioredis as explicit dependency

Previously available only as transitive dep via @medusajs/caching-redis.
Making explicit to avoid breakage if transitive path changes.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

Note: The monorepo uses bun workspaces, so `bun.lock` is at root. Commit whichever lockfile changed.

---

### Task 14: Create rate-limit middleware

**Files:**
- Create: `backend/src/api/middlewares/rate-limit.ts`

- [ ] **Step 1: Create the middleware file**

Note: The `backend/src/api/middlewares/` directory does not exist yet — creating this file will create it.

```typescript
import type { RequestHandler } from "express"
import Redis from "ioredis"

const MAX_ATTEMPTS = 5
const WINDOW_SECONDS = 900 // 15 minutes

let redis: Redis | null = null
let warned = false

function getRedis(): Redis | null {
  if (redis) return redis
  const url = process.env.REDIS_URL
  if (!url) {
    if (!warned) {
      console.warn("[rate-limit] REDIS_URL not set — auth rate limiting disabled")
      warned = true
    }
    return null
  }
  try {
    redis = new Redis(url, { maxRetriesPerRequest: 1 })
    redis.on("error", (err) => {
      console.warn("[rate-limit] Redis error — auth rate limiting may be unavailable:", err.message)
    })
    return redis
  } catch {
    return null
  }
}

function keyFor(ip: string): string {
  return `auth_fail:${ip}`
}

export function authRateLimit(): RequestHandler {
  return async (req, res, next) => {
    const client = getRedis()
    if (!client) return next()

    const ip = req.ip || req.socket.remoteAddress || "unknown"
    const key = keyFor(ip)

    try {
      const count = await client.get(key)
      if (count && parseInt(count, 10) >= MAX_ATTEMPTS) {
        const ttl = await client.ttl(key)
        res.set("Retry-After", String(ttl > 0 ? ttl : WINDOW_SECONDS))
        res.status(429).json({
          message: "Too many failed attempts. Please try again later.",
          type: "too_many_requests",
        })
        return
      }
    } catch {
      // Redis read failed — pass through
      return next()
    }

    // Intercept response to track failures
    res.on("finish", () => {
      if (!client) return
      try {
        if (res.statusCode === 401) {
          client
            .multi()
            .incr(key)
            .expire(key, WINDOW_SECONDS)
            .exec()
            .catch(() => {})
        } else if (res.statusCode >= 200 && res.statusCode < 300) {
          client.del(key).catch(() => {})
        }
      } catch {
        // Swallow — rate limiting is best-effort
      }
    })

    next()
  }
}
```

- [ ] **Step 2: Verify backend builds**

Run: `cd backend && bun run build 2>&1 | tail -10`
Expected: No new errors

- [ ] **Step 3: Commit**

```
git add backend/src/api/middlewares/rate-limit.ts
git commit -m "feat(auth): add Redis-backed rate-limit middleware

Tracks failed auth attempts (401s) per IP. 5 failures = 15-min lockout (429).
Successful auth clears the counter. Graceful degradation if Redis unavailable.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 15: Wire rate-limit middleware into Medusa routes

**Files:**
- Modify: `backend/src/api/middlewares.ts`

- [ ] **Step 1: Add import**

At the top of `middlewares.ts`, add:

```typescript
import { authRateLimit } from "./middlewares/rate-limit"
```

- [ ] **Step 2: Add rate-limit routes to the `routes` array**

Add at the beginning of the `routes` array (before the payment-methods route):

```typescript
    // --- Auth rate limiting ---
    {
      matcher: "/auth/customer/emailpass*",
      method: ["POST"],
      middlewares: [authRateLimit()],
    },
    {
      matcher: "/auth/user/emailpass*",
      method: ["POST"],
      middlewares: [authRateLimit()],
    },
```

- [ ] **Step 3: Verify the backend starts without errors**

Run: `cd backend && bun run dev` (if not already running)
Expected: Server starts on port 9000 without errors. Check logs for any rate-limit warnings.

- [ ] **Step 4: Verify `trust proxy` status (P0 — rate limiting not functional without this)**

Run: `grep -r "trust.proxy" backend/node_modules/@medusajs/medusa/dist/ 2>/dev/null | head -5`

If Medusa already sets `trust proxy`, no action needed.

If Medusa does NOT set it, create a custom middleware that sets it. Add to the top of the `routes` array in `middlewares.ts`, before the rate-limit routes:

```typescript
    // --- Trust proxy for correct IP detection behind reverse proxy ---
    {
      matcher: "/auth*",
      middlewares: [
        (req, _res, next) => {
          req.app.set("trust proxy", true)
          next()
        },
      ],
    },
```

Alternatively, verify by logging `req.ip` during a test request to confirm it returns the real client IP, not the proxy IP. The rate-limit middleware is NOT considered functional until correct IP detection is confirmed.

- [ ] **Step 5: Commit**

```
git add backend/src/api/middlewares.ts
git commit -m "feat(auth): wire rate-limit middleware to auth endpoints

Applied to POST /auth/customer/emailpass* and POST /auth/user/emailpass*.
Covers login, register, reset-password, and password update routes.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 16: Manual smoke test of the full flow

- [ ] **Step 1: Test forgot password flow**

1. Navigate to `http://localhost:3000/account/login`
2. Click "Forgot password?"
3. Enter a test email, submit
4. Verify: Success message appears ("If an account exists...")
5. Check backend logs for password reset event (if Resend is not configured, the email won't send but the event should fire)

- [ ] **Step 2: Test reset password page**

1. Navigate to `http://localhost:3000/account/reset-password` (no params)
2. Verify: "Invalid reset link" message shown
3. Navigate to `http://localhost:3000/account/reset-password?token=fake&email=test@example.com`
4. Enter password less than 8 chars, submit
5. Verify: "Password must be at least 8 characters" error
6. Enter mismatched passwords, submit
7. Verify: "Passwords do not match" error
8. Enter valid matching passwords, submit
9. Verify: Error about invalid/expired token (expected with fake token)

- [ ] **Step 3: Test signup password validation**

1. Navigate to `http://localhost:3000/account/register`
2. Fill all fields, enter password "short", submit
3. Verify: "Password must be at least 8 characters" error (server-side)
4. Verify: Browser also blocks submission (HTML minLength)

- [ ] **Step 4: Update TODO.md**

Mark the three auth security items as complete:

```markdown
- [x] Password reset page — `/reset-password` storefront route ...
- [x] Rate limiting on auth endpoints — prevent brute-force attacks ...
- [x] Password complexity validation — enforce minimum length (8+ chars) ...
```

- [ ] **Step 5: Final commit**

```
git add TODO.md
git commit -m "docs: mark auth security items complete in TODO.md

Password reset flow, rate limiting, and password validation all implemented.

Co-Authored-By: Claude <noreply@anthropic.com>"
```
