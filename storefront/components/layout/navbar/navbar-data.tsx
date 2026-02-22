import { getNavigation } from "lib/medusa";
import { retrieveCustomer } from "lib/medusa/customer";
import { NavbarClient } from "./navbar-client";

export default async function NavbarData() {
  const [navigation, customer] = await Promise.all([
    getNavigation(),
    retrieveCustomer(),
  ]);

  const customerData = customer
    ? {
        firstName: customer.first_name,
        lastName: customer.last_name,
      }
    : null;

  return <NavbarClient navigation={navigation} customer={customerData} />;
}
