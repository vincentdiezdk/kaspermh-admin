import { isDineroConfigured, dineroFetch } from './client'

/** Sync customer to Dinero as contact */
export async function syncContactToDinero(customer: {
  name: string
  email: string
  phone: string
  address: string
  postalCode: string
  city: string
}) {
  if (!isDineroConfigured()) return null

  return dineroFetch('/contacts', {
    method: 'POST',
    body: JSON.stringify({
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      zipCode: customer.postalCode,
      city: customer.city,
      countryKey: 'DK',
    }),
  })
}

/** Create invoice in Dinero from a completed job */
export async function createDineroInvoice(job: {
  invoiceNumber: string
  customerName: string
  customerEmail: string
  lines: { description: string; quantity: number; unitPrice: number; accountNumber?: number }[]
  dueDate: string
}) {
  if (!isDineroConfigured()) return null

  // Dinero expects amounts in cents (ører) and uses account 1000 for sales
  return dineroFetch('/invoices', {
    method: 'POST',
    body: JSON.stringify({
      contactGuid: null, // Would need to look up or create the contact first
      currency: 'DKK',
      language: 'da-DK',
      externalReference: job.invoiceNumber,
      paymentConditionType: 'Netto',
      paymentConditionNumberOfDays: 14,
      productLines: job.lines.map(line => ({
        description: line.description,
        quantity: line.quantity,
        accountNumber: line.accountNumber || 1000,
        unit: 'parts',
        totalAmountInCents: Math.round(line.quantity * line.unitPrice * 100),
      })),
    }),
  })
}

/** Book an invoice in Dinero (makes it final) */
export async function bookDineroInvoice(invoiceGuid: string) {
  if (!isDineroConfigured()) return null

  return dineroFetch(`/invoices/${invoiceGuid}/book`, {
    method: 'POST',
    body: JSON.stringify({ timestamp: new Date().toISOString() }),
  })
}

/** Mark invoice as paid in Dinero */
export async function markDineroPaid(invoiceGuid: string, amount: number, paidDate: string) {
  if (!isDineroConfigured()) return null

  return dineroFetch(`/invoices/${invoiceGuid}/payments`, {
    method: 'POST',
    body: JSON.stringify({
      amountInCents: Math.round(amount * 100),
      depositAccountNumber: 55000, // Default bank account number in Dinero
      paymentDate: paidDate,
      description: 'Betaling modtaget',
    }),
  })
}
