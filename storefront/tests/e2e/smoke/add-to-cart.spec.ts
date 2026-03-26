import { test, expect } from "@playwright/test";
import {
  addCurrentProductToCart,
  openFirstProductFromSearch,
} from "../helpers/product-flow";

test.describe("Cart smoke", () => {
  test("browse product and add it to cart", async ({ page }) => {
    await openFirstProductFromSearch(page);
    await addCurrentProductToCart(page);

    const checkoutButton = page.locator('button:has-text("Checkout")');
    await expect(checkoutButton).toBeVisible({ timeout: 10_000 });
  });
});
