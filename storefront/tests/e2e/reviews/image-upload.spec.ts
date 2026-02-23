import { test, expect } from "../fixtures/review.fixture";
import * as sel from "../helpers/selectors";
import path from "path";
import fs from "fs";

// Create a tiny valid JPEG for testing (1x1 pixel)
function createTestImage(name: string): string {
  const dir = path.join(process.cwd(), "tests", "e2e", ".tmp");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // Minimal valid JPEG: 1x1 pixel red image
  const jpegBytes = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
    0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
    0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
    0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20,
    0x24, 0x2e, 0x27, 0x20, 0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29,
    0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27, 0x39, 0x3d, 0x38, 0x32,
    0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
    0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x1f, 0x00, 0x00,
    0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
    0x09, 0x0a, 0x0b, 0xff, 0xc4, 0x00, 0xb5, 0x10, 0x00, 0x02, 0x01, 0x03,
    0x03, 0x02, 0x04, 0x03, 0x05, 0x05, 0x04, 0x04, 0x00, 0x00, 0x01, 0x7d,
    0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06,
    0x13, 0x51, 0x61, 0x07, 0x22, 0x71, 0x14, 0x32, 0x81, 0x91, 0xa1, 0x08,
    0x23, 0x42, 0xb1, 0xc1, 0x15, 0x52, 0xd1, 0xf0, 0x24, 0x33, 0x62, 0x72,
    0x82, 0x09, 0x0a, 0x16, 0x17, 0x18, 0x19, 0x1a, 0x25, 0x26, 0x27, 0x28,
    0x29, 0x2a, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3a, 0x43, 0x44, 0x45,
    0x46, 0x47, 0x48, 0x49, 0x4a, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59,
    0x5a, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6a, 0x73, 0x74, 0x75,
    0x76, 0x77, 0x78, 0x79, 0x7a, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89,
    0x8a, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9a, 0xa2, 0xa3,
    0xa4, 0xa5, 0xa6, 0xa7, 0xa8, 0xa9, 0xaa, 0xb2, 0xb3, 0xb4, 0xb5, 0xb6,
    0xb7, 0xb8, 0xb9, 0xba, 0xc2, 0xc3, 0xc4, 0xc5, 0xc6, 0xc7, 0xc8, 0xc9,
    0xca, 0xd2, 0xd3, 0xd4, 0xd5, 0xd6, 0xd7, 0xd8, 0xd9, 0xda, 0xe1, 0xe2,
    0xe3, 0xe4, 0xe5, 0xe6, 0xe7, 0xe8, 0xe9, 0xea, 0xf1, 0xf2, 0xf3, 0xf4,
    0xf5, 0xf6, 0xf7, 0xf8, 0xf9, 0xfa, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01,
    0x00, 0x00, 0x3f, 0x00, 0x7b, 0x94, 0x11, 0x00, 0x00, 0x00, 0x00, 0xff,
    0xd9,
  ]);

  const filePath = path.join(dir, name);
  fs.writeFileSync(filePath, jpegBytes);
  return filePath;
}

test.describe("Review Image Upload", () => {
  test.afterAll(() => {
    // Cleanup temp images
    const dir = path.join(process.cwd(), "tests", "e2e", ".tmp");
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test("shows photo upload area in review form", async ({
    authedPage: page,
    testProductHandle,
  }) => {
    await page.goto(`/product/${testProductHandle}`);
    await page.waitForLoadState("networkidle");

    await page.locator(sel.WRITE_REVIEW_BUTTON).click();
    await expect(
      page.locator(sel.REVIEW_DIALOG_TITLE),
    ).toBeVisible({ timeout: 5_000 });

    // Photo label should be visible
    await expect(page.locator(sel.REVIEW_PHOTO_LABEL)).toBeVisible();

    // Add photo button (dashed border label) should be visible
    await expect(page.locator(sel.REVIEW_ADD_PHOTO_LABEL)).toBeVisible();
  });

  test("can select an image and see thumbnail preview", async ({
    authedPage: page,
    testProductHandle,
  }) => {
    await page.goto(`/product/${testProductHandle}`);
    await page.waitForLoadState("networkidle");

    await page.locator(sel.WRITE_REVIEW_BUTTON).click();
    await expect(
      page.locator(sel.REVIEW_DIALOG_TITLE),
    ).toBeVisible({ timeout: 5_000 });

    // Select a file
    const testImage = createTestImage("test1.jpg");
    const fileInput = page.locator(sel.REVIEW_FILE_INPUT);
    await fileInput.setInputFiles(testImage);

    // Should show a thumbnail
    await expect(page.locator(sel.REVIEW_IMAGE_THUMBNAIL).first()).toBeVisible({
      timeout: 5_000,
    });
  });

  test("can select up to 3 images", async ({
    authedPage: page,
    testProductHandle,
  }) => {
    await page.goto(`/product/${testProductHandle}`);
    await page.waitForLoadState("networkidle");

    await page.locator(sel.WRITE_REVIEW_BUTTON).click();
    await expect(
      page.locator(sel.REVIEW_DIALOG_TITLE),
    ).toBeVisible({ timeout: 5_000 });

    // Add 3 images one by one
    const img1 = createTestImage("test-a.jpg");
    const img2 = createTestImage("test-b.jpg");
    const img3 = createTestImage("test-c.jpg");

    const fileInput = page.locator(sel.REVIEW_FILE_INPUT);
    await fileInput.setInputFiles(img1);
    await expect(page.locator(sel.REVIEW_IMAGE_THUMBNAIL)).toHaveCount(1, {
      timeout: 5_000,
    });

    await fileInput.setInputFiles(img2);
    await expect(page.locator(sel.REVIEW_IMAGE_THUMBNAIL)).toHaveCount(2, {
      timeout: 5_000,
    });

    await fileInput.setInputFiles(img3);
    await expect(page.locator(sel.REVIEW_IMAGE_THUMBNAIL)).toHaveCount(3, {
      timeout: 5_000,
    });

    // The "add photo" label should no longer be visible (max reached)
    await expect(
      page.locator(sel.REVIEW_ADD_PHOTO_LABEL),
    ).not.toBeVisible();
  });

  test("can remove a selected image", async ({
    authedPage: page,
    testProductHandle,
  }) => {
    await page.goto(`/product/${testProductHandle}`);
    await page.waitForLoadState("networkidle");

    await page.locator(sel.WRITE_REVIEW_BUTTON).click();
    await expect(
      page.locator(sel.REVIEW_DIALOG_TITLE),
    ).toBeVisible({ timeout: 5_000 });

    // Add an image
    const testImage = createTestImage("test-remove.jpg");
    await page.locator(sel.REVIEW_FILE_INPUT).setInputFiles(testImage);

    await expect(page.locator(sel.REVIEW_IMAGE_THUMBNAIL).first()).toBeVisible({
      timeout: 5_000,
    });

    // Click the remove button (small X on the thumbnail)
    // The remove button is in a div.relative next to the img
    const removeBtn = page.locator("form div.relative button").first();
    await removeBtn.click();

    // Thumbnail should be gone
    await expect(page.locator(sel.REVIEW_IMAGE_THUMBNAIL)).toHaveCount(0, {
      timeout: 5_000,
    });

    // Add photo label should reappear
    await expect(page.locator(sel.REVIEW_ADD_PHOTO_LABEL)).toBeVisible();
  });

  test("file input only accepts JPEG, PNG, and WebP", async ({
    authedPage: page,
    testProductHandle,
  }) => {
    await page.goto(`/product/${testProductHandle}`);
    await page.waitForLoadState("networkidle");

    await page.locator(sel.WRITE_REVIEW_BUTTON).click();
    await expect(
      page.locator(sel.REVIEW_DIALOG_TITLE),
    ).toBeVisible({ timeout: 5_000 });

    // Check the accept attribute
    const fileInput = page.locator(sel.REVIEW_FILE_INPUT);
    const accept = await fileInput.getAttribute("accept");
    expect(accept).toContain("image/jpeg");
    expect(accept).toContain("image/png");
    expect(accept).toContain("image/webp");
  });
});
