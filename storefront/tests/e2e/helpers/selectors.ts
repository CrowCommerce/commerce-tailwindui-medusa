/**
 * Shared selectors for wishlist UI elements.
 * Derived from actual component markup in:
 * - components/wishlist/wishlist-button.tsx
 * - components/wishlist/wishlist-page-client.tsx
 * - app/wishlist/shared/[token]/page.tsx
 */

// Heart button (PDP and product cards)
export const HEART_BUTTON =
  'button[aria-label="Add to wishlist"], button[aria-label="Remove from wishlist"]';
export const HEART_ADD = 'button[aria-label="Add to wishlist"]';
export const HEART_REMOVE = 'button[aria-label="Remove from wishlist"]';

// Wishlist page
export const WISHLIST_TABS = 'nav[aria-label="Wishlists"]';
export const WISHLIST_TAB = 'nav[aria-label="Wishlists"] button';
export const SHARE_BUTTON = 'button:has-text("Share")';
export const NEW_WISHLIST_BUTTON = 'button:has-text("New Wishlist")';
export const REMOVE_ITEM_BUTTON =
  'button[aria-label="Remove from wishlist"]';
export const ADD_TO_CART_BUTTON = 'button:has-text("Add to Cart")';
export const EMPTY_STATE_HEADING = 'h3:has-text("No saved items yet")';
export const BROWSE_PRODUCTS_LINK = 'a:has-text("Browse Products")';

// New wishlist dialog
export const WISHLIST_NAME_INPUT = "#wishlist-name";
export const CREATE_BUTTON =
  'button[type="submit"]:has-text("Create")';
export const CANCEL_BUTTON = 'button:has-text("Cancel")';

// Shared wishlist page
export const SHARED_WISHLIST_TITLE = "h1";
export const IMPORT_BUTTON =
  'button:has-text("Import to My Wishlist")';
export const SIGN_IN_LINK = 'main a:has-text("Sign In")';
export const WISHLIST_NOT_AVAILABLE =
  'h1:has-text("Wishlist Not Available")';

// Wishlist actions menu (rename/delete)
export const ACTIONS_MENU_BUTTON =
  'button:has(span:has-text("Wishlist options"))';
export const RENAME_MENU_ITEM = '[role="menuitem"]:has-text("Rename")';
export const DELETE_MENU_ITEM = '[role="menuitem"]:has-text("Delete")';
export const RENAME_DIALOG_TITLE = 'h3:has-text("Rename Wishlist")';
export const RENAME_INPUT = "#rename-wishlist";
export const RENAME_SUBMIT = 'button[type="submit"]:has-text("Rename")';
export const DELETE_DIALOG_TITLE = 'h3:has-text("Delete Wishlist")';
export const DELETE_CONFIRM = 'button:has-text("Delete"):not([class*="text-red-600"])';

// Nav wishlist badge
export const NAV_WISHLIST_LINK = 'header a[href="/account/wishlist"]';

// Social proof
export const SOCIAL_PROOF_TEXT = 'p:has-text("saved this")';

// Auth forms
export const LOGIN_EMAIL = 'input[name="email"]';
export const LOGIN_PASSWORD = 'input[name="password"]';
export const LOGIN_SUBMIT = 'button[type="submit"]';
export const REGISTER_FIRST_NAME = 'input[name="first_name"]';
export const REGISTER_LAST_NAME = 'input[name="last_name"]';
export const REGISTER_EMAIL = 'input[name="email"]';
export const REGISTER_PASSWORD = 'input[name="password"]';

// Reviews — summary & CTA
export const REVIEW_SECTION_HEADING = 'h2:has-text("Customer Reviews")';
export const WRITE_REVIEW_BUTTON = 'button:has-text("Write a review")';
export const REVIEW_COUNT_TEXT = 'p:has-text("Based on")';

// Reviews — form dialog
export const REVIEW_DIALOG_TITLE = 'h2:has-text("Write a review")';
export const REVIEW_TITLE_INPUT = "#review-title";
export const REVIEW_CONTENT_INPUT = "#review-content";
export const REVIEW_SUBMIT_BUTTON = 'button[type="submit"]';
export const REVIEW_SUCCESS_TITLE = 'h2:has-text("Thank you!")';
export const REVIEW_SUCCESS_DONE = 'button:has-text("Done")';
export const REVIEW_ERROR_MESSAGE = "p.text-red-600";

// Reviews — star rating (form dialog)
export const REVIEW_STAR_BUTTON = (n: number) =>
  `button:has(span:has-text("${n} star"))`;

// Reviews — image upload (form dialog)
export const REVIEW_PHOTO_LABEL = 'label:has-text("Photos")';
export const REVIEW_FILE_INPUT = 'input[type="file"][accept*="image"]';
export const REVIEW_IMAGE_THUMBNAIL = "form img.size-16";
export const REVIEW_IMAGE_REMOVE = "form img.size-16 + button, form div.relative button";
export const REVIEW_ADD_PHOTO_LABEL =
  "label.flex.size-16.cursor-pointer";

// Reviews — list
export const REVIEW_LIST_ITEM = "div.py-12";
export const REVIEW_REVIEWER_NAME = "h4.text-sm.font-bold";

// Reviews — admin response (in list)
export const REVIEW_STORE_RESPONSE = 'div.bg-gray-50:has(p:has-text("Store response"))';
export const REVIEW_STORE_RESPONSE_LABEL =
  'p:has-text("Store response")';

// Reviews — image thumbnails (in list)
export const REVIEW_LIST_THUMBNAIL = "div.mt-3 button img";

// Reviews — lightbox
// Target the DialogPanel (has dimensions) not the Dialog wrapper (zero dimensions)
export const REVIEW_LIGHTBOX_DIALOG =
  '[role="dialog"][data-headlessui-state="open"]';
export const REVIEW_LIGHTBOX_PANEL =
  '[role="dialog"] div.max-w-3xl, [role="dialog"] [class*="max-w-3xl"]';
export const REVIEW_LIGHTBOX_IMAGE = '[role="dialog"] img';
export const REVIEW_LIGHTBOX_CLOSE = '[role="dialog"] button:has(svg.size-8)';
export const REVIEW_LIGHTBOX_PREV =
  '[role="dialog"] button:has(svg.size-6):first-of-type';
export const REVIEW_LIGHTBOX_NEXT =
  '[role="dialog"] button:has(svg.size-6):last-of-type';
