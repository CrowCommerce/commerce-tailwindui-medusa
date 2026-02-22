import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"

export default async function reviewCreatedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string; product_id: string }>) {
  const logger = container.resolve("logger")

  logger.info(
    `[ProductReview] Review created — review ${data.id} for product ${data.product_id}`
  )
}

export const config: SubscriberConfig = {
  event: "product_review.created",
}
