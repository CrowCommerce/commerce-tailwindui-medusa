import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import jwt, { TokenExpiredError } from "jsonwebtoken"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { http } = req.scope.resolve("configModule").projectConfig

  let decoded: unknown
  try {
    decoded = jwt.verify(req.params.token, http.jwtSecret!)
  } catch (e) {
    if (e instanceof TokenExpiredError) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        "This wishlist link has expired. Ask the owner to share a new link."
      )
    }
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Invalid share link")
  }

  if (
    typeof decoded !== "object" ||
    decoded === null ||
    !("wishlist_id" in decoded) ||
    typeof (decoded as Record<string, unknown>).wishlist_id !== "string"
  ) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Invalid share link")
  }

  const { wishlist_id } = decoded as { wishlist_id: string }

  const query = req.scope.resolve("query")

  const { data } = await query.graph({
    entity: "wishlist",
    fields: ["*", "items.*", "items.product_variant.*", "items.product_variant.product.*"],
    filters: { id: wishlist_id },
  })

  if (!data.length) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Wishlist not found")
  }

  res.json({ wishlist: data[0] })
}
