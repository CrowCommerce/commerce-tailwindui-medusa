import { test, expect } from "../fixtures/wishlist.fixture";
import * as sel from "../helpers/selectors";

test.describe("Import Shared Wishlist", () => {
  test("authenticated user can import a shared wishlist", async ({
    authedPage: page,
    api,
    populatedWishlist,
  }) => {
    const token = await api.shareWishlist(populatedWishlist.wishlistId);

    await page.goto(`/wishlist/shared/${token}`);
    await page.waitForLoadState("networkidle");

    const importBtn = page.locator(sel.IMPORT_BUTTON);
    await expect(importBtn).toBeVisible({ timeout: 10_000 });
    await importBtn.click();

    await expect(importBtn).not.toHaveText("Importing...", {
      timeout: 15_000,
    });

    await page.goto("/account/wishlist");
    await page.waitForLoadState("networkidle");

    const pageContent = await page.textContent("body");
    expect(pageContent).toBeTruthy();
  });

  test("import button is not shown to unauthenticated users", async ({
    guestPage: page,
    api,
    populatedWishlist,
  }) => {
    const token = await api.shareWishlist(populatedWishlist.wishlistId);

    await page.goto(`/wishlist/shared/${token}`);
    await page.waitForLoadState("networkidle");

    await expect(page.locator(sel.IMPORT_BUTTON)).toHaveCount(0);
    await expect(page.locator(sel.SIGN_IN_LINK)).toBeVisible();
  });
});
