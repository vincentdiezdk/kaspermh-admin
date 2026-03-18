import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/email/send'
import { logEmail } from '@/lib/email/log'
import { adminNotificationEmail } from '@/lib/email/templates'

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

// POST /api/webhooks/lead
// Public endpoint — verified by secret token
// Called by kaspermh.dk when a customer submits the price calculator form
export async function POST(request: Request) {
  // Verify webhook secret
  const authHeader = request.headers.get('authorization')
  const webhookSecret = process.env.LEAD_WEBHOOK_SECRET

  if (webhookSecret && authHeader !== `Bearer ${webhookSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const {
    name,
    email,
    phone,
    address,
    service,
    area_m2,
    estimated_price,
    message,
    source,
  } = body as {
    name?: string
    email?: string
    phone?: string
    address?: string
    service?: string
    area_m2?: number
    estimated_price?: number
    message?: string
    source?: string
  }

  // Validate required fields (email is optional for exit-intent leads)
  if (!name || !phone) {
    return Response.json(
      { error: 'Manglende felter: name og phone er påkrævet' },
      { status: 400 }
    )
  }

  const supabase = getServiceClient()
  if (!supabase) {
    console.error('[Webhook] No Supabase service client available')
    return Response.json({ error: 'Server configuration error' }, { status: 500 })
  }

  const { data: lead, error } = await supabase
    .from('leads')
    .insert({
      full_name: name,
      email: email || '',
      phone,
      address: address || '',
      service_type: service || null,
      estimated_area: area_m2 || null,
      calculated_price: estimated_price || null,
      message: message || null,
      source: source || 'hjemmeside',
      status: 'new',
    })
    .select()
    .single()

  if (error) {
    console.error('[Webhook] Lead insert failed:', error)
    return Response.json({ error: 'Kunne ikke oprette lead' }, { status: 500 })
  }

  // Send admin notification email (non-blocking)
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://kaspermh-admin.vercel.app'
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'kontakt@kaspermh.dk'

  void (async () => {
    try {
      const html = adminNotificationEmail({
        type: 'new_lead',
        title: `Nyt lead: ${name}`,
        details: `Service: ${service || 'Ikke angivet'}\nAreal: ${area_m2 ? area_m2 + ' m²' : 'Ikke angivet'}\nEst. pris: ${estimated_price ? estimated_price + ' kr' : 'Ikke angivet'}\nTelefon: ${phone}\nEmail: ${email || 'Ikke angivet'}`,
        actionUrl: `${APP_URL}/leads/${lead.id}`,
      })

      const result = await sendEmail({
        to: ADMIN_EMAIL,
        subject: `Nyt lead: ${name} \u2014 ${service || 'Ukendt service'}`,
        html,
      })

      await logEmail({
        to: ADMIN_EMAIL,
        subject: `Nyt lead: ${name}`,
        templateType: 'admin_notification',
        relatedId: lead.id,
        success: result.success,
        resendId: result.id,
      })
    } catch (err) {
      console.error('[Webhook] Admin notification failed:', err)
    }
  })()

  return Response.json({
    success: true,
    lead_id: lead.id,
    message: 'Lead oprettet',
  })
}
