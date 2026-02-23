import type { MedusaRequest, MedusaStoreRequest } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import jwt, { TokenExpiredError } from "jsonwebtoken"

/**
 * Verifies a JWT share token and returns the embedded wishlist_id.
 * Throws MedusaError on invalid, expired, or malformed tokens.
 */
export function verifyShareToken(
  req: MedusaRequest,
  token: string,
  expiredMessage = "This share link has expired"
): string {
  const { http } = req.scope.resolve("configModule").projectConfig
  if (!http.jwtSecret) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "JWT secret is not configured")
  }

  let decoded: unknown
  try {
    decoded = jwt.verify(token, http.jwtSecret)
  } catch (e) {
    if (e instanceof TokenExpiredError) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, expiredMessage)
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

  return (decoded as { wishlist_id: string }).wishlist_id
}

/**
 * Verifies that the given wishlist ID belongs to a guest wishlist
 * (customer_id is null). Throws MedusaError if not found.
 */
export async function requireGuestWishlist(
  req: MedusaRequest,
  wishlistId: string
): Promise<void> {
  const query = req.scope.resolve("query")
  const { data } = await query.graph({
    entity: "wishlist",
    fields: ["id"],
    filters: { id: wishlistId, customer_id: null },
  })

  if (!data.length) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Wishlist not found")
  }
}

/**
 * Extracts the first sales channel ID from the publishable key context.
 * Throws MedusaError if no sales channel is present.
 */
export function requireSalesChannelId(
  req: MedusaStoreRequest | { publishable_key_context?: { sales_channel_ids: string[] } }
): string {
  const [salesChannelId] = req.publishable_key_context?.sales_channel_ids ?? []
  if (!salesChannelId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "At least one sales channel ID is required"
    )
  }
  return salesChannelId
}
