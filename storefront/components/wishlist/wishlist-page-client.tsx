"use client";

import {
  HeartIcon,
  ShareIcon,
  PlusIcon,
  XMarkIcon,
  ShoppingBagIcon,
} from "@heroicons/react/24/outline";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { useActionState, useState, useTransition } from "react";
import { addItem } from "components/cart/actions";
import {
  createWishlist,
  removeFromWishlist,
  shareWishlist,
  type WishlistActionResult,
} from "lib/medusa/wishlist";
import { useNotification } from "components/notifications";
import type { Wishlist, WishlistItem } from "lib/types";
import Image from "next/image";
import Link from "next/link";
import clsx from "clsx";

export function WishlistPageClient({ wishlists }: { wishlists: Wishlist[] }) {
  const [activeTab, setActiveTab] = useState(0);

  if (!wishlists.length) {
    return <EmptyState />;
  }

  const activeWishlist = wishlists[activeTab] ?? wishlists[0];

  return (
    <div>
      {/* Tab navigation when multiple wishlists */}
      {wishlists.length > 1 && (
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Wishlists">
            {wishlists.map((wl, index) => (
              <button
                key={wl.id}
                type="button"
                onClick={() => setActiveTab(index)}
                className={clsx(
                  "border-b-2 px-1 py-4 text-sm font-medium whitespace-nowrap",
                  index === activeTab
                    ? "border-primary-600 text-primary-600"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700",
                )}
              >
                {wl.name || "Wishlist"}
                <span
                  className={clsx(
                    "ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                    index === activeTab
                      ? "bg-primary-100 text-primary-600"
                      : "bg-gray-100 text-gray-600",
                  )}
                >
                  {wl.items?.length ?? 0}
                </span>
              </button>
            ))}
          </nav>
        </div>
      )}

      {/* Wishlist header with actions */}
      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-lg font-medium text-gray-900">
          {activeWishlist?.name || "My Wishlist"}
        </h2>
        <div className="flex items-center gap-3">
          <ShareButton wishlistId={activeWishlist!.id} />
          <NewWishlistButton />
        </div>
      </div>

      {/* Items grid */}
      {activeWishlist && activeWishlist.items?.length > 0 ? (
        <div className="mt-8 grid grid-cols-1 gap-y-12 sm:grid-cols-2 sm:gap-x-6 lg:grid-cols-3 xl:gap-x-8">
          {activeWishlist.items.map((item) => (
            <WishlistItemCard
              key={item.id}
              item={item}
              wishlistId={activeWishlist.id}
            />
          ))}
        </div>
      ) : (
        <EmptyState />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// WishlistItemCard
// ---------------------------------------------------------------------------

function WishlistItemCard({
  item,
  wishlistId,
}: {
  item: WishlistItem;
  wishlistId: string;
}) {
  const { showNotification } = useNotification();
  const [isRemoving, startRemoveTransition] = useTransition();
  const [addToCartMessage, addToCartAction] = useActionState(addItem, null);
  const [isAddingToCart, startAddTransition] = useTransition();

  const variant = item.product_variant;
  const product = variant?.product;
  const featuredImage = product?.featuredImage;
  const price = product?.priceRange?.minVariantPrice;

  const boundAddToCart = addToCartAction.bind(
    null,
    item.product_variant_id,
  );

  function handleRemove() {
    startRemoveTransition(async () => {
      const formData = new FormData();
      formData.set("wishlist_id", wishlistId);
      formData.set("item_id", item.id);
      const result = await removeFromWishlist(null, formData);
      if (result?.error) {
        showNotification("error", "Could not remove item", result.error);
      } else {
        showNotification("success", "Removed from wishlist");
      }
    });
  }

  return (
    <div
      className={clsx(
        "group relative",
        isRemoving && "pointer-events-none opacity-50",
      )}
    >
      {/* Remove button */}
      <button
        type="button"
        onClick={handleRemove}
        disabled={isRemoving}
        className="absolute top-2 right-2 z-10 rounded-full bg-white/80 p-1.5 text-gray-400 shadow-sm backdrop-blur-sm transition-colors hover:bg-white hover:text-gray-600"
        aria-label="Remove from wishlist"
      >
        <XMarkIcon className="size-5" />
      </button>

      {/* Product image */}
      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-gray-100">
        {featuredImage ? (
          <Link
            href={product?.handle ? `/product/${product.handle}` : "#"}
            prefetch={true}
          >
            <Image
              src={featuredImage.url}
              alt={featuredImage.altText || product?.title || "Product image"}
              width={featuredImage.width || 400}
              height={featuredImage.height || 400}
              className="size-full object-cover object-center transition-opacity group-hover:opacity-75"
            />
          </Link>
        ) : (
          <div className="flex size-full items-center justify-center">
            <ShoppingBagIcon className="size-12 text-gray-300" />
          </div>
        )}
      </div>

      {/* Product info */}
      <div className="mt-4">
        {product ? (
          <Link
            href={`/product/${product.handle}`}
            className="text-sm font-medium text-gray-900 hover:text-gray-700"
          >
            {product.title}
          </Link>
        ) : (
          <p className="text-sm font-medium text-gray-900">Unknown product</p>
        )}

        {variant?.title && variant.title !== "Default" && (
          <p className="mt-1 text-sm text-gray-500">{variant.title}</p>
        )}

        {price && (
          <p
            suppressHydrationWarning
            className="mt-1 text-lg font-medium text-gray-900"
          >
            {new Intl.NumberFormat(undefined, {
              style: "currency",
              currency: price.currencyCode,
              currencyDisplay: "narrowSymbol",
            }).format(parseFloat(price.amount))}
          </p>
        )}
      </div>

      {/* Add to cart */}
      <form
        className="mt-4"
        action={() => {
          startAddTransition(() => {
            boundAddToCart();
          });
        }}
      >
        <button
          type="submit"
          disabled={isAddingToCart}
          className={clsx(
            "w-full rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:outline-none",
            isAddingToCart && "cursor-not-allowed opacity-50",
          )}
        >
          {isAddingToCart ? "Adding..." : "Add to Cart"}
        </button>
      </form>

      {addToCartMessage && typeof addToCartMessage === "string" && (
        <p className="mt-1 text-sm text-red-600">{addToCartMessage}</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// EmptyState
// ---------------------------------------------------------------------------

function EmptyState() {
  return (
    <div className="py-16 text-center">
      <HeartIcon className="mx-auto size-12 text-gray-400" />
      <h3 className="mt-4 text-sm font-semibold text-gray-900">
        No saved items yet
      </h3>
      <p className="mt-2 text-sm text-gray-500">
        Start browsing and save the products you love.
      </p>
      <div className="mt-6">
        <Link
          href="/products"
          className="inline-flex items-center rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
        >
          Browse Products
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ShareButton
// ---------------------------------------------------------------------------

function ShareButton({ wishlistId }: { wishlistId: string }) {
  const { showNotification } = useNotification();
  const [isPending, startTransition] = useTransition();

  function handleShare() {
    startTransition(async () => {
      const token = await shareWishlist(wishlistId);
      if (!token) {
        showNotification("error", "Could not generate share link");
        return;
      }

      const url = `${window.location.origin}/wishlist/shared/${token}`;

      try {
        await navigator.clipboard.writeText(url);
        showNotification("success", "Share link copied to clipboard");
      } catch {
        // Fallback: show the URL in the notification if clipboard fails
        showNotification("success", "Share link generated", url);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      disabled={isPending}
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 shadow-sm ring-gray-300 ring-inset hover:bg-gray-50",
        isPending && "cursor-not-allowed opacity-50",
      )}
    >
      <ShareIcon className="-ml-0.5 size-4" />
      {isPending ? "Sharing..." : "Share"}
    </button>
  );
}

// ---------------------------------------------------------------------------
// NewWishlistButton
// ---------------------------------------------------------------------------

function NewWishlistButton() {
  const [open, setOpen] = useState(false);
  const { showNotification } = useNotification();

  const [state, formAction, isPending] = useActionState<
    WishlistActionResult,
    FormData
  >(async (prev, formData) => {
    const result = await createWishlist(prev, formData);
    if (result?.success) {
      setOpen(false);
      showNotification("success", "Wishlist created");
    } else if (result?.error) {
      showNotification("error", "Could not create wishlist", result.error);
    }
    return result;
  }, null);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
      >
        <PlusIcon className="-ml-0.5 size-4" />
        New Wishlist
      </button>

      <Dialog open={open} onClose={setOpen} className="relative z-50">
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-gray-500/75 transition-opacity data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in"
        />

        <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <DialogPanel
              transition
              className="relative w-full transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left shadow-xl transition-all data-closed:translate-y-4 data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in sm:my-8 sm:max-w-sm sm:p-6 data-closed:sm:translate-y-0 data-closed:sm:scale-95"
            >
              <div>
                <DialogTitle
                  as="h3"
                  className="text-base font-semibold text-gray-900"
                >
                  Create New Wishlist
                </DialogTitle>

                <form action={formAction} className="mt-4">
                  <label
                    htmlFor="wishlist-name"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Name
                  </label>
                  <input
                    id="wishlist-name"
                    name="name"
                    type="text"
                    required
                    placeholder="e.g. Gift ideas"
                    className="mt-1 block w-full rounded-md bg-white px-3 py-2 text-sm text-gray-900 ring-1 shadow-sm ring-gray-300 ring-inset placeholder:text-gray-400 focus:ring-2 focus:ring-primary-600 focus:outline-none"
                  />

                  {state?.error && (
                    <p className="mt-2 text-sm text-red-600">{state.error}</p>
                  )}

                  <div className="mt-5 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 shadow-sm ring-gray-300 ring-inset hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isPending}
                      className={clsx(
                        "rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600",
                        isPending && "cursor-not-allowed opacity-50",
                      )}
                    >
                      {isPending ? "Creating..." : "Create"}
                    </button>
                  </div>
                </form>
              </div>
            </DialogPanel>
          </div>
        </div>
      </Dialog>
    </>
  );
}
