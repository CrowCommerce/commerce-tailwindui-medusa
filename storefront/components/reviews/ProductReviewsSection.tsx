import { ProductReviews } from "components/reviews/ProductReviews";
import { getProductReviews } from "lib/medusa/reviews";
import type { Product } from "lib/types";

export async function ProductReviewsSection({
  productPromise,
}: {
  productPromise: Promise<Product | undefined>;
}) {
  const product = await productPromise;
  if (!product) return null;

  const reviewsData = await getProductReviews(product.id);

  // canReview is always true here — auth is validated in the server action.
  // This avoids reading cookies inside the "use cache" scope of the product page.
  return (
    <div className="bg-white">
      <ProductReviews
        productId={product.id}
        initialData={reviewsData}
        canReview
      />
    </div>
  );
}
