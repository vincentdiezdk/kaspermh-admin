import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { InvoicePDF } from '@/components/pdf/InvoicePDF'
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

  // Fetch job with customer
  const { data: job, error } = await supabase
    .from('jobs')
    .select('*, customer:customers(full_name, address, city, zip_code)')
    .eq('id', id)
    .single()

  if (error || !job || !job.invoice_number) {
    return NextResponse.json({ error: 'Faktura ikke fundet' }, { status: 404 })
  }

  // Fetch company settings
  const { data: company } = await supabase
    .from('company_settings')
    .select('*')
    .limit(1)
    .single()

  const services = typeof job.services === 'string'
    ? JSON.parse(job.services)
    : job.services

  const customer = job.customer as {
    full_name: string
    address: string
    city: string
    zip_code: string
  } | null

  const pdfElement = React.createElement(InvoicePDF, {
    job: {
      job_number: job.job_number,
      invoice_number: job.invoice_number,
      status: job.status,
      invoice_sent_at: job.invoice_sent_at,
      paid_at: job.paid_at,
      services,
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
      bank_reg: company?.bank_reg || '',
      bank_account: company?.bank_account || '',
      mobilepay_number: company?.mobilepay_number || '',
      invoice_due_days: company?.invoice_due_days || 14,
    },
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(pdfElement as any)

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="faktura-${job.invoice_number}.pdf"`,
    },
  })
}
