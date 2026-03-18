import { createClient } from '@supabase/supabase-js'

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export async function logSms({
  toPhone,
  templateType,
  relatedId,
  status,
  twilioSid,
}: {
  toPhone: string
  templateType: string
  relatedId?: string | null
  status: 'sent' | 'failed' | 'skipped'
  twilioSid?: string | null
}) {
  const supabase = getServiceClient()
  if (!supabase) {
    console.warn('[SMS Log] No service client — skipping log')
    return
  }

  try {
    await supabase.from('email_log').insert({
      type: `sms_${templateType}`,
      recipient: toPhone,
      subject: `SMS: ${templateType}`,
      reference_id: relatedId || null,
      status: status === 'skipped' ? 'failed' : status,
      resend_id: twilioSid || null,
    })
  } catch (err) {
    console.error('[SMS Log] Failed to log:', err)
  }
}
