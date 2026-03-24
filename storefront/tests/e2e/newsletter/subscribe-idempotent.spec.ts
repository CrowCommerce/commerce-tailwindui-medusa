import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import {
  gotoHomepageNewsletter,
  newsletterFooter,
  uniqueTestEmail,
  waitForNewsletterRequestSlot,
} from "./helpers";

test.setTimeout(180_000);

async function subscribeFromFooter(page: Page, email: string) {
  await gotoHomepageNewsletter(page);

  const { emailInput, signUpButton, successMessage } = newsletterFooter(page);

  await emailInput.fill(email);
  await waitForNewsletterRequestSlot();
  await signUpButton.click();

  await expect(successMessage).toBeVisible({ timeout: 10_000 });
}

test.describe("Newsletter Subscribe Idempotency", () => {
  test("allows subscribing the same email twice without showing an error", async ({
    page,
  }, testInfo) => {
    const email = uniqueTestEmail("resubscribe", testInfo.project.name);

    await subscribeFromFooter(page, email);

    await page.goto("/products");
    await page.waitForLoadState("networkidle");

    await subscribeFromFooter(page, email);

    await expect(page.getByText("You're subscribed!")).toBeVisible({
      timeout: 10_000,
    });
  });
});
