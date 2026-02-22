import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import jwt, { TokenExpiredError } from "jsonwebtoken"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { http } = req.scope.resolve("configModule").projectConfig

  let decoded: { wishlist_id: string }
  try {
    decoded = jwt.verify(req.params.token, http.jwtSecret!) as { wishlist_id: string }
  } catch (e) {
    if (e instanceof TokenExpiredError) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        "This wishlist link has expired. Ask the owner to share a new link."
      )
    }
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Invalid share link")
  }

  const query = req.scope.resolve("query")

  const { data } = await query.graph({
    entity: "wishlist",
    fields: ["*", "items.*", "items.product_variant.*"],
    filters: { id: decoded.wishlist_id },
  })

  if (!data.length) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Wishlist not found")
  }

  res.json({ wishlist: data[0] })
}
