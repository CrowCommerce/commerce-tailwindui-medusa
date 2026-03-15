import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"
import { defaultEmailConfig } from "../modules/resend/templates/_config/email-config"

export default async function customerCreatedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve("logger")

  try {
    const customerModuleService = container.resolve(Modules.CUSTOMER)
    const customer = await customerModuleService.retrieveCustomer(data.id)

    if (!customer.email) {
      logger.warn(`Customer ${data.id} has no email address, skipping welcome email`)
      return
    }

    // Build customer name, or null if neither first nor last name exists
    const customerName = [customer.first_name, customer.last_name]
      .filter(Boolean)
      .join(" ") || null

    const storefrontUrl = (process.env.STOREFRONT_URL || "http://localhost:3000").replace(/\/$/, "")
    const storeName = defaultEmailConfig.companyName
    const notificationService = container.resolve(Modules.NOTIFICATION)

    await notificationService.createNotifications({
      to: customer.email,
      channel: "email",
      template: "welcome",
      data: {
        subject: `Welcome to ${storeName}`,
        customerName,
        shopUrl: storefrontUrl,
        accountUrl: `${storefrontUrl}/account`,
        storeName,
      },
    })

    logger.info(`Welcome email sent to ${customer.email} (customer ${data.id})`)
  } catch (error) {
    logger.error(
      `Failed to send welcome email for customer ${data.id}`,
      error
    )
  }
}

export const config: SubscriberConfig = {
  event: "customer.created",
}
