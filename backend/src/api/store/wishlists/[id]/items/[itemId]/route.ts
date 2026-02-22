import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { deleteWishlistItemWorkflow } from "../../../../../../workflows/delete-wishlist-item"

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const { result } = await deleteWishlistItemWorkflow(req.scope).run({
    input: {
      wishlist_item_id: req.params.itemId,
      wishlist_id: req.params.id,
    },
  })

  res.json({ wishlist: result.wishlist })
}
