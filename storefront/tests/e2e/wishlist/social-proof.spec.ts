import { test, expect } from "../fixtures/wishlist.fixture";
import * as sel from "../helpers/selectors";

test.describe("Social Proof Count", () => {
  test("shows 'X people saved this' on PDP for wishlisted product", async ({
    authedPage: page,
    populatedWishlist,
  }) => {
    const handle = populatedWishlist.productHandles[0];
    if (!handle) throw new Error("No product handle from fixture");

    await page.goto(`/product/${handle}`);
    await page.waitForLoadState("networkidle");

    // Social proof text should appear (fetched client-side after mount)
    const socialProof = page.locator(sel.SOCIAL_PROOF_TEXT);
    await expect(socialProof).toBeVisible({ timeout: 15_000 });

    // Should contain "saved this"
    const text = await socialProof.textContent();
    expect(text).toMatch(/\d+ (person|people) saved this/);
  });

  test("social proof component does not crash on PDP", async ({
    authedPage: page,
    testProductHandle,
  }) => {
    // Visit a product page as an authenticated user (no items wishlisted
    // by this test user). Verify the social proof component either renders
    // valid text or is absent — it should never crash the page.
    await page.goto(`/product/${testProductHandle}`);
    await page.waitForLoadState("networkidle");

    // Wait for the page to fully render (product title is inside a client component)
    const title = page.locator("h1");
    await expect(title).toBeVisible({ timeout: 15_000 });

    // Social proof should either be absent or show a valid count
    // (other workers may have wishlisted this product)
    const socialProof = page.locator(sel.SOCIAL_PROOF_TEXT);
    const isVisible = await socialProof.isVisible();
    if (isVisible) {
      const text = await socialProof.textContent();
      expect(text).toMatch(/\d+ (person|people) saved this/);
    }
  });
});
