import { expect, type Page } from "@playwright/test";

export async function openFirstProductFromSearch(page: Page): Promise<string> {
  for (let navAttempt = 0; navAttempt < 3; navAttempt++) {
    await page.goto("/search");
    await page.waitForLoadState("networkidle");

    const hasContent = await page
      .locator('a[href^="/product/"]')
      .first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);

    if (hasContent) break;

    await page.waitForTimeout(2_000);
  }

  const productLink = page
    .locator('a[href^="/product/"]')
    .filter({ has: page.locator("img") })
    .first();

  await expect(productLink).toBeVisible({ timeout: 15_000 });

  const productHref = await productLink.getAttribute("href");
  if (!productHref) {
    throw new Error("Could not determine product URL from search results");
  }

  await page.goto(productHref);
  await page.waitForURL("**/product/**");
  await page.waitForLoadState("networkidle");

  return productHref;
}

export async function addCurrentProductToCart(page: Page): Promise<void> {
  const anyAddButton = page.locator(
    'button[aria-label="Add to cart"], button[aria-label="Please select an option"]',
  );
  await expect(anyAddButton.first()).toBeVisible({ timeout: 15_000 });

  const disabledAdd = page.locator(
    'button[aria-label="Please select an option"]',
  );
  if (await disabledAdd.isVisible({ timeout: 2_000 }).catch(() => false)) {
    const variantButton = page
      .locator('button:not([disabled]):not([aria-label]):not([type="submit"])')
      .filter({ hasText: /^[A-Z0-9/]{1,10}$/ })
      .first();

    if (await variantButton.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await variantButton.click();
      await expect(
        page.locator('button[aria-label="Add to cart"]'),
      ).toBeVisible({ timeout: 5_000 });
    }
  }

  const addToCartButton = page.locator('button[aria-label="Add to cart"]');
  await expect(addToCartButton).toBeVisible({ timeout: 15_000 });
  await addToCartButton.click();
}
