import { createClient } from '@supabase/supabase-js'
import { sendEmail } from './send'
import { logEmail } from './log'
import {
  quoteEmail,
  jobConfirmationEmail,
  jobReportEmail,
  invoiceEmail,
  adminNotificationEmail,
} from './templates'

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

async function getCompanyInfo() {
  const supabase = getServiceClient()
  if (!supabase) return null
  const { data } = await supabase
    .from('company_settings')
    .select('*')
    .limit(1)
    .single()
  return data as {
    company_name: string
    phone: string
    email: string
    cvr: string
    address: string
    postal_code: string
    city: string
    bank_reg: string
    bank_account: string
    mobilepay_number: string
    invoice_due_days: number
  } | null
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://kaspermh-admin.vercel.app'
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'kontakt@kaspermh.dk'

/** Trigger 2: Quote sent → email customer */
export async function triggerQuoteSentEmail(quoteId: string) {
  try {
    const supabase = getServiceClient()
    if (!supabase) return

    const { data: quote } = await supabase
      .from('quotes')
      .select('*, customer:customers(*)')
      .eq('id', quoteId)
      .single()

    if (!quote?.customer?.email) return

    const company = await getCompanyInfo()
    if (!company) return

    const lineItems = typeof quote.line_items === 'string'
      ? JSON.parse(quote.line_items)
      : quote.line_items

    const services = (lineItems as { service_name: string; quantity: number; unit: string; unit_price: number; line_total: number }[]).map((li) => ({
      name: li.service_name,
      quantity: li.quantity,
      unit: li.unit === 'm2' ? 'm²' : li.unit === 'stk' ? 'stk' : li.unit === 'time' ? 'time' : 'stk',
      unitPrice: li.unit_price,
      total: li.line_total,
    }))

    const acceptUrl = `${APP_URL}/api/accept-quote?token=${quote.accept_token}`

    const html = quoteEmail({
      customerName: quote.customer.full_name,
      quoteNumber: quote.quote_number,
      services,
      subtotal: quote.subtotal,
      vat: quote.vat_amount,
      total: quote.total_incl_vat,
      validUntil: quote.valid_until
        ? new Date(quote.valid_until).toLocaleDateString('da-DK')
        : 'Ukendt',
      acceptUrl,
      companyName: company.company_name,
      companyPhone: company.phone,
      companyEmail: company.email,
      companyCvr: company.cvr,
      companyAddress: `${company.address}, ${company.postal_code} ${company.city}`,
    })

    const result = await sendEmail({
      to: quote.customer.email,
      subject: `Tilbud ${quote.quote_number} fra ${company.company_name}`,
      html,
    })

    await logEmail({
      to: quote.customer.email,
      subject: `Tilbud ${quote.quote_number}`,
      templateType: 'quote',
      relatedId: quoteId,
      success: result.success,
      resendId: result.id,
    })
  } catch (err) {
    console.error('[Email Trigger] Quote sent failed:', err)
  }
}

/** Trigger 3: Quote accepted → confirmation + admin notification */
export async function triggerQuoteAcceptedEmail(quoteId: string, customerId: string) {
  try {
    const supabase = getServiceClient()
    if (!supabase) return

    const { data: customer } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single()

    const { data: quote } = await supabase
      .from('quotes')
      .select('*')
      .eq('id', quoteId)
      .single()

    if (!customer || !quote) return

    const company = await getCompanyInfo()
    if (!company) return

    const lineItems = typeof quote.line_items === 'string'
      ? JSON.parse(quote.line_items)
      : quote.line_items

    const serviceName = (lineItems as { service_name: string }[])
      .map((li) => li.service_name)
      .join(', ')

    // Send job confirmation to customer
    if (customer.email) {
      const html = jobConfirmationEmail({
        customerName: customer.full_name,
        serviceName,
        scheduledDate: 'Aftales snarest',
        scheduledTime: 'Aftales nærmere',
        address: `${customer.address}, ${customer.zip_code} ${customer.city}`,
        companyName: company.company_name,
        companyPhone: company.phone,
      })

      const result = await sendEmail({
        to: customer.email,
        subject: `Bekræftelse — dit tilbud er accepteret`,
        html,
      })

      await logEmail({
        to: customer.email,
        subject: 'Jobbekræftelse',
        templateType: 'job_confirmation',
        relatedId: quoteId,
        success: result.success,
        resendId: result.id,
      })
    }

    // Admin notification
    const adminHtml = adminNotificationEmail({
      type: 'quote_accepted',
      title: `Tilbud accepteret: ${customer.full_name}`,
      details: `Tilbud ${quote.quote_number}\nKunde: ${customer.full_name}\nService: ${serviceName}\nTotal: ${quote.total_incl_vat} kr inkl. moms`,
      actionUrl: `${APP_URL}/quotes/${quoteId}`,
    })

    const adminResult = await sendEmail({
      to: ADMIN_EMAIL,
      subject: `Tilbud accepteret: ${customer.full_name} — ${quote.quote_number}`,
      html: adminHtml,
    })

    await logEmail({
      to: ADMIN_EMAIL,
      subject: `Tilbud accepteret: ${quote.quote_number}`,
      templateType: 'admin_notification',
      relatedId: quoteId,
      success: adminResult.success,
      resendId: adminResult.id,
    })
  } catch (err) {
    console.error('[Email Trigger] Quote accepted failed:', err)
  }
}

/** Trigger 4: Job completed → job report email */
export async function triggerJobCompletedEmail(jobId: string) {
  try {
    const supabase = getServiceClient()
    if (!supabase) return

    const { data: job } = await supabase
      .from('jobs')
      .select('*, customer:customers(*)')
      .eq('id', jobId)
      .single()

    if (!job?.customer?.email) return

    const company = await getCompanyInfo()
    if (!company) return

    // Get photos
    const { data: photos } = await supabase
      .from('job_photos')
      .select('public_url, type')
      .eq('job_id', jobId)

    const beforePhotos = (photos || []).filter((p) => p.type === 'before').map((p) => p.public_url)
    const afterPhotos = (photos || []).filter((p) => p.type === 'after').map((p) => p.public_url)

    const services = typeof job.services === 'string'
      ? JSON.parse(job.services)
      : job.services

    const serviceName = (services as { service_name: string }[])
      .map((s) => s.service_name)
      .join(', ')

    const html = jobReportEmail({
      customerName: job.customer.full_name,
      jobNumber: job.job_number,
      serviceName,
      completedDate: new Date().toLocaleDateString('da-DK'),
      customerNotes: job.customer_notes || '',
      beforePhotos,
      afterPhotos,
      companyName: company.company_name,
      companyPhone: company.phone,
    })

    const result = await sendEmail({
      to: job.customer.email,
      subject: `Jobraport — ${job.job_number}`,
      html,
    })

    await logEmail({
      to: job.customer.email,
      subject: `Jobraport ${job.job_number}`,
      templateType: 'job_report',
      relatedId: jobId,
      success: result.success,
      resendId: result.id,
    })
  } catch (err) {
    console.error('[Email Trigger] Job completed failed:', err)
  }
}

/** Trigger 5: Invoice created → invoice email */
export async function triggerInvoiceEmail(jobId: string) {
  try {
    const supabase = getServiceClient()
    if (!supabase) return

    const { data: job } = await supabase
      .from('jobs')
      .select('*, customer:customers(*)')
      .eq('id', jobId)
      .single()

    if (!job?.customer?.email) return

    const company = await getCompanyInfo()
    if (!company) return

    const lineItems = typeof job.services === 'string'
      ? JSON.parse(job.services)
      : job.services

    const services = (lineItems as { service_name: string; quantity: number; unit: string; unit_price: number; line_total: number }[]).map((li) => ({
      name: li.service_name,
      quantity: li.quantity,
      unit: li.unit === 'm2' ? 'm²' : li.unit,
      unitPrice: li.unit_price,
      total: li.line_total,
    }))

    const subtotal = services.reduce((sum, s) => sum + s.total, 0)
    const vat = subtotal * 0.25
    const total = subtotal + vat

    const invoiceDate = new Date().toLocaleDateString('da-DK')
    const dueDate = new Date(Date.now() + (company.invoice_due_days || 14) * 86400000).toLocaleDateString('da-DK')

    const html = invoiceEmail({
      customerName: job.customer.full_name,
      invoiceNumber: job.invoice_number || '',
      invoiceDate,
      dueDate,
      services,
      subtotal,
      vat,
      total,
      bankReg: company.bank_reg,
      bankAccount: company.bank_account,
      mobilepayNumber: company.mobilepay_number,
      companyName: company.company_name,
      companyCvr: company.cvr,
      companyAddress: `${company.address}, ${company.postal_code} ${company.city}`,
    })

    const result = await sendEmail({
      to: job.customer.email,
      subject: `Faktura ${job.invoice_number} fra ${company.company_name}`,
      html,
    })

    await logEmail({
      to: job.customer.email,
      subject: `Faktura ${job.invoice_number}`,
      templateType: 'invoice',
      relatedId: jobId,
      success: result.success,
      resendId: result.id,
    })
  } catch (err) {
    console.error('[Email Trigger] Invoice email failed:', err)
  }
}

/** Trigger 6: Job created manually → job confirmation email */
export async function triggerJobCreatedEmail(jobId: string) {
  try {
    const supabase = getServiceClient()
    if (!supabase) return

    const { data: job } = await supabase
      .from('jobs')
      .select('*, customer:customers(*)')
      .eq('id', jobId)
      .single()

    if (!job?.customer?.email) return

    const company = await getCompanyInfo()
    if (!company) return

    const services = typeof job.services === 'string'
      ? JSON.parse(job.services)
      : job.services

    const serviceName = (services as { service_name: string }[])
      .map((s) => s.service_name)
      .join(', ')

    const html = jobConfirmationEmail({
      customerName: job.customer.full_name,
      serviceName,
      scheduledDate: job.scheduled_date
        ? new Date(job.scheduled_date).toLocaleDateString('da-DK')
        : 'Aftales snarest',
      scheduledTime: job.scheduled_time || 'Aftales nærmere',
      address: job.address,
      companyName: company.company_name,
      companyPhone: company.phone,
    })

    const result = await sendEmail({
      to: job.customer.email,
      subject: `Jobbekræftelse — ${serviceName}`,
      html,
    })

    await logEmail({
      to: job.customer.email,
      subject: `Jobbekræftelse ${job.job_number}`,
      templateType: 'job_confirmation',
      relatedId: jobId,
      success: result.success,
      resendId: result.id,
    })
  } catch (err) {
    console.error('[Email Trigger] Job created failed:', err)
  }
}
