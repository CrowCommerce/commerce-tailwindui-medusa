import {
  AbstractNotificationProviderService,
  MedusaError,
} from "@medusajs/framework/utils"
import type {
  Logger,
  ProviderSendNotificationDTO,
  ProviderSendNotificationResultsDTO,
} from "@medusajs/framework/types"
import React from "react"
import { Resend } from "resend"
import { render } from "@react-email/render"
import {
  OrderConfirmation,
  isValidOrderConfirmationData,
} from "./templates/order-confirmation"
import {
  PasswordReset,
  isValidPasswordResetData,
} from "./templates/password-reset"
import {
  InviteUser,
  isValidInviteUserData,
} from "./templates/invite-user"
import {
  Welcome,
  isValidWelcomeData,
} from "./templates/welcome"
import {
  ShippingConfirmation,
  isValidShippingConfirmationData,
} from "./templates/shipping-confirmation"
import {
  OrderCanceled,
  isValidOrderCanceledData,
} from "./templates/order-canceled"
import {
  RefundConfirmation,
  isValidRefundConfirmationData,
} from "./templates/refund-confirmation"
import {
  AdminOrderAlert,
  isValidAdminOrderAlertData,
} from "./templates/admin-order-alert"
import {
  AbandonedCart,
  isValidAbandonedCartData,
} from "./templates/abandoned-cart"
import { EmailTemplates } from "./templates/template-registry"

type ResendOptions = {
  api_key: string
  from: string
}

type InjectedDependencies = {
  logger: Logger
}

/** Caller-controlled email options passed via notification.data.emailOptions */
type EmailOptions = {
  from?: string
  replyTo?: string | string[]
  cc?: string | string[]
  bcc?: string | string[]
  tags?: Array<{ name: string; value: string }>
  text?: string
  headers?: Record<string, string>
  scheduledAt?: string
}

/** File attachment passed via notification.data.attachments */
type EmailAttachment = {
  content?: string | Buffer
  filename?: string
  path?: string
  content_type?: string
}

type TemplateEntry = {
  component: React.FC<any>
  validate: (data: unknown) => boolean
  defaultSubject: string
}

class ResendNotificationProviderService extends AbstractNotificationProviderService {
  static identifier = "notification-resend"
  private resendClient: Resend
  private options: ResendOptions
  private logger: Logger

  private templateRegistry: Record<string, TemplateEntry> = {
    [EmailTemplates.ORDER_CONFIRMATION]: {
      component: OrderConfirmation,
      validate: isValidOrderConfirmationData,
      defaultSubject: "Order Confirmed",
    },
    [EmailTemplates.PASSWORD_RESET]: {
      component: PasswordReset,
      validate: isValidPasswordResetData,
      defaultSubject: "Reset Your Password",
    },
    [EmailTemplates.INVITE_USER]: {
      component: InviteUser,
      validate: isValidInviteUserData,
      defaultSubject: "You've Been Invited",
    },
    [EmailTemplates.WELCOME]: {
      component: Welcome,
      validate: isValidWelcomeData,
      defaultSubject: "Welcome!",
    },
    [EmailTemplates.SHIPPING_CONFIRMATION]: {
      component: ShippingConfirmation,
      validate: isValidShippingConfirmationData,
      defaultSubject: "Your Order Has Shipped",
    },
    [EmailTemplates.ORDER_CANCELED]: {
      component: OrderCanceled,
      validate: isValidOrderCanceledData,
      defaultSubject: "Order Canceled",
    },
    [EmailTemplates.REFUND_CONFIRMATION]: {
      component: RefundConfirmation,
      validate: isValidRefundConfirmationData,
      defaultSubject: "Refund Processed",
    },
    [EmailTemplates.ADMIN_ORDER_ALERT]: {
      component: AdminOrderAlert,
      validate: isValidAdminOrderAlertData,
      defaultSubject: "New Order Received",
    },
    [EmailTemplates.ABANDONED_CART]: {
      component: AbandonedCart,
      validate: isValidAbandonedCartData,
      defaultSubject: "You Left Something Behind",
    },
  }

  constructor(
    { logger }: InjectedDependencies,
    options: ResendOptions
  ) {
    super()
    this.resendClient = new Resend(options.api_key)
    this.options = options
    this.logger = logger
  }

  static validateOptions(options: Record<string, any>) {
    if (!options.api_key) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Resend api_key is required in provider options"
      )
    }
    if (!options.from) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Resend from email is required in provider options"
      )
    }
  }

  async send(
    notification: ProviderSendNotificationDTO
  ): Promise<ProviderSendNotificationResultsDTO> {
    const templateId = notification.template
    const entry = this.templateRegistry[templateId]

    if (!entry) {
      this.logger.error(
        `Email template "${templateId}" not found. ` +
        `Available: ${Object.keys(this.templateRegistry).join(", ") || "(none)"}`
      )
      return {}
    }

    // Separate email routing metadata from template props
    const {
      subject: callerSubject,
      emailOptions: rawEmailOptions,
      attachments: rawAttachments,
      ...templateData
    } = (notification.data || {}) as Record<string, any>

    if (!entry.validate(templateData)) {
      this.logger.error(
        `Invalid data for template "${templateId}". ` +
        `Received keys: ${Object.keys(templateData).join(", ")}`
      )
      return {}
    }

    const html = await render(
      React.createElement(entry.component, templateData)
    )

    // Subject precedence: caller > centralized default > auto-generated from ID
    const subject =
      callerSubject ??
      entry.defaultSubject ??
      templateId.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())

    const emailOptions = (rawEmailOptions as EmailOptions) ?? {}
    const attachments = rawAttachments as EmailAttachment[] | undefined

    const { data, error } = await this.resendClient.emails.send({
      from: emailOptions.from ?? this.options.from,
      to: [notification.to],
      subject,
      html,
      ...(emailOptions.replyTo && { reply_to: emailOptions.replyTo }),
      ...(emailOptions.cc && { cc: emailOptions.cc }),
      ...(emailOptions.bcc && { bcc: emailOptions.bcc }),
      ...(emailOptions.tags && { tags: emailOptions.tags }),
      ...(emailOptions.text && { text: emailOptions.text }),
      ...(emailOptions.headers && { headers: emailOptions.headers }),
      ...(emailOptions.scheduledAt && { scheduled_at: emailOptions.scheduledAt }),
      ...(attachments?.length && {
        attachments: attachments.map((a) => ({
          ...(a.content != null && { content: a.content }),
          ...(a.filename && { filename: a.filename }),
          ...(a.path && { path: a.path }),
          ...(a.content_type && { content_type: a.content_type }),
        })),
      }),
    })

    if (error || !data) {
      this.logger.error("Failed to send email", error ?? "unknown error")
      return {}
    }

    return { id: data.id }
  }
}

export default ResendNotificationProviderService
