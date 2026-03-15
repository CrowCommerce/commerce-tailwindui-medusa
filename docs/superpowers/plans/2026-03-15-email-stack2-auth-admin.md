# Stack 2: Core Auth & Admin Emails — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three transactional email templates (password reset, admin invite, customer welcome) with subscriber-only delivery — no workflows.

**Architecture:** Each email follows the pattern: Medusa event → subscriber → `createNotifications()` → Resend service resolves template → renders react-email component → sends via Resend API. Subscribers handle all data resolution and URL construction. Templates are dumb renderers that receive ready-to-render props.

**Tech Stack:** Medusa v2 subscribers, `@medusajs/framework/utils` (Modules), react-email components, Resend, existing Stack 1 shared components (Header, Footer, Button, Text, Body, Head, Tailwind).

**Spec:** `docs/superpowers/specs/2026-03-15-email-stack2-auth-admin-design.md`

**Prerequisite:** Stack 1 source files are on `main` (merged 2026-03-15). Verify with `ls backend/src/modules/resend/service.ts`.

---

## Chunk 1: Password Reset Email

### Task 1: Password Reset Template

**Files:**
- Create: `backend/src/modules/resend/templates/password-reset.tsx`

- [ ] **Step 1: Create the password reset template**

```tsx
// backend/src/modules/resend/templates/password-reset.tsx
import { Container, Html, Preview, Row, Section } from "@react-email/components";
import { Body } from "./_components/body";
import { Button } from "./_components/button";
import { LeftAligned as Footer } from "./_components/footer";
import { Head } from "./_components/head";
import { LeftAligned as Header } from "./_components/header";
import { Tailwind } from "./_components/tailwind";
import { Text } from "./_components/text";
import { getEmailConfig } from "./_config/email-config";
import type { BaseTemplateProps } from "./types";

export interface PasswordResetProps extends BaseTemplateProps {
  resetUrl: string;
  email: string;
  actorType: "customer" | "user";
}

export const PasswordReset = ({
  theme,
  resetUrl,
  email,
  actorType,
  brandConfig,
}: PasswordResetProps) => {
  const config = getEmailConfig(brandConfig);
  const isAdmin = actorType === "user";

  return (
    <Html>
      <Tailwind theme={theme}>
        <Head />
        <Preview>Reset your {isAdmin ? "admin" : "account"} password</Preview>
        <Body>
          <Container align="center" className="w-full max-w-160 bg-primary md:p-8">
            <Header logoUrl={config.logoUrl} logoAlt={config.logoAlt} />
            <Section align="left" className="max-w-full px-6 py-8">
              <Row className="mb-6">
                <Text className="text-display-xs font-semibold text-primary">
                  Reset Your Password
                </Text>
              </Row>
              <Row className="mb-6">
                <Text className="text-tertiary">
                  We received a request to reset the password for the{" "}
                  {isAdmin ? "admin" : "store"} account associated with{" "}
                  {email}. Click the button below to choose a new password.
                </Text>
              </Row>
              <Row className="mb-6">
                <Button href={resetUrl}>
                  <Text className="text-md font-semibold">Reset Password</Text>
                </Button>
              </Row>
              <Row className="mb-6">
                <Text className="text-sm text-tertiary">
                  This link expires in 15 minutes. If you didn't request a
                  password reset, you can safely ignore this email — your
                  password will remain unchanged.
                </Text>
              </Row>
              <Row>
                <Text className="text-md text-tertiary">
                  Thanks,
                  <br />
                  The {config.companyName} team
                </Text>
              </Row>
            </Section>
            <Footer
              companyName={config.companyName}
              copyrightYear={config.copyrightYear}
              legalLinks={config.legalLinks}
            />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

PasswordReset.PreviewProps = {
  resetUrl: "http://localhost:3000/reset-password?token=abc123&email=sarah@example.com",
  email: "sarah@example.com",
  actorType: "customer",
} satisfies PasswordResetProps;

export default PasswordReset;
```

- [ ] **Step 2: Verify template renders in preview**

```bash
cd backend && bun run preview:emails
```

Open `http://localhost:3003` and confirm the password-reset template renders without errors. Check both light appearance and the text content. Close the preview server when done.

- [ ] **Step 3: Commit**

```bash
git add backend/src/modules/resend/templates/password-reset.tsx
git commit -m "feat(email): add password reset template

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2: Password Reset Subscriber

**Files:**
- Create: `backend/src/subscribers/password-reset.ts`
- Modify: `backend/src/modules/resend/service.ts`

- [ ] **Step 1: Create the subscriber**

```typescript
// backend/src/subscribers/password-reset.ts
import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"

type PasswordResetPayload = {
  entity_id: string  // This IS the email address (renamed from `email` after v2.0.7)
  actor_type: string
  token: string
}

export default async function passwordResetHandler({
  event: { data },
  container,
}: SubscriberArgs<PasswordResetPayload>) {
  const logger = container.resolve("logger")

  try {
    const email = data.entity_id
    const actorType = data.actor_type as "customer" | "user"
    const token = data.token

    // Build reset URL based on actor type
    let resetUrl: string

    if (actorType === "customer") {
      const storefrontUrl = process.env.STOREFRONT_URL || "http://localhost:3000"
      resetUrl = `${storefrontUrl}/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`
    } else {
      // Admin user — resolve URL from configModule (canonical source)
      const configModule = container.resolve("configModule")
      const rawBackendUrl = configModule.admin?.backendUrl
      const backendUrl = (rawBackendUrl && rawBackendUrl !== "/")
        ? rawBackendUrl
        : "http://localhost:9000"
      const adminPath = configModule.admin?.path || "/app"
      resetUrl = `${backendUrl}${adminPath}/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`
    }

    const notificationService = container.resolve(Modules.NOTIFICATION)

    await notificationService.createNotifications({
      to: email,
      channel: "email",
      template: "password-reset",
      data: {
        subject: actorType === "customer"
          ? "Reset Your Password"
          : "Reset Your Admin Password",
        resetUrl,
        email,
        actorType,
      },
    })

    logger.info(`Password reset email sent to ${email} (${actorType})`)
  } catch (error) {
    logger.error(
      `Failed to send password reset email for ${data.entity_id}`,
      error
    )
  }
}

export const config: SubscriberConfig = {
  event: "auth.password_reset",
}
```

- [ ] **Step 2: Register template in service.ts**

Add the import and template map entry to `backend/src/modules/resend/service.ts`:

```typescript
// Add import at top (after OrderConfirmation import):
import { PasswordReset } from "./templates/password-reset"

// Add to templates map:
"password-reset": PasswordReset,
```

The templates map should now look like:

```typescript
private templates: Record<string, React.FC<any>> = {
  "order-confirmation": OrderConfirmation,
  "password-reset": PasswordReset,
}
```

- [ ] **Step 3: Verify build**

```bash
cd backend && bun run build
```

Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add backend/src/subscribers/password-reset.ts backend/src/modules/resend/service.ts
git commit -m "feat(email): add password reset subscriber

Handles auth.password_reset event. Builds reset URL from configModule
for admin users and STOREFRONT_URL for customers. Token expires in
15 minutes (hardcoded in Medusa's generateResetPasswordTokenWorkflow).

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Chunk 2: Admin Invite Email

### Task 3: Admin Invite Template

**Files:**
- Create: `backend/src/modules/resend/templates/invite-user.tsx`

- [ ] **Step 1: Create the invite template**

```tsx
// backend/src/modules/resend/templates/invite-user.tsx
import { Container, Html, Preview, Row, Section } from "@react-email/components";
import { Body } from "./_components/body";
import { Button } from "./_components/button";
import { LeftAligned as Footer } from "./_components/footer";
import { Head } from "./_components/head";
import { LeftAligned as Header } from "./_components/header";
import { Tailwind } from "./_components/tailwind";
import { Text } from "./_components/text";
import { getEmailConfig } from "./_config/email-config";
import type { BaseTemplateProps } from "./types";

export interface InviteUserProps extends BaseTemplateProps {
  inviteUrl: string;
  storeName: string;
}

export const InviteUser = ({
  theme,
  inviteUrl,
  storeName,
  brandConfig,
}: InviteUserProps) => {
  const config = getEmailConfig(brandConfig);

  return (
    <Html>
      <Tailwind theme={theme}>
        <Head />
        <Preview>You've been invited to join {storeName}</Preview>
        <Body>
          <Container align="center" className="w-full max-w-160 bg-primary md:p-8">
            <Header logoUrl={config.logoUrl} logoAlt={config.logoAlt} />
            <Section align="left" className="max-w-full px-6 py-8">
              <Row className="mb-6">
                <Text className="text-display-xs font-semibold text-primary">
                  You've Been Invited
                </Text>
              </Row>
              <Row className="mb-6">
                <Text className="text-tertiary">
                  You've been invited to join {storeName} as an admin. Click
                  the button below to accept your invitation and set up your
                  account.
                </Text>
              </Row>
              <Row className="mb-6">
                <Button href={inviteUrl}>
                  <Text className="text-md font-semibold">Accept Invite</Text>
                </Button>
              </Row>
              <Row className="mb-6">
                <Text className="text-sm text-tertiary">
                  This invitation expires in 7 days. If you weren't expecting
                  this invitation, you can safely ignore this email.
                </Text>
              </Row>
              <Row>
                <Text className="text-md text-tertiary">
                  Thanks,
                  <br />
                  The {config.companyName} team
                </Text>
              </Row>
            </Section>
            <Footer
              companyName={config.companyName}
              copyrightYear={config.copyrightYear}
              legalLinks={config.legalLinks}
            />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

InviteUser.PreviewProps = {
  inviteUrl: "http://localhost:9000/app/invite?token=abc123",
  storeName: "CrowCommerce",
} satisfies InviteUserProps;

export default InviteUser;
```

- [ ] **Step 2: Verify template renders in preview**

```bash
cd backend && bun run preview:emails
```

Open `http://localhost:3003` and confirm invite-user renders. Close when done.

- [ ] **Step 3: Commit**

```bash
git add backend/src/modules/resend/templates/invite-user.tsx
git commit -m "feat(email): add admin invite template

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4: Admin Invite Subscriber

**Files:**
- Create: `backend/src/subscribers/invite-created.ts`
- Modify: `backend/src/modules/resend/service.ts`

- [ ] **Step 1: Create the subscriber**

```typescript
// backend/src/subscribers/invite-created.ts
import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"
import { defaultEmailConfig } from "../modules/resend/templates/_config/email-config"

export default async function inviteCreatedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve("logger")

  try {
    // Fetch invite record — always fresh (invite.resent regenerates the token)
    const userModuleService = container.resolve(Modules.USER)
    const invite = await userModuleService.retrieveInvite(data.id)

    if (!invite.email) {
      logger.warn(`Invite ${data.id} has no email address, skipping notification`)
      return
    }

    // Build admin invite URL from configModule (canonical source for admin URL)
    const configModule = container.resolve("configModule")
    const rawBackendUrl = configModule.admin?.backendUrl
    const backendUrl = (rawBackendUrl && rawBackendUrl !== "/")
      ? rawBackendUrl
      : "http://localhost:9000"
    const adminPath = configModule.admin?.path || "/app"
    const inviteUrl = `${backendUrl}${adminPath}/invite?token=${encodeURIComponent(invite.token)}`

    const storeName = defaultEmailConfig.companyName
    const notificationService = container.resolve(Modules.NOTIFICATION)

    await notificationService.createNotifications({
      to: invite.email,
      channel: "email",
      template: "invite-user",
      data: {
        subject: `You've been invited to join ${storeName}`,
        inviteUrl,
        storeName,
      },
    })

    logger.info(`Invite email sent to ${invite.email} (invite ${data.id})`)
  } catch (error) {
    logger.error(
      `Failed to send invite email for invite ${data.id}`,
      error
    )
  }
}

export const config: SubscriberConfig = {
  event: ["invite.created", "invite.resent"],
}
```

- [ ] **Step 2: Register template in service.ts**

Add to `backend/src/modules/resend/service.ts`:

```typescript
// Add import at top:
import { InviteUser } from "./templates/invite-user"

// Add to templates map:
"invite-user": InviteUser,
```

The templates map should now be:

```typescript
private templates: Record<string, React.FC<any>> = {
  "order-confirmation": OrderConfirmation,
  "password-reset": PasswordReset,
  "invite-user": InviteUser,
}
```

- [ ] **Step 3: Verify build**

```bash
cd backend && bun run build
```

Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add backend/src/subscribers/invite-created.ts backend/src/modules/resend/service.ts
git commit -m "feat(email): add admin invite subscriber

Handles both invite.created and invite.resent events via array config.
Always fetches invite record fresh (invite.resent regenerates the token).
Builds admin invite URL from configModule.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Chunk 3: Customer Welcome Email & Final Wiring

### Task 5: Customer Welcome Template

**Files:**
- Create: `backend/src/modules/resend/templates/welcome.tsx`

- [ ] **Step 1: Create the welcome template**

```tsx
// backend/src/modules/resend/templates/welcome.tsx
import { Container, Html, Preview, Row, Section } from "@react-email/components";
import { Body } from "./_components/body";
import { Button } from "./_components/button";
import { LeftAligned as Footer } from "./_components/footer";
import { Head } from "./_components/head";
import { LeftAligned as Header } from "./_components/header";
import { Tailwind } from "./_components/tailwind";
import { Text } from "./_components/text";
import { getEmailConfig } from "./_config/email-config";
import type { BaseTemplateProps } from "./types";

export interface WelcomeProps extends BaseTemplateProps {
  customerName: string | null;
  shopUrl: string;
  accountUrl: string;
  storeName: string;
}

export const Welcome = ({
  theme,
  customerName,
  shopUrl,
  accountUrl,
  storeName,
  brandConfig,
}: WelcomeProps) => {
  const config = getEmailConfig(brandConfig);
  const greeting = customerName ? `Hi ${customerName},` : "Hi there,";

  return (
    <Html>
      <Tailwind theme={theme}>
        <Head />
        <Preview>Welcome to {storeName}</Preview>
        <Body>
          <Container align="center" className="w-full max-w-160 bg-primary md:p-8">
            <Header logoUrl={config.logoUrl} logoAlt={config.logoAlt} />
            <Section align="left" className="max-w-full px-6 py-8">
              <Row className="mb-6">
                <Text className="text-display-xs font-semibold text-primary">
                  Welcome to {storeName}
                </Text>
              </Row>
              <Row className="mb-6">
                <Text className="text-tertiary">
                  {greeting}
                  <br />
                  <br />
                  Thanks for creating an account! We're excited to have you.
                  Here's what you can do:
                </Text>
              </Row>
              <Row className="mb-2">
                <Text className="text-tertiary">
                  • Browse our latest collections and discover new arrivals
                </Text>
              </Row>
              <Row className="mb-2">
                <Text className="text-tertiary">
                  • Save your favorites to your wishlist for later
                </Text>
              </Row>
              <Row className="mb-6">
                <Text className="text-tertiary">
                  • Track your orders and manage your account in one place
                </Text>
              </Row>
              <Row className="mb-4">
                <Button href={shopUrl}>
                  <Text className="text-md font-semibold">Start Shopping</Text>
                </Button>
              </Row>
              <Row className="mb-6">
                <Button href={accountUrl} color="secondary">
                  <Text className="text-md font-semibold">View Your Account</Text>
                </Button>
              </Row>
              <Row>
                <Text className="text-md text-tertiary">
                  If you have any questions, contact us at{" "}
                  <a
                    href={`mailto:${config.supportEmail}`}
                    className="text-brand-secondary"
                  >
                    {config.supportEmail}
                  </a>
                  .
                  <br />
                  <br />
                  Thanks,
                  <br />
                  The {config.companyName} team
                </Text>
              </Row>
            </Section>
            <Footer
              companyName={config.companyName}
              copyrightYear={config.copyrightYear}
              legalLinks={config.legalLinks}
            />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

Welcome.PreviewProps = {
  customerName: "Sarah",
  shopUrl: "http://localhost:3000",
  accountUrl: "http://localhost:3000/account",
  storeName: "CrowCommerce",
} satisfies WelcomeProps;

export default Welcome;
```

- [ ] **Step 2: Verify template renders in preview**

```bash
cd backend && bun run preview:emails
```

Open `http://localhost:3003` and confirm welcome renders with the name greeting and both CTAs. Also test with `customerName: null` by editing PreviewProps temporarily to confirm "Hi there," fallback. Close when done.

- [ ] **Step 3: Commit**

```bash
git add backend/src/modules/resend/templates/welcome.tsx
git commit -m "feat(email): add customer welcome template

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 6: Customer Welcome Subscriber

**Files:**
- Create: `backend/src/subscribers/customer-created.ts`
- Modify: `backend/src/modules/resend/service.ts`

- [ ] **Step 1: Create the subscriber**

```typescript
// backend/src/subscribers/customer-created.ts
import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"
import { defaultEmailConfig } from "../modules/resend/templates/_config/email-config"

export default async function customerCreatedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve("logger")

  try {
    const customerModuleService = container.resolve(Modules.CUSTOMER)
    const customer = await customerModuleService.retrieveCustomer(data.id)

    if (!customer.email) {
      logger.warn(`Customer ${data.id} has no email address, skipping welcome email`)
      return
    }

    // Build customer name, or null if neither first nor last name exists
    const customerName = [customer.first_name, customer.last_name]
      .filter(Boolean)
      .join(" ") || null

    const storefrontUrl = process.env.STOREFRONT_URL || "http://localhost:3000"
    const storeName = defaultEmailConfig.companyName
    const notificationService = container.resolve(Modules.NOTIFICATION)

    await notificationService.createNotifications({
      to: customer.email,
      channel: "email",
      template: "welcome",
      data: {
        subject: `Welcome to ${storeName}`,
        customerName,
        shopUrl: storefrontUrl,
        accountUrl: `${storefrontUrl}/account`,
        storeName,
      },
    })

    logger.info(`Welcome email sent to ${customer.email} (customer ${data.id})`)
  } catch (error) {
    logger.error(
      `Failed to send welcome email for customer ${data.id}`,
      error
    )
  }
}

export const config: SubscriberConfig = {
  event: "customer.created",
}
```

- [ ] **Step 2: Register template in service.ts**

Add to `backend/src/modules/resend/service.ts`:

```typescript
// Add import at top:
import { Welcome } from "./templates/welcome"

// Add to templates map:
"welcome": Welcome,
```

Final templates map:

```typescript
private templates: Record<string, React.FC<any>> = {
  "order-confirmation": OrderConfirmation,
  "password-reset": PasswordReset,
  "invite-user": InviteUser,
  "welcome": Welcome,
}
```

- [ ] **Step 3: Verify build**

```bash
cd backend && bun run build
```

Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add backend/src/subscribers/customer-created.ts backend/src/modules/resend/service.ts
git commit -m "feat(email): add customer welcome subscriber

Handles customer.created event (fires for both storefront signups and
admin-created customers). Fetches customer record for name, degrades
greeting to 'Hi there,' when no name exists.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 7: Final Verification & Submit

**Files:** None (verification only)

- [ ] **Step 1: Full build verification**

```bash
cd backend && bun run build
```

- [ ] **Step 2: Verify all new files exist**

```bash
ls -la backend/src/modules/resend/templates/password-reset.tsx
ls -la backend/src/modules/resend/templates/invite-user.tsx
ls -la backend/src/modules/resend/templates/welcome.tsx
ls -la backend/src/subscribers/password-reset.ts
ls -la backend/src/subscribers/invite-created.ts
ls -la backend/src/subscribers/customer-created.ts
```

All six files must exist.

- [ ] **Step 3: Verify template map in service.ts**

Read `backend/src/modules/resend/service.ts` and confirm the templates map contains all four entries: `order-confirmation`, `password-reset`, `invite-user`, `welcome`.

- [ ] **Step 4: Verify email preview**

```bash
cd backend && bun run preview:emails
```

Open `http://localhost:3003`. Confirm all four templates render:
1. `order-confirmation` — existing, should still work
2. `password-reset` — new, shows reset button and 15-minute expiry
3. `invite-user` — new, shows accept invite button and 7-day expiry
4. `welcome` — new, shows greeting, value props, two CTAs

- [ ] **Step 5: Submit stack**

```bash
gt submit --stack
```

This creates/updates the PR. The PR should show 3 templates + 3 subscribers + service.ts modifications.
