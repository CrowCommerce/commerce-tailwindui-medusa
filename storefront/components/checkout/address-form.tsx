"use client";

import { useCallback, useState } from "react";

import type { AddressPayload } from "lib/types";

type AddressFormProps = {
  defaultValues?: AddressPayload;
  countries: { iso_2: string; display_name: string }[];
  onChange?: (address: AddressPayload) => void;
};

const INPUT_CLASS =
  "block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6";

const LABEL_CLASS = "block text-sm/6 font-medium text-gray-900";

export const EMPTY_ADDRESS: AddressPayload = {
  first_name: "",
  last_name: "",
  address_1: "",
  address_2: "",
  company: "",
  city: "",
  country_code: "",
  province: "",
  postal_code: "",
  phone: "",
};

export function AddressForm({
  defaultValues,
  countries,
  onChange,
}: AddressFormProps) {
  const [address, setAddress] = useState<AddressPayload>({
    ...EMPTY_ADDRESS,
    ...defaultValues,
  });

  const update = useCallback(
    (field: keyof AddressPayload, value: string) => {
      setAddress((prev) => {
        const next = { ...prev, [field]: value };
        onChange?.(next);
        return next;
      });
    },
    [onChange],
  );

  return (
    <div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-6">
      {/* First name / Last name */}
      <div className="sm:col-span-3">
        <label htmlFor="addr-first-name" className={LABEL_CLASS}>
          First name
        </label>
        <div className="mt-1">
          <input
            id="addr-first-name"
            name="first_name"
            type="text"
            required
            autoComplete="given-name"
            value={address.first_name}
            onChange={(e) => update("first_name", e.target.value)}
            className={INPUT_CLASS}
          />
        </div>
      </div>

      <div className="sm:col-span-3">
        <label htmlFor="addr-last-name" className={LABEL_CLASS}>
          Last name
        </label>
        <div className="mt-1">
          <input
            id="addr-last-name"
            name="last_name"
            type="text"
            required
            autoComplete="family-name"
            value={address.last_name}
            onChange={(e) => update("last_name", e.target.value)}
            className={INPUT_CLASS}
          />
        </div>
      </div>

      {/* Company (optional) */}
      <div className="sm:col-span-6">
        <label htmlFor="addr-company" className={LABEL_CLASS}>
          Company{" "}
          <span className="text-sm font-normal text-gray-500">(optional)</span>
        </label>
        <div className="mt-1">
          <input
            id="addr-company"
            name="company"
            type="text"
            autoComplete="organization"
            value={address.company ?? ""}
            onChange={(e) => update("company", e.target.value)}
            className={INPUT_CLASS}
          />
        </div>
      </div>

      {/* Address line 1 */}
      <div className="sm:col-span-6">
        <label htmlFor="addr-address1" className={LABEL_CLASS}>
          Address
        </label>
        <div className="mt-1">
          <input
            id="addr-address1"
            name="address_1"
            type="text"
            required
            autoComplete="address-line1"
            value={address.address_1}
            onChange={(e) => update("address_1", e.target.value)}
            className={INPUT_CLASS}
          />
        </div>
      </div>

      {/* Address line 2 (optional) */}
      <div className="sm:col-span-6">
        <label htmlFor="addr-address2" className={LABEL_CLASS}>
          Apartment, suite, etc.{" "}
          <span className="text-sm font-normal text-gray-500">(optional)</span>
        </label>
        <div className="mt-1">
          <input
            id="addr-address2"
            name="address_2"
            type="text"
            autoComplete="address-line2"
            value={address.address_2 ?? ""}
            onChange={(e) => update("address_2", e.target.value)}
            className={INPUT_CLASS}
          />
        </div>
      </div>

      {/* City / Province / Postal code — 3-column grid */}
      <div className="sm:col-span-2">
        <label htmlFor="addr-city" className={LABEL_CLASS}>
          City
        </label>
        <div className="mt-1">
          <input
            id="addr-city"
            name="city"
            type="text"
            required
            autoComplete="address-level2"
            value={address.city}
            onChange={(e) => update("city", e.target.value)}
            className={INPUT_CLASS}
          />
        </div>
      </div>

      <div className="sm:col-span-2">
        <label htmlFor="addr-province" className={LABEL_CLASS}>
          State / Province
        </label>
        <div className="mt-1">
          <input
            id="addr-province"
            name="province"
            type="text"
            autoComplete="address-level1"
            value={address.province ?? ""}
            onChange={(e) => update("province", e.target.value)}
            className={INPUT_CLASS}
          />
        </div>
      </div>

      <div className="sm:col-span-2">
        <label htmlFor="addr-postal-code" className={LABEL_CLASS}>
          Postal code
        </label>
        <div className="mt-1">
          <input
            id="addr-postal-code"
            name="postal_code"
            type="text"
            required
            autoComplete="postal-code"
            value={address.postal_code}
            onChange={(e) => update("postal_code", e.target.value)}
            className={INPUT_CLASS}
          />
        </div>
      </div>

      {/* Country */}
      <div className="sm:col-span-3">
        <label htmlFor="addr-country" className={LABEL_CLASS}>
          Country
        </label>
        <div className="mt-1">
          <select
            id="addr-country"
            name="country_code"
            required
            autoComplete="country"
            value={address.country_code}
            onChange={(e) => update("country_code", e.target.value)}
            className={INPUT_CLASS}
          >
            <option value="">Select a country</option>
            {countries.map((c) => (
              <option key={c.iso_2} value={c.iso_2}>
                {c.display_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Phone */}
      <div className="sm:col-span-3">
        <label htmlFor="addr-phone" className={LABEL_CLASS}>
          Phone
        </label>
        <div className="mt-1">
          <input
            id="addr-phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            value={address.phone ?? ""}
            onChange={(e) => update("phone", e.target.value)}
            className={INPUT_CLASS}
          />
        </div>
      </div>
    </div>
  );
}
