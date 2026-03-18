'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getVehicles() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .order('is_active', { ascending: false })
    .order('name', { ascending: true })

  if (error) throw new Error(error.message)
  return data
}

export async function createVehicle(data: {
  name: string
  license_plate: string
  color: string | null
  notes: string | null
  is_active: boolean
}) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('vehicles')
    .insert(data)

  if (error) throw new Error(error.message)
  revalidatePath('/settings/vehicles')
}

export async function updateVehicle(id: string, data: {
  name: string
  license_plate: string
  color: string | null
  notes: string | null
  is_active: boolean
}) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('vehicles')
    .update(data)
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/settings/vehicles')
}

export async function deleteVehicle(id: string) {
  const supabase = await createClient()

  // Check if vehicle is assigned to any active jobs
  const { count } = await supabase
    .from('jobs')
    .select('*', { count: 'exact', head: true })
    .eq('vehicle_id', id)
    .in('status', ['scheduled', 'en_route', 'arrived', 'in_progress'])

  if (count && count > 0) {
    throw new Error('Dette køretøj er tildelt aktive jobs og kan ikke slettes')
  }

  const { error } = await supabase
    .from('vehicles')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/settings/vehicles')
}

export async function toggleVehicleActive(id: string, is_active: boolean) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('vehicles')
    .update({ is_active })
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/settings/vehicles')
}
