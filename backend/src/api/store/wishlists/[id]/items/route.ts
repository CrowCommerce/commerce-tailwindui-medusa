import type { MedusaStoreRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"
import { createWishlistItemWorkflow } from "../../../../../workflows/create-wishlist-item"
import { PostGuestCreateWishlistItemSchema } from "../../validators"

type PostReq = z.infer<typeof PostGuestCreateWishlistItemSchema>

export async function POST(req: MedusaStoreRequest<PostReq>, res: MedusaResponse) {
  if (!req.publishable_key_context?.sales_channel_ids.length) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "At least one sales channel ID is required"
    )
  }

  const { result } = await createWishlistItemWorkflow(req.scope).run({
    input: {
      variant_id: req.validatedBody.variant_id,
      wishlist_id: req.params.id,
      sales_channel_id: req.publishable_key_context.sales_channel_ids[0],
    },
  })

  res.json({ wishlist: result.wishlist })
}
