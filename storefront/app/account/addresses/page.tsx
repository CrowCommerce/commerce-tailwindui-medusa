import { retrieveCustomer } from "lib/medusa/customer";
import { AddressesClient } from "components/account/addresses-client";

export const metadata = {
  title: "Addresses",
};

export default async function AddressesPage() {
  const customer = await retrieveCustomer();
  if (!customer) return null;

  return (
    <div>
      <h2 className="text-base/7 font-semibold text-gray-900">Addresses</h2>
      <p className="mt-1 max-w-2xl text-sm/6 text-gray-600">
        Manage your shipping and billing addresses.
      </p>
      <div className="mt-10">
        <AddressesClient addresses={customer.addresses || []} />
      </div>
    </div>
  );
}
