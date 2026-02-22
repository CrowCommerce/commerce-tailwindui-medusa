"use server";

import { sdk } from "lib/medusa";
import { TAGS } from "lib/constants";
import type { Wishlist } from "lib/types";
import { revalidatePath, revalidateTag } from "next/cache";
import { cacheLife, cacheTag } from "next/cache";
import {
  getAuthHeaders,
  getAuthToken,
  getWishlistId,
  setWishlistId,
  removeWishlistId,
} from "lib/medusa/cookies";

export type WishlistActionResult = { error?: string; success?: boolean } | null;

type WishlistResponse = { wishlist: Wishlist };
type WishlistsResponse = { wishlists: Wishlist[] };

function revalidateWishlists(): void {
  revalidateTag(TAGS.wishlists, "max");
  revalidatePath("/", "layout");
}

// --- Read Operations ---

export async function getWishlists(): Promise<Wishlist[]> {
  "use cache";
  cacheTag(TAGS.wishlists);
  cacheLife("days");

  const token = await getAuthToken();
  const headers = await getAuthHeaders();

  if (token) {
    // Authenticated: fetch all customer wishlists
    try {
      const result = await sdk.client.fetch<WishlistsResponse>(
        "/store/customers/me/wishlists",
        { method: "GET", headers }
      );
      return result.wishlists;
    } catch {
      return [];
    }
  }

  // Guest: fetch single wishlist by cookie ID
  const wishlistId = await getWishlistId();
  if (!wishlistId) return [];

  try {
    const result = await sdk.client.fetch<WishlistResponse>(
      `/store/wishlists/${wishlistId}`,
      { method: "GET" }
    );
    return [result.wishlist];
  } catch {
    return [];
  }
}

export async function getWishlist(wishlistId: string): Promise<Wishlist | null> {
  "use cache";
  cacheTag(TAGS.wishlists);
  cacheLife("days");

  const headers = await getAuthHeaders();

  try {
    const result = await sdk.client.fetch<WishlistResponse>(
      `/store/wishlists/${wishlistId}`,
      { method: "GET", headers }
    );
    return result.wishlist;
  } catch {
    return null;
  }
}

export async function getSharedWishlist(token: string): Promise<Wishlist | null> {
  try {
    const result = await sdk.client.fetch<WishlistResponse>(
      `/store/wishlists/shared/${token}`,
      { method: "GET" }
    );
    return result.wishlist;
  } catch {
    return null;
  }
}

export async function isVariantInWishlist(variantId: string): Promise<boolean> {
  const wishlists = await getWishlists();
  return wishlists.some((wl) =>
    wl.items?.some((item) => item.product_variant_id === variantId)
  );
}

export async function getWishlistItemCount(): Promise<number> {
  const wishlists = await getWishlists();
  return wishlists.reduce((sum, wl) => sum + (wl.items?.length ?? 0), 0);
}

// --- Mutations ---

export async function createWishlist(
  prevState: WishlistActionResult,
  formData: FormData,
): Promise<WishlistActionResult> {
  const name = formData.get("name") as string | null;
  const headers = await getAuthHeaders();

  try {
    await sdk.client.fetch<WishlistResponse>(
      "/store/customers/me/wishlists",
      { method: "POST", headers, body: { name: name || undefined } }
    );
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error creating wishlist" };
  } finally {
    revalidateWishlists();
  }

  return { success: true };
}

export async function addToWishlist(
  prevState: WishlistActionResult,
  formData: FormData,
): Promise<WishlistActionResult> {
  const variantId = formData.get("variant_id") as string;
  let wishlistId = formData.get("wishlist_id") as string | null;

  if (!variantId) return { error: "Variant ID is required" };

  const token = await getAuthToken();
  const headers = await getAuthHeaders();

  if (token) {
    // Authenticated flow
    if (!wishlistId) {
      // Auto-target: if customer has exactly one wishlist, use it
      const wishlists = await getWishlists();
      if (wishlists.length === 1) {
        wishlistId = wishlists[0]!.id;
      } else if (wishlists.length === 0) {
        // Auto-create a default wishlist
        try {
          const result = await sdk.client.fetch<WishlistResponse>(
            "/store/customers/me/wishlists",
            { method: "POST", headers, body: { name: "My Wishlist" } }
          );
          wishlistId = result.wishlist.id;
        } catch (e) {
          return { error: e instanceof Error ? e.message : "Error creating wishlist" };
        }
      } else {
        return { error: "Please select a wishlist" };
      }
    }

    try {
      await sdk.client.fetch<WishlistResponse>(
        `/store/customers/me/wishlists/${wishlistId}/items`,
        { method: "POST", headers, body: { variant_id: variantId } }
      );
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Error adding to wishlist" };
    } finally {
      revalidateWishlists();
    }
  } else {
    // Guest flow — lazy create guest wishlist
    let guestWishlistId = await getWishlistId();

    if (!guestWishlistId) {
      try {
        const result = await sdk.client.fetch<WishlistResponse>(
          "/store/wishlists",
          { method: "POST" }
        );
        guestWishlistId = result.wishlist.id;
        await setWishlistId(guestWishlistId);
      } catch (e) {
        return { error: e instanceof Error ? e.message : "Error creating wishlist" };
      }
    }

    try {
      await sdk.client.fetch<WishlistResponse>(
        `/store/wishlists/${guestWishlistId}/items`,
        { method: "POST", body: { variant_id: variantId } }
      );
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Error adding to wishlist" };
    } finally {
      revalidateWishlists();
    }
  }

  return { success: true };
}

export async function removeFromWishlist(
  prevState: WishlistActionResult,
  formData: FormData,
): Promise<WishlistActionResult> {
  const wishlistId = formData.get("wishlist_id") as string;
  const itemId = formData.get("item_id") as string;

  if (!wishlistId || !itemId) return { error: "Missing wishlist or item ID" };

  const token = await getAuthToken();
  const headers = await getAuthHeaders();

  try {
    const basePath = token
      ? `/store/customers/me/wishlists/${wishlistId}/items/${itemId}`
      : `/store/wishlists/${wishlistId}/items/${itemId}`;

    await sdk.client.fetch(basePath, { method: "DELETE", headers });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error removing item" };
  } finally {
    revalidateWishlists();
  }

  return { success: true };
}

export async function deleteWishlist(
  prevState: WishlistActionResult,
  formData: FormData,
): Promise<WishlistActionResult> {
  const wishlistId = formData.get("wishlist_id") as string;
  if (!wishlistId) return { error: "Wishlist ID is required" };

  const headers = await getAuthHeaders();

  try {
    await sdk.client.fetch(
      `/store/customers/me/wishlists/${wishlistId}`,
      { method: "DELETE", headers }
    );
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error deleting wishlist" };
  } finally {
    revalidateWishlists();
  }

  return { success: true };
}

export async function renameWishlist(
  prevState: WishlistActionResult,
  formData: FormData,
): Promise<WishlistActionResult> {
  const wishlistId = formData.get("wishlist_id") as string;
  const name = formData.get("name") as string;

  if (!wishlistId) return { error: "Wishlist ID is required" };

  const headers = await getAuthHeaders();

  try {
    await sdk.client.fetch(
      `/store/customers/me/wishlists/${wishlistId}`,
      { method: "PUT", headers, body: { name } }
    );
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error renaming wishlist" };
  } finally {
    revalidateWishlists();
  }

  return { success: true };
}

export async function transferWishlist(): Promise<void> {
  const guestWishlistId = await getWishlistId();
  if (!guestWishlistId) return;

  const headers = await getAuthHeaders();

  try {
    await sdk.client.fetch(
      `/store/customers/me/wishlists/${guestWishlistId}/transfer`,
      { method: "POST", headers }
    );
  } catch {
    // Transfer is best-effort
  } finally {
    await removeWishlistId();
    revalidateWishlists();
  }
}

export async function shareWishlist(wishlistId: string): Promise<string | null> {
  const headers = await getAuthHeaders();

  try {
    const result = await sdk.client.fetch<{ token: string }>(
      `/store/customers/me/wishlists/${wishlistId}/share`,
      { method: "POST", headers }
    );
    return result.token;
  } catch {
    return null;
  }
}
