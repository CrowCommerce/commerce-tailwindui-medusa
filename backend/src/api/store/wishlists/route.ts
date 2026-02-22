import type { MedusaStoreRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { createWishlistWorkflow } from "../../../workflows/create-wishlist"

export async function POST(req: MedusaStoreRequest, res: MedusaResponse) {
  const [salesChannelId] = req.publishable_key_context?.sales_channel_ids ?? []
  if (!salesChannelId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "At least one sales channel ID is required"
    )
  }

  const { result } = await createWishlistWorkflow(req.scope).run({
    input: {
      sales_channel_id: salesChannelId,
      // No customer_id — this is a guest wishlist
    },
  })

  res.status(201).json({ wishlist: result.wishlist })
}
