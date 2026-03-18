import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

export async function sendEmail({
  to,
  subject,
  html,
  replyTo,
}: {
  to: string
  subject: string
  html: string
  replyTo?: string
}) {
  if (!resend) {
    console.warn('[Email] RESEND_API_KEY not set — skipping email:', subject, '→', to)
    return { success: false, skipped: true, id: undefined }
  }

  const from = process.env.EMAIL_FROM || 'KasperMH <onboarding@resend.dev>'

  try {
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject,
      html,
      replyTo: replyTo || undefined,
    })

    if (error) {
      console.error('[Email] Send failed:', error)
      return { success: false, error, id: undefined }
    }

    console.log('[Email] Sent:', subject, '→', to, 'id:', data?.id)
    return { success: true, id: data?.id }
  } catch (err) {
    console.error('[Email] Exception:', err)
    return { success: false, error: err, id: undefined }
  }
}
