'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { QuoteLineItem } from '@/lib/types'
import { triggerJobCreatedEmail, triggerJobCompletedEmail, triggerInvoiceEmail } from '@/lib/email/triggers'
import { triggerJobConfirmationSms, triggerEnRouteSms, triggerJobCompletedSms, triggerInvoiceSms } from '@/lib/sms/triggers'
import { syncContactToDinero, createDineroInvoice, markDineroPaid } from '@/lib/dinero/operations'
import { notifyAdmins } from '@/lib/notifications'

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

  // Send job confirmation email (non-blocking)
  void triggerJobCreatedEmail(job.id).catch(err => console.error('[Job] Email trigger failed:', err))

  // Send job confirmation SMS (non-blocking)
  void triggerJobConfirmationSms(job.id).catch(err => console.error('[Job] SMS trigger failed:', err))

  revalidatePath('/jobs')
  revalidatePath('/')
  redirect(`/jobs/${job.id}`)
}

export async function updateJobStatus(jobId: string, newStatus: string) {
  const supabase = await createClient()

  const updateData: Record<string, unknown> = { status: newStatus }
  const now = new Date().toISOString()

  if (newStatus === 'en_route') {
    // Send "på vej" SMS (non-blocking)
    void triggerEnRouteSms(jobId).catch(err => console.error('[Job] SMS trigger failed:', err))
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

  // Send job report email when completed
  if (newStatus === 'completed') {
    void triggerJobCompletedEmail(jobId).catch(err => console.error('[Job] Email trigger failed:', err))
    void triggerJobCompletedSms(jobId).catch(err => console.error('[Job] SMS trigger failed:', err))

    // In-app notification to admins (non-blocking)
    void (async () => {
      try {
        const { data: job } = await supabase
          .from('jobs')
          .select('job_number, address')
          .eq('id', jobId)
          .single()
        if (job) {
          await notifyAdmins(
            supabase,
            'job_completed',
            `Job ${job.job_number} afsluttet`,
            job.address || 'Ingen adresse',
            `/jobs/${jobId}`
          )
        }
      } catch (err) {
        console.error('[Job] In-app notification failed:', err)
      }
    })()
  }

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

  // Send invoice email (non-blocking)
  void triggerInvoiceEmail(jobId).catch(err => console.error('[Job] Invoice email failed:', err))

  // Send invoice SMS (non-blocking)
  void triggerInvoiceSms(jobId).catch(err => console.error('[Job] Invoice SMS failed:', err))

  // Sync invoice to Dinero (non-blocking)
  void (async () => {
    try {
      const { data: job } = await supabase
        .from('jobs')
        .select('*, customer:customers(*)')
        .eq('id', jobId)
        .single()
      if (!job) return
      const services = typeof job.services === 'string' ? JSON.parse(job.services) : job.services
      await createDineroInvoice({
        invoiceNumber: invoice_number,
        customerName: job.customer?.full_name || '',
        customerEmail: job.customer?.email || '',
        lines: (services as { service_name: string; quantity: number; unit_price: number }[]).map(s => ({
          description: s.service_name,
          quantity: s.quantity,
          unitPrice: s.unit_price,
        })),
        dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      })
    } catch (err) {
      console.error('[Dinero] Invoice sync failed:', err)
    }
  })()

  revalidatePath(`/jobs/${jobId}`)
  revalidatePath('/jobs')
  revalidatePath('/')
}

export async function markJobPaid(jobId: string) {
  const supabase = await createClient()
  const now = new Date().toISOString()

  // Get job total for Dinero
  const { data: job } = await supabase
    .from('jobs')
    .select('total_amount')
    .eq('id', jobId)
    .single()

  const { error } = await supabase
    .from('jobs')
    .update({ paid_at: now })
    .eq('id', jobId)

  if (error) throw new Error(error.message)

  // Sync payment to Dinero (non-blocking) — needs dineroInvoiceGuid which we don't store yet
  // This is prepared for when Dinero integration is fully connected
  if (job?.total_amount) {
    void markDineroPaid('', job.total_amount, now.split('T')[0]).catch(err =>
      console.error('[Dinero] Payment sync failed:', err)
    )
  }

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
