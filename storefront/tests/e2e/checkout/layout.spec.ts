import { test, expect } from "../fixtures/checkout.fixture";
import * as sel from "../helpers/selectors";

test.describe("Checkout Layout", () => {
  test("order summary renders in the first (left) column", async ({
    guestCheckoutPage: page,
  }) => {
    // The checkout page uses a 2-column grid: OrderSummary (left), CheckoutForm (right)
    const grid = page.locator(".grid.grid-cols-1.lg\\:grid-cols-2");
    await expect(grid).toBeVisible({ timeout: 15_000 });

    const columns = grid.locator("> div");
    await expect(columns).toHaveCount(2);

    // First column contains the order summary (sr-only h2)
    const firstColumn = columns.nth(0);
    await expect(
      firstColumn.locator('h2:has-text("Order summary")'),
    ).toBeAttached();

    // Order summary items should be visible
    await expect(
      firstColumn.locator(sel.ORDER_SUMMARY_ITEM).first(),
    ).toBeVisible();
  });

  test("checkout form renders in the second (right) column", async ({
    guestCheckoutPage: page,
  }) => {
    const grid = page.locator(".grid.grid-cols-1.lg\\:grid-cols-2");
    await expect(grid).toBeVisible({ timeout: 15_000 });

    const columns = grid.locator("> div");
    const secondColumn = columns.nth(1);

    // Second column contains the checkout form (first step heading)
    await expect(
      secondColumn.locator('h2:has-text("Contact information")'),
    ).toBeVisible();
  });
});
