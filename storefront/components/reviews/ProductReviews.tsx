"use client";

import { useState, useTransition } from "react";
import { ReviewSummary } from "components/reviews/ReviewSummary";
import { ReviewList } from "components/reviews/ReviewList";
import { ReviewForm } from "components/reviews/ReviewForm";
import type { ProductReviews as ProductReviewsType, Review } from "lib/types";
import { getProductReviews } from "lib/medusa/reviews";

export function ProductReviews({
  productId,
  initialData,
  canReview,
}: {
  productId: string;
  initialData: ProductReviewsType;
  canReview: boolean;
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [reviews, setReviews] = useState<Review[]>(initialData.reviews);
  const [hasMore, setHasMore] = useState(
    initialData.count > initialData.reviews.length,
  );
  const [isLoadingMore, startLoadMore] = useTransition();

  function loadMore() {
    startLoadMore(async () => {
      const data = await getProductReviews(productId, {
        limit: 10,
        offset: reviews.length,
      });
      setReviews((prev) => [...prev, ...data.reviews]);
      setHasMore(data.count > reviews.length + data.reviews.length);
    });
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 sm:py-24 lg:grid lg:max-w-7xl lg:grid-cols-12 lg:gap-x-8 lg:px-8 lg:py-32">
      <div className="lg:col-span-4 lg:sticky lg:top-8 lg:self-start">
        <ReviewSummary
          reviews={initialData}
          canReview={canReview}
          onWriteReview={() => setFormOpen(true)}
        />
      </div>

      <div className="mt-16 lg:col-span-7 lg:col-start-6 lg:mt-0">
        <h3 className="sr-only">Recent reviews</h3>
        <ReviewList reviews={reviews} />

        {hasMore && (
          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={loadMore}
              disabled={isLoadingMore}
              className="rounded-md border border-gray-300 bg-white px-6 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50"
            >
              {isLoadingMore ? "Loading..." : "Load more reviews"}
            </button>
          </div>
        )}
      </div>

      {canReview && (
        <ReviewForm
          productId={productId}
          open={formOpen}
          onClose={() => setFormOpen(false)}
        />
      )}
    </div>
  );
}
