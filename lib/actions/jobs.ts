'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { QuoteLineItem } from '@/lib/types'

async function generateJobNumber(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string> {
  const year = new Date().getFullYear()
  const { count } = await supabase
    .from('jobs')
    .select('*', { count: 'exact', head: true })
    .like('job_number', `JOB-${year}-%`)

  const nextNum = (count || 0) + 1
  return `JOB-${year}-${String(nextNum).padStart(4, '0')}`
}

async function generateInvoiceNumber(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string> {
  const year = new Date().getFullYear()
  const { count } = await supabase
    .from('jobs')
    .select('*', { count: 'exact', head: true })
    .like('invoice_number', `F-${year}-%`)

  const nextNum = (count || 0) + 1
  return `F-${year}-${String(nextNum).padStart(4, '0')}`
}

export async function createJob(data: {
  customer_id: string
  scheduled_date: string
  scheduled_time: string | null
  estimated_duration: number | null
  assigned_user_id: string | null
  vehicle_id: string | null
  address: string
  services: QuoteLineItem[]
  internal_notes: string | null
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const job_number = await generateJobNumber(supabase)

  const { data: job, error } = await supabase
    .from('jobs')
    .insert({
      job_number,
      customer_id: data.customer_id,
      scheduled_date: data.scheduled_date,
      scheduled_time: data.scheduled_time || null,
      estimated_duration: data.estimated_duration || null,
      assigned_user_id: data.assigned_user_id || user?.id || null,
      vehicle_id: data.vehicle_id || null,
      address: data.address,
      services: JSON.stringify(data.services),
      internal_notes: data.internal_notes || null,
      status: 'scheduled',
      created_by: user?.id || null,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  revalidatePath('/jobs')
  revalidatePath('/')
  redirect(`/jobs/${job.id}`)
}

export async function updateJobStatus(jobId: string, newStatus: string) {
  const supabase = await createClient()

  const updateData: Record<string, unknown> = { status: newStatus }
  const now = new Date().toISOString()

  if (newStatus === 'en_route') {
    // no extra timestamp needed
  } else if (newStatus === 'arrived') {
    updateData.arrived_at = now
  } else if (newStatus === 'in_progress') {
    updateData.started_at = now
  } else if (newStatus === 'completed') {
    updateData.completed_at = now
  }

  const { error } = await supabase
    .from('jobs')
    .update(updateData)
    .eq('id', jobId)

  if (error) throw new Error(error.message)

  revalidatePath(`/jobs/${jobId}`)
  revalidatePath('/jobs')
  revalidatePath('/')
}

export async function updateJobNotes(jobId: string, customerNotes: string | null, internalNotes: string | null) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('jobs')
    .update({ customer_notes: customerNotes, internal_notes: internalNotes })
    .eq('id', jobId)

  if (error) throw new Error(error.message)

  revalidatePath(`/jobs/${jobId}`)
}

export async function generateInvoice(jobId: string) {
  const supabase = await createClient()
  const invoice_number = await generateInvoiceNumber(supabase)
  const now = new Date().toISOString()

  const { error } = await supabase
    .from('jobs')
    .update({
      status: 'invoiced',
      invoice_number,
      invoice_sent_at: now,
    })
    .eq('id', jobId)

  if (error) throw new Error(error.message)

  revalidatePath(`/jobs/${jobId}`)
  revalidatePath('/jobs')
  revalidatePath('/')
}

export async function markJobPaid(jobId: string) {
  const supabase = await createClient()
  const now = new Date().toISOString()

  const { error } = await supabase
    .from('jobs')
    .update({ paid_at: now })
    .eq('id', jobId)

  if (error) throw new Error(error.message)

  revalidatePath(`/jobs/${jobId}`)
  revalidatePath('/jobs')
  revalidatePath('/')
}

export async function deleteJobPhoto(photoId: string, storagePath: string, jobId: string) {
  const supabase = await createClient()

  // Delete from storage
  await supabase.storage.from('job-photos').remove([storagePath])

  // Delete from database
  const { error } = await supabase
    .from('job_photos')
    .delete()
    .eq('id', photoId)

  if (error) throw new Error(error.message)

  revalidatePath(`/jobs/${jobId}`)
}
