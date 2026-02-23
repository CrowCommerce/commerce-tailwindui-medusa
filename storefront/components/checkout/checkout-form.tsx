"use client";

import type { HttpTypes } from "@medusajs/types";

export function CheckoutForm({
  cart,
  customer,
}: {
  cart: HttpTypes.StoreCart;
  customer: HttpTypes.StoreCustomer | null;
}) {
  return (
    <div>
      <p className="text-sm text-gray-500">
        Checkout form — steps loading...
      </p>
    </div>
  );
}
