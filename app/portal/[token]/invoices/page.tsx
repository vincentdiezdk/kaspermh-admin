'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { getPortalInvoices } from '@/lib/actions/portal'

interface PortalInvoice {
  id: string
  job_number: string
  invoice_number: string
  invoice_sent_at: string | null
  paid_at: string | null
  total_amount: number | null
  status: string
}

export default function PortalInvoicesPage() {
  const params = useParams()
  const token = params.token as string
  const [invoices, setInvoices] = useState<PortalInvoice[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getPortalInvoices(token).then(result => {
      if (result) setInvoices(result.invoices)
      setLoading(false)
    })
  }, [token])

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
      </div>
    )
  }

  const formatPrice = (amount: number | null) => {
    if (amount == null) return '–'
    return new Intl.NumberFormat('da-DK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount) + ' kr'
  }

  const formatDate = (date: string | null) => {
    if (!date) return '–'
    return new Date(date).toLocaleDateString('da-DK', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  const getDueDate = (invoiceSentAt: string | null) => {
    if (!invoiceSentAt) return '–'
    const d = new Date(invoiceSentAt)
    d.setDate(d.getDate() + 14)
    return d.toLocaleDateString('da-DK', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Fakturaer</h1>

      {invoices.length === 0 ? (
        <div className="bg-white rounded-xl border p-8 text-center text-gray-500">
          Ingen fakturaer fundet
        </div>
      ) : (
        <div className="space-y-3">
          {invoices.map(inv => (
            <div key={inv.id} className="bg-white rounded-xl border p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900">{inv.invoice_number}</span>
                    {inv.paid_at ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        Betalt
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                        Ubetalt
                      </span>
                    )}
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <div>
                      <span className="text-gray-500">Dato: </span>
                      <span className="text-gray-700">{formatDate(inv.invoice_sent_at)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Beløb: </span>
                      <span className="font-medium text-gray-900">{formatPrice(inv.total_amount)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Forfaldsdato: </span>
                      <span className="text-gray-700">{getDueDate(inv.invoice_sent_at)}</span>
                    </div>
                    {inv.paid_at && (
                      <div>
                        <span className="text-gray-500">Betalt: </span>
                        <span className="text-green-600 font-medium">{formatDate(inv.paid_at)}</span>
                      </div>
                    )}
                  </div>
                </div>
                <a
                  href={`/api/portal/pdf/invoice/${token}/${inv.id}`}
                  download={`faktura-${inv.invoice_number}.pdf`}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors shrink-0"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  PDF
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
