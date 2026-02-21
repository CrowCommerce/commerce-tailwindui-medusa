"use server";

import { sdk } from "lib/medusa";
import { TAGS } from "lib/constants";
import type { HttpTypes } from "@medusajs/types";
import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import {
  getAuthHeaders,
  getAuthToken,
  getCartId,
  removeAuthToken,
  removeCartId,
  setAuthToken,
} from "lib/medusa/cookies";

function revalidateCustomer(): void {
  revalidateTag(TAGS.customers, "max");
  revalidatePath("/", "layout");
}

async function transferCart(): Promise<void> {
  const cartId = await getCartId();
  if (!cartId) return;

  const headers = await getAuthHeaders();
  await sdk.store.cart.transferCart(cartId, {}, headers);
  revalidateTag(TAGS.cart, "max");
}

export async function retrieveCustomer(): Promise<HttpTypes.StoreCustomer | null> {
  const token = await getAuthToken();
  if (!token) return null;

  const headers = await getAuthHeaders();

  try {
    const { customer } = await sdk.client.fetch<{
      customer: HttpTypes.StoreCustomer;
    }>("/store/customers/me", {
      method: "GET",
      headers,
      query: { fields: "*addresses" },
    });
    return customer;
  } catch {
    return null;
  }
}

export async function login(
  prevState: string | null,
  formData: FormData,
): Promise<string | null> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  try {
    const token = await sdk.auth.login("customer", "emailpass", {
      email,
      password,
    });
    await setAuthToken(token as string);
  } catch (e) {
    return e instanceof Error ? e.message : "Invalid email or password";
  }

  try {
    await transferCart();
  } catch {
    // Cart transfer is best-effort — don't block login
  }

  revalidateCustomer();
  redirect("/account");
}

export async function signup(
  prevState: string | null,
  formData: FormData,
): Promise<string | null> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const customerForm = {
    email,
    first_name: formData.get("first_name") as string,
    last_name: formData.get("last_name") as string,
    phone: (formData.get("phone") as string) || undefined,
  };

  try {
    const registerToken = await sdk.auth.register("customer", "emailpass", {
      email,
      password,
    });
    await setAuthToken(registerToken as string);

    const headers = await getAuthHeaders();
    await sdk.store.customer.create(customerForm, {}, headers);

    const loginToken = await sdk.auth.login("customer", "emailpass", {
      email,
      password,
    });
    await setAuthToken(loginToken as string);
  } catch (e) {
    return e instanceof Error ? e.message : "Error creating account";
  }

  try {
    await transferCart();
  } catch {
    // Cart transfer is best-effort
  }

  revalidateCustomer();
  redirect("/account");
}

export async function signout(): Promise<void> {
  try {
    await sdk.auth.logout();
  } catch {
    // Logout endpoint may fail if token already expired — proceed anyway
  }

  await removeAuthToken();
  await removeCartId();

  revalidateTag(TAGS.customers, "max");
  revalidateTag(TAGS.cart, "max");
  revalidatePath("/", "layout");

  redirect("/");
}

export async function updateCustomer(
  prevState: string | null,
  formData: FormData,
): Promise<string | null> {
  const body: HttpTypes.StoreUpdateCustomer = {
    first_name: formData.get("first_name") as string,
    last_name: formData.get("last_name") as string,
    phone: (formData.get("phone") as string) || undefined,
  };

  const headers = await getAuthHeaders();

  try {
    await sdk.store.customer.update(body, {}, headers);
  } catch (e) {
    return e instanceof Error ? e.message : "Error updating profile";
  } finally {
    revalidateCustomer();
  }

  return null;
}

function parseAddressFields(
  formData: FormData,
): HttpTypes.StoreCreateCustomerAddress {
  return {
    first_name: formData.get("first_name") as string,
    last_name: formData.get("last_name") as string,
    company: (formData.get("company") as string) || undefined,
    address_1: formData.get("address_1") as string,
    address_2: (formData.get("address_2") as string) || undefined,
    city: formData.get("city") as string,
    province: (formData.get("province") as string) || undefined,
    postal_code: formData.get("postal_code") as string,
    country_code: formData.get("country_code") as string,
    phone: (formData.get("phone") as string) || undefined,
  };
}

export async function addCustomerAddress(
  prevState: string | null,
  formData: FormData,
): Promise<string | null> {
  const headers = await getAuthHeaders();

  try {
    await sdk.store.customer.createAddress(
      parseAddressFields(formData),
      {},
      headers,
    );
  } catch (e) {
    return e instanceof Error ? e.message : "Error adding address";
  } finally {
    revalidateCustomer();
  }

  return null;
}

export async function updateCustomerAddress(
  prevState: string | null,
  formData: FormData,
): Promise<string | null> {
  const addressId = formData.get("address_id") as string;
  if (!addressId) return "Address ID is required";

  const headers = await getAuthHeaders();

  try {
    await sdk.store.customer.updateAddress(
      addressId,
      parseAddressFields(formData),
      {},
      headers,
    );
  } catch (e) {
    return e instanceof Error ? e.message : "Error updating address";
  } finally {
    revalidateCustomer();
  }

  return null;
}

export async function deleteCustomerAddress(
  addressId: string,
): Promise<string | null> {
  const headers = await getAuthHeaders();

  try {
    await sdk.store.customer.deleteAddress(addressId, headers);
  } catch (e) {
    return e instanceof Error ? e.message : "Error deleting address";
  } finally {
    revalidateCustomer();
  }

  return null;
}
