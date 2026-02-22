import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { transferWishlistWorkflow } from "../../../../../../../workflows/transfer-wishlist"

export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  if (!req.publishable_key_context?.sales_channel_ids.length) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "At least one sales channel ID is required"
    )
  }

  const { result } = await transferWishlistWorkflow(req.scope).run({
    input: {
      wishlist_id: req.params.id,
      customer_id: req.auth_context.actor_id,
      sales_channel_id: req.publishable_key_context.sales_channel_ids[0],
    },
  })

  res.json({ wishlist: result.wishlist })
}
