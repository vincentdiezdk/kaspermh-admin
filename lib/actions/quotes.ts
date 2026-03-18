'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { QuoteLineItem } from '@/lib/types'

async function generateQuoteNumber(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string> {
  const year = new Date().getFullYear()
  const { count } = await supabase
    .from('quotes')
    .select('*', { count: 'exact', head: true })
    .like('quote_number', `${year}-%`)

  const nextNum = (count || 0) + 1
  return `${year}-${String(nextNum).padStart(4, '0')}`
}

export async function createQuote(data: {
  customer_id: string
  lead_id?: string | null
  line_items: QuoteLineItem[]
  subtotal: number
  vat_amount: number
  total_incl_vat: number
  valid_until: string | null
  notes: string | null
  status: 'draft' | 'sent'
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const quote_number = await generateQuoteNumber(supabase)

  const insertData = {
    quote_number,
    customer_id: data.customer_id,
    lead_id: data.lead_id || null,
    line_items: JSON.stringify(data.line_items),
    subtotal: data.subtotal,
    vat_amount: data.vat_amount,
    total_incl_vat: data.total_incl_vat,
    valid_until: data.valid_until,
    notes: data.notes,
    status: data.status,
    sent_at: data.status === 'sent' ? new Date().toISOString() : null,
    created_by: user?.id || null,
  }

  const { data: quote, error } = await supabase
    .from('quotes')
    .insert(insertData)
    .select()
    .single()

  if (error) throw new Error(error.message)

  // If from a lead, update lead status
  if (data.lead_id) {
    await supabase
      .from('leads')
      .update({ status: 'quote_sent' })
      .eq('id', data.lead_id)
    revalidatePath('/leads')
  }

  revalidatePath('/quotes')
  redirect(`/quotes/${quote.id}`)
}

export async function updateQuoteStatus(id: string, status: string) {
  const supabase = await createClient()

  const updateData: Record<string, unknown> = { status }
  if (status === 'sent') updateData.sent_at = new Date().toISOString()
  if (status === 'accepted') updateData.accepted_at = new Date().toISOString()
  if (status === 'declined') updateData.declined_at = new Date().toISOString()

  const { error } = await supabase
    .from('quotes')
    .update(updateData)
    .eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath(`/quotes/${id}`)
  revalidatePath('/quotes')
}

export async function duplicateQuote(id: string) {
  const supabase = await createClient()

  const { data: original, error: fetchError } = await supabase
    .from('quotes')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError || !original) throw new Error('Tilbud ikke fundet')

  const { data: { user } } = await supabase.auth.getUser()
  const quote_number = await generateQuoteNumber(supabase)

  const { data: newQuote, error } = await supabase
    .from('quotes')
    .insert({
      quote_number,
      customer_id: original.customer_id,
      lead_id: original.lead_id,
      line_items: original.line_items,
      subtotal: original.subtotal,
      vat_amount: original.vat_amount,
      total_incl_vat: original.total_incl_vat,
      notes: original.notes,
      valid_until: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      status: 'draft',
      created_by: user?.id || null,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  revalidatePath('/quotes')
  redirect(`/quotes/${newQuote.id}`)
}
