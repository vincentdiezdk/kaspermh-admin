import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { QuoteLineItem } from '@/lib/types'
import { InvoiceClient } from './invoice-client'

const DANISH_MONTHS = [
  'januar', 'februar', 'marts', 'april', 'maj', 'juni',
  'juli', 'august', 'september', 'oktober', 'november', 'december',
]

function formatDanishDate(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getDate()}. ${DANISH_MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: job } = await supabase
    .from('jobs')
    .select('*, customer:customers(full_name, address, city, zip_code, email, phone)')
    .eq('id', id)
    .single()

  if (!job || !job.invoice_number) {
    notFound()
  }

  // Fetch company settings
  const { data: company } = await supabase
    .from('company_settings')
    .select('*')
    .limit(1)
    .single()

  const companyName = company?.company_name || 'KasperMH Haveservice'
  const companyCvr = company?.cvr || ''
  const companyAddress = company?.address || ''
  const companyPostal = company?.postal_code || ''
  const companyCity = company?.city || ''
  const companyLogoUrl = company?.logo_url || ''
  const bankReg = company?.bank_reg || ''
  const bankAccount = company?.bank_account || ''
  const mobilepay = company?.mobilepay_number || ''
  const invoiceDueDays = company?.invoice_due_days || 14

  const services: QuoteLineItem[] = typeof job.services === 'string'
    ? JSON.parse(job.services)
    : job.services

  const subtotal = services.reduce((sum, s) => sum + s.line_total, 0)
  const vat = subtotal * 0.25
  const total = subtotal + vat

  const invoiceDate = job.invoice_sent_at
    ? formatDanishDate(job.invoice_sent_at)
    : formatDanishDate(new Date().toISOString())

  const dueDate = (() => {
    const d = job.invoice_sent_at ? new Date(job.invoice_sent_at) : new Date()
    d.setDate(d.getDate() + invoiceDueDays)
    return formatDanishDate(d.toISOString())
  })()

  const customer = job.customer as {
    full_name: string
    address: string
    city: string
    zip_code: string
    email: string | null
    phone: string
  } | null

  const priceFormat = (amount: number): string => {
    return new Intl.NumberFormat('da-DK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount) + ' kr'
  }

  return (
    <InvoiceClient>
      <div className="invoice-page max-w-[800px] mx-auto bg-white p-8 print:p-0 print:shadow-none shadow-lg">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            {companyLogoUrl ? (
              <img src={companyLogoUrl} alt={companyName} className="h-12 w-auto mb-2" />
            ) : (
              <h1 className="text-2xl font-bold text-green-700">{companyName}</h1>
            )}
            {companyAddress && (
              <p className="text-sm text-gray-600 mt-1">
                {companyAddress}{companyPostal || companyCity ? `, ${companyPostal} ${companyCity}` : ''}
              </p>
            )}
          </div>
          <div className="text-right">
            <h2 className="text-3xl font-bold text-gray-800">FAKTURA</h2>
            <p className="text-lg font-medium text-gray-600 mt-1">{job.invoice_number}</p>
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4 mb-8 text-sm">
          <div>
            <p className="text-gray-500">Fakturadato</p>
            <p className="font-medium">{invoiceDate}</p>
          </div>
          <div>
            <p className="text-gray-500">Forfaldsdato</p>
            <p className="font-medium">{dueDate}</p>
          </div>
        </div>

        {/* Customer */}
        <div className="mb-8">
          <p className="text-sm text-gray-500 mb-1">Kunde</p>
          <p className="font-semibold">{customer?.full_name || 'Ukendt'}</p>
          {customer && (
            <p className="text-sm text-gray-600">
              {customer.address}, {customer.zip_code} {customer.city}
            </p>
          )}
        </div>

        {/* Job reference */}
        <div className="mb-6 text-sm text-gray-500">
          Job-ref.: {job.job_number}
        </div>

        {/* Service table */}
        <table className="w-full mb-6">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="text-left py-2 text-sm font-semibold text-gray-600">Service</th>
              <th className="text-right py-2 text-sm font-semibold text-gray-600">Antal</th>
              <th className="text-right py-2 text-sm font-semibold text-gray-600">Enhedspris</th>
              <th className="text-right py-2 text-sm font-semibold text-gray-600">Total</th>
            </tr>
          </thead>
          <tbody>
            {services.map((s, i) => (
              <tr key={i} className="border-b border-gray-100">
                <td className="py-2 text-sm">{s.service_name}</td>
                <td className="py-2 text-sm text-right">
                  {s.quantity} {s.unit === 'm2' ? 'm²' : s.unit === 'stk' ? 'stk' : s.unit === 'time' ? 'timer' : ''}
                </td>
                <td className="py-2 text-sm text-right">{priceFormat(s.unit_price)}</td>
                <td className="py-2 text-sm text-right font-medium">{priceFormat(s.line_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="border-t-2 border-gray-200 pt-4 mb-8">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600">Subtotal</span>
            <span>{priceFormat(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600">Moms 25%</span>
            <span>{priceFormat(vat)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold border-t pt-2">
            <span>TOTAL</span>
            <span>{priceFormat(total)}</span>
          </div>
        </div>

        {/* Payment info */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6 print:bg-gray-100">
          <h3 className="text-sm font-semibold mb-2">Betalingsinformation</h3>
          <div className="text-sm text-gray-600 space-y-1">
            {(bankReg || bankAccount) && (
              <p>Reg. nr.: {bankReg || '—'} &nbsp; Kontonr.: {bankAccount || '—'}</p>
            )}
            {mobilepay && <p>MobilePay: {mobilepay}</p>}
            {!bankReg && !bankAccount && !mobilepay && (
              <p className="text-muted-foreground italic">Betalingsinfo ikke konfigureret</p>
            )}
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Betaling bedes foretaget senest {dueDate}
          </p>
        </div>

        {/* Paid stamp */}
        {job.paid_at && (
          <div className="text-center mb-6">
            <span className="inline-block border-4 border-green-600 text-green-600 text-2xl font-bold px-6 py-2 rounded-lg rotate-[-5deg]">
              BETALT
            </span>
          </div>
        )}

        {/* Footer */}
        <div className="border-t pt-4 text-center text-xs text-gray-500">
          <p>
            {companyCvr ? `CVR: ${companyCvr} · ` : ''}{companyName}
          </p>
        </div>
      </div>
    </InvoiceClient>
  )
}
