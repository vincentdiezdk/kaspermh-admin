import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  const html = (title: string, message: string) => new NextResponse(
    `<!DOCTYPE html>
<html lang="da">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f9fafb; }
    .card { background: white; border-radius: 12px; padding: 2rem; max-width: 480px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .icon { font-size: 3rem; margin-bottom: 1rem; }
    h1 { color: #111827; font-size: 1.25rem; margin-bottom: 0.5rem; }
    p { color: #6b7280; font-size: 0.95rem; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${title.includes('Tak') ? '✅' : '⚠️'}</div>
    <h1>${title}</h1>
    <p>${message}</p>
  </div>
</body>
</html>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  )

  if (!token) {
    return html('Ugyldigt link', 'Dette link er ikke gyldigt eller er allerede brugt.')
  }

  const supabase = await createClient()

  // Find quote by token
  const { data: quote, error } = await supabase
    .from('quotes')
    .select('*, customer:customers(*)')
    .eq('accept_token', token)
    .single()

  if (error || !quote) {
    return html('Ugyldigt link', 'Dette link er ikke gyldigt eller er allerede brugt.')
  }

  if (quote.status !== 'sent') {
    return html('Allerede behandlet', 'Dette link er ikke gyldigt eller er allerede brugt.')
  }

  // Accept the quote
  const { error: updateError } = await supabase
    .from('quotes')
    .update({
      status: 'accepted',
      accepted_at: new Date().toISOString(),
    })
    .eq('id', quote.id)

  if (updateError) {
    return html('Fejl', 'Der opstod en fejl. Prøv igen eller kontakt os.')
  }

  // Create a job from the quote
  const customer = quote.customer as { full_name: string; address: string; city: string; zip_code: string } | null
  const lineItems = typeof quote.line_items === 'string' ? JSON.parse(quote.line_items) : quote.line_items

  // Generate job number
  const year = new Date().getFullYear()
  const { count } = await supabase
    .from('jobs')
    .select('*', { count: 'exact', head: true })
    .like('job_number', `J${year}-%`)

  const jobNumber = `J${year}-${String((count || 0) + 1).padStart(4, '0')}`

  await supabase.from('jobs').insert({
    job_number: jobNumber,
    customer_id: quote.customer_id,
    quote_id: quote.id,
    scheduled_date: new Date().toISOString().split('T')[0],
    status: 'scheduled',
    address: customer ? `${customer.address}, ${customer.zip_code} ${customer.city}` : '',
    services: lineItems,
    created_by: quote.created_by,
  })

  return html('Tak!', 'Dit tilbud er accepteret. Vi kontakter dig snart med en dato.')
}
