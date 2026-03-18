import { NextResponse } from 'next/server'
import { processInvoiceReminders } from '@/app/actions/invoice-reminders'

export async function GET(request: Request) {
  // Verify authorization: Vercel Cron sends this header automatically,
  // or accept a shared secret for manual triggers
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await processInvoiceReminders()

    return NextResponse.json({
      success: true,
      reminders_sent: result.sent,
      errors: result.errors,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[Cron] Invoice reminders failed:', err)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
