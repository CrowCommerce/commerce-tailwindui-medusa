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
  const [salesChannelId] = req.publishable_key_context?.sales_channel_ids ?? []
  if (!salesChannelId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "At least one sales channel ID is required"
    )
  }

  const { http } = req.scope.resolve("configModule").projectConfig
  if (!http.jwtSecret) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "JWT secret is not configured")
  }

  let decoded: unknown
  try {
    decoded = jwt.verify(req.validatedBody.share_token, http.jwtSecret)
  } catch (e) {
    if (e instanceof TokenExpiredError) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        "This share link has expired"
      )
    }
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Invalid share token")
  }

  if (
    typeof decoded !== "object" ||
    decoded === null ||
    !("wishlist_id" in decoded) ||
    typeof (decoded as Record<string, unknown>).wishlist_id !== "string"
  ) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Invalid share token")
  }

  const { wishlist_id } = decoded as { wishlist_id: string }

  const query = req.scope.resolve("query")
  const wishlistService: WishlistModuleService = req.scope.resolve(WISHLIST_MODULE)

  // Fetch source wishlist
  const { data } = await query.graph({
    entity: "wishlist",
    fields: ["*", "items.*"],
    filters: { id: wishlist_id },
  })

  if (!data.length) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Source wishlist not found")
  }

  const source = data[0]

  // Clone: create new wishlist for this customer
  const newWishlist = await wishlistService.createWishlists({
    customer_id: req.auth_context.actor_id,
    sales_channel_id: salesChannelId,
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
      } catch (err) {
        // Skip duplicate-key violations; log anything else
        const message = err instanceof Error ? err.message : String(err)
        if (!message.includes("unique") && !message.includes("duplicate")) {
          console.warn(`[wishlist-import] Failed to clone item ${item.product_variant_id}:`, message)
        }
      }
    }
  }

  // Fetch the complete new wishlist
  const { data: result } = await query.graph({
    entity: "wishlist",
    fields: ["*", "items.*", "items.product_variant.*", "items.product_variant.product.*"],
    filters: { id: newWishlist.id },
  })

  res.status(201).json({ wishlist: result[0] })
}
