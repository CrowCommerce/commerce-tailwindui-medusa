import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"
import jwt, { TokenExpiredError } from "jsonwebtoken"
import { WISHLIST_MODULE } from "../../../../modules/wishlist"
import WishlistModuleService from "../../../../modules/wishlist/service"
import { PostImportWishlistSchema } from "../validators"

type PostReq = z.infer<typeof PostImportWishlistSchema>

export async function POST(
  req: AuthenticatedMedusaRequest<PostReq>,
  res: MedusaResponse
) {
  if (!req.publishable_key_context?.sales_channel_ids.length) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "At least one sales channel ID is required"
    )
  }

  const { http } = req.scope.resolve("configModule").projectConfig

  let decoded: { wishlist_id: string }
  try {
    decoded = jwt.verify(req.validatedBody.share_token, http.jwtSecret!) as { wishlist_id: string }
  } catch (e) {
    if (e instanceof TokenExpiredError) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        "This share link has expired"
      )
    }
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Invalid share token")
  }

  const query = req.scope.resolve("query")
  const wishlistService: WishlistModuleService = req.scope.resolve(WISHLIST_MODULE)

  // Fetch source wishlist
  const { data } = await query.graph({
    entity: "wishlist",
    fields: ["*", "items.*"],
    filters: { id: decoded.wishlist_id },
  })

  if (!data.length) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Source wishlist not found")
  }

  const source = data[0]

  // Clone: create new wishlist for this customer
  const newWishlist = await wishlistService.createWishlists({
    customer_id: req.auth_context.actor_id,
    sales_channel_id: req.publishable_key_context.sales_channel_ids[0],
    name: source.name ? `${source.name} (imported)` : "Imported Wishlist",
  })

  // Clone items
  if (source.items?.length) {
    for (const item of source.items) {
      if (!item) continue
      try {
        await wishlistService.createWishlistItems({
          wishlist_id: newWishlist.id,
          product_variant_id: item.product_variant_id,
        })
      } catch {
        // Skip duplicates or invalid variants
      }
    }
  }

  // Fetch the complete new wishlist
  const { data: result } = await query.graph({
    entity: "wishlist",
    fields: ["*", "items.*", "items.product_variant.*"],
    filters: { id: newWishlist.id },
  })

  res.status(201).json({ wishlist: result[0] })
}
