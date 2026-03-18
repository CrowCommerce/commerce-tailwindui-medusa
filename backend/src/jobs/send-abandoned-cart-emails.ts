import { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { sendAbandonedCartEmailWorkflow } from "../workflows/notifications/send-abandoned-cart-email"

type AbandonedCartRow = {
  id: string
  email: string
  items: unknown[]
  metadata: Record<string, unknown> | null
  updated_at: string
}

export default async function abandonedCartJob(
  container: MedusaContainer
) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const logger = container.resolve("logger")

  const startTime = Date.now()
  const limit = 100
  let offset = 0
  let totalSent = 0
  let totalErrors = 0

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
  const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000)

  logger.info("Starting abandoned cart email job...")

  try {
    do {
      const { data: carts } = await query.graph({
        entity: "cart",
        fields: [
          "id",
          "email",
          "items.*",
          "metadata",
          "updated_at",
        ],
        filters: {
          completed_at: null,
          updated_at: {
            $lt: oneHourAgo,
            $gt: fortyEightHoursAgo,
          },
          email: { $ne: null },
        },
        pagination: { skip: offset, take: limit },
      })

      const eligibleCarts = (carts as AbandonedCartRow[]).filter(
        (cart) =>
          cart.items?.length > 0 &&
          !cart.metadata?.abandoned_cart_notified
      )

      for (const cart of eligibleCarts) {
        try {
          await sendAbandonedCartEmailWorkflow(container).run({
            input: { cart_id: cart.id },
          })
          totalSent++
          logger.info(`Sent abandoned cart email for cart ${cart.id}`)
        } catch (error: any) {
          totalErrors++
          logger.error(
            `Failed to send abandoned cart email for cart ${cart.id}: ${error?.message}`
          )
        }
      }

      offset += limit
      if (carts.length < limit) break // No more pages
    } while (true)

    const duration = Date.now() - startTime
    logger.info(
      `Abandoned cart job complete: ${totalSent} sent, ${totalErrors} errors in ${duration}ms`
    )
  } catch (error: any) {
    logger.error(`Abandoned cart job failed: ${error?.message}`)
  }
}

export const config = {
  name: "send-abandoned-cart-emails",
  schedule: "*/15 * * * *",
}
