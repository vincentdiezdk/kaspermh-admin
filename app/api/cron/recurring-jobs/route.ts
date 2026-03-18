import { NextResponse } from 'next/server'
import { generateRecurringJobs } from '@/app/actions/recurring'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await generateRecurringJobs()

    return NextResponse.json({
      success: true,
      jobs_generated: result.generated,
      errors: result.errors,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[Cron] Recurring jobs failed:', err)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
