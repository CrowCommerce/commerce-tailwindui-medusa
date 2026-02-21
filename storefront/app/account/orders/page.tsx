import { getOrders } from "lib/medusa";
import { OrderCard } from "components/account/order-card";

export const metadata = {
  title: "Order History",
};

export default async function OrdersPage() {
  const orders = await getOrders();

  return (
    <div>
      <h2 className="text-base/7 font-semibold text-gray-900">Order History</h2>
      <p className="mt-1 max-w-2xl text-sm/6 text-gray-600">
        Check the status of recent orders and manage returns.
      </p>

      <div className="mt-10">
        {orders.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-gray-500">
              You haven&apos;t placed any orders yet.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {orders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
