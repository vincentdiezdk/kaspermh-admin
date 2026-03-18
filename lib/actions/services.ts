'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getServices() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) throw new Error(error.message)
  return data
}

export async function createService(data: {
  name: string
  description: string | null
  unit: string
  base_price: number
  min_price: number | null
  is_active: boolean
  sort_order: number
}) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('services')
    .insert(data)

  if (error) throw new Error(error.message)
  revalidatePath('/settings/services')
}

export async function updateService(id: string, data: {
  name: string
  description: string | null
  unit: string
  base_price: number
  min_price: number | null
  is_active: boolean
  sort_order: number
}) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('services')
    .update(data)
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/settings/services')
}

export async function deleteService(id: string) {
  const supabase = await createClient()

  // Check if service is used in any jobs
  const { count: jobCount } = await supabase
    .from('jobs')
    .select('*', { count: 'exact', head: true })
    .contains('services', JSON.stringify([{ service_id: id }]))

  if (jobCount && jobCount > 0) {
    throw new Error('Denne service bruges i eksisterende jobs og kan ikke slettes')
  }

  const { error } = await supabase
    .from('services')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/settings/services')
}

export async function toggleServiceActive(id: string, is_active: boolean) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('services')
    .update({ is_active })
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/settings/services')
}
