"use server";

import { sdk } from "lib/medusa";
import { TAGS } from "lib/constants";
import type { HttpTypes } from "@medusajs/types";
import { setCartId, getAuthHeaders } from "lib/medusa/cookies";
import * as Sentry from "@sentry/nextjs";
import { revalidatePath, revalidateTag } from "next/cache";

type ReorderResult =
  | { cart: HttpTypes.StoreCart }
  | { error: string };

function classifyError(e: unknown): string {
  const msg = e instanceof Error ? e.message.toLowerCase() : "";
  if (
    msg.includes("variant") ||
    msg.includes("inventory") ||
    msg.includes("stock") ||
    msg.includes("not found")
  ) {
    return "Some items from this order are no longer available.";
  }
  return "Something went wrong. Please try again.";
}

export async function reorder(orderId: string): Promise<ReorderResult> {
  try {
    const headers = await getAuthHeaders();
    const { cart } = await sdk.client.fetch<{ cart: HttpTypes.StoreCart }>(
      `/store/customers/me/orders/${orderId}/reorder`,
      { method: "POST", headers }
    );
    await setCartId(cart.id);
    revalidateTag(TAGS.cart, "max");
    revalidatePath("/", "layout");
    return { cart };
  } catch (e) {
    Sentry.captureException(e, {
      tags: { order_id: orderId, action: "reorder" },
    });
    return { error: classifyError(e) };
  }
}
