"use client";

import type { HttpTypes } from "@medusajs/types";
import type { Stripe, StripeElements } from "@stripe/stripe-js";
import { useCallback, useMemo, useState } from "react";

import { CheckoutAddress } from "components/checkout/checkout-address";
import { CheckoutEmail } from "components/checkout/checkout-email";
import { CheckoutPayment } from "components/checkout/checkout-payment";
import { CheckoutReview } from "components/checkout/checkout-review";
import { CheckoutShipping } from "components/checkout/checkout-shipping";
import { ExpressCheckout } from "components/checkout/express-checkout";
import type { CheckoutStep } from "lib/types";

const STEP_ORDER: CheckoutStep[] = [
  "email",
  "address",
  "shipping",
  "payment",
  "review",
];

const STEP_LABELS: Record<CheckoutStep, string> = {
  email: "Contact information",
  address: "Shipping address",
  shipping: "Shipping method",
  payment: "Payment",
  review: "Review order",
};

function deriveCompletedSteps(cart: HttpTypes.StoreCart): Set<CheckoutStep> {
  const completed = new Set<CheckoutStep>();
  if (cart.email) completed.add("email");
  if (cart.shipping_address?.address_1) completed.add("address");
  if (cart.shipping_methods && cart.shipping_methods.length > 0)
    completed.add("shipping");
  if (
    cart.payment_collection?.payment_sessions &&
    cart.payment_collection.payment_sessions.length > 0
  )
    completed.add("payment");
  return completed;
}

function getStepSummary(
  step: CheckoutStep,
  cart: HttpTypes.StoreCart,
): string {
  switch (step) {
    case "email":
      return cart.email || "";
    case "address": {
      const addr = cart.shipping_address;
      if (!addr) return "";
      const parts = [
        [addr.first_name, addr.last_name].filter(Boolean).join(" "),
        addr.address_1,
        [addr.city, [addr.province, addr.postal_code].filter(Boolean).join(" ")]
          .filter(Boolean)
          .join(", "),
      ].filter(Boolean);
      return parts.join(", ");
    }
    case "shipping":
      return cart.shipping_methods?.[0]?.name || "Shipping method selected";
    case "payment":
      return "Payment method selected";
    case "review":
      return "";
  }
}

export function CheckoutForm({
  cart,
  customer,
}: {
  cart: HttpTypes.StoreCart;
  customer: HttpTypes.StoreCustomer | null;
}) {
  const completedSteps = useMemo(() => deriveCompletedSteps(cart), [cart]);

  const defaultActiveStep = useMemo(() => {
    for (const step of STEP_ORDER) {
      if (!completedSteps.has(step)) return step;
    }
    return "review" as CheckoutStep;
  }, [completedSteps]);

  const [activeStep, setActiveStep] = useState<CheckoutStep>(defaultActiveStep);

  // Stripe refs for payment confirmation in review step
  const [stripeInstance, setStripeInstance] = useState<Stripe | null>(null);
  const [elementsInstance, setElementsInstance] = useState<StripeElements | null>(null);

  const onStepComplete = useCallback(
    (step: CheckoutStep) => {
      const currentIndex = STEP_ORDER.indexOf(step);
      const nextStep =
        currentIndex < STEP_ORDER.length - 1
          ? STEP_ORDER[currentIndex + 1]!
          : ("review" as CheckoutStep);
      setActiveStep(nextStep);
    },
    [],
  );

  const onEditStep = useCallback((step: CheckoutStep) => {
    setActiveStep(step);
  }, []);

  function renderStepContent(step: CheckoutStep) {
    switch (step) {
      case "email":
        return (
          <CheckoutEmail
            cart={cart}
            customer={customer}
            onComplete={() => onStepComplete("email")}
          />
        );
      case "address":
        return (
          <CheckoutAddress
            cart={cart}
            customer={customer}
            onComplete={() => onStepComplete("address")}
          />
        );
      case "shipping":
        return (
          <CheckoutShipping
            cart={cart}
            onComplete={() => onStepComplete("shipping")}
          />
        );
      case "payment":
        return (
          <CheckoutPayment
            cart={cart}
            customer={customer}
            onComplete={() => onStepComplete("payment")}
            onStripeReady={(stripe, elements) => {
              setStripeInstance(stripe);
              setElementsInstance(elements);
            }}
          />
        );
      case "review":
        return (
          <CheckoutReview
            cart={cart}
            stripe={stripeInstance}
            elements={elementsInstance}
            onEditStep={onEditStep}
          />
        );
    }
  }

  return (
    <div>
      <ExpressCheckout cart={cart} />

      <div className="divide-y divide-gray-200 border-b border-t border-gray-200">
      {STEP_ORDER.map((step) => {
        const isCompleted = completedSteps.has(step);
        const isActive = step === activeStep;
        const isFuture = !isCompleted && !isActive;

        // Payment step needs a persistent render to keep Stripe Elements mounted.
        // Instead of unmounting when leaving the step and remounting in a hidden div,
        // we render the content ONCE and toggle visibility via className.
        const isPaymentPersisted =
          step === "payment" && (isActive || activeStep === "review");

        return (
          <div key={step} className="py-6">
            {/* Active step (non-payment, or payment when not using persistent render) */}
            {isActive && !isPaymentPersisted && (
              <>
                <h2 className="text-lg font-medium text-gray-900">
                  {STEP_LABELS[step]}
                </h2>
                <div className="mt-6">{renderStepContent(step)}</div>
              </>
            )}

            {/* Payment step: persistent render — visible when active, hidden during review */}
            {isPaymentPersisted && (
              <>
                {isActive && (
                  <h2 className="text-lg font-medium text-gray-900">
                    {STEP_LABELS[step]}
                  </h2>
                )}
                <div className={isActive ? "mt-6" : "hidden"}>
                  {renderStepContent(step)}
                </div>
              </>
            )}

            {/* Completed step (collapsed) */}
            {isCompleted && !isActive && (
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-medium text-gray-900">
                    {STEP_LABELS[step]}
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    {getStepSummary(step, cart)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onEditStep(step)}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                >
                  Edit
                </button>
              </div>
            )}

            {/* Future/disabled step */}
            {isFuture && (
              <button
                type="button"
                disabled
                className="w-full cursor-auto text-left text-lg font-medium text-gray-500"
              >
                {STEP_LABELS[step]}
              </button>
            )}
          </div>
        );
      })}
      </div>
    </div>
  );
}
