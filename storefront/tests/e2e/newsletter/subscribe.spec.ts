import { test, expect } from "@playwright/test";
import {
  gotoHomepageNewsletter,
  newsletterFooter,
  uniqueTestEmail,
  waitForNewsletterRequestSlot,
} from "./helpers";

test.setTimeout(180_000);

test.describe("Newsletter Subscribe", () => {
  test("shows the footer form and allows a successful subscription", async ({
    page,
  }, testInfo) => {
    const email = uniqueTestEmail("test", testInfo.project.name);

    await gotoHomepageNewsletter(page);

    const { heading, emailInput, signUpButton, successMessage } =
      newsletterFooter(page);

    await expect(heading).toBeVisible();
    await expect(emailInput).toBeVisible();
    await expect(signUpButton).toBeVisible();

    await emailInput.fill(email);
    await waitForNewsletterRequestSlot();
    await signUpButton.click();

    await expect(successMessage).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("You're subscribed!")).toBeVisible({
      timeout: 10_000,
    });
    await expect(emailInput).toHaveCount(0);
    await expect(signUpButton).toHaveCount(0);
  });
});
