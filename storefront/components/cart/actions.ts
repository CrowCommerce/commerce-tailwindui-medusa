"use server";

import { TAGS } from "lib/constants";
import {
  addToCart,
  createCart,
  getCart,
  removeFromCart,
  updateCart,
} from "lib/medusa";
import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";

function revalidateCart(): void {
  revalidateTag(TAGS.cart, "max");
  revalidatePath("/", "layout");
}

export async function addItem(
  prevState: any,
  selectedVariantId: string | undefined,
) {
  if (!selectedVariantId) {
    return "Please select a product variant";
  }

  try {
    await addToCart([{ merchandiseId: selectedVariantId, quantity: 1 }]);
  } catch (e) {
    return e instanceof Error ? e.message : "Error adding item to cart";
  } finally {
    revalidateCart();
  }
}

export async function removeItem(prevState: any, lineItemId: string) {
  if (!lineItemId) {
    return "Missing item ID — please try again";
  }

  try {
    await removeFromCart([lineItemId]);
  } catch (e) {
    return e instanceof Error ? e.message : "Error removing item from cart";
  } finally {
    revalidateCart();
  }
}

export async function updateItemQuantity(
  prevState: any,
  payload: {
    merchandiseId: string;
    quantity: number;
  },
) {
  const { merchandiseId, quantity } = payload;

  if (!merchandiseId) {
    return "Missing product variant ID";
  }
  if (quantity < 0) {
    return "Quantity cannot be negative";
  }

  try {
    const cart = await getCart();

    if (!cart) {
      return "Error fetching cart";
    }

    const lineItem = cart.lines.find(
      (line) => line.merchandise.id === merchandiseId,
    );

    if (lineItem && lineItem.id) {
      if (quantity === 0) {
        await removeFromCart([lineItem.id]);
      } else {
        await updateCart([{ id: lineItem.id, merchandiseId, quantity }]);
      }
    } else if (quantity > 0) {
      await addToCart([{ merchandiseId, quantity }]);
    }
  } catch (e) {
    return e instanceof Error ? e.message : "Error updating item quantity";
  } finally {
    revalidateCart();
  }
}

export async function redirectToCheckout() {
  redirect("/checkout");
}

export async function createCartAndSetCookie() {
  await createCart();
}
