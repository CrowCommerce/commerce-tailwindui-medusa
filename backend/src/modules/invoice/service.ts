import { MedusaService } from "@medusajs/framework/utils"
import Invoice from "./models/invoice"
import InvoiceConfig from "./models/invoice-config"

class InvoiceModuleService extends MedusaService({
  Invoice,
  InvoiceConfig,
}) {
  async getNextDisplayId(year: number): Promise<number> {
    const invoices = await this.listInvoices(
      { year },
      { order: { display_id: "DESC" }, take: 1 }
    )
    const maxDisplayId = invoices[0]?.display_id ?? 0
    return maxDisplayId + 1
  }

  formatInvoiceNumber(year: number, displayId: number): string {
    return `INV-${year}-${String(displayId).padStart(4, "0")}`
  }
}

export default InvoiceModuleService
