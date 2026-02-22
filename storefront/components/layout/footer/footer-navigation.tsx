import { getCollections, getMenu } from "lib/medusa";
import {
  transformCollectionsToFooterProducts,
  transformMenuToFooterNav,
} from "lib/utils";
import Link from "next/link";

export default async function FooterNavigation() {
  // Fetch data from Medusa
  const collections = await getCollections();
  const companyMenu = await getMenu("footer-company");
  const customerServiceMenu = await getMenu("footer-customer-service");

  // Transform data to footer format
  const footerNavigation = {
    products: transformCollectionsToFooterProducts(collections.slice(1, 6)), // Skip "All" collection, limit to 5
    company: transformMenuToFooterNav(companyMenu),
    customerService: transformMenuToFooterNav(customerServiceMenu),
  };

  return (
    <div className="col-span-6 mt-10 grid grid-cols-2 gap-8 sm:grid-cols-3 md:col-span-8 md:col-start-3 md:row-start-1 md:mt-0 lg:col-span-6 lg:col-start-2">
      <div className="grid grid-cols-1 gap-y-12 sm:col-span-2 sm:grid-cols-2 sm:gap-x-8">
        <div>
          <h3 className="text-sm font-medium text-gray-900">Products</h3>
          <ul role="list" className="mt-6 space-y-6">
            {footerNavigation.products.map((item) => (
              <li key={item.name} className="text-sm">
                <Link
                  href={item.href}
                  className="text-gray-500 hover:text-gray-600"
                >
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-900">Company</h3>
          <ul role="list" className="mt-6 space-y-6">
            {footerNavigation.company.map((item) => (
              <li key={item.name} className="text-sm">
                <Link
                  href={item.href}
                  className="text-gray-500 hover:text-gray-600"
                >
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div>
        <h3 className="text-sm font-medium text-gray-900">Customer Service</h3>
        <ul role="list" className="mt-6 space-y-6">
          {footerNavigation.customerService.map((item) => (
            <li key={item.name} className="text-sm">
              <Link
                href={item.href}
                className="text-gray-500 hover:text-gray-600"
              >
                {item.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
