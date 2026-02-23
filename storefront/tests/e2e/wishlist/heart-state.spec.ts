import { test, expect } from "../fixtures/wishlist.fixture";
import * as sel from "../helpers/selectors";

test.describe("Heart Button Server State", () => {
  test("heart shows filled on PDP for wishlisted variant", async ({
    authedPage: page,
    populatedWishlist,
  }) => {
    const handle = populatedWishlist.productHandles[0];
    if (!handle) throw new Error("No product handle from fixture");

    await page.goto(`/product/${handle}`);
    await page.waitForLoadState("networkidle");

    // The variant is in the wishlist — heart should auto-check and show solid
    const removeHeart = page.locator(sel.HEART_REMOVE).first();
    await expect(removeHeart).toBeVisible({ timeout: 15_000 });
  });

  test("heart shows outline on PDP for non-wishlisted variant", async ({
    authedPage: page,
    testProductHandle,
  }) => {
    // testProductHandle gets first product — use a different one if possible
    // But the fixture only gives one handle. We'll navigate to it without
    // adding it to wishlist. Since populatedWishlist is NOT used here,
    // no items are in the wishlist.
    await page.goto(`/product/${testProductHandle}`);
    await page.waitForLoadState("networkidle");

    const addHeart = page.locator(sel.HEART_ADD).first();
    await expect(addHeart).toBeVisible({ timeout: 15_000 });
  });

  test("heart toggles from filled to outline on remove", async ({
    authedPage: page,
    populatedWishlist,
  }) => {
    const handle = populatedWishlist.productHandles[0];
    if (!handle) throw new Error("No product handle from fixture");

    await page.goto(`/product/${handle}`);
    await page.waitForLoadState("networkidle");

    // Should start as filled (remove state)
    const removeHeart = page.locator(sel.HEART_REMOVE).first();
    await expect(removeHeart).toBeVisible({ timeout: 15_000 });

    // Click to remove
    await removeHeart.click();

    // Should toggle to outline (add state)
    await expect(page.locator(sel.HEART_ADD).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test("product grid hearts reflect wishlist state", async ({
    authedPage: page,
    populatedWishlist,
  }) => {
    // Visit the products listing page
    await page.goto("/products");
    await page.waitForLoadState("networkidle");

    // At least one heart should show as filled (the wishlisted product)
    const filledHearts = page.locator(sel.HEART_REMOVE);
    await expect(filledHearts.first()).toBeVisible({ timeout: 15_000 });
  });
});
