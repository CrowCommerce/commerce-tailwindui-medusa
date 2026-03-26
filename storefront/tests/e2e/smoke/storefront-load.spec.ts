import { test, expect } from "@playwright/test";
import { openFirstProductFromSearch } from "../helpers/product-flow";

test.describe("Storefront smoke", () => {
  test("home page and product detail page load", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("header")).toBeVisible();
    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator("footer")).toBeVisible();

    const productHref = await openFirstProductFromSearch(page);

    await expect(page).toHaveURL(new RegExp(`${productHref}(\\?.*)?$`));
    await expect(
      page.locator(
        'button[aria-label="Add to cart"], button[aria-label="Please select an option"]',
      ),
    ).toBeVisible({ timeout: 15_000 });
  });
});
