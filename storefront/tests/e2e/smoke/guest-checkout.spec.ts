import {
  test,
  expect,
  TEST_ADDRESS,
  fillStripeCard,
  selectShippingOption,
} from "../fixtures/checkout.fixture";
import * as sel from "../helpers/selectors";

test.describe("Guest checkout smoke", () => {
  test("complete one guest checkout happy path", async ({
    guestCheckoutPage: page,
  }) => {
    const testEmail = `guest-smoke-${Date.now()}@test.local`;

    await expect(page.locator(sel.CHECKOUT_EMAIL_INPUT)).toBeVisible({
      timeout: 15_000,
    });
    await page.locator(sel.CHECKOUT_EMAIL_INPUT).fill(testEmail);
    await page.locator(sel.CHECKOUT_CONTINUE_BUTTON).click();

    await expect(page.locator(`p:has-text("${testEmail}")`)).toBeVisible({
      timeout: 10_000,
    });

    await page.locator(sel.ADDR_FIRST_NAME).fill(TEST_ADDRESS.first_name);
    await page.locator(sel.ADDR_LAST_NAME).fill(TEST_ADDRESS.last_name);
    await page.locator(sel.ADDR_ADDRESS1).fill(TEST_ADDRESS.address_1);
    await page.locator(sel.ADDR_CITY).fill(TEST_ADDRESS.city);
    await page.locator(sel.ADDR_PROVINCE).fill(TEST_ADDRESS.province);
    await page.locator(sel.ADDR_POSTAL_CODE).fill(TEST_ADDRESS.postal_code);
    await page
      .locator(sel.ADDR_COUNTRY)
      .selectOption(TEST_ADDRESS.country_code);
    await page.locator(sel.CHECKOUT_CONTINUE_BUTTON).click();

    await selectShippingOption(page);
    await expect(page.getByRole("heading", { name: "Payment" })).toBeVisible({
      timeout: 15_000,
    });

    await fillStripeCard(page);

    const paymentContinue = page.locator(sel.PAYMENT_CONTINUE_BUTTON);
    await expect(paymentContinue).toBeEnabled({ timeout: 15_000 });
    await paymentContinue.click();

    await expect(page.locator(sel.CHECKOUT_REVIEW_CONTACT_DT)).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.locator(`dd:has-text("${testEmail}")`)).toBeVisible();

    const placeOrderButton = page.locator(sel.PLACE_ORDER_BUTTON);
    await expect(placeOrderButton).toBeVisible();
    await placeOrderButton.click();

    await page.waitForURL("**/order/confirmed/**", { timeout: 60_000 });
    await expect(page.locator(sel.ORDER_CONFIRMED_HEADING)).toBeVisible({
      timeout: 15_000,
    });
  });
});
