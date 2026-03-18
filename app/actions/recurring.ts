'use server'

import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { notifyAdmins } from '@/lib/notifications'

// Frequency labels in Danish
export const FREQUENCY_LABELS: Record<string, string> = {
  weekly: 'Ugentlig',
  biweekly: 'Hver 2. uge',
  monthly: 'Månedlig',
  bimonthly: 'Hver 2. måned',
  quarterly: 'Kvartalsvis',
  semiannual: 'Halvårlig',
  annual: 'Årlig',
}

// Day of week labels in Danish
export const DAY_LABELS: Record<number, string> = {
  0: 'Søndag',
  1: 'Mandag',
  2: 'Tirsdag',
  3: 'Onsdag',
  4: 'Torsdag',
  5: 'Fredag',
  6: 'Lørdag',
}

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

function calculateNextDate(frequency: string, fromDate: string): string {
  const d = new Date(fromDate + 'T00:00:00')
  switch (frequency) {
    case 'weekly':     d.setDate(d.getDate() + 7); break
    case 'biweekly':   d.setDate(d.getDate() + 14); break
    case 'monthly':    d.setMonth(d.getMonth() + 1); break
    case 'bimonthly':  d.setMonth(d.getMonth() + 2); break
    case 'quarterly':  d.setMonth(d.getMonth() + 3); break
    case 'semiannual': d.setMonth(d.getMonth() + 6); break
    case 'annual':     d.setFullYear(d.getFullYear() + 1); break
  }
  return d.toISOString().split('T')[0]
}

export async function createRecurringTemplate(data: {
  customer_id: string
  service_id: string
  assigned_user_id: string | null
  vehicle_id: string | null
  frequency: string
  day_of_week: number | null
  preferred_time: string | null
  notes: string | null
  next_job_date: string
}) {
  const supabase = await createServerClient()

  const { error } = await supabase
    .from('recurring_templates')
    .insert({
      customer_id: data.customer_id,
      service_id: data.service_id,
      assigned_user_id: data.assigned_user_id || null,
      vehicle_id: data.vehicle_id || null,
      frequency: data.frequency,
      day_of_week: data.day_of_week,
      preferred_time: data.preferred_time || null,
      notes: data.notes || null,
      next_job_date: data.next_job_date,
      is_active: true,
    })

  if (error) throw new Error(error.message)

  revalidatePath(`/customers/${data.customer_id}`)
}

export async function updateRecurringTemplate(id: string, data: {
  service_id: string
  assigned_user_id: string | null
  vehicle_id: string | null
  frequency: string
  day_of_week: number | null
  preferred_time: string | null
  notes: string | null
  next_job_date: string
}) {
  const supabase = await createServerClient()

  const { error } = await supabase
    .from('recurring_templates')
    .update({
      service_id: data.service_id,
      assigned_user_id: data.assigned_user_id || null,
      vehicle_id: data.vehicle_id || null,
      frequency: data.frequency,
      day_of_week: data.day_of_week,
      preferred_time: data.preferred_time || null,
      notes: data.notes || null,
      next_job_date: data.next_job_date,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) throw new Error(error.message)

  // Get customer_id for revalidation
  const { data: template } = await supabase
    .from('recurring_templates')
    .select('customer_id')
    .eq('id', id)
    .single()

  if (template) revalidatePath(`/customers/${template.customer_id}`)
}

export async function deleteRecurringTemplate(id: string) {
  const supabase = await createServerClient()

  // Get customer_id before deletion
  const { data: template } = await supabase
    .from('recurring_templates')
    .select('customer_id')
    .eq('id', id)
    .single()

  const { error } = await supabase
    .from('recurring_templates')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)

  if (template) revalidatePath(`/customers/${template.customer_id}`)
}

export async function toggleRecurringTemplate(id: string) {
  const supabase = await createServerClient()

  const { data: template } = await supabase
    .from('recurring_templates')
    .select('is_active, customer_id')
    .eq('id', id)
    .single()

  if (!template) throw new Error('Skabelon ikke fundet')

  const { error } = await supabase
    .from('recurring_templates')
    .update({ is_active: !template.is_active, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath(`/customers/${template.customer_id}`)
}

export async function getRecurringTemplates(customerId?: string) {
  const supabase = await createServerClient()

  let query = supabase
    .from('recurring_templates')
    .select('*, service:services(name), assigned_user:profiles(full_name), vehicle:vehicles(name, license_plate), customer:customers(full_name, address, city, zip_code)')
    .order('next_job_date', { ascending: true })

  if (customerId) {
    query = query.eq('customer_id', customerId)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data || []
}

// Generate jobs from recurring templates — called by cron
export async function generateRecurringJobs(): Promise<{ generated: number; errors: number }> {
  const supabase = getServiceClient()
  if (!supabase) {
    console.error('[Recurring Jobs] No service client available')
    return { generated: 0, errors: 0 }
  }

  const today = new Date().toISOString().split('T')[0]

  // Find all active templates where next_job_date <= today
  const { data: templates, error } = await supabase
    .from('recurring_templates')
    .select('*, service:services(name, base_price, unit), customer:customers(full_name, address, city, zip_code)')
    .eq('is_active', true)
    .lte('next_job_date', today)

  if (error) {
    console.error('[Recurring Jobs] Query error:', error)
    return { generated: 0, errors: 0 }
  }

  if (!templates || templates.length === 0) {
    return { generated: 0, errors: 0 }
  }

  let generated = 0
  let errors = 0

  // Generate job number
  const year = new Date().getFullYear()
  const { count: existingCount } = await supabase
    .from('jobs')
    .select('*', { count: 'exact', head: true })
    .like('job_number', `JOB-${year}-%`)

  let nextNum = (existingCount || 0) + 1

  for (const template of templates) {
    try {
      const customer = template.customer as { full_name: string; address: string; city: string; zip_code: string } | null
      const service = template.service as { name: string; base_price: number; unit: string } | null

      if (!customer || !service) {
        console.warn(`[Recurring Jobs] Skipping template ${template.id}: missing customer or service`)
        continue
      }

      const jobNumber = `JOB-${year}-${String(nextNum).padStart(4, '0')}`
      nextNum++

      const address = `${customer.address}, ${customer.zip_code} ${customer.city}`

      const services = JSON.stringify([{
        service_id: template.service_id,
        service_name: service.name,
        quantity: 1,
        unit: service.unit,
        unit_price: Number(service.base_price),
        line_total: Number(service.base_price),
      }])

      // Create the job
      const { error: jobError } = await supabase
        .from('jobs')
        .insert({
          job_number: jobNumber,
          customer_id: template.customer_id,
          scheduled_date: template.next_job_date,
          scheduled_time: template.preferred_time || null,
          assigned_user_id: template.assigned_user_id || null,
          vehicle_id: template.vehicle_id || null,
          address,
          services,
          status: 'scheduled',
          internal_notes: template.notes || null,
          recurring_template_id: template.id,
          created_by: template.assigned_user_id || null,
        })

      if (jobError) {
        console.error(`[Recurring Jobs] Failed to create job for template ${template.id}:`, jobError)
        errors++
        continue
      }

      // Update template: set last_job_date and calculate next_job_date
      const nextDate = calculateNextDate(template.frequency, template.next_job_date)

      await supabase
        .from('recurring_templates')
        .update({
          last_job_date: template.next_job_date,
          next_job_date: nextDate,
          updated_at: new Date().toISOString(),
        })
        .eq('id', template.id)

      generated++
    } catch (err) {
      console.error(`[Recurring Jobs] Error processing template ${template.id}:`, err)
      errors++
    }
  }

  // Notify admins
  if (generated > 0) {
    await notifyAdmins(
      supabase,
      'system',
      `${generated} gentagne job${generated !== 1 ? 's' : ''} oprettet`,
      `Automatisk oprettet fra faste aftaler`,
      '/jobs'
    )
  }

  return { generated, errors }
}
