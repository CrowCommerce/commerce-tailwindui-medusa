import type { MedusaStoreRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"
import { createWishlistItemWorkflow } from "../../../../../workflows/create-wishlist-item"
import { PostGuestCreateWishlistItemSchema } from "../../validators"

type PostReq = z.infer<typeof PostGuestCreateWishlistItemSchema>

export async function POST(req: MedusaStoreRequest<PostReq>, res: MedusaResponse) {
  const [salesChannelId] = req.publishable_key_context?.sales_channel_ids ?? []
  if (!salesChannelId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "At least one sales channel ID is required"
    )
  }

  // Verify this is a guest wishlist (not a customer wishlist)
  const query = req.scope.resolve("query")
  const { data } = await query.graph({
    entity: "wishlist",
    fields: ["id"],
    filters: {
      id: req.params.id,
      customer_id: null,
    },
  })

  if (!data.length) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Wishlist not found")
  }

  const { result } = await createWishlistItemWorkflow(req.scope).run({
    input: {
      variant_id: req.validatedBody.variant_id,
      wishlist_id: req.params.id,
      sales_channel_id: salesChannelId,
    },
  })

  res.json({ wishlist: result.wishlist })
}
