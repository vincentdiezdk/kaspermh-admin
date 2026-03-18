import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { QuotePDF } from '@/components/pdf/QuotePDF'
import React from 'react'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch quote with customer
  const { data: quote, error } = await supabase
    .from('quotes')
    .select('*, customer:customers(full_name, address, city, zip_code)')
    .eq('id', id)
    .single()

  if (error || !quote) {
    return NextResponse.json({ error: 'Tilbud ikke fundet' }, { status: 404 })
  }

  // Fetch company settings
  const { data: company } = await supabase
    .from('company_settings')
    .select('*')
    .limit(1)
    .single()

  const lineItems = typeof quote.line_items === 'string'
    ? JSON.parse(quote.line_items)
    : quote.line_items

  const customer = quote.customer as {
    full_name: string
    address: string
    city: string
    zip_code: string
  } | null

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kaspermh-admin.vercel.app'

  const pdfElement = React.createElement(QuotePDF, {
    quote: {
      quote_number: quote.quote_number,
      status: quote.status,
      created_at: quote.created_at,
      valid_until: quote.valid_until,
      subtotal: Number(quote.subtotal),
      vat_amount: Number(quote.vat_amount),
      total_incl_vat: Number(quote.total_incl_vat),
      line_items: lineItems,
      notes: quote.notes,
      accept_token: quote.accept_token,
    },
    customer,
    company: {
      company_name: company?.company_name || 'KasperMH Haveservice',
      address: company?.address || '',
      postal_code: company?.postal_code || '',
      city: company?.city || '',
      cvr: company?.cvr || '',
      phone: company?.phone || '',
      email: company?.email || '',
    },
    baseUrl,
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(pdfElement as any)

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="tilbud-${quote.quote_number}.pdf"`,
    },
  })
}
