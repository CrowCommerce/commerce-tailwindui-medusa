"use server";

import type { HttpTypes } from "@medusajs/types";
import { TAGS } from "lib/constants";
import { sdk } from "lib/medusa";
import { getAuthHeaders, getCartId, removeCartId } from "lib/medusa/cookies";
import { medusaError } from "lib/medusa/error";
import type {
  AddressPayload,
  CartCompletionResult,
  SavedPaymentMethod,
  ShippingOption,
} from "lib/types";
import { revalidatePath, revalidateTag } from "next/cache";

function revalidateCheckout(): void {
  revalidateTag(TAGS.cart, "max");
  revalidatePath("/", "layout");
}

// === Retrieve raw cart (not transformed) for checkout ===

export async function getCheckoutCart(): Promise<HttpTypes.StoreCart | null> {
  const cartId = await getCartId();
  if (!cartId) return null;

  const headers = await getAuthHeaders();

  try {
    const { cart } = await sdk.client.fetch<{
      cart: HttpTypes.StoreCart;
    }>(`/store/carts/${cartId}`, {
      method: "GET",
      headers,
      query: {
        fields:
          "*items,*items.product,*items.variant,*items.thumbnail,+items.total,*promotions,+shipping_methods.name,*payment_collection.payment_sessions",
      },
    });
    return cart;
  } catch (error) {
    console.error("[Checkout] Failed to retrieve cart:", error);
    return null;
  }
}

// === Cart Email ===

export async function setCartEmail(
  cartId: string,
  email: string,
): Promise<string | null> {
  const headers = await getAuthHeaders();

  try {
    await sdk.store.cart
      .update(cartId, { email }, {}, headers)
      .catch(medusaError);
  } catch (e) {
    return e instanceof Error ? e.message : "Error setting email";
  } finally {
    revalidateCheckout();
  }

  return null;
}

// === Addresses ===

export async function setCartAddresses(
  cartId: string,
  shipping: AddressPayload,
  billing?: AddressPayload,
): Promise<string | null> {
  const headers = await getAuthHeaders();
  const billingAddress = billing || shipping;

  try {
    await sdk.store.cart
      .update(
        cartId,
        {
          shipping_address: shipping,
          billing_address: billingAddress,
        },
        {},
        headers,
      )
      .catch(medusaError);
  } catch (e) {
    return e instanceof Error ? e.message : "Error setting addresses";
  } finally {
    revalidateCheckout();
  }

  return null;
}

// === Shipping Options ===

export async function getShippingOptions(
  cartId: string,
): Promise<ShippingOption[]> {
  const headers = await getAuthHeaders();

  try {
    const { shipping_options } = await sdk.client.fetch<{
      shipping_options: any[];
    }>("/store/shipping-options", {
      method: "GET",
      headers,
      query: { cart_id: cartId },
    });

    return shipping_options.map((opt) => ({
      id: opt.id,
      name: opt.name,
      price_type: opt.price_type || "flat",
      amount: opt.amount ?? 0,
      currency_code: opt.currency_code || "USD",
    }));
  } catch (error) {
    console.error("[Checkout] Failed to fetch shipping options:", error);
    return [];
  }
}

export async function setShippingMethod(
  cartId: string,
  optionId: string,
): Promise<string | null> {
  const headers = await getAuthHeaders();

  try {
    await sdk.store.cart
      .addShippingMethod(cartId, { option_id: optionId }, {}, headers)
      .catch(medusaError);
  } catch (e) {
    return e instanceof Error ? e.message : "Error setting shipping method";
  } finally {
    revalidateCheckout();
  }

  return null;
}

// === Payment ===

export async function initializePaymentSession(
  cartId: string,
  providerId: string,
  data?: Record<string, unknown>,
): Promise<string | null> {
  const headers = await getAuthHeaders();

  try {
    const { cart } = await sdk.client.fetch<{
      cart: HttpTypes.StoreCart;
    }>(`/store/carts/${cartId}`, {
      method: "GET",
      headers,
      query: { fields: "*payment_collection.payment_sessions" },
    });

    await sdk.store.payment
      .initiatePaymentSession(cart, { provider_id: providerId, data }, {}, headers)
      .catch(medusaError);
  } catch (e) {
    return e instanceof Error ? e.message : "Error initializing payment";
  } finally {
    revalidateCheckout();
  }

  return null;
}

// === Saved Payment Methods ===

export async function getSavedPaymentMethods(
  accountHolderId: string,
): Promise<SavedPaymentMethod[]> {
  const headers = await getAuthHeaders();

  try {
    const { payment_methods } = await sdk.client.fetch<{
      payment_methods: SavedPaymentMethod[];
    }>(`/store/payment-methods/${accountHolderId}`, {
      method: "GET",
      headers,
    });
    return payment_methods;
  } catch {
    return [];
  }
}

// === Complete Cart ===

export async function completeCart(
  cartId: string,
): Promise<CartCompletionResult> {
  const headers = await getAuthHeaders();

  try {
    const result = await sdk.store.cart
      .complete(cartId, {}, headers)
      .catch(medusaError);

    if (result.type === "order") {
      await removeCartId();
      revalidateTag(TAGS.cart, "max");
      revalidatePath("/", "layout");
      return { type: "order", order: result.order };
    }

    return {
      type: "cart",
      error:
        (typeof result.error === "string"
          ? result.error
          : result.error?.message) || "Payment could not be completed",
    };
  } catch (e) {
    return {
      type: "cart",
      error: e instanceof Error ? e.message : "Error completing order",
    };
  }
}

// === Express Checkout Composite ===

/**
 * Chains all steps needed for express checkout (Apple Pay / Google Pay):
 * setCartEmail -> setCartAddresses -> getShippingOptions -> setShippingMethod -> initializePaymentSession
 *
 * Returns the updated cart on success, or throws on error.
 */
export async function applyExpressCheckoutData(
  cartId: string,
  email: string,
  shipping: AddressPayload,
  billing?: AddressPayload,
): Promise<void> {
  const emailError = await setCartEmail(cartId, email);
  if (emailError) throw new Error(emailError);

  const addressError = await setCartAddresses(cartId, shipping, billing);
  if (addressError) throw new Error(addressError);

  const options = await getShippingOptions(cartId);
  if (options.length === 0) {
    throw new Error("No shipping options available");
  }

  const shippingError = await setShippingMethod(cartId, options[0]!.id);
  if (shippingError) throw new Error(shippingError);

  const paymentError = await initializePaymentSession(
    cartId,
    "pp_stripe_stripe",
  );
  if (paymentError) throw new Error(paymentError);
}

// === Customer Addresses (for saved address picker) ===

export async function getCustomerAddresses(): Promise<
  HttpTypes.StoreCustomerAddress[]
> {
  const headers = await getAuthHeaders();
  if (!("authorization" in headers)) return [];

  try {
    const { addresses } = await sdk.client.fetch<{
      addresses: HttpTypes.StoreCustomerAddress[];
    }>("/store/customers/me/addresses", {
      method: "GET",
      headers,
    });
    return addresses;
  } catch {
    return [];
  }
}
