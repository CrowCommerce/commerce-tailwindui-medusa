import { getNavigation } from "lib/medusa";
import NavbarClient from "./navbar-client";

export default async function NavbarData() {
  "use cache";
  const navigation = await getNavigation();
  return <NavbarClient navigation={navigation} />;
}
