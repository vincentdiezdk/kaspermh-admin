'use server'

import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/email/send'
import { logEmail } from '@/lib/email/log'
import { sendSms, isSmsConfigured } from '@/lib/sms/send'
import { logSms } from '@/lib/sms/log'
import { notifyAdmins } from '@/lib/notifications'

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

function formatDanishPrice(amount: number): string {
  return new Intl.NumberFormat('da-DK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount) + ' kr'
}

function formatDanishDate(dateStr: string): string {
  const MONTHS = [
    'januar', 'februar', 'marts', 'april', 'maj', 'juni',
    'juli', 'august', 'september', 'oktober', 'november', 'december',
  ]
  const d = new Date(dateStr)
  return `${d.getDate()}. ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

function daysSince(dateStr: string): number {
  const sent = new Date(dateStr)
  const now = new Date()
  return Math.floor((now.getTime() - sent.getTime()) / (1000 * 60 * 60 * 24))
}

function reminderEmailHtml(
  level: 1 | 2 | 3,
  customerName: string,
  invoiceNumber: string,
  amount: string,
  dueDate: string,
  company: { company_name: string; phone: string; email: string; bank_reg: string; bank_account: string; mobilepay_number: string }
): string {
  const firstName = customerName.split(' ')[0]

  if (level === 1) {
    return `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #16a34a;">P\u00e5mindelse om betaling</h2>
        <p>K\u00e6re ${firstName},</p>
        <p>Vi tillader os venligt at minde dig om, at faktura <strong>${invoiceNumber}</strong> p\u00e5 <strong>${amount}</strong> med forfaldsdato ${dueDate} endnu ikke er registreret som betalt.</p>
        <p>Det kan naturligvis skyldes en forglemmelse, og vi beder dig derfor venligst om at foretage betalingen hurtigst muligt.</p>
        ${company.bank_reg || company.bank_account ? `<p><strong>Bankoverf\u00f8rsel:</strong> Reg. nr.: ${company.bank_reg || '\u2014'} Kontonr.: ${company.bank_account || '\u2014'}</p>` : ''}
        ${company.mobilepay_number ? `<p><strong>MobilePay:</strong> ${company.mobilepay_number}</p>` : ''}
        <p>Har du allerede betalt, bedes du se bort fra denne p\u00e5mindelse.</p>
        <p>Med venlig hilsen,<br/>${company.company_name}</p>
      </div>
    `
  }

  if (level === 2) {
    return `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #d97706;">2. rykker \u2014 Faktura ${invoiceNumber}</h2>
        <p>K\u00e6re ${firstName},</p>
        <p>Vi har tidligere sendt en p\u00e5mindelse vedr\u00f8rende faktura <strong>${invoiceNumber}</strong> p\u00e5 <strong>${amount}</strong>, som forfaldt ${dueDate}.</p>
        <p>Vi har endnu ikke modtaget betalingen og beder dig venligst om at betale snarest muligt.</p>
        ${company.bank_reg || company.bank_account ? `<p><strong>Bankoverf\u00f8rsel:</strong> Reg. nr.: ${company.bank_reg || '\u2014'} Kontonr.: ${company.bank_account || '\u2014'}</p>` : ''}
        ${company.mobilepay_number ? `<p><strong>MobilePay:</strong> ${company.mobilepay_number}</p>` : ''}
        <p>Kontakt os venligst p\u00e5 ${company.phone || company.email} hvis du har sp\u00f8rgsm\u00e5l.</p>
        <p>Med venlig hilsen,<br/>${company.company_name}</p>
      </div>
    `
  }

  // Level 3
  return `
    <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #dc2626;">3. og sidste rykker \u2014 Faktura ${invoiceNumber}</h2>
      <p>K\u00e6re ${firstName},</p>
      <p>Trods tidligere p\u00e5mindelser har vi stadig ikke modtaget betaling for faktura <strong>${invoiceNumber}</strong> p\u00e5 <strong>${amount}</strong>, som forfaldt ${dueDate}.</p>
      <p>Vi er n\u00f8dsaget til at meddele, at manglende betaling inden 7 dage vil medf\u00f8re overdragelse til inkasso, hvilket kan medf\u00f8re yderligere omkostninger for dig.</p>
      ${company.bank_reg || company.bank_account ? `<p><strong>Bankoverf\u00f8rsel:</strong> Reg. nr.: ${company.bank_reg || '\u2014'} Kontonr.: ${company.bank_account || '\u2014'}</p>` : ''}
      ${company.mobilepay_number ? `<p><strong>MobilePay:</strong> ${company.mobilepay_number}</p>` : ''}
      <p>Kontakt os omg\u00e5ende p\u00e5 ${company.phone || company.email} for at l\u00f8se sagen.</p>
      <p>Med venlig hilsen,<br/>${company.company_name}</p>
    </div>
  `
}

function reminderSmsBody(
  level: 1 | 2 | 3,
  customerName: string,
  invoiceNumber: string,
  amount: string,
  mobilepayNumber?: string
): string {
  const firstName = customerName.split(' ')[0]
  const mpay = mobilepayNumber ? ` MobilePay: ${mobilepayNumber}.` : ''

  if (level === 1) {
    return `Hej ${firstName}. Venlig p\u00e5mindelse: Faktura ${invoiceNumber} p\u00e5 ${amount} er forfalden. Betal venligst snarest.${mpay} Mvh KasperMH`
  }
  if (level === 2) {
    return `Hej ${firstName}. 2. rykker: Faktura ${invoiceNumber} p\u00e5 ${amount} afventer stadig betaling. Kontakt os ved sp\u00f8rgsm\u00e5l.${mpay} Mvh KasperMH`
  }
  return `Hej ${firstName}. Sidste rykker: Faktura ${invoiceNumber} p\u00e5 ${amount}. Manglende betaling inden 7 dage medf\u00f8rer inkasso.${mpay} Mvh KasperMH`
}

export async function processInvoiceReminders(): Promise<{ sent: number; errors: number }> {
  const supabase = getServiceClient()
  if (!supabase) {
    console.error('[Invoice Reminders] No service client available')
    return { sent: 0, errors: 0 }
  }

  // Fetch company settings
  const { data: company } = await supabase
    .from('company_settings')
    .select('*')
    .limit(1)
    .single()

  const companyInfo = {
    company_name: company?.company_name || 'KasperMH Haveservice',
    phone: company?.phone || '',
    email: company?.email || '',
    bank_reg: company?.bank_reg || '',
    bank_account: company?.bank_account || '',
    mobilepay_number: company?.mobilepay_number || '',
    invoice_due_days: company?.invoice_due_days || 14,
  }

  // Check SMS preferences
  const smsPrefs = company?.sms_preferences as { payment_reminder?: boolean } | null
  const smsEnabled = isSmsConfigured() && (smsPrefs?.payment_reminder !== false)

  // Find overdue invoiced jobs with auto_reminders_enabled
  const { data: overdueJobs, error } = await supabase
    .from('jobs')
    .select('*, customer:customers(full_name, email, phone)')
    .eq('status', 'invoiced')
    .is('paid_at', null)
    .eq('auto_reminders_enabled', true)
    .not('invoice_sent_at', 'is', null)

  if (error) {
    console.error('[Invoice Reminders] Query error:', error)
    return { sent: 0, errors: 0 }
  }

  if (!overdueJobs || overdueJobs.length === 0) {
    return { sent: 0, errors: 0 }
  }

  let sent = 0
  let errors = 0

  for (const job of overdueJobs) {
    try {
      const days = daysSince(job.invoice_sent_at!)
      const dueDays = companyInfo.invoice_due_days
      const daysOverdue = days - dueDays

      if (daysOverdue < 7) continue // Not yet overdue enough for first reminder

      // Determine reminder level
      let level: 1 | 2 | 3 | null = null
      let sentAtField: string | null = null

      if (daysOverdue >= 30 && !job.reminder_3_sent_at) {
        level = 3
        sentAtField = 'reminder_3_sent_at'
      } else if (daysOverdue >= 14 && !job.reminder_2_sent_at) {
        level = 2
        sentAtField = 'reminder_2_sent_at'
      } else if (daysOverdue >= 7 && !job.reminder_1_sent_at) {
        level = 1
        sentAtField = 'reminder_1_sent_at'
      }

      if (!level || !sentAtField) continue

      const customer = job.customer as {
        full_name: string
        email: string | null
        phone: string | null
      } | null

      if (!customer) continue

      // Calculate total
      const services = typeof job.services === 'string' ? JSON.parse(job.services) : job.services
      const subtotal = Array.isArray(services)
        ? services.reduce((sum: number, s: { line_total: number }) => sum + s.line_total, 0)
        : 0
      const total = subtotal * 1.25
      const amount = formatDanishPrice(total)

      const dueDateObj = new Date(job.invoice_sent_at!)
      dueDateObj.setDate(dueDateObj.getDate() + dueDays)
      const dueDate = formatDanishDate(dueDateObj.toISOString())

      const subjects: Record<number, string> = {
        1: `P\u00e5mindelse: Faktura ${job.invoice_number} forfalden`,
        2: `2. rykker: Faktura ${job.invoice_number}`,
        3: `3. og sidste rykker: Faktura ${job.invoice_number}`,
      }

      // Send email
      if (customer.email) {
        const html = reminderEmailHtml(level, customer.full_name, job.invoice_number!, amount, dueDate, companyInfo)
        const emailResult = await sendEmail({
          to: customer.email,
          subject: subjects[level],
          html,
        })

        await logEmail({
          to: customer.email,
          subject: subjects[level],
          templateType: `invoice_reminder_${level}`,
          relatedId: job.id,
          success: emailResult.success,
          resendId: emailResult.id,
        })
      }

      // Send SMS
      if (smsEnabled && customer.phone) {
        const body = reminderSmsBody(level, customer.full_name, job.invoice_number!, amount, companyInfo.mobilepay_number)
        const smsResult = await sendSms({ to: customer.phone, body })

        await logSms({
          toPhone: customer.phone,
          templateType: `invoice_reminder_${level}`,
          relatedId: job.id,
          status: smsResult.success ? 'sent' : (smsResult.skipped ? 'skipped' : 'failed'),
          twilioSid: smsResult.sid,
        })
      }

      // Update reminder sent timestamp
      await supabase
        .from('jobs')
        .update({ [sentAtField]: new Date().toISOString() })
        .eq('id', job.id)

      // Notify admins
      const levelLabels: Record<number, string> = {
        1: 'P\u00e5mindelse',
        2: '2. rykker',
        3: '3. rykker',
      }

      await notifyAdmins(
        supabase,
        'payment_overdue',
        `${levelLabels[level]} sendt: ${job.invoice_number}`,
        `${customer.full_name} \u2014 ${amount}`,
        `/jobs/${job.id}`
      )

      sent++
    } catch (err) {
      console.error(`[Invoice Reminders] Error processing job ${job.id}:`, err)
      errors++
    }
  }

  return { sent, errors }
}
