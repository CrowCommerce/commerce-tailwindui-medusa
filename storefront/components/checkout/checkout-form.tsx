"use client";

import type { HttpTypes } from "@medusajs/types";
import type { Stripe, StripeElements } from "@stripe/stripe-js";
import { useCallback, useMemo, useState } from "react";

import { CheckoutAddress } from "components/checkout/checkout-address";
import { CheckoutEmail } from "components/checkout/checkout-email";
import { CheckoutPayment } from "components/checkout/checkout-payment";
import { CheckoutReview } from "components/checkout/checkout-review";
import { CheckoutShipping } from "components/checkout/checkout-shipping";
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
    <div className="divide-y divide-gray-200 border-b border-t border-gray-200">
      {STEP_ORDER.map((step, index) => {
        const isCompleted = completedSteps.has(step);
        const isActive = step === activeStep;
        const isPreviousComplete =
          index === 0 ||
          STEP_ORDER.slice(0, index).every((s) => completedSteps.has(s));
        const isFuture = !isCompleted && !isActive;
        const isDisabled = isFuture && !isPreviousComplete;

        return (
          <div key={step} className="py-6">
            {/* Step header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-x-3">
                {/* Step number indicator */}
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium ${
                    isCompleted
                      ? "bg-indigo-600 text-white"
                      : isActive
                        ? "border-2 border-indigo-600 text-indigo-600"
                        : "border-2 border-gray-300 text-gray-500"
                  }`}
                >
                  {isCompleted ? (
                    <svg
                      className="h-4 w-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </span>

                <div>
                  <h3
                    className={`text-sm font-semibold ${
                      isDisabled
                        ? "text-gray-400"
                        : isActive
                          ? "text-indigo-600"
                          : "text-gray-900"
                    }`}
                  >
                    {STEP_LABELS[step]}
                  </h3>

                  {/* Summary text for completed, collapsed steps */}
                  {isCompleted && !isActive && (
                    <p className="mt-0.5 text-sm text-gray-500">
                      {getStepSummary(step, cart)}
                    </p>
                  )}
                </div>
              </div>

              {/* Edit button for completed, collapsed steps */}
              {isCompleted && !isActive && (
                <button
                  type="button"
                  onClick={() => onEditStep(step)}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                >
                  Edit
                </button>
              )}
            </div>

            {/* Step content (only shown when active) */}
            {/* Payment step stays mounted (hidden) during review so Stripe Elements remain in DOM */}
            {(isActive || (step === "payment" && activeStep === "review")) && (
              <div
                className={`mt-2 pl-11 ${step === "payment" && activeStep === "review" ? "hidden" : ""}`}
              >
                {renderStepContent(step)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
