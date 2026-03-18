'use server'

import { createClient } from '@/lib/supabase/server'

export async function exportJobsCSV(startDate: string, endDate: string): Promise<string> {
  const supabase = await createClient()

  const { data: jobs } = await supabase
    .from('jobs')
    .select('*, customer:customers(full_name)')
    .gte('scheduled_date', startDate)
    .lte('scheduled_date', endDate)
    .order('scheduled_date', { ascending: true })

  const headers = [
    'Job nr.',
    'Dato',
    'Kunde',
    'Adresse',
    'Service',
    'Antal',
    'Enhedspris',
    'Total (ex. moms)',
    'Moms',
    'Total (inkl. moms)',
    'Status',
    'Fakturanr.',
    'Betalt dato',
  ]

  const rows: string[][] = []

  for (const job of jobs || []) {
    const customer = job.customer as { full_name: string } | null
    const services = typeof job.services === 'string' ? JSON.parse(job.services) : job.services

    if (Array.isArray(services) && services.length > 0) {
      for (const svc of services) {
        const lineTotal = svc.line_total || 0
        const vat = lineTotal * 0.25
        rows.push([
          job.job_number || '',
          job.scheduled_date || '',
          customer?.full_name || '',
          job.address || '',
          svc.service_name || '',
          String(svc.quantity || ''),
          String(svc.unit_price || ''),
          String(lineTotal.toFixed(2)),
          String(vat.toFixed(2)),
          String((lineTotal + vat).toFixed(2)),
          job.status || '',
          job.invoice_number || '',
          job.paid_at ? new Date(job.paid_at).toLocaleDateString('da-DK') : '',
        ])
      }
    } else {
      const total = Number(job.total_amount) || 0
      const vat = total * 0.25
      rows.push([
        job.job_number || '',
        job.scheduled_date || '',
        customer?.full_name || '',
        job.address || '',
        '',
        '',
        '',
        String(total.toFixed(2)),
        String(vat.toFixed(2)),
        String((total + vat).toFixed(2)),
        job.status || '',
        job.invoice_number || '',
        job.paid_at ? new Date(job.paid_at).toLocaleDateString('da-DK') : '',
      ])
    }
  }

  const escapeCsv = (val: string) => {
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`
    }
    return val
  }

  const csvLines = [
    headers.map(escapeCsv).join(','),
    ...rows.map((row) => row.map(escapeCsv).join(',')),
  ]

  return csvLines.join('\n')
}
