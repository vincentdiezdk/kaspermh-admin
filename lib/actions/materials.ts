'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getMaterials() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('materials')
    .select('*')
    .order('is_active', { ascending: false })
    .order('name', { ascending: true })

  if (error) throw new Error(error.message)
  return data
}

export async function createMaterial(data: {
  name: string
  unit: string
  cost_per_unit: number
  stock_quantity: number
  low_stock_threshold: number | null
}) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('materials')
    .insert(data)

  if (error) throw new Error(error.message)
  revalidatePath('/settings/materials')
}

export async function updateMaterial(id: string, data: {
  name: string
  unit: string
  cost_per_unit: number
  low_stock_threshold: number | null
  is_active: boolean
}) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('materials')
    .update(data)
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/settings/materials')
}

export async function deleteMaterial(id: string) {
  const supabase = await createClient()

  // Soft delete: set is_active = false
  const { error } = await supabase
    .from('materials')
    .update({ is_active: false })
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/settings/materials')
}

export async function restockMaterial(id: string, quantity: number) {
  const supabase = await createClient()

  // Get current stock
  const { data: material, error: fetchErr } = await supabase
    .from('materials')
    .select('stock_quantity')
    .eq('id', id)
    .single()

  if (fetchErr || !material) throw new Error('Materiale ikke fundet')

  const newQuantity = Number(material.stock_quantity) + quantity

  const { error } = await supabase
    .from('materials')
    .update({ stock_quantity: newQuantity })
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/settings/materials')
}

export async function addJobMaterial(
  jobId: string,
  materialId: string,
  quantity: number,
  notes?: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Get material unit cost
  const { data: material, error: matErr } = await supabase
    .from('materials')
    .select('cost_per_unit')
    .eq('id', materialId)
    .single()

  if (matErr || !material) throw new Error('Materiale ikke fundet')

  const { error } = await supabase
    .from('job_materials')
    .insert({
      job_id: jobId,
      material_id: materialId,
      quantity,
      unit_cost: material.cost_per_unit,
      registered_by: user?.id || null,
      notes: notes || null,
    })

  if (error) throw new Error(error.message)
  revalidatePath(`/jobs/${jobId}`)
}

export async function getJobMaterials(jobId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('job_materials')
    .select('*, material:materials(name, unit)')
    .eq('job_id', jobId)
    .order('registered_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data
}

export async function removeJobMaterial(id: string, jobId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('job_materials')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath(`/jobs/${jobId}`)
}

export async function getMaterialCostForPeriod(startDate: string, endDate: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('job_materials')
    .select('total_cost, registered_at')
    .gte('registered_at', startDate)
    .lte('registered_at', endDate + 'T23:59:59')

  if (error) return { totalCost: 0, count: 0 }

  const totalCost = (data || []).reduce((sum, m) => sum + (Number(m.total_cost) || 0), 0)
  return { totalCost, count: data?.length || 0 }
}

export async function getLowStockCount() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('materials')
    .select('id, stock_quantity, low_stock_threshold')
    .eq('is_active', true)
    .not('low_stock_threshold', 'is', null)

  const lowStockCount = (data || []).filter(
    m => Number(m.stock_quantity) < Number(m.low_stock_threshold)
  ).length

  return lowStockCount
}

export async function getActiveMaterials() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('materials')
    .select('id, name, unit, cost_per_unit, stock_quantity')
    .eq('is_active', true)
    .order('name', { ascending: true })

  if (error) throw new Error(error.message)
  return data
}
