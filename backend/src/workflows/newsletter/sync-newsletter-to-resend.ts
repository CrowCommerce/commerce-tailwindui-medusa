import {
  createWorkflow,
  createStep,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { Resend } from "resend"
import { NEWSLETTER_MODULE } from "../../modules/newsletter"
import NewsletterModuleService from "../../modules/newsletter/service"

type SyncInput = {
  email: string
  subscriber_id: string
}

const syncToResendStep = createStep(
  "sync-newsletter-to-resend",
  async (input: SyncInput, { container }) => {
    const audienceId = process.env.RESEND_AUDIENCE_ID
    const apiKey = process.env.RESEND_API_KEY

    if (!audienceId || !apiKey) {
      return new StepResponse({ skipped: true })
    }

    const resend = new Resend(apiKey)
    const logger = container.resolve("logger")

    const { data, error } = await resend.contacts.create({
      email: input.email,
      audienceId,
      unsubscribed: false,
    })

    if (error) {
      logger.warn(
        `[newsletter] Failed to sync ${input.email} to Resend Audience: ${error.message}`
      )
      return new StepResponse({ skipped: false, error: error.message })
    }

    if (data?.id) {
      const newsletterService: NewsletterModuleService =
        container.resolve(NEWSLETTER_MODULE)

      await newsletterService.updateSubscribers({
        id: input.subscriber_id,
        resend_contact_id: data.id,
      })
    }

    return new StepResponse({ skipped: false, contactId: data?.id })
  }
)

export const syncNewsletterToResendWorkflow = createWorkflow(
  "sync-newsletter-to-resend",
  function (input: SyncInput) {
    const result = syncToResendStep(input)
    return new WorkflowResponse(result)
  }
)
