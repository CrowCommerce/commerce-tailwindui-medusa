import type { MedusaStoreRequest, MedusaResponse } from "@medusajs/framework/http"
import { createWishlistWorkflow } from "../../../workflows/create-wishlist"
import { requireSalesChannelId } from "./helpers"

export async function POST(req: MedusaStoreRequest, res: MedusaResponse) {
  const salesChannelId = requireSalesChannelId(req)

  const { result } = await createWishlistWorkflow(req.scope).run({
    input: {
      sales_channel_id: salesChannelId,
      // No customer_id — this is a guest wishlist
    },
  })

  res.status(201).json({ wishlist: result.wishlist })
}
