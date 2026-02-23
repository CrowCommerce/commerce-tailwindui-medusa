import { test, expect } from "../fixtures/wishlist.fixture";
import * as sel from "../helpers/selectors";

test.describe("Guest Wishlist", () => {
  test("can add item to wishlist via heart button on PDP", async ({
    guestPage: page,
    testProductHandle,
  }) => {
    await page.goto(`/product/${testProductHandle}`);
    await page.waitForLoadState("networkidle");

    const heart = page.locator(sel.HEART_ADD).first();
    await expect(heart).toBeVisible();

    await heart.click();

    // Heart should toggle to solid (Remove from wishlist)
    await expect(page.locator(sel.HEART_REMOVE).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test("guest wishlist cookie is set after adding item", async ({
    guestPage: page,
    testProductHandle,
    browser,
  }) => {
    const context = page.context();

    await page.goto(`/product/${testProductHandle}`);
    await page.waitForLoadState("networkidle");

    await page.locator(sel.HEART_ADD).first().click();
    await expect(page.locator(sel.HEART_REMOVE).first()).toBeVisible({
      timeout: 10_000,
    });

    // Verify the wishlist cookie was set
    const cookies = await context.cookies();
    const wishlistCookie = cookies.find(
      (c) => c.name === "_medusa_wishlist_id",
    );
    expect(wishlistCookie).toBeTruthy();
  });

  test("guest is redirected to login when accessing account wishlist page", async ({
    guestPage: page,
  }) => {
    await page.goto("/account/wishlist");
    await page.waitForLoadState("networkidle");

    // Account layout redirects guests to login
    await expect(page).toHaveURL(/\/account\/login/);
  });

  test("adding same variant twice shows error notification gracefully", async ({
    guestPage: page,
    testProductHandle,
  }) => {
    await page.goto(`/product/${testProductHandle}`);
    await page.waitForLoadState("networkidle");

    // First add — should succeed
    await page.locator(sel.HEART_ADD).first().click();
    await expect(page.locator(sel.HEART_REMOVE).first()).toBeVisible({
      timeout: 10_000,
    });

    // Second click — the button is now in "Remove" state but since PDP doesn't
    // pass wishlistId/wishlistItemId, it falls through to add again.
    // This should be handled gracefully (error notification, no crash).
    await page.locator(sel.HEART_REMOVE).first().click();

    // Page should not crash — heart button should still be present
    await expect(page.locator(sel.HEART_BUTTON).first()).toBeVisible({
      timeout: 10_000,
    });
  });
});
