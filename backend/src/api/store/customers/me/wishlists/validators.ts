import { z } from "@medusajs/framework/zod"

export const PostCreateWishlistSchema = z.object({
  name: z.string().optional(),
})

export const PutUpdateWishlistSchema = z.object({
  name: z.string().optional(),
})

export const PostCreateWishlistItemSchema = z.object({
  variant_id: z.string(),
})
