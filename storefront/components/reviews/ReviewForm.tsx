"use client";

import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { XMarkIcon, StarIcon } from "@heroicons/react/24/outline";
import { StarIcon as StarIconSolid } from "@heroicons/react/20/solid";
import clsx from "clsx";
import { addProductReview, type ReviewActionResult } from "lib/medusa/reviews";
import { useActionState, useState } from "react";

export function ReviewForm({
  productId,
  open,
  onClose,
}: {
  productId: string;
  open: boolean;
  onClose: () => void;
}) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);

  const [state, formAction, isPending] = useActionState<
    ReviewActionResult,
    FormData
  >(addProductReview, null);

  const displayRating = hoverRating || rating;
  const isDisabled = isPending || rating === 0;

  if (state?.success) {
    return (
      <Dialog open={open} onClose={onClose} className="relative z-50">
        <DialogBackdrop className="fixed inset-0 bg-gray-500/75 transition-opacity" />
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <DialogPanel className="relative w-full max-w-lg rounded-lg bg-white px-6 py-8 text-center shadow-xl">
              <DialogTitle className="text-lg font-semibold text-gray-900">
                Thank you!
              </DialogTitle>
              <p className="mt-2 text-sm text-gray-600">
                Your review has been posted.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-6 rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500"
              >
                Done
              </button>
            </DialogPanel>
          </div>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <DialogBackdrop className="fixed inset-0 bg-gray-500/75 transition-opacity" />

      <div className="fixed inset-0 z-10 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <DialogPanel className="relative w-full max-w-lg rounded-lg bg-white px-6 py-8 shadow-xl">
            <div className="absolute right-4 top-4">
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
              >
                <span className="sr-only">Close</span>
                <XMarkIcon className="size-6" aria-hidden="true" />
              </button>
            </div>

            <DialogTitle className="text-lg font-semibold text-gray-900">
              Write a review
            </DialogTitle>

            <form action={formAction} className="mt-6 space-y-6">
              <input type="hidden" name="product_id" value={productId} />
              <input type="hidden" name="rating" value={rating} />

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Rating
                </label>
                <div className="mt-2 flex gap-x-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-0.5"
                    >
                      {displayRating >= star ? (
                        <StarIconSolid className="size-8 text-yellow-400" />
                      ) : (
                        <StarIcon className="size-8 text-gray-300" />
                      )}
                      <span className="sr-only">
                        {star} star{star !== 1 ? "s" : ""}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label
                  htmlFor="review-title"
                  className="block text-sm font-medium text-gray-700"
                >
                  Title <span className="text-gray-400">(optional)</span>
                </label>
                <input
                  type="text"
                  id="review-title"
                  name="title"
                  className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  placeholder="Summarize your experience"
                />
              </div>

              <div>
                <label
                  htmlFor="review-content"
                  className="block text-sm font-medium text-gray-700"
                >
                  Review
                </label>
                <textarea
                  id="review-content"
                  name="content"
                  rows={4}
                  required
                  className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  placeholder="What did you like or dislike about this product?"
                />
              </div>

              {state?.error && (
                <p className="text-sm text-red-600">{state.error}</p>
              )}

              <button
                type="submit"
                disabled={isDisabled}
                className={clsx(
                  "w-full rounded-md px-4 py-2.5 text-sm font-semibold text-white shadow-sm",
                  isDisabled
                    ? "cursor-not-allowed bg-gray-300"
                    : "bg-primary-600 hover:bg-primary-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600",
                )}
              >
                {isPending ? "Submitting..." : "Submit review"}
              </button>
            </form>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}
