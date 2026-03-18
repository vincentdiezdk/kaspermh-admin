'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { syncContactToDinero } from '@/lib/dinero/operations'
import { geocodeAddress } from '@/lib/geocode'

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

  // Sync to Dinero (non-blocking)
  void syncContactToDinero({
    name: data.full_name,
    email: data.email || '',
    phone: data.phone,
    address: data.address,
    postalCode: data.zip_code,
    city: data.city,
  }).catch(err => console.error('[Dinero] Contact sync failed:', err))

  // Geocode address (non-blocking, fire-and-forget)
  void geocodeAndUpdate(customer.id, `${data.address}, ${data.zip_code} ${data.city}`)

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

  // Geocode address (non-blocking, fire-and-forget)
  void geocodeAndUpdate(id, `${data.address}, ${data.zip_code} ${data.city}`)

  revalidatePath(`/customers/${id}`)
  revalidatePath('/customers')
  redirect(`/customers/${id}`)
}

async function geocodeAndUpdate(customerId: string, fullAddress: string) {
  try {
    const coords = await geocodeAddress(fullAddress)
    if (!coords) return

    const supabase = await createClient()
    await supabase
      .from('customers')
      .update({ lat: coords.lat, lng: coords.lng })
      .eq('id', customerId)
  } catch (err) {
    console.error('[Geocode] Failed to geocode customer address:', err)
  }
}
