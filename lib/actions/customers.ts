'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createCustomer(formData: FormData) {
  const supabase = await createClient()

  const data = {
    full_name: formData.get('full_name') as string,
    email: (formData.get('email') as string) || null,
    phone: formData.get('phone') as string,
    address: formData.get('address') as string,
    city: formData.get('city') as string,
    zip_code: formData.get('zip_code') as string,
    notes: (formData.get('notes') as string) || null,
    source: (formData.get('source') as string) || 'manual',
  }

  const { data: customer, error } = await supabase
    .from('customers')
    .insert(data)
    .select()
    .single()

  if (error) throw new Error(error.message)

  revalidatePath('/customers')

  const redirectTo = formData.get('redirect_to') as string
  if (redirectTo) {
    redirect(redirectTo)
  }

  redirect(`/customers/${customer.id}`)
}

export async function updateCustomer(id: string, formData: FormData) {
  const supabase = await createClient()

  const data = {
    full_name: formData.get('full_name') as string,
    email: (formData.get('email') as string) || null,
    phone: formData.get('phone') as string,
    address: formData.get('address') as string,
    city: formData.get('city') as string,
    zip_code: formData.get('zip_code') as string,
    notes: (formData.get('notes') as string) || null,
    source: (formData.get('source') as string) || null,
  }

  const { error } = await supabase
    .from('customers')
    .update(data)
    .eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath(`/customers/${id}`)
  revalidatePath('/customers')
  redirect(`/customers/${id}`)
}
