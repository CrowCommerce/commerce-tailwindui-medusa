import { InjectManager, MedusaService, MedusaContext } from "@medusajs/framework/utils"
import Review from "./models/review"
import { Context } from "@medusajs/framework/types"
import { EntityManager } from "@medusajs/framework/mikro-orm/knex"

class ProductReviewModuleService extends MedusaService({
  Review,
}) {
  @InjectManager()
  async getAverageRating(
    productId: string,
    @MedusaContext() sharedContext?: Context<EntityManager>
  ): Promise<number> {
    const result = await sharedContext?.manager?.execute(
      `SELECT AVG(rating) as average FROM review WHERE product_id = $1 AND status = 'approved'`,
      [productId]
    )

    return parseFloat(parseFloat(result?.[0]?.average ?? 0).toFixed(2))
  }

  @InjectManager()
  async getRatingDistribution(
    productId: string,
    @MedusaContext() sharedContext?: Context<EntityManager>
  ): Promise<{ rating: number; count: number }[]> {
    const result = await sharedContext?.manager?.execute(
      `SELECT rating::int as rating, COUNT(*)::int as count
       FROM review
       WHERE product_id = $1 AND status = 'approved'
       GROUP BY rating::int
       ORDER BY rating DESC`,
      [productId]
    )

    return result ?? []
  }
}

export default ProductReviewModuleService
