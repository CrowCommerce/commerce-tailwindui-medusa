import type { MedusaStoreRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { createWishlistWorkflow } from "../../../workflows/create-wishlist"

export async function POST(req: MedusaStoreRequest, res: MedusaResponse) {
  if (!req.publishable_key_context?.sales_channel_ids.length) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "At least one sales channel ID is required"
    )
  }

  const { result } = await createWishlistWorkflow(req.scope).run({
    input: {
      sales_channel_id: req.publishable_key_context.sales_channel_ids[0],
      // No customer_id — this is a guest wishlist
    },
  })

  res.status(201).json({ wishlist: result.wishlist })
}
