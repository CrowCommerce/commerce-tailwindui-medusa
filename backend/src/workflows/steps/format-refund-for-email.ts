import {
  createStep,
  StepResponse,
} from "@medusajs/framework/workflows-sdk"

export type FormattedRefundEmailData = {
  paymentId: string
  orderId: string
  orderNumber: string
  email: string
  refundAmount: string
  refundDate: string
  refundReason?: string
  currencyCode: string
}

type FormatRefundForEmailInput = {
  payment: Record<string, any>
}

export const formatRefundForEmailStep = createStep(
  "format-refund-for-email",
  async (input: FormatRefundForEmailInput) => {
    const { payment } = input

    const currencyCode = payment.currency_code || "USD"
    const currencyFormatter = new Intl.NumberFormat([], {
      style: "currency",
      currency: currencyCode,
      currencyDisplay: "narrowSymbol",
    })

    const refunds = payment.refunds || []
    const latestRefund = refunds[refunds.length - 1]

    if (!latestRefund) {
      throw new Error("No refunds found on payment")
    }

    const order =
      payment.payment_collection?.order ||
      (payment as any).payment_collections?.[0]?.order

    const refundDate = new Date(
      latestRefund.created_at
    ).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })

    const formatted: FormattedRefundEmailData = {
      paymentId: payment.id,
      orderId: order?.id || "",
      orderNumber: String(order?.display_id || order?.id || ""),
      email: order?.email || "",
      refundAmount: currencyFormatter.format(
        Number(latestRefund.amount) || 0
      ),
      refundDate,
      refundReason: latestRefund.refund_reason?.label || undefined,
      currencyCode,
    }

    return new StepResponse(formatted)
  }
)
