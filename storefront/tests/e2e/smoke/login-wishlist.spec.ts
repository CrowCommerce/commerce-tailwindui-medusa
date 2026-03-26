import { test, expect } from "../fixtures/wishlist.fixture";
import * as sel from "../helpers/selectors";

test.describe("Wishlist smoke", () => {
  test("login and add a product to wishlist", async ({
    authedPage: page,
    testProductHandle,
  }) => {
    await page.goto(`/product/${testProductHandle}`);
    await page.waitForLoadState("networkidle");

    const heart = page.locator(sel.HEART_ADD).first();
    await expect(heart).toBeVisible({ timeout: 10_000 });
    await heart.click();

    await expect(page.locator(sel.HEART_REMOVE).first()).toBeVisible({
      timeout: 10_000,
    });

    await page.goto("/account/wishlist");
    await page.waitForLoadState("networkidle");

    await expect(page.locator(sel.REMOVE_ITEM_BUTTON).first()).toBeVisible({
      timeout: 10_000,
    });
  });
});
