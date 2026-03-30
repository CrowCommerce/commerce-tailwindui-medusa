import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
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

export const GetAdminReviewsSchema = z.object({
  fields: z.string().optional(),
  offset: z.preprocess(parseOptionalNumber, z.number().optional().default(0)),
  limit: z.preprocess(parseOptionalNumber, z.number().optional().default(20)),
  order: z.string().optional(),
  with_deleted: z.preprocess(parseOptionalBoolean, z.boolean().optional()),
});

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const query = req.scope.resolve("query");

  const {
    data: reviews,
    metadata: { count, take, skip } = {
      count: 0,
      take: 20,
      skip: 0,
    },
  } = await query.graph({
    entity: "review",
    ...req.queryConfig,
  });

  res.json({
    reviews,
    count,
    limit: take,
    offset: skip,
  });
};
