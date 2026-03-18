import twilio from 'twilio'

const client = (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN)
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null

const SENDER_ID = process.env.TWILIO_SENDER_ID || 'KasperMH'

export function isSmsConfigured(): boolean {
  return !!client
}

export async function sendSms({
  to,
  body,
}: {
  to: string
  body: string
}) {
  if (!client) {
    console.warn('[SMS] Twilio not configured — skipping SMS to:', to)
    return { success: false, skipped: true, sid: undefined }
  }

  const normalizedTo = normalizeDanishPhone(to)
  if (!normalizedTo) {
    console.warn('[SMS] Invalid phone number:', to)
    return { success: false, error: 'Invalid phone number', sid: undefined }
  }

  try {
    const message = await client.messages.create({
      body,
      from: SENDER_ID,
      to: normalizedTo,
    })

    console.log('[SMS] Sent to:', normalizedTo, 'SID:', message.sid)
    return { success: true, sid: message.sid }
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    console.error('[SMS] Send failed:', errorMessage)
    return { success: false, error: errorMessage, sid: undefined }
  }
}

// Normalize Danish phone numbers to E.164 format (+45XXXXXXXX)
function normalizeDanishPhone(phone: string): string | null {
  const cleaned = phone.replace(/[^\d+]/g, '')

  if (cleaned.startsWith('+45') && cleaned.length === 11) {
    return cleaned
  }
  if (cleaned.startsWith('45') && cleaned.length === 10) {
    return '+' + cleaned
  }
  if (cleaned.length === 8 && /^[2-9]/.test(cleaned)) {
    return '+45' + cleaned
  }
  if (cleaned.startsWith('+') && cleaned.length >= 10) {
    return cleaned
  }

  return null
}
