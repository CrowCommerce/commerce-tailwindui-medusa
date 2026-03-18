import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { MedusaError } from "@medusajs/framework/utils"
import {
  useQueryGraphStep,
  sendNotificationsStep,
  updateCartsStep,
} from "@medusajs/medusa/core-flows"
import { generateCartRecoveryTokenStep } from "../steps/generate-cart-recovery-token"
import { formatCartForEmailStep } from "../steps/format-cart-for-email"

type SendAbandonedCartEmailInput = {
  cart_id: string
  email: string
}

export const sendAbandonedCartEmailWorkflow = createWorkflow(
  "send-abandoned-cart-email",
  function (input: SendAbandonedCartEmailInput) {
    const { data: carts } = useQueryGraphStep({
      entity: "cart",
      fields: [
        "id",
        "email",
        "currency_code",
        "items.*",
        "items.variant.*",
        "items.variant.product.*",
        "metadata",
        "customer.first_name",
        "item_subtotal",
      ],
      filters: { id: input.cart_id },
    })

    const cart = transform({ carts }, ({ carts: result }) => {
      const c = result[0]
      if (!c?.email) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "Cart has no email address, cannot send abandoned cart notification"
        )
      }
      return c
    })

    const recoveryToken = generateCartRecoveryTokenStep({
      cart_id: input.cart_id,
    })

    const formatInput = transform(
      { cart, recoveryToken },
      ({ cart: c, recoveryToken: rt }) => ({
        cart: c,
        recoveryUrl: rt.recoveryUrl,
      })
    )

    const formatted = formatCartForEmailStep(formatInput)

    const notifications = transform(
      { formatted, cart },
      ({ formatted: data, cart: c }) => [
        {
          to: (c.email as string).toLowerCase(),
          channel: "email" as const,
          template: "abandoned-cart",
          data,
          trigger_type: "cart.abandoned",
          resource_id: c.id as string,
          resource_type: "cart",
        },
      ]
    )

    sendNotificationsStep(notifications)

    const cartUpdate = transform({ cart }, ({ cart: c }) => [
      {
        id: c.id as string,
        metadata: {
          ...((c.metadata as Record<string, unknown>) || {}),
          abandoned_cart_notified: new Date().toISOString(),
        },
      },
    ])

    updateCartsStep(cartUpdate)

    return new WorkflowResponse({ cart_id: input.cart_id })
  }
)
