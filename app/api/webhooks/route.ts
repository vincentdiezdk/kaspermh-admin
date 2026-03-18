import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  // Placeholder for webhook handling (e.g., Supabase webhooks, payment webhooks)
  return NextResponse.json({ received: true })
}

export async function GET() {
  return NextResponse.json({ status: 'ok' })
}
