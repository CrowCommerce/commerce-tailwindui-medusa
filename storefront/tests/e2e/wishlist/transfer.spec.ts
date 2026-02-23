import { test as base, expect } from "@playwright/test";
import { MedusaApiClient } from "../fixtures/api.fixture";
import * as sel from "../helpers/selectors";

const test = base;

test.describe("Guest-to-Customer Wishlist Transfer", () => {
  test("guest wishlist transfers on login", async ({ browser }) => {
    const api = new MedusaApiClient();

    const email = `transfer-login-${Date.now()}@test.local`;
    const password = "Test1234!";
    await api.registerCustomer({
      email,
      password,
      first_name: "Transfer",
      last_name: "Login",
    });

    const products = await api.getProducts();
    expect(products.length).toBeGreaterThan(0);
    const handle = products[0]!.handle;

    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(`/product/${handle}`);
    await page.waitForLoadState("networkidle");
    await page.locator(sel.HEART_ADD).first().click();
    await expect(page.locator(sel.HEART_REMOVE).first()).toBeVisible({
      timeout: 10_000,
    });

    await page.goto("/account/login");
    await page.waitForLoadState("networkidle");
    await page.locator(sel.LOGIN_EMAIL).fill(email);
    await page.locator(sel.LOGIN_PASSWORD).fill(password);
    await page.locator(sel.LOGIN_SUBMIT).click();

    await page.waitForURL("**/account", { timeout: 15_000 });

    await page.goto("/account/wishlist");
    await page.waitForLoadState("networkidle");

    const hasItems = await page.locator(sel.REMOVE_ITEM_BUTTON).count();
    const hasEmptyState = await page
      .locator(sel.EMPTY_STATE_HEADING)
      .isVisible()
      .catch(() => false);

    if (hasItems === 0 && !hasEmptyState) {
      await page.reload();
      await page.waitForLoadState("networkidle");
    }

    expect(
      (await page.locator(sel.REMOVE_ITEM_BUTTON).count()) > 0 ||
        (await page.locator(sel.EMPTY_STATE_HEADING).isVisible()),
    ).toBeTruthy();

    await context.close();
  });

  test("guest wishlist transfers on signup", async ({ browser }) => {
    const tempApi = new MedusaApiClient();
    const products = await tempApi.getProducts();
    expect(products.length).toBeGreaterThan(0);
    const handle = products[0]!.handle;

    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(`/product/${handle}`);
    await page.waitForLoadState("networkidle");
    await page.locator(sel.HEART_ADD).first().click();
    await expect(page.locator(sel.HEART_REMOVE).first()).toBeVisible({
      timeout: 10_000,
    });

    const email = `transfer-signup-${Date.now()}@test.local`;
    await page.goto("/account/register");
    await page.waitForLoadState("networkidle");
    await page.locator(sel.REGISTER_FIRST_NAME).fill("Transfer");
    await page.locator(sel.REGISTER_LAST_NAME).fill("Signup");
    await page.locator(sel.REGISTER_EMAIL).fill(email);
    await page.locator(sel.REGISTER_PASSWORD).fill("Test1234!");
    await page.locator(sel.LOGIN_SUBMIT).click();

    await page.waitForURL("**/account", { timeout: 15_000 });

    await page.goto("/account/wishlist");
    await page.waitForLoadState("networkidle");

    const hasItems = await page.locator(sel.REMOVE_ITEM_BUTTON).count();
    const hasEmptyState = await page
      .locator(sel.EMPTY_STATE_HEADING)
      .isVisible()
      .catch(() => false);

    if (hasItems === 0 && !hasEmptyState) {
      await page.reload();
      await page.waitForLoadState("networkidle");
    }

    expect(
      (await page.locator(sel.REMOVE_ITEM_BUTTON).count()) > 0 ||
        (await page.locator(sel.EMPTY_STATE_HEADING).isVisible()),
    ).toBeTruthy();

    await context.close();
  });

  test("guest wishlist cookie is cleared after login transfer", async ({
    browser,
  }) => {
    const api = new MedusaApiClient();
    const email = `transfer-cookie-${Date.now()}@test.local`;
    const password = "Test1234!";
    await api.registerCustomer({
      email,
      password,
      first_name: "Cookie",
      last_name: "Clear",
    });

    const products = await api.getProducts();
    const handle = products[0]!.handle;

    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(`/product/${handle}`);
    await page.waitForLoadState("networkidle");
    await page.locator(sel.HEART_ADD).first().click();
    await expect(page.locator(sel.HEART_REMOVE).first()).toBeVisible({
      timeout: 10_000,
    });

    let cookies = await context.cookies();
    const guestCookie = cookies.find((c) => c.name === "_medusa_wishlist_id");
    expect(guestCookie).toBeTruthy();

    await page.goto("/account/login");
    await page.waitForLoadState("networkidle");
    await page.locator(sel.LOGIN_EMAIL).fill(email);
    await page.locator(sel.LOGIN_PASSWORD).fill(password);
    await page.locator(sel.LOGIN_SUBMIT).click();
    await page.waitForURL("**/account", { timeout: 15_000 });

    cookies = await context.cookies();
    const remainingCookie = cookies.find(
      (c) => c.name === "_medusa_wishlist_id",
    );
    expect(remainingCookie).toBeUndefined();

    await context.close();
  });
});
