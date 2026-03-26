import { test as authTest, expect } from "./auth.fixture";
import type { Frame, Page } from "@playwright/test";
import {
  addCurrentProductToCart,
  openFirstProductFromSearch,
} from "../helpers/product-flow";

type CheckoutFixtures = {
  /** A guest page with an item in cart, already on /checkout */
  guestCheckoutPage: Page;
  /** An authenticated page with an item in cart, already on /checkout */
  authedCheckoutPage: Page;
};

/**
 * Navigate to first available product, add to cart, and go to /checkout.
 * Works for both guest and authed pages.
 */
async function addToCartAndCheckout(page: Page): Promise<void> {
  await openFirstProductFromSearch(page);
  await addCurrentProductToCart(page);

  // Wait for cart drawer/panel to appear and click Checkout
  const checkoutButton = page.locator('button:has-text("Checkout")');
  await expect(checkoutButton).toBeVisible({ timeout: 10_000 });
  await checkoutButton.click();

  // Wait for checkout page
  await page.waitForURL("**/checkout", { timeout: 15_000 });
  await page.waitForLoadState("networkidle");
}

// Test data constants
export const TEST_ADDRESS = {
  first_name: "Test",
  last_name: "Buyer",
  address_1: "123 Test Street",
  city: "New York",
  province: "NY",
  postal_code: "10001",
  country_code: "us",
} as const;

export const STRIPE_TEST_CARD = {
  number: "4242424242424242",
  expiry: "1230",
  cvc: "123",
} as const;

/**
 * Fill Stripe PaymentElement card fields.
 *
 * PaymentElement renders with accordion layout inside an iframe titled
 * "Secure payment input frame". Two such iframes exist (one from
 * ExpressCheckout, one from PaymentElement). We find the one containing
 * the "Card" accordion, click it to expand, then fill the card fields
 * inside that same frame.
 */
async function fillStripeCard(page: Page): Promise<void> {
  const cardNumberSelectors =
    '[placeholder="1234 1234 1234 1234"], [name="cardnumber"], [name="number"], [autocomplete="cc-number"], [aria-label*="Card number" i], [data-elements-stable-field-name="cardNumber"]';
  const expirySelectors =
    '[placeholder="MM / YY"], [name="exp-date"], [name="expiry"], [autocomplete="cc-exp"], [aria-label*="expir" i], [data-elements-stable-field-name="cardExpiry"]';
  const cvcSelectors =
    '[placeholder="CVC"], [name="cvc"], [autocomplete="cc-csc"], [aria-label*="CVC" i], [data-elements-stable-field-name="cardCvc"]';
  const zipSelectors =
    '[placeholder="12345"], [placeholder="ZIP"], [name="postal"], [aria-label*="ZIP" i], [autocomplete="postal-code"]';

  // Multiple Stripe frames exist. Find the PaymentElement frame with the Card accordion.
  let paymentFrame: Frame | null = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    for (const frame of page.frames()) {
      const cardButton = frame.getByRole("button", { name: /^Card$/ });
      if (
        await cardButton
          .first()
          .isVisible({ timeout: 1_000 })
          .catch(() => false)
      ) {
        paymentFrame = frame;
        break;
      }
    }
    if (paymentFrame) break;
    await page.waitForTimeout(1_500);
  }

  if (!paymentFrame) {
    throw new Error(
      "Could not find Stripe PaymentElement frame with Card accordion",
    );
  }
  const activePaymentFrame = paymentFrame;

  // PaymentElement renders its form inside the same frame after the accordion expands.
  const cardButton = activePaymentFrame
    .getByRole("button", { name: /^Card$/ })
    .first();
  await cardButton.click();
  await expect(
    activePaymentFrame.locator(cardNumberSelectors).first(),
  ).toBeVisible({
    timeout: 15_000,
  });

  // Stripe requires keydown/keyup events, so we use pressSequentially
  // instead of fill() to properly trigger Stripe's internal validation.
  async function typeInFrame(
    selectors: string,
    value: string,
    required = true,
  ): Promise<boolean> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidateFrames: Frame[] = [activePaymentFrame, ...page.frames()];

      for (const frame of candidateFrames) {
        const input = frame.locator(selectors);
        if (
          await input
            .first()
            .isVisible({ timeout: 500 })
            .catch(() => false)
        ) {
          await input.first().click();
          await input.first().pressSequentially(value, { delay: 50 });
          return true;
        }
      }
      if (!required) return false;
      await page.waitForTimeout(1_500);
    }
    if (required) {
      throw new Error(
        `Could not find input matching "${selectors}" in any frame`,
      );
    }
    return false;
  }

  await typeInFrame(cardNumberSelectors, STRIPE_TEST_CARD.number);
  await typeInFrame(expirySelectors, STRIPE_TEST_CARD.expiry);
  await typeInFrame(cvcSelectors, STRIPE_TEST_CARD.cvc);
  await typeInFrame(zipSelectors, "10001", false);
}

/**
 * Select a shipping option, handling the case where the single option
 * is already pre-checked (clicking a checked radio doesn't fire onChange).
 */
async function selectShippingOption(page: Page): Promise<void> {
  const radio = page.locator('input[name="shipping-option"]').first();
  await expect(radio).toBeAttached({ timeout: 15_000 });

  // If the radio is already checked, uncheck it first so clicking fires onChange
  const isChecked = await radio.isChecked();
  if (isChecked) {
    await radio.evaluate((el) => {
      (el as HTMLInputElement).checked = false;
    });
  }

  // Now click to check it — this fires the React onChange handler
  await radio.click({ force: true });
}

export const test = authTest.extend<CheckoutFixtures>({
  guestCheckoutPage: async ({ guestPage }, use) => {
    await addToCartAndCheckout(guestPage);
    await use(guestPage);
  },

  authedCheckoutPage: async ({ authedPage }, use) => {
    await addToCartAndCheckout(authedPage);
    await use(authedPage);
  },
});

export { expect };

// Re-export helpers for tests
export { addToCartAndCheckout, fillStripeCard, selectShippingOption };
