"use client";

import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from "@headlessui/react";
import { ChevronDownIcon, XMarkIcon } from "@heroicons/react/20/solid";
import clsx from "clsx";
import type { HttpTypes } from "@medusajs/types";
import { applyPromoCode, removePromoCode } from "lib/medusa/checkout";
import { useRef, useState, useTransition } from "react";

type Props = {
  promotions: HttpTypes.StorePromotion[];
};

export function PromoCodeInput({ promotions }: Props) {
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const appliedCodes = promotions
    .map((p) => p.code)
    .filter((c): c is string => !!c);

  function handleApply() {
    const code = inputValue.trim();
    if (!code) return;
    setError(null);

    startTransition(async () => {
      const result = await applyPromoCode(code);
      if (result) {
        setError(result);
      } else {
        setInputValue("");
        inputRef.current?.focus();
      }
    });
  }

  function handleRemove(code: string) {
    setError(null);
    startTransition(async () => {
      const result = await removePromoCode(code);
      if (result) setError(result);
    });
  }

  return (
    <Disclosure as="div" className="border-t border-gray-200 pt-6">
      <DisclosureButton
        aria-label="Toggle promo code input"
        className="group flex w-full items-center justify-between text-sm font-medium text-gray-900"
      >
        <span>Have a promo code?</span>
        <ChevronDownIcon
          aria-hidden="true"
          className="size-5 text-gray-500 transition-transform group-data-open:rotate-180"
        />
      </DisclosureButton>

      <DisclosurePanel className="mt-4 space-y-3">
        {/* Applied code chips */}
        {appliedCodes.length > 0 && (
          <ul aria-label="Applied promo codes" className="flex flex-wrap gap-2">
            {appliedCodes.map((code) => (
              <li
                key={code}
                className="flex items-center gap-1 rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700"
              >
                <span>{code}</span>
                <button
                  type="button"
                  aria-label={`Remove promo code ${code}`}
                  disabled={isPending}
                  onClick={() => handleRemove(code)}
                  className="ml-1 rounded-full p-0.5 text-primary-500 hover:text-primary-700 disabled:opacity-50"
                >
                  <XMarkIcon aria-hidden="true" className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Input row */}
        <div className="flex gap-2">
          <label htmlFor="promo-code-input" className="sr-only">
            Promo code
          </label>
          <input
            id="promo-code-input"
            ref={inputRef}
            type="text"
            name="promo-code"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleApply();
              }
            }}
            placeholder="Enter code"
            autoComplete="off"
            disabled={isPending}
            aria-describedby={error ? "promo-code-error" : undefined}
            className={clsx(
              "block w-full rounded-md border px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm",
              "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500",
              "disabled:opacity-50",
              error ? "border-red-300" : "border-gray-300",
            )}
          />
          <button
            type="button"
            onClick={handleApply}
            disabled={isPending || !inputValue.trim()}
            className={clsx(
              "shrink-0 rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm",
              "hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600",
              "disabled:opacity-50 disabled:cursor-not-allowed",
            )}
          >
            {isPending ? "Applying…" : "Apply"}
          </button>
        </div>

        {/* Inline error */}
        {error && (
          <p id="promo-code-error" role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
      </DisclosurePanel>
    </Disclosure>
  );
}
