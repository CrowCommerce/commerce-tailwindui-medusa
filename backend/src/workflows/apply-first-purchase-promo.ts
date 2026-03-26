// backend/src/workflows/apply-first-purchase-promo.ts
import {
  createStep,
  createWorkflow,
  StepResponse,
  transform,
  when,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  useQueryGraphStep,
  updateCartPromotionsStep,
} from "@medusajs/medusa/core-flows"
import { PromotionActions } from "@medusajs/framework/utils"
import { FIRST_PURCHASE_PROMOTION_CODE } from "../constants"

type Input = { cart_id: string }

/**
 * Pure eligibility check — runs after data is fetched, returns whether
 * the promotion should be applied and the cart_id to apply it to.
 */
const checkFirstPurchaseEligibilityStep = createStep(
  "check-first-purchase-eligibility",
  async (input: {
    cart: {
      id: string
      promotions?: { code: string }[]
      customer?: { id: string; orders?: { id: string }[] }
    } | undefined
    promotion: { id: string; code: string } | undefined
  }) => {
    const { cart, promotion } = input

    if (!cart || !promotion) {
      return new StepResponse({ eligible: false, cart_id: null as string | null })
    }
    if (!cart.customer?.id) {
      return new StepResponse({ eligible: false, cart_id: null as string | null })
    }
    if ((cart.customer.orders ?? []).length > 0) {
      return new StepResponse({ eligible: false, cart_id: null as string | null })
    }
    const alreadyApplied = (cart.promotions ?? []).some(
      (p) => p.code === FIRST_PURCHASE_PROMOTION_CODE
    )
    if (alreadyApplied) {
      return new StepResponse({ eligible: false, cart_id: null as string | null })
    }

    return new StepResponse({ eligible: true, cart_id: cart.id })
  }
)

export const applyFirstPurchasePromoWorkflow = createWorkflow(
  "apply-first-purchase-promo",
  (input: Input) => {
    // Fetch cart with its applied promotions, customer, and customer's order history
    const { data: carts } = useQueryGraphStep({
      entity: "cart",
      fields: [
        "id",
        "promotions.code",
        "customer.id",
        "customer.orders.id",
      ],
      filters: { id: input.cart_id },
    })

    // Fetch the first-purchase promotion by code
    const { data: promotions } = useQueryGraphStep({
      entity: "promotion",
      fields: ["id", "code"],
      filters: { code: FIRST_PURCHASE_PROMOTION_CODE },
    }).config({ name: "get-first-purchase-promotion" })

    // Determine eligibility
    const eligibility = checkFirstPurchaseEligibilityStep(
      transform({ carts, promotions }, ({ carts, promotions }) => ({
        cart: carts[0] as {
          id: string
          promotions?: { code: string }[]
          customer?: { id: string; orders?: { id: string }[] }
        } | undefined,
        promotion: promotions[0] as { id: string; code: string } | undefined,
      }))
    )

    // Only apply when eligible — use (data) => data.eligibility.eligible pattern,
    // NOT destructuring, to match how `when` is used elsewhere in this codebase
    when({ eligibility }, (data) => data.eligibility.eligible).then(
      () => {
        updateCartPromotionsStep({
          id: eligibility.cart_id!,
          promo_codes: [FIRST_PURCHASE_PROMOTION_CODE],
          action: PromotionActions.ADD,
        })
      }
    )

    return new WorkflowResponse({})
  }
)
