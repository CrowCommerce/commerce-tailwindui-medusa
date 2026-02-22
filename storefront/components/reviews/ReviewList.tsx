import { StarIcon } from "@heroicons/react/20/solid";
import clsx from "clsx";
import type { Review } from "lib/types";
import { DEFAULT_LOCALE } from "lib/constants";

export function ReviewList({ reviews }: { reviews: Review[] }) {
  if (reviews.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        No reviews yet. Be the first to share your thoughts!
      </p>
    );
  }

  return (
    <div className="flow-root">
      <div className="-my-12 divide-y divide-gray-200">
        {reviews.map((review) => (
          <div key={review.id} className="py-12">
            <div className="flex items-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-gray-100 text-sm font-medium text-gray-600">
                {review.first_name.charAt(0)}
                {review.last_name.charAt(0)}
              </div>
              <div className="ml-4">
                <h4 className="text-sm font-bold text-gray-900">
                  {review.first_name} {review.last_name.charAt(0)}.
                </h4>
                <div className="mt-1 flex items-center">
                  {[0, 1, 2, 3, 4].map((rating) => (
                    <StarIcon
                      key={rating}
                      aria-hidden="true"
                      className={clsx(
                        review.rating > rating
                          ? "text-yellow-400"
                          : "text-gray-300",
                        "size-5 shrink-0",
                      )}
                    />
                  ))}
                </div>
                <p className="sr-only">{review.rating} out of 5 stars</p>
              </div>
            </div>

            {review.title && (
              <h5 className="mt-4 text-sm font-semibold text-gray-900">
                {review.title}
              </h5>
            )}

            <p className="mt-2 text-sm text-gray-600">{review.content}</p>

            <time
              dateTime={review.created_at}
              className="mt-2 block text-xs text-gray-400"
            >
              {new Date(review.created_at).toLocaleDateString(DEFAULT_LOCALE, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </time>
          </div>
        ))}
      </div>
    </div>
  );
}
