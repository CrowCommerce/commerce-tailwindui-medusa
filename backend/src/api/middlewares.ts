import {
  defineMiddlewares,
  authenticate,
  validateAndTransformBody,
  validateAndTransformQuery,
} from "@medusajs/framework/http"
import { PostStoreReviewSchema } from "./store/reviews/route"
import { PostAdminUpdateReviewsStatusSchema } from "./admin/reviews/status/route"
import { GetAdminReviewsSchema } from "./admin/reviews/route"
import { GetStoreReviewsSchema } from "./store/products/[id]/reviews/route"
import {
  WishlistNameSchema,
  PostCreateWishlistItemSchema,
} from "./store/customers/me/wishlists/validators"
import {
  PostGuestCreateWishlistItemSchema,
  PostImportWishlistSchema,
} from "./store/wishlists/validators"

export default defineMiddlewares({
  routes: [
    {
      method: ["POST"],
      matcher: "/store/reviews",
      middlewares: [
        authenticate("customer", ["session", "bearer"]),
        validateAndTransformBody(PostStoreReviewSchema),
      ],
    },
    {
      matcher: "/admin/reviews",
      method: ["GET"],
      middlewares: [
        validateAndTransformQuery(GetAdminReviewsSchema, {
          isList: true,
          defaults: [
            "id",
            "title",
            "content",
            "rating",
            "product_id",
            "customer_id",
            "status",
            "created_at",
            "updated_at",
            "product.*",
          ],
        }),
      ],
    },
    {
      matcher: "/admin/reviews/status",
      method: ["POST"],
      middlewares: [
        validateAndTransformBody(PostAdminUpdateReviewsStatusSchema),
      ],
    },
    {
      matcher: "/store/products/:id/reviews",
      method: ["GET"],
      middlewares: [
        validateAndTransformQuery(GetStoreReviewsSchema, {
          isList: true,
          defaults: [
            "id",
            "rating",
            "title",
            "first_name",
            "last_name",
            "content",
            "created_at",
          ],
        }),
      ],
    },
    // Customer wishlist routes — auth on all paths
    {
      matcher: "/store/customers/me/wishlists*",
      middlewares: [
        authenticate("customer", ["session", "bearer"]),
      ],
    },
    // Body validation for specific customer wishlist mutations
    {
      matcher: "/store/customers/me/wishlists",
      method: ["POST"],
      middlewares: [
        validateAndTransformBody(WishlistNameSchema),
      ],
    },
    {
      matcher: "/store/customers/me/wishlists/:id",
      method: ["PUT"],
      middlewares: [
        validateAndTransformBody(WishlistNameSchema),
      ],
    },
    {
      matcher: "/store/customers/me/wishlists/:id/items",
      method: ["POST"],
      middlewares: [
        validateAndTransformBody(PostCreateWishlistItemSchema),
      ],
    },
    // Guest wishlist routes — no auth required
    {
      matcher: "/store/wishlists/:id/items",
      method: ["POST"],
      middlewares: [
        validateAndTransformBody(PostGuestCreateWishlistItemSchema),
      ],
    },
    // Import route — requires auth
    {
      matcher: "/store/wishlists/import",
      method: ["POST"],
      middlewares: [
        authenticate("customer", ["session", "bearer"]),
        validateAndTransformBody(PostImportWishlistSchema),
      ],
    },
  ],
})
