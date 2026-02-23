import { test, expect } from "../fixtures/wishlist.fixture";
import * as sel from "../helpers/selectors";

test.describe("Shared Wishlist", () => {
  test("shared link opens read-only view with items", async ({
    guestPage: page,
    api,
    populatedWishlist,
  }) => {
    const token = await api.shareWishlist(populatedWishlist.wishlistId);

    await page.goto(`/wishlist/shared/${token}`);
    await page.waitForLoadState("networkidle");

    await expect(page.locator(sel.SHARED_WISHLIST_TITLE)).toBeVisible();

    const itemCount = page.getByText(/\d+ items?/);
    await expect(itemCount).toBeVisible();

    await expect(page.locator(sel.REMOVE_ITEM_BUTTON)).toHaveCount(0);
  });

  test("unauthenticated viewer sees sign-in prompt, no import button", async ({
    guestPage: page,
    api,
    populatedWishlist,
  }) => {
    const token = await api.shareWishlist(populatedWishlist.wishlistId);

    await page.goto(`/wishlist/shared/${token}`);
    await page.waitForLoadState("networkidle");

    await expect(page.locator(sel.SIGN_IN_LINK)).toBeVisible();
    await expect(page.locator(sel.IMPORT_BUTTON)).toHaveCount(0);
  });

  test("authenticated viewer sees import button, no sign-in prompt", async ({
    authedPage: page,
    api,
    populatedWishlist,
  }) => {
    const token = await api.shareWishlist(populatedWishlist.wishlistId);

    await page.goto(`/wishlist/shared/${token}`);
    await page.waitForLoadState("networkidle");

    await expect(page.locator(sel.IMPORT_BUTTON)).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.locator(sel.SIGN_IN_LINK)).toHaveCount(0);
  });

  test("invalid/expired token shows error page", async ({
    guestPage: page,
  }) => {
    await page.goto("/wishlist/shared/invalid-token-abc123");
    await page.waitForLoadState("networkidle");

    await expect(page.locator(sel.WISHLIST_NOT_AVAILABLE)).toBeVisible();
  });
});
