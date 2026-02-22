import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { createReviewStep, type CreateReviewStepInput } from "./steps/create-review"
import { refreshReviewStatsStep } from "./steps/refresh-review-stats"
import { useQueryGraphStep } from "@medusajs/medusa/core-flows"

export const createReviewWorkflow = createWorkflow(
  "create-review",
  function (input: CreateReviewStepInput) {
    useQueryGraphStep({
      entity: "product",
      fields: ["id"],
      filters: {
        id: input.product_id,
      },
      options: {
        throwIfKeyNotFound: true,
      },
    })

    const review = createReviewStep(input)

    const statsInput = transform({ input }, (data) => ({
      product_id: data.input.product_id,
    }))

    refreshReviewStatsStep(statsInput)

    return new WorkflowResponse({
      review,
    })
  }
)
