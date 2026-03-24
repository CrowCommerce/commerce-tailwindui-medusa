import { getOrder } from "lib/medusa";
import { notFound } from "next/navigation";
import { OrderDetail } from "components/account/order-detail";
import { trackServer } from "lib/analytics-server";
import Link from "next/link";

export const metadata = {
  title: "Order Details",
};

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const order = await getOrder(orderId);

  if (!order) {
    notFound();
  }

  trackServer("order_detail_viewed", {
    order_id: order.id,
    display_id: order.display_id ?? 0,
    item_count: order.items?.length ?? 0,
  });

  return (
    <div>
      <div className="mb-8">
        <Link
          href="/account/orders"
          className="text-sm font-medium text-primary-600 hover:text-primary-500"
        >
          <span aria-hidden="true">&larr;</span> Back to orders
        </Link>
      </div>
      <OrderDetail order={order} />
    </div>
  );
}
