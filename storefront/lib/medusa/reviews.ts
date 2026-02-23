"use server";

import { sdk } from "lib/medusa";
import { TAGS } from "lib/constants";
import type { ProductReviews, Review } from "lib/types";
import { revalidatePath, revalidateTag } from "next/cache";
import { cacheLife, cacheTag } from "next/cache";
import { getAuthHeaders } from "lib/medusa/cookies";
import { retrieveCustomer } from "lib/medusa/customer";

export type ReviewActionResult = { error?: string; success?: boolean } | null;

export async function getProductReviews(
  productId: string,
  { limit = 10, offset = 0 }: { limit?: number; offset?: number } = {},
): Promise<ProductReviews> {
  "use cache";
  cacheTag(TAGS.reviews);
  cacheLife("days");

  const emptyResult: ProductReviews = {
    reviews: [],
    averageRating: 0,
    count: 0,
    ratingDistribution: [5, 4, 3, 2, 1].map((rating) => ({ rating, count: 0 })),
  };

  let response;
  try {
    response = await sdk.client.fetch<{
      reviews: Review[];
      average_rating: number;
      count: number;
      limit: number;
      offset: number;
      rating_distribution: { rating: number; count: number }[];
    }>(`/store/products/${productId}/reviews`, {
      method: "GET",
      query: {
        limit,
        offset,
        order: "-created_at",
      },
    });
  } catch {
    return emptyResult;
  }

  // Build full 1-5 distribution (fill missing ratings with 0)
  const distributionMap = new Map(
    response.rating_distribution.map((d) => [d.rating, d.count]),
  );
  const ratingDistribution = [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: distributionMap.get(rating) ?? 0,
  }));

  return {
    reviews: response.reviews,
    averageRating: response.average_rating,
    count: response.count,
    ratingDistribution,
  };
}

export async function addProductReview(
  prevState: ReviewActionResult,
  formData: FormData,
): Promise<ReviewActionResult> {
  const productId = formData.get("product_id") as string;
  const title = (formData.get("title") as string)?.trim() || undefined;
  const content = (formData.get("content") as string)?.trim();
  const rating = Number(formData.get("rating"));

  // Parse image URLs from hidden form field (JSON-encoded array)
  const imagesJson = formData.get("images") as string | null;
  let images: { url: string; sort_order: number }[] = [];
  if (imagesJson) {
    try {
      const parsed = JSON.parse(imagesJson);
      if (Array.isArray(parsed)) {
        images = parsed;
      }
    } catch {
      // Malformed JSON — proceed without images
    }
  }

  if (!content) return { error: "Review content is required" };
  if (!rating || rating < 1 || rating > 5)
    return { error: "Please select a rating" };

  const customer = await retrieveCustomer();
  if (!customer) return { error: "You must be logged in to leave a review" };

  const headers = await getAuthHeaders();

  try {
    await sdk.client.fetch("/store/reviews", {
      method: "POST",
      headers,
      body: {
        product_id: productId,
        title,
        content,
        rating,
        first_name: customer.first_name || "Customer",
        last_name: customer.last_name || "",
        ...(images.length > 0 ? { images } : {}),
      },
    });
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Error submitting review",
    };
  } finally {
    revalidateTag(TAGS.reviews, "max");
    revalidatePath("/", "layout");
  }

  return { success: true };
}

export async function uploadReviewImages(
  files: File[],
): Promise<{ id: string; url: string }[]> {
  const headers = await getAuthHeaders();

  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));

  try {
    const response = await sdk.client.fetch<{
      files: { id: string; url: string }[];
    }>("/store/reviews/uploads", {
      method: "POST",
      headers,
      body: formData,
    });

    return response.files;
  } catch (e) {
    throw new Error(
      "Failed to upload review images",
      { cause: e },
    );
  }
}
