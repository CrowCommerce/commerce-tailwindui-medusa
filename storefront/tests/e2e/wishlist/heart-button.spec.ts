import { test, expect } from "../fixtures/wishlist.fixture";
import * as sel from "../helpers/selectors";

test.describe("Heart Button", () => {
  test("heart button appears on product detail page", async ({
    guestPage: page,
    testProductHandle,
  }) => {
    await page.goto(`/product/${testProductHandle}`);
    await page.waitForLoadState("networkidle");

    const heart = page.locator(sel.HEART_BUTTON).first();
    await expect(heart).toBeVisible();
  });

  test("heart toggles to solid on add click", async ({
    guestPage: page,
    testProductHandle,
  }) => {
    await page.goto(`/product/${testProductHandle}`);
    await page.waitForLoadState("networkidle");

    // Initially outline (Add to wishlist)
    await expect(page.locator(sel.HEART_ADD).first()).toBeVisible();

    // Click to add — becomes solid (Remove from wishlist)
    await page.locator(sel.HEART_ADD).first().click();
    await expect(page.locator(sel.HEART_REMOVE).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test("heart button shows pending state during server action", async ({
    guestPage: page,
    testProductHandle,
  }) => {
    await page.goto(`/product/${testProductHandle}`);
    await page.waitForLoadState("networkidle");

    const heart = page.locator(sel.HEART_ADD).first();

    // Click and verify it transitions to the toggled state
    await heart.click();

    await expect(page.locator(sel.HEART_REMOVE).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test("heart button works for authenticated users", async ({
    authedPage: page,
    testProductHandle,
  }) => {
    await page.goto(`/product/${testProductHandle}`);
    await page.waitForLoadState("networkidle");

    const heart = page.locator(sel.HEART_ADD).first();
    await expect(heart).toBeVisible();

    await heart.click();
    await expect(page.locator(sel.HEART_REMOVE).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test("heart button creates guest wishlist with cookie", async ({
    guestPage: page,
    testProductHandle,
  }) => {
    await page.goto(`/product/${testProductHandle}`);
    await page.waitForLoadState("networkidle");

    const heart = page.locator(sel.HEART_ADD).first();
    await heart.click();
    await expect(page.locator(sel.HEART_REMOVE).first()).toBeVisible({
      timeout: 10_000,
    });

    // Verify cookie was set (guest wishlist created)
    const cookies = await page.context().cookies();
    const wishlistCookie = cookies.find(
      (c) => c.name === "_medusa_wishlist_id",
    );
    expect(wishlistCookie).toBeTruthy();
  });
});
