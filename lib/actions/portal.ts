'use server'

import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/send'
import { logEmail } from '@/lib/email/log'
import { revalidatePath } from 'next/cache'

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export async function sendPortalLink(customerId: string) {
  const supabase = await createServerClient()

  // Fetch customer
  const { data: customer, error: custErr } = await supabase
    .from('customers')
    .select('id, full_name, email')
    .eq('id', customerId)
    .single()

  if (custErr || !customer) throw new Error('Kunde ikke fundet')
  if (!customer.email) throw new Error('Kunden har ingen email')

  // Upsert portal token (delete old, create new)
  await supabase
    .from('customer_portal_tokens')
    .delete()
    .eq('customer_id', customerId)

  const { data: token, error: tokenErr } = await supabase
    .from('customer_portal_tokens')
    .insert({
      customer_id: customerId,
      email: customer.email,
    })
    .select('token')
    .single()

  if (tokenErr || !token) throw new Error('Kunne ikke oprette portallink')

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  const portalUrl = `${baseUrl}/portal/${token.token}`

  // Send email
  const subject = `Din kundeportal – ${customer.full_name}`
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #16a34a; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">KasperMH</h1>
      </div>
      <div style="padding: 30px 20px;">
        <p>Hej ${customer.full_name},</p>
        <p>Her er dit personlige link til kundeportalen, hvor du kan se dine jobs, fakturaer og meget mere:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${portalUrl}" style="background-color: #16a34a; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            Åbn kundeportal
          </a>
        </div>
        <p style="color: #6b7280; font-size: 14px;">Linket er gyldigt i 7 dage. Kontakt os hvis du har brug for et nyt link.</p>
      </div>
      <div style="background-color: #f9fafb; padding: 15px 20px; text-align: center; font-size: 12px; color: #9ca3af;">
        KasperMH Haveservice
      </div>
    </div>
  `

  const result = await sendEmail({ to: customer.email, subject, html })

  // Log email (non-blocking)
  void logEmail({
    to: customer.email,
    subject,
    templateType: 'portal_link',
    relatedId: customerId,
    success: result.success,
    resendId: result.id || null,
  }).catch(err => console.error('[Portal] Email log failed:', err))

  revalidatePath(`/customers/${customerId}`)

  return { success: true }
}

export async function validatePortalToken(token: string) {
  const supabase = getServiceClient()
  if (!supabase) return null

  const { data, error } = await supabase
    .rpc('get_customer_by_portal_token', { p_token: token })

  if (error || !data || data.length === 0) return null

  return {
    customer_id: data[0].customer_id as string,
    customer_name: data[0].customer_name as string,
    customer_email: data[0].customer_email as string | null,
  }
}

export async function getPortalJobs(token: string) {
  const customer = await validatePortalToken(token)
  if (!customer) return null

  const supabase = getServiceClient()
  if (!supabase) return null

  const { data: jobs } = await supabase
    .from('jobs')
    .select('id, job_number, scheduled_date, status, address, services')
    .eq('customer_id', customer.customer_id)
    .order('scheduled_date', { ascending: false })

  // Fetch photos for all jobs
  const jobIds = (jobs || []).map(j => j.id)
  const { data: photos } = jobIds.length > 0
    ? await supabase
        .from('job_photos')
        .select('id, job_id, public_url, type')
        .in('job_id', jobIds)
    : { data: [] }

  return {
    customer,
    jobs: (jobs || []).map(job => ({
      ...job,
      services: typeof job.services === 'string' ? JSON.parse(job.services) : job.services,
      photos: (photos || []).filter(p => p.job_id === job.id),
    })),
  }
}

export async function getPortalQuotes(token: string) {
  const customer = await validatePortalToken(token)
  if (!customer) return null

  const supabase = getServiceClient()
  if (!supabase) return null

  const { data: quotes } = await supabase
    .from('quotes')
    .select('id, quote_number, total_incl_vat, status, created_at, valid_until')
    .eq('customer_id', customer.customer_id)
    .order('created_at', { ascending: false })

  return { customer, quotes: quotes || [] }
}

export async function getPortalInvoices(token: string) {
  const customer = await validatePortalToken(token)
  if (!customer) return null

  const supabase = getServiceClient()
  if (!supabase) return null

  const { data: jobs } = await supabase
    .from('jobs')
    .select('id, job_number, invoice_number, invoice_sent_at, paid_at, total_amount, services, status')
    .eq('customer_id', customer.customer_id)
    .not('invoice_number', 'is', null)
    .order('invoice_sent_at', { ascending: false })

  return {
    customer,
    invoices: (jobs || []).map(job => ({
      ...job,
      services: typeof job.services === 'string' ? JSON.parse(job.services) : job.services,
    })),
  }
}

export async function getPortalOverview(token: string) {
  const customer = await validatePortalToken(token)
  if (!customer) return null

  const supabase = getServiceClient()
  if (!supabase) return null

  const [
    { count: jobCount },
    { data: unpaidJobs },
    { data: latestJob },
  ] = await Promise.all([
    supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', customer.customer_id),
    supabase
      .from('jobs')
      .select('id')
      .eq('customer_id', customer.customer_id)
      .eq('status', 'invoiced')
      .is('paid_at', null),
    supabase
      .from('jobs')
      .select('scheduled_date')
      .eq('customer_id', customer.customer_id)
      .order('scheduled_date', { ascending: false })
      .limit(1),
  ])

  return {
    customer,
    jobCount: jobCount || 0,
    unpaidCount: unpaidJobs?.length || 0,
    latestJobDate: latestJob?.[0]?.scheduled_date || null,
  }
}
