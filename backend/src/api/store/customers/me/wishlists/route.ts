import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"
import { createWishlistWorkflow } from "../../../../../workflows/create-wishlist"
import { PostCreateWishlistSchema } from "./validators"

type PostReq = z.infer<typeof PostCreateWishlistSchema>

export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const query = req.scope.resolve("query")

  const { data } = await query.graph({
    entity: "wishlist",
    fields: ["*", "items.*", "items.product_variant.*"],
    filters: {
      customer_id: req.auth_context.actor_id,
    },
  })

  res.json({ wishlists: data })
}

export async function POST(
  req: AuthenticatedMedusaRequest<PostReq>,
  res: MedusaResponse
) {
  if (!req.publishable_key_context?.sales_channel_ids.length) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "At least one sales channel ID is required"
    )
  }

  const { result } = await createWishlistWorkflow(req.scope).run({
    input: {
      customer_id: req.auth_context.actor_id,
      sales_channel_id: req.publishable_key_context.sales_channel_ids[0],
      name: req.validatedBody?.name,
    },
  })

  res.status(201).json({ wishlist: result.wishlist })
}
