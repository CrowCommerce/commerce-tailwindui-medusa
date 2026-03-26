// backend/src/workflows/hooks/validate-promotion.ts
import {
  updateCartPromotionsWorkflow,
  completeCartWorkflow,
} from "@medusajs/medusa/core-flows"
import { MedusaError, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { FIRST_PURCHASE_PROMOTION_CODE } from "../../constants"

async function validateFirstPurchaseEligibility(
  cartId: string,
  container: any
): Promise<void> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  // Note: only query fields confirmed valid for the "cart" entity in Medusa v2.
  // "customer.has_account" is intentionally omitted — the field name is unverified
  // and the customer.id check (guests have no customer record) is sufficient.
  const { data: carts } = await query.graph({
    entity: "cart",
    fields: ["customer.id", "customer.orders.id"],
    filters: { id: cartId },
  })

  const cart = carts[0]

  // No customer on cart means guest — not eligible
  if (!cart?.customer?.id) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "FIRST_PURCHASE promotion is only available to registered customers"
    )
  }

  if ((cart.customer.orders ?? []).length > 0) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "FIRST_PURCHASE promotion is only available for your first order"
    )
  }
}

// Block ineligible manual application of FIRST_PURCHASE
updateCartPromotionsWorkflow.hooks.validate(
  async ({ input }, { container }) => {
    // input.promo_codes is a flat string[] (not { add: [] })
    const promoCodes: string[] = (input as any).promo_codes ?? []
    if (!promoCodes.includes(FIRST_PURCHASE_PROMOTION_CODE)) return

    // cart_id (not id) identifies the cart for this workflow
    await validateFirstPurchaseEligibility((input as any).cart_id!, container)
  }
)

// Block checkout completion if FIRST_PURCHASE is present but customer is not eligible
completeCartWorkflow.hooks.validate(
  async ({ input, cart }, { container }) => {
    // completeCartWorkflow hook receives { input, cart } where input.id is the cart ID
    const cartId = (input as any).id as string
    const query = container.resolve(ContainerRegistrationKeys.QUERY)

    const { data: carts } = await query.graph({
      entity: "cart",
      fields: ["promotions.code"],
      filters: { id: cartId },
    })

    const fetchedCart = carts[0]
    const hasFirstPurchasePromo = (fetchedCart?.promotions ?? []).some(
      (p) => p?.code === FIRST_PURCHASE_PROMOTION_CODE
    )

    if (!hasFirstPurchasePromo) return

    await validateFirstPurchaseEligibility(cartId, container)
  }
)
