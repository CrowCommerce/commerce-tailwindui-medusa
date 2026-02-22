import { getNavigation } from "lib/medusa";
import { retrieveCustomer } from "lib/medusa/customer";
import { getWishlistItemCount } from "lib/medusa/wishlist";
import { NavbarClient } from "./navbar-client";

export async function NavbarData() {
  const [navigation, customer, wishlistCount] = await Promise.all([
    getNavigation(),
    retrieveCustomer(),
    getWishlistItemCount(),
  ]);

  const customerData = customer
    ? {
        firstName: customer.first_name,
        lastName: customer.last_name,
      }
    : null;

  return (
    <NavbarClient
      navigation={navigation}
      customer={customerData}
      wishlistCount={wishlistCount}
    />
  );
}
