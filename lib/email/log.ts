import { createClient } from '@supabase/supabase-js'

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export async function logEmail({
  to,
  subject,
  templateType,
  relatedId,
  success,
  resendId,
}: {
  to: string
  subject: string
  templateType: string
  relatedId?: string | null
  success: boolean
  resendId?: string | null
}) {
  const supabase = getServiceClient()
  if (!supabase) {
    console.warn('[Email Log] No service client — skipping log')
    return
  }

  try {
    await supabase.from('email_log').insert({
      type: templateType,
      recipient: to,
      subject,
      reference_id: relatedId || null,
      status: success ? 'sent' : 'failed',
      resend_id: resendId || null,
    })
  } catch (err) {
    console.error('[Email Log] Failed to log email:', err)
  }
}
