"use client";

import { HeartIcon as HeartOutline } from "@heroicons/react/24/outline";
import { HeartIcon as HeartSolid } from "@heroicons/react/24/solid";
import { useEffect, useState, useTransition } from "react";
import { addToWishlist, removeFromWishlist, type WishlistActionResult } from "lib/medusa/wishlist";
import { useNotification } from "components/notifications";
import clsx from "clsx";

type WishlistButtonProps = {
  variantId: string;
  isInWishlist?: boolean;
  wishlistId?: string;
  wishlistItemId?: string;
  size?: "sm" | "md";
  className?: string;
};

export function WishlistButton({
  variantId,
  isInWishlist: initialIsInWishlist = false,
  wishlistId,
  wishlistItemId,
  size = "md",
  className,
}: WishlistButtonProps) {
  const [isWishlisted, setIsWishlisted] = useState(initialIsInWishlist);
  const [isPending, startTransition] = useTransition();
  const { showNotification } = useNotification();

  useEffect(() => {
    setIsWishlisted(initialIsInWishlist);
  }, [initialIsInWishlist]);

  function handleClick() {
    startTransition(async () => {
      if (isWishlisted && wishlistId && wishlistItemId) {
        const formData = new FormData();
        formData.set("wishlist_id", wishlistId);
        formData.set("item_id", wishlistItemId);
        const result = await removeFromWishlist(null, formData);
        if (result?.error) {
          showNotification("error", "Could not remove from wishlist", result.error);
        } else {
          setIsWishlisted(false);
          showNotification("success", "Removed from wishlist");
        }
      } else {
        const formData = new FormData();
        formData.set("variant_id", variantId);
        if (wishlistId) formData.set("wishlist_id", wishlistId);
        const result = await addToWishlist(null, formData);
        if (result?.error) {
          showNotification("error", "Could not add to wishlist", result.error);
        } else {
          setIsWishlisted(true);
          showNotification("success", "Added to wishlist");
        }
      }
    });
  }

  const iconSize = size === "sm" ? "size-5" : "size-6";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className={clsx(
        "group/heart rounded-full p-2 transition-colors",
        isWishlisted
          ? "text-red-500 hover:text-red-600"
          : "text-gray-400 hover:text-red-500",
        isPending && "opacity-50",
        className,
      )}
      aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
    >
      {isWishlisted ? (
        <HeartSolid className={clsx(iconSize, isPending && "animate-pulse")} />
      ) : (
        <HeartOutline className={clsx(iconSize, "group-hover/heart:fill-red-100")} />
      )}
    </button>
  );
}
