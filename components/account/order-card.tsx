import type { HttpTypes } from "@medusajs/types";
import Link from "next/link";

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatMoney(amount: number, currencyCode: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
  }).format(amount);
}

export function OrderCard({ order }: { order: HttpTypes.StoreOrder }) {
  const currencyCode = order.currency_code || "usd";

  return (
    <div className="border-b border-t border-gray-200 bg-white shadow-sm sm:rounded-lg sm:border">
      <div className="flex items-center border-b border-gray-200 p-4 sm:grid sm:grid-cols-4 sm:gap-x-6 sm:p-6">
        <dl className="grid flex-1 grid-cols-2 gap-x-6 text-sm sm:col-span-3 sm:grid-cols-3 lg:col-span-2">
          <div>
            <dt className="font-medium text-gray-900">Order number</dt>
            <dd className="mt-1 text-gray-500">#{order.display_id}</dd>
          </div>
          <div className="hidden sm:block">
            <dt className="font-medium text-gray-900">Date placed</dt>
            <dd className="mt-1 text-gray-500">
              <time dateTime={order.created_at as string}>
                {formatDate(order.created_at as string)}
              </time>
            </dd>
          </div>
          <div>
            <dt className="font-medium text-gray-900">Total amount</dt>
            <dd className="mt-1 font-medium text-gray-900">
              {formatMoney(order.total as number, currencyCode)}
            </dd>
          </div>
        </dl>
      </div>

      <h4 className="sr-only">Items</h4>
      <ul role="list" className="divide-y divide-gray-200">
        {order.items?.map((item) => (
          <li key={item.id} className="p-4 sm:p-6">
            <div className="flex items-center sm:items-start">
              <div className="size-20 shrink-0 overflow-hidden rounded-lg bg-gray-200 sm:size-40">
                {item.thumbnail ? (
                  <img
                    src={item.thumbnail}
                    alt={item.title}
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center text-gray-400">
                    No image
                  </div>
                )}
              </div>
              <div className="ml-6 flex-1 text-sm">
                <div className="font-medium text-gray-900 sm:flex sm:justify-between">
                  <h5>{item.title}</h5>
                  <p className="mt-2 sm:mt-0">
                    {formatMoney(item.unit_price as number, currencyCode)}
                  </p>
                </div>
                <p className="hidden text-gray-500 sm:mt-2 sm:block">
                  Qty: {item.quantity}
                </p>
              </div>
            </div>

            {item.product_handle && (
              <div className="mt-6 flex items-center border-t border-gray-200 pt-4 text-sm font-medium">
                <Link
                  href={`/product/${item.product_handle}`}
                  className="text-primary-600 hover:text-primary-500"
                >
                  View product
                </Link>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
