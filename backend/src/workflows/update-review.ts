import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { updateReviewsStep, type UpdateReviewsStepInput } from "./steps/update-review"
import { refreshReviewStatsForReviewsStep } from "./steps/refresh-review-stats"

export const updateReviewWorkflow = createWorkflow(
  "update-review",
  function (input: UpdateReviewsStepInput) {
    const reviews = updateReviewsStep(input)

    refreshReviewStatsForReviewsStep(reviews)

    return new WorkflowResponse({
      reviews,
    })
  }
)
