'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function updateLeadStatus(id: string, status: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('leads')
    .update({ status })
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath(`/leads/${id}`)
  revalidatePath('/leads')
}

export async function updateLeadNotes(id: string, notes: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('leads')
    .update({ notes })
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath(`/leads/${id}`)
}

export async function convertLeadToCustomer(leadId: string) {
  const supabase = await createClient()

  // Get lead data
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .single()

  if (leadError || !lead) throw new Error('Lead ikke fundet')

  // Create customer
  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .insert({
      full_name: lead.full_name,
      email: lead.email,
      phone: lead.phone,
      address: lead.address,
      city: lead.city || '',
      zip_code: lead.zip_code || '',
      source: 'website',
    })
    .select()
    .single()

  if (customerError || !customer) throw new Error(customerError?.message || 'Kunne ikke oprette kunde')

  // Update lead with customer reference
  await supabase
    .from('leads')
    .update({
      converted_customer_id: customer.id,
      status: 'won',
    })
    .eq('id', leadId)

  revalidatePath(`/leads/${leadId}`)
  revalidatePath('/leads')
  revalidatePath('/customers')

  return customer.id
}

export async function createLead(formData: FormData) {
  const supabase = await createClient()

  const data = {
    full_name: formData.get('full_name') as string,
    email: (formData.get('email') as string) || null,
    phone: formData.get('phone') as string,
    address: formData.get('address') as string,
    city: (formData.get('city') as string) || null,
    zip_code: (formData.get('zip_code') as string) || null,
    service_type: (formData.get('service_type') as string) || null,
    estimated_area: formData.get('estimated_area') ? Number(formData.get('estimated_area')) : null,
    calculated_price: formData.get('calculated_price') ? Number(formData.get('calculated_price')) : null,
    message: (formData.get('message') as string) || null,
    status: 'new' as const,
    source: 'manual',
  }

  const { error } = await supabase.from('leads').insert(data)
  if (error) throw new Error(error.message)

  revalidatePath('/leads')
  redirect('/leads')
}
