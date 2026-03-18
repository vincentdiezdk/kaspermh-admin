import { createClient } from '@supabase/supabase-js'
import { sendSms, isSmsConfigured } from './send'
import { logSms } from './log'
import { smsTemplates } from './templates'

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

type SmsPreferences = {
  job_confirmation: boolean
  en_route: boolean
  job_completed: boolean
  invoice_sent: boolean
  quote_sent: boolean
  payment_reminder: boolean
  job_reminder: boolean
}

const DEFAULT_PREFERENCES: SmsPreferences = {
  job_confirmation: true,
  en_route: true,
  job_completed: true,
  invoice_sent: true,
  quote_sent: true,
  payment_reminder: true,
  job_reminder: true,
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getSmsPreferences(supabase: any): Promise<SmsPreferences> {
  const { data } = await supabase
    .from('company_settings')
    .select('sms_preferences')
    .limit(1)
    .single()

  if (!data?.sms_preferences) return DEFAULT_PREFERENCES
  return { ...DEFAULT_PREFERENCES, ...(data.sms_preferences as Partial<SmsPreferences>) }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getCompanyInfo(supabase: any) {
  const { data } = await supabase
    .from('company_settings')
    .select('*')
    .limit(1)
    .single()
  return data as {
    phone: string
    mobilepay_number: string
    invoice_due_days: number
  } | null
}

function formatDanishDate(dateStr: string): string {
  const days = ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag']
  const date = new Date(dateStr)
  const dayName = days[date.getDay()]
  const day = date.getDate()
  const month = date.getMonth() + 1
  return `${dayName} ${day}/${month}`
}

function formatDanishAmount(amount: number): string {
  return amount.toLocaleString('da-DK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' kr'
}

function formatDueDateDanish(daysFromNow: number): string {
  const date = new Date(Date.now() + daysFromNow * 86400000)
  const day = date.getDate()
  const months = ['januar', 'februar', 'marts', 'april', 'maj', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'december']
  return `${day}. ${months[date.getMonth()]}`
}

/** Trigger: Job created → SMS confirmation to customer */
export async function triggerJobConfirmationSms(jobId: string) {
  try {
    if (!isSmsConfigured()) return

    const supabase = getServiceClient()
    if (!supabase) return

    const prefs = await getSmsPreferences(supabase)
    if (!prefs.job_confirmation) return

    const { data: job } = await supabase
      .from('jobs')
      .select('*, customer:customers(*)')
      .eq('id', jobId)
      .single()

    if (!job?.customer?.phone) return

    const company = await getCompanyInfo(supabase)
    if (!company) return

    const services = typeof job.services === 'string' ? JSON.parse(job.services) : job.services
    const serviceName = (services as { service_name: string }[]).map(s => s.service_name).join(', ')

    const body = smsTemplates.jobConfirmation({
      customerName: job.customer.full_name,
      date: job.scheduled_date ? formatDanishDate(job.scheduled_date) : 'aftales',
      time: job.scheduled_time || 'aftales',
      service: serviceName,
      phone: company.phone,
    })

    const result = await sendSms({ to: job.customer.phone, body })

    await logSms({
      toPhone: job.customer.phone,
      templateType: 'job_confirmation',
      relatedId: jobId,
      status: result.success ? 'sent' : (result.skipped ? 'skipped' : 'failed'),
      twilioSid: result.sid,
    })
  } catch (err) {
    console.error('[SMS Trigger] Job confirmation failed:', err)
  }
}

/** Trigger: Job status → en_route → SMS "på vej" to customer */
export async function triggerEnRouteSms(jobId: string) {
  try {
    if (!isSmsConfigured()) return

    const supabase = getServiceClient()
    if (!supabase) return

    const prefs = await getSmsPreferences(supabase)
    if (!prefs.en_route) return

    const { data: job } = await supabase
      .from('jobs')
      .select('*, customer:customers(*)')
      .eq('id', jobId)
      .single()

    if (!job?.customer?.phone) return

    const body = smsTemplates.enRoute({
      customerName: job.customer.full_name,
    })

    const result = await sendSms({ to: job.customer.phone, body })

    await logSms({
      toPhone: job.customer.phone,
      templateType: 'en_route',
      relatedId: jobId,
      status: result.success ? 'sent' : (result.skipped ? 'skipped' : 'failed'),
      twilioSid: result.sid,
    })
  } catch (err) {
    console.error('[SMS Trigger] En route failed:', err)
  }
}

/** Trigger: Job completed → SMS to customer */
export async function triggerJobCompletedSms(jobId: string) {
  try {
    if (!isSmsConfigured()) return

    const supabase = getServiceClient()
    if (!supabase) return

    const prefs = await getSmsPreferences(supabase)
    if (!prefs.job_completed) return

    const { data: job } = await supabase
      .from('jobs')
      .select('*, customer:customers(*)')
      .eq('id', jobId)
      .single()

    if (!job?.customer?.phone) return

    const services = typeof job.services === 'string' ? JSON.parse(job.services) : job.services
    const serviceName = (services as { service_name: string }[]).map(s => s.service_name).join(', ')

    const body = smsTemplates.jobCompleted({
      customerName: job.customer.full_name,
      service: serviceName,
    })

    const result = await sendSms({ to: job.customer.phone, body })

    await logSms({
      toPhone: job.customer.phone,
      templateType: 'job_completed',
      relatedId: jobId,
      status: result.success ? 'sent' : (result.skipped ? 'skipped' : 'failed'),
      twilioSid: result.sid,
    })
  } catch (err) {
    console.error('[SMS Trigger] Job completed failed:', err)
  }
}

/** Trigger: Invoice created → SMS to customer */
export async function triggerInvoiceSms(jobId: string) {
  try {
    if (!isSmsConfigured()) return

    const supabase = getServiceClient()
    if (!supabase) return

    const prefs = await getSmsPreferences(supabase)
    if (!prefs.invoice_sent) return

    const { data: job } = await supabase
      .from('jobs')
      .select('*, customer:customers(*)')
      .eq('id', jobId)
      .single()

    if (!job?.customer?.phone) return

    const company = await getCompanyInfo(supabase)
    if (!company) return

    const services = typeof job.services === 'string' ? JSON.parse(job.services) : job.services
    const subtotal = (services as { line_total: number }[]).reduce((sum, s) => sum + s.line_total, 0)
    const total = subtotal * 1.25

    const body = smsTemplates.invoiceSent({
      customerName: job.customer.full_name,
      invoiceNumber: job.invoice_number || '',
      amount: formatDanishAmount(total),
      dueDate: formatDueDateDanish(company.invoice_due_days || 14),
    })

    const result = await sendSms({ to: job.customer.phone, body })

    await logSms({
      toPhone: job.customer.phone,
      templateType: 'invoice_sent',
      relatedId: jobId,
      status: result.success ? 'sent' : (result.skipped ? 'skipped' : 'failed'),
      twilioSid: result.sid,
    })
  } catch (err) {
    console.error('[SMS Trigger] Invoice SMS failed:', err)
  }
}

/** Trigger: Quote sent → SMS to customer */
export async function triggerQuoteSentSms(quoteId: string) {
  try {
    if (!isSmsConfigured()) return

    const supabase = getServiceClient()
    if (!supabase) return

    const prefs = await getSmsPreferences(supabase)
    if (!prefs.quote_sent) return

    const { data: quote } = await supabase
      .from('quotes')
      .select('*, customer:customers(*)')
      .eq('id', quoteId)
      .single()

    if (!quote?.customer?.phone) return

    const body = smsTemplates.quoteSent({
      customerName: quote.customer.full_name,
      amount: formatDanishAmount(quote.total_incl_vat),
    })

    const result = await sendSms({ to: quote.customer.phone, body })

    await logSms({
      toPhone: quote.customer.phone,
      templateType: 'quote_sent',
      relatedId: quoteId,
      status: result.success ? 'sent' : (result.skipped ? 'skipped' : 'failed'),
      twilioSid: result.sid,
    })
  } catch (err) {
    console.error('[SMS Trigger] Quote sent failed:', err)
  }
}

/** Trigger: Payment reminder → SMS to customer */
export async function triggerPaymentReminderSms(jobId: string) {
  try {
    if (!isSmsConfigured()) return

    const supabase = getServiceClient()
    if (!supabase) return

    const prefs = await getSmsPreferences(supabase)
    if (!prefs.payment_reminder) return

    const { data: job } = await supabase
      .from('jobs')
      .select('*, customer:customers(*)')
      .eq('id', jobId)
      .single()

    if (!job?.customer?.phone) return

    const company = await getCompanyInfo(supabase)

    const services = typeof job.services === 'string' ? JSON.parse(job.services) : job.services
    const subtotal = (services as { line_total: number }[]).reduce((sum, s) => sum + s.line_total, 0)
    const total = subtotal * 1.25

    const body = smsTemplates.paymentReminder({
      customerName: job.customer.full_name,
      invoiceNumber: job.invoice_number || '',
      amount: formatDanishAmount(total),
      mobilepayNumber: company?.mobilepay_number || undefined,
    })

    const result = await sendSms({ to: job.customer.phone, body })

    await logSms({
      toPhone: job.customer.phone,
      templateType: 'payment_reminder',
      relatedId: jobId,
      status: result.success ? 'sent' : (result.skipped ? 'skipped' : 'failed'),
      twilioSid: result.sid,
    })
  } catch (err) {
    console.error('[SMS Trigger] Payment reminder failed:', err)
  }
}

/** Trigger: Day-before reminder → SMS to customer */
export async function triggerJobReminderSms(jobId: string) {
  try {
    if (!isSmsConfigured()) return

    const supabase = getServiceClient()
    if (!supabase) return

    const prefs = await getSmsPreferences(supabase)
    if (!prefs.job_reminder) return

    const { data: job } = await supabase
      .from('jobs')
      .select('*, customer:customers(*)')
      .eq('id', jobId)
      .single()

    if (!job?.customer?.phone) return

    const services = typeof job.services === 'string' ? JSON.parse(job.services) : job.services
    const serviceName = (services as { service_name: string }[]).map(s => s.service_name).join(', ')

    const body = smsTemplates.jobReminder({
      customerName: job.customer.full_name,
      time: job.scheduled_time || 'aftalt tid',
      service: serviceName,
    })

    const result = await sendSms({ to: job.customer.phone, body })

    await logSms({
      toPhone: job.customer.phone,
      templateType: 'job_reminder',
      relatedId: jobId,
      status: result.success ? 'sent' : (result.skipped ? 'skipped' : 'failed'),
      twilioSid: result.sid,
    })
  } catch (err) {
    console.error('[SMS Trigger] Job reminder failed:', err)
  }
}
