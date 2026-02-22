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
  PostCreateWishlistSchema,
  PutUpdateWishlistSchema,
  PostCreateWishlistItemSchema,
} from "./store/customers/me/wishlists/validators"

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
    // Customer wishlist routes
    {
      matcher: "/store/customers/me/wishlists",
      method: ["POST"],
      middlewares: [
        authenticate("customer", ["session", "bearer"]),
        validateAndTransformBody(PostCreateWishlistSchema),
      ],
    },
    {
      matcher: "/store/customers/me/wishlists",
      method: ["GET"],
      middlewares: [
        authenticate("customer", ["session", "bearer"]),
      ],
    },
    {
      matcher: "/store/customers/me/wishlists/:id",
      middlewares: [
        authenticate("customer", ["session", "bearer"]),
      ],
    },
    {
      matcher: "/store/customers/me/wishlists/:id",
      method: ["PUT"],
      middlewares: [
        authenticate("customer", ["session", "bearer"]),
        validateAndTransformBody(PutUpdateWishlistSchema),
      ],
    },
    {
      matcher: "/store/customers/me/wishlists/:id/items",
      method: ["POST"],
      middlewares: [
        authenticate("customer", ["session", "bearer"]),
        validateAndTransformBody(PostCreateWishlistItemSchema),
      ],
    },
    {
      matcher: "/store/customers/me/wishlists/:id/items/:itemId",
      middlewares: [
        authenticate("customer", ["session", "bearer"]),
      ],
    },
    {
      matcher: "/store/customers/me/wishlists/:id/share",
      middlewares: [
        authenticate("customer", ["session", "bearer"]),
      ],
    },
    {
      matcher: "/store/customers/me/wishlists/:id/transfer",
      middlewares: [
        authenticate("customer", ["session", "bearer"]),
      ],
    },
  ],
})
