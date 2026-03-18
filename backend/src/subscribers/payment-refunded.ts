import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { sendRefundConfirmationWorkflow } from "../workflows/notifications/send-refund-confirmation"

export default async function paymentRefundedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve("logger")

  try {
    await sendRefundConfirmationWorkflow(container).run({
      input: { paymentId: data.id },
    })
    logger.info(`Refund confirmation email sent for payment ${data.id}`)
  } catch (error) {
    logger.error(
      `Failed to send refund confirmation for payment ${data.id}`,
      error
    )
  }
}

export const config: SubscriberConfig = {
  event: "payment.refunded",
}
