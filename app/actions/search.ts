'use server'

import { createClient } from '@/lib/supabase/server'

export interface SearchResult {
  id: string
  type: 'customer' | 'job' | 'quote' | 'lead'
  title: string
  subtitle: string
  href: string
  status?: string
}

export async function globalSearch(query: string): Promise<SearchResult[]> {
  if (!query || query.length < 2) return []
  const supabase = await createClient()
  const tsQuery = query.split(' ').filter(Boolean).join(' & ') + ':*'

  const [customers, jobs, quotes, leads] = await Promise.all([
    supabase
      .from('customers')
      .select('id, full_name, address, phone')
      .textSearch('search_vector', tsQuery, { config: 'danish' })
      .limit(5),
    supabase
      .from('jobs')
      .select('id, job_number, status, scheduled_date, address')
      .or(`job_number.ilike.%${query}%,address.ilike.%${query}%`)
      .limit(5),
    supabase
      .from('quotes')
      .select('id, quote_number, status, total_incl_vat')
      .or(`quote_number.ilike.%${query}%`)
      .limit(3),
    supabase
      .from('leads')
      .select('id, full_name, phone, email, status')
      .textSearch('search_vector', tsQuery, { config: 'danish' })
      .limit(5),
  ])

  const results: SearchResult[] = []

  customers.data?.forEach(c => results.push({
    id: c.id, type: 'customer',
    title: c.full_name, subtitle: c.address || c.phone || '',
    href: `/customers/${c.id}`
  }))

  jobs.data?.forEach(j => results.push({
    id: j.id, type: 'job',
    title: `${j.job_number}`,
    subtitle: `${j.address || ''} · ${j.status}`,
    href: `/jobs/${j.id}`, status: j.status
  }))

  quotes.data?.forEach(q => results.push({
    id: q.id, type: 'quote',
    title: `Tilbud ${q.quote_number}`,
    subtitle: `${q.total_incl_vat} kr · ${q.status}`,
    href: `/quotes/${q.id}`, status: q.status
  }))

  leads.data?.forEach(l => results.push({
    id: l.id, type: 'lead',
    title: l.full_name, subtitle: l.phone || l.email || '',
    href: `/leads/${l.id}`, status: l.status
  }))

  return results
}
