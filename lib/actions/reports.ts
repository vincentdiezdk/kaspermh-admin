'use server'

import { createClient } from '@/lib/supabase/server'

export interface ReportKPIs {
  revenue: number
  jobCount: number
  avgJobValue: number
  conversionRate: number
  unpaidAmount: number
  unpaidCount: number
  ytdRevenue: number
  ytdJobCount: number
}

export async function getReportKPIs(startDate: string, endDate: string): Promise<ReportKPIs> {
  const supabase = await createClient()

  // Revenue and job count for period
  const { data: periodJobs } = await supabase
    .from('jobs')
    .select('total_amount, status')
    .gte('scheduled_date', startDate)
    .lte('scheduled_date', endDate)
    .in('status', ['completed', 'invoiced'])

  const revenue = (periodJobs || []).reduce((sum, j) => sum + (Number(j.total_amount) || 0), 0)
  const jobCount = (periodJobs || []).length

  // YTD
  const yearStart = `${new Date().getFullYear()}-01-01`
  const { data: ytdJobs } = await supabase
    .from('jobs')
    .select('total_amount')
    .gte('scheduled_date', yearStart)
    .in('status', ['completed', 'invoiced'])

  const ytdRevenue = (ytdJobs || []).reduce((sum, j) => sum + (Number(j.total_amount) || 0), 0)
  const ytdJobCount = (ytdJobs || []).length

  // Conversion rate from quotes
  const { count: totalQuotes } = await supabase
    .from('quotes')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', startDate)
    .lte('created_at', endDate)

  const { count: acceptedQuotes } = await supabase
    .from('quotes')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', startDate)
    .lte('created_at', endDate)
    .eq('status', 'accepted')

  const conversionRate = totalQuotes ? Math.round(((acceptedQuotes || 0) / totalQuotes) * 100) : 0

  // Unpaid invoices (all time)
  const { data: unpaidJobs } = await supabase
    .from('jobs')
    .select('total_amount')
    .eq('status', 'invoiced')
    .is('paid_at', null)

  const unpaidAmount = (unpaidJobs || []).reduce((sum, j) => sum + (Number(j.total_amount) || 0), 0)
  const unpaidCount = (unpaidJobs || []).length

  return {
    revenue,
    jobCount,
    avgJobValue: jobCount > 0 ? Math.round(revenue / jobCount) : 0,
    conversionRate,
    unpaidAmount,
    unpaidCount,
    ytdRevenue,
    ytdJobCount,
  }
}

export async function getMonthlyRevenue(year: number) {
  const supabase = await createClient()

  const { data: jobs } = await supabase
    .from('jobs')
    .select('scheduled_date, total_amount')
    .gte('scheduled_date', `${year}-01-01`)
    .lte('scheduled_date', `${year}-12-31`)
    .in('status', ['completed', 'invoiced'])

  const months = Array.from({ length: 12 }, (_, i) => ({
    month: i,
    name: ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'][i],
    revenue: 0,
  }))

  for (const job of jobs || []) {
    const month = new Date(job.scheduled_date).getMonth()
    months[month].revenue += Number(job.total_amount) || 0
  }

  return months
}

export async function getJobsByServiceType(startDate: string, endDate: string) {
  const supabase = await createClient()

  const { data: jobs } = await supabase
    .from('jobs')
    .select('services')
    .gte('scheduled_date', startDate)
    .lte('scheduled_date', endDate)
    .in('status', ['completed', 'invoiced'])

  const serviceCounts: Record<string, number> = {}

  for (const job of jobs || []) {
    const services = typeof job.services === 'string' ? JSON.parse(job.services) : job.services
    if (Array.isArray(services)) {
      for (const svc of services) {
        const name = svc.service_name || 'Ukendt'
        serviceCounts[name] = (serviceCounts[name] || 0) + 1
      }
    }
  }

  const COLORS = ['#16a34a', '#22c55e', '#4ade80', '#86efac', '#bbf7d0', '#15803d', '#166534', '#0d9488']

  return Object.entries(serviceCounts).map(([name, count], i) => ({
    name,
    count,
    color: COLORS[i % COLORS.length],
  }))
}

export async function getConversionFunnel(startDate: string, endDate: string) {
  const supabase = await createClient()

  const { count: leads } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', startDate)
    .lte('created_at', endDate)

  const { count: quotes } = await supabase
    .from('quotes')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', startDate)
    .lte('created_at', endDate)

  const { count: jobs } = await supabase
    .from('jobs')
    .select('*', { count: 'exact', head: true })
    .gte('scheduled_date', startDate)
    .lte('scheduled_date', endDate)

  const { count: paid } = await supabase
    .from('jobs')
    .select('*', { count: 'exact', head: true })
    .gte('scheduled_date', startDate)
    .lte('scheduled_date', endDate)
    .not('paid_at', 'is', null)

  return [
    { stage: 'Leads', count: leads || 0 },
    { stage: 'Tilbud', count: quotes || 0 },
    { stage: 'Jobs', count: jobs || 0 },
    { stage: 'Betalt', count: paid || 0 },
  ]
}

export async function getTopCustomers(startDate: string, endDate: string, limit: number = 10) {
  const supabase = await createClient()

  const { data: jobs } = await supabase
    .from('jobs')
    .select('customer_id, total_amount, scheduled_date, customer:customers(full_name)')
    .gte('scheduled_date', startDate)
    .lte('scheduled_date', endDate)
    .in('status', ['completed', 'invoiced'])

  const customerMap: Record<string, { name: string; jobCount: number; revenue: number; lastJob: string }> = {}

  for (const job of jobs || []) {
    const cid = job.customer_id
    const customerArr = job.customer as unknown as { full_name: string }[] | null
    const customer = Array.isArray(customerArr) ? customerArr[0] : customerArr
    if (!customerMap[cid]) {
      customerMap[cid] = {
        name: customer?.full_name || 'Ukendt',
        jobCount: 0,
        revenue: 0,
        lastJob: job.scheduled_date,
      }
    }
    customerMap[cid].jobCount++
    customerMap[cid].revenue += Number(job.total_amount) || 0
    if (job.scheduled_date > customerMap[cid].lastJob) {
      customerMap[cid].lastJob = job.scheduled_date
    }
  }

  return Object.values(customerMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit)
}
