"use client";

import type { HttpTypes } from "@medusajs/types";
import type { Stripe, StripeElements } from "@stripe/stripe-js";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { completeCart } from "lib/medusa/checkout";
import type { CheckoutStep } from "lib/types";

type CheckoutReviewProps = {
  cart: HttpTypes.StoreCart;
  stripe: Stripe | null;
  elements: StripeElements | null;
  onEditStep: (step: CheckoutStep) => void;
};

function formatAddress(
  addr: HttpTypes.StoreCartAddress | null | undefined,
): string {
  if (!addr) return "";
  const parts = [
    [addr.first_name, addr.last_name].filter(Boolean).join(" "),
    addr.address_1,
    addr.address_2,
    [addr.city, [addr.province, addr.postal_code].filter(Boolean).join(" ")]
      .filter(Boolean)
      .join(", "),
    addr.country_code?.toUpperCase(),
  ].filter(Boolean);
  return parts.join(", ");
}

function isSameAddress(
  a: HttpTypes.StoreCartAddress | null | undefined,
  b: HttpTypes.StoreCartAddress | null | undefined,
): boolean {
  if (!a || !b) return false;
  return (
    a.first_name === b.first_name &&
    a.last_name === b.last_name &&
    a.address_1 === b.address_1 &&
    a.address_2 === b.address_2 &&
    a.city === b.city &&
    a.province === b.province &&
    a.postal_code === b.postal_code &&
    a.country_code === b.country_code
  );
}

function formatShippingMethod(cart: HttpTypes.StoreCart): string {
  const method = cart.shipping_methods?.[0];
  if (!method) return "Not selected";

  const name = method.name || "Shipping";
  const amount = method.total ?? method.amount ?? 0;

  if (amount === 0) return `${name} (Free)`;

  const currencyCode = cart.currency_code || "usd";
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
  }).format(amount);

  return `${name} (${formatted})`;
}

function formatPaymentMethod(cart: HttpTypes.StoreCart): string {
  const session = cart.payment_collection?.payment_sessions?.[0];
  if (!session) return "Not selected";

  const paymentMethodId = session.data?.payment_method as string | undefined;

  // Saved payment method
  if (paymentMethodId && paymentMethodId.startsWith("pm_")) {
    return "Saved card";
  }

  // System default (zero-total)
  if (session.provider_id === "pp_system_default") {
    return "No payment required";
  }

  return "Credit card";
}

export function CheckoutReview({
  cart,
  stripe,
  elements,
  onEditStep,
}: CheckoutReviewProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const billingIsSameAsShipping = isSameAddress(
    cart.shipping_address,
    cart.billing_address,
  );

  const clientSecret = cart.payment_collection?.payment_sessions?.[0]?.data
    ?.client_secret as string | undefined;

  const savedPaymentMethodId = cart.payment_collection?.payment_sessions?.[0]
    ?.data?.payment_method as string | undefined;

  const isSavedMethod =
    savedPaymentMethodId && savedPaymentMethodId.startsWith("pm_");

  const isZeroTotal = cart.total === 0;

  async function handleOrderComplete() {
    const result = await completeCart(cart.id);
    if (result.type === "order") {
      router.push(`/order/confirmed/${result.order.id}`);
    } else {
      setError(result.error);
    }
  }

  async function handlePlaceOrder() {
    setError(null);
    setIsSubmitting(true);

    try {
      // Zero-total cart: skip Stripe entirely
      if (isZeroTotal) {
        await handleOrderComplete();
        return;
      }

      // Saved payment method: use confirmCardPayment
      if (isSavedMethod && stripe && clientSecret) {
        const { error: confirmError, paymentIntent } =
          await stripe.confirmCardPayment(clientSecret, {
            payment_method: savedPaymentMethodId,
          });

        if (confirmError) {
          const pi = confirmError.payment_intent;
          if (
            pi &&
            (pi.status === "requires_capture" || pi.status === "succeeded")
          ) {
            await handleOrderComplete();
            return;
          }
          setError(
            confirmError.message || "Payment failed. Please try again.",
          );
          return;
        }

        if (
          paymentIntent &&
          (paymentIntent.status === "requires_capture" ||
            paymentIntent.status === "succeeded")
        ) {
          await handleOrderComplete();
        }
        return;
      }

      // Card / new payment method: use confirmPayment with elements
      if (stripe && elements && clientSecret) {
        const { error: confirmError, paymentIntent } =
          await stripe.confirmPayment({
            elements,
            clientSecret,
            confirmParams: {
              return_url: `${window.location.origin}/checkout/capture/${cart.id}`,
              payment_method_data: {
                billing_details: {
                  name: `${cart.billing_address?.first_name} ${cart.billing_address?.last_name}`,
                  address: {
                    city: cart.billing_address?.city ?? "",
                    country: cart.billing_address?.country_code ?? "",
                    line1: cart.billing_address?.address_1 ?? "",
                    line2: cart.billing_address?.address_2 ?? "",
                    postal_code: cart.billing_address?.postal_code ?? "",
                    state: cart.billing_address?.province ?? "",
                  },
                  email: cart.email ?? "",
                  phone: cart.billing_address?.phone ?? undefined,
                },
              },
            },
            redirect: "if_required",
          });

        if (confirmError) {
          const pi = confirmError.payment_intent;
          if (
            pi &&
            (pi.status === "requires_capture" || pi.status === "succeeded")
          ) {
            await handleOrderComplete();
            return;
          }
          setError(
            confirmError.message || "Payment failed. Please try again.",
          );
          return;
        }

        if (
          paymentIntent &&
          (paymentIntent.status === "requires_capture" ||
            paymentIntent.status === "succeeded")
        ) {
          await handleOrderComplete();
        }
        return;
      }

      // Fallback: no Stripe available, attempt direct completion
      await handleOrderComplete();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "An unexpected error occurred.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="py-4">
      <dl className="divide-y divide-gray-200 text-sm">
        {/* Contact */}
        <div className="grid grid-cols-[8rem_1fr_auto] items-baseline gap-x-4 py-3">
          <dt className="font-medium text-gray-900">Contact</dt>
          <dd className="truncate text-gray-700">{cart.email}</dd>
          <button
            type="button"
            onClick={() => onEditStep("email")}
            className="text-indigo-600 hover:text-indigo-500"
          >
            Edit
          </button>
        </div>

        {/* Shipping address */}
        <div className="grid grid-cols-[8rem_1fr_auto] items-baseline gap-x-4 py-3">
          <dt className="font-medium text-gray-900">Ship to</dt>
          <dd className="text-gray-700">
            {formatAddress(cart.shipping_address)}
          </dd>
          <button
            type="button"
            onClick={() => onEditStep("address")}
            className="text-indigo-600 hover:text-indigo-500"
          >
            Edit
          </button>
        </div>

        {/* Billing address */}
        <div className="grid grid-cols-[8rem_1fr_auto] items-baseline gap-x-4 py-3">
          <dt className="font-medium text-gray-900">Bill to</dt>
          <dd className="text-gray-700">
            {billingIsSameAsShipping
              ? "Same as shipping"
              : formatAddress(cart.billing_address)}
          </dd>
          <button
            type="button"
            onClick={() => onEditStep("address")}
            className="text-indigo-600 hover:text-indigo-500"
          >
            Edit
          </button>
        </div>

        {/* Shipping method */}
        <div className="grid grid-cols-[8rem_1fr_auto] items-baseline gap-x-4 py-3">
          <dt className="font-medium text-gray-900">Shipping method</dt>
          <dd className="text-gray-700">{formatShippingMethod(cart)}</dd>
          <button
            type="button"
            onClick={() => onEditStep("shipping")}
            className="text-indigo-600 hover:text-indigo-500"
          >
            Edit
          </button>
        </div>

        {/* Payment method */}
        <div className="grid grid-cols-[8rem_1fr_auto] items-baseline gap-x-4 py-3">
          <dt className="font-medium text-gray-900">Payment</dt>
          <dd className="text-gray-700">{formatPaymentMethod(cart)}</dd>
          <button
            type="button"
            onClick={() => onEditStep("payment")}
            className="text-indigo-600 hover:text-indigo-500"
          >
            Edit
          </button>
        </div>
      </dl>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-6">
        <button
          type="button"
          onClick={handlePlaceOrder}
          disabled={isSubmitting}
          className="w-full rounded-md border border-transparent bg-indigo-600 px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500"
        >
          {isSubmitting ? "Placing order..." : "Place Order"}
        </button>
      </div>
    </div>
  );
}
