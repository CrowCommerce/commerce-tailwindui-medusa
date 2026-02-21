"use cache";

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProductPageContent } from "components/product/product-page-content";
import RelatedProductsComponent from "components/product/related-products";
import { ProductReviewsSection } from "components/reviews/ProductReviewsSection";
import { HIDDEN_PRODUCT_TAG } from "lib/constants";
import { getProduct, getProductRecommendations, getProducts } from "lib/medusa";
import { getProductReviews } from "lib/medusa/reviews";
import type { Product } from "lib/types";
import { transformProductsToRelatedProducts } from "lib/utils";
import { Suspense } from "react";

export async function generateMetadata(props: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  const product = await getProduct(params.handle);

  if (!product) return notFound();

  const { url, width, height, altText: alt } = product.featuredImage || {};
  const indexable = !product.tags.includes(HIDDEN_PRODUCT_TAG);

  return {
    title: product.seo.title || product.title,
    description: product.seo.description || product.description,
    robots: {
      index: indexable,
      follow: indexable,
      googleBot: {
        index: indexable,
        follow: indexable,
      },
    },
    openGraph: url
      ? {
          images: [
            {
              url,
              width,
              height,
              alt,
            },
          ],
        }
      : null,
  };
}

export async function generateStaticParams() {
  const products = await getProducts({});

  return products.map((product) => ({
    handle: product.handle,
  }));
}

export default async function ProductPage(props: {
  params: Promise<{ handle: string }>;
}) {
  const params = await props.params;
  // Don't await the fetch, pass the Promise to the client component
  const productPromise = getProduct(params.handle);

  if (!productPromise) return notFound();

  const reviewsPromise = productPromise.then((product) =>
    product ? getProductReviews(product.id) : null,
  );

  return (
    <ProductPageContent
      productPromise={productPromise}
      reviewsPromise={reviewsPromise}
      reviewsSlot={
        <Suspense
          fallback={
            <div className="mx-auto max-w-7xl px-4 py-8">
              <div className="h-32 animate-pulse rounded bg-gray-200" />
            </div>
          }
        >
          <ProductReviewsSection productPromise={productPromise} />
        </Suspense>
      }
      relatedProductsSlot={
        <Suspense
          fallback={
            <div className="mx-auto max-w-7xl px-4 py-8">
              <h2 className="mb-4 text-xl font-bold text-gray-900">
                Customers also bought
              </h2>
              <div className="h-24 animate-pulse rounded bg-gray-200" />
            </div>
          }
        >
          <RelatedProducts productPromise={productPromise} />
        </Suspense>
      }
    />
  );
}

async function RelatedProducts({
  productPromise,
}: {
  productPromise: Promise<Product | undefined>;
}) {
  // Await the product promise
  const product = await productPromise;
  if (!product) return null;

  const relatedProducts = await getProductRecommendations(product.id);

  if (!relatedProducts.length) return null;

  // Transform products for Tailwind component
  const transformedRelatedProducts =
    transformProductsToRelatedProducts(relatedProducts);

  return (
    <RelatedProductsComponent
      products={transformedRelatedProducts}
      fullProducts={relatedProducts}
    />
  );
}
