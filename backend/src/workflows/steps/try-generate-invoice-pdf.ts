import {
  createStep,
  StepResponse,
} from "@medusajs/framework/workflows-sdk"
import { INVOICE_MODULE } from "../../modules/invoice"
import type InvoiceModuleService from "../../modules/invoice/service"
import {
  createCurrencyFormatter,
  formatAddress,
  formatOrderDate,
} from "../notifications/_format-helpers"
import type { InvoiceDocumentProps } from "../../modules/invoice/templates/invoice-document"

type TryGenerateInvoicePdfInput = {
  order_id: string
  order: Record<string, any>
}

type TryGenerateInvoicePdfOutput = {
  buffer: Buffer | null
  invoiceNumber: string | null
}

/**
 * Resilient invoice PDF generation step.
 *
 * Wraps the entire invoice generation pipeline (get/create invoice record,
 * fetch config, format data, render PDF) in a try/catch so that failures
 * never propagate to the parent workflow. Returns `{ buffer: null }` on
 * any error, allowing the caller to fall back to link mode.
 */
export const tryGenerateInvoicePdfStep = createStep(
  "try-generate-invoice-pdf",
  async (
    input: TryGenerateInvoicePdfInput,
    { container }
  ): Promise<StepResponse<TryGenerateInvoicePdfOutput>> => {
    try {
      const invoiceService: InvoiceModuleService =
        container.resolve(INVOICE_MODULE)

      // 1. Get or create the invoice record
      const existing = await invoiceService.listInvoices({
        order_id: input.order_id,
      })

      let invoice = existing[0]
      if (!invoice) {
        const year = new Date().getFullYear()
        const displayId = await invoiceService.getNextDisplayId(year)
        try {
          invoice = await invoiceService.createInvoices({
            display_id: displayId,
            order_id: input.order_id,
            year,
            generated_at: new Date(),
          })
        } catch {
          // Retry once on unique constraint violation (race on display_id)
          const retryId = await invoiceService.getNextDisplayId(year)
          invoice = await invoiceService.createInvoices({
            display_id: retryId,
            order_id: input.order_id,
            year,
            generated_at: new Date(),
          })
        }
      }

      // 2. Fetch invoice config
      const configs = await invoiceService.listInvoiceConfigs()
      const config = configs[0]
      if (!config) {
        console.warn(
          "[try-generate-invoice-pdf] InvoiceConfig not found, skipping attachment"
        )
        return new StepResponse({ buffer: null, invoiceNumber: null })
      }

      // 3. Format invoice data
      const fmt = createCurrencyFormatter(
        input.order.currency_code || "USD"
      )
      const formatMoney = (amount: number) => fmt.format(amount)
      const address = formatAddress(
        input.order.shipping_address || input.order.billing_address
      )

      const invoiceNumber = invoiceService.formatInvoiceNumber(
        invoice.year,
        invoice.display_id
      )

      const props: InvoiceDocumentProps = {
        invoiceNumber,
        issuedDate: formatOrderDate(input.order.created_at),
        orderDisplayId: `#${input.order.display_id || input.order.id}`,
        company: {
          name: config.company_name,
          address: config.company_address,
          phone: config.company_phone || undefined,
          email: config.company_email,
          logo: config.company_logo || undefined,
          taxId: config.tax_id || undefined,
        },
        customer: {
          name: address.name || input.order.email,
          address: [
            address.line1,
            address.line2,
            `${address.city}, ${address.state || ""} ${address.postalCode}`.trim(),
            address.country,
          ]
            .filter(Boolean)
            .join("\n"),
          email: input.order.email,
        },
        items: (
          (input.order.items || []) as Record<string, any>[]
        ).map((item) => ({
          name: (item.product_title || item.title) as string,
          variant: (item.variant_title as string) || undefined,
          sku: (item.variant_sku as string) || undefined,
          quantity: item.quantity as number,
          unitPrice: formatMoney(item.unit_price as number),
          total: formatMoney(
            (item.total as number) ??
              (item.unit_price as number) * (item.quantity as number)
          ),
        })),
        subtotal: formatMoney(
          input.order.item_subtotal ?? input.order.subtotal ?? 0
        ),
        shipping: formatMoney(input.order.shipping_total || 0),
        discount: input.order.discount_total
          ? formatMoney(input.order.discount_total)
          : undefined,
        tax: formatMoney(input.order.tax_total || 0),
        total: formatMoney(input.order.total || 0),
        currency: input.order.currency_code || "USD",
        notes: config.notes || undefined,
      }

      // 4. Render PDF — dynamic import to avoid loading @react-pdf/renderer
      //    in environments where it isn't available
      const React = await import("react")
      const { renderToBuffer } = await import("@react-pdf/renderer")
      const { InvoiceDocument } = await import(
        "../../modules/invoice/templates/invoice-document.js"
      )

      const element = React.createElement(InvoiceDocument, props)
      const buffer = await renderToBuffer(element as any)

      return new StepResponse({
        buffer: Buffer.from(buffer),
        invoiceNumber,
      })
    } catch (error) {
      console.error(
        "[try-generate-invoice-pdf] Failed to generate invoice PDF, falling back to link mode:",
        error instanceof Error ? error.message : error
      )
      return new StepResponse({ buffer: null, invoiceNumber: null })
    }
  }
)
