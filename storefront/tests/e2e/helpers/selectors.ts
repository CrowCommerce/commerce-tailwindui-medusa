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

// Auth forms
export const LOGIN_EMAIL = 'input[name="email"]';
export const LOGIN_PASSWORD = 'input[name="password"]';
export const LOGIN_SUBMIT = 'button[type="submit"]';
export const REGISTER_FIRST_NAME = 'input[name="first_name"]';
export const REGISTER_LAST_NAME = 'input[name="last_name"]';
export const REGISTER_EMAIL = 'input[name="email"]';
export const REGISTER_PASSWORD = 'input[name="password"]';
