import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { PRODUCT_REVIEW_MODULE } from "../../../../../modules/product-review";
import type ProductReviewModuleService from "../../../../../modules/product-review/service";
import { z } from "@medusajs/framework/zod";

function parseOptionalNumber(value: unknown) {
  if (typeof value === "string") {
    return parseInt(value, 10);
  }

  return value;
}

function parseOptionalBoolean(value: unknown) {
  if (typeof value === "string") {
    if (value === "true") {
      return true;
    }

    if (value === "false") {
      return false;
    }
  }

  return value;
}

export const GetStoreReviewsSchema = z.object({
  fields: z.string().optional(),
  offset: z.preprocess(parseOptionalNumber, z.number().optional().default(0)),
  limit: z.preprocess(parseOptionalNumber, z.number().optional().default(20)),
  order: z.string().optional(),
  with_deleted: z.preprocess(parseOptionalBoolean, z.boolean().optional()),
});

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params;

  const query = req.scope.resolve("query");
  const reviewService: ProductReviewModuleService = req.scope.resolve(
    PRODUCT_REVIEW_MODULE,
  );

  const [queryResult, averageRating, ratingDistribution] = await Promise.all([
    query.graph({
      entity: "review",
      filters: {
        product_id: id,
        status: "approved",
      },
      ...req.queryConfig,
    }),
    reviewService.getAverageRating(id),
    reviewService.getRatingDistribution(id),
  ]);

  const {
    data: reviews,
    metadata: { count, take, skip } = { count: 0, take: 10, skip: 0 },
  } = queryResult;

  res.json({
    reviews,
    count,
    limit: take,
    offset: skip,
    average_rating: averageRating,
    rating_distribution: ratingDistribution,
  });
};
