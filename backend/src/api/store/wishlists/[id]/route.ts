import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve("query")

  const { data } = await query.graph({
    entity: "wishlist",
    fields: ["*", "items.*", "items.product_variant.*", "items.product_variant.product.*"],
    filters: { id: req.params.id, customer_id: null },
  })

  if (!data.length) {
    return res.status(404).json({ message: "Wishlist not found" })
  }

  res.json({ wishlist: data[0] })
}
