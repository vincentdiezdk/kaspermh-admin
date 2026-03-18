'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface SmsPreferences {
  job_confirmation: boolean
  en_route: boolean
  job_completed: boolean
  invoice_sent: boolean
  quote_sent: boolean
  payment_reminder: boolean
  job_reminder: boolean
}

export interface CompanySettings {
  id: string
  company_name: string
  address: string
  postal_code: string
  city: string
  cvr: string
  phone: string
  email: string
  logo_url: string
  mobilepay_number: string
  bank_reg: string
  bank_account: string
  default_quote_validity_days: number
  default_quote_notes: string
  invoice_reminder_days: number
  invoice_due_days: number
  sms_preferences: SmsPreferences
  updated_at: string
}

export async function getCompanySettings(): Promise<CompanySettings | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('company_settings')
    .select('*')
    .limit(1)
    .single()

  if (error) return null
  return data as CompanySettings
}

export async function getSmsStatus(): Promise<{ configured: boolean; senderId: string }> {
  const configured = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN)
  const senderId = process.env.TWILIO_SENDER_ID || 'KasperMH'
  return { configured, senderId }
}

export async function updateCompanySettings(settings: Partial<Omit<CompanySettings, 'id' | 'updated_at'>>) {
  const supabase = await createClient()

  // Get existing row
  const { data: existing } = await supabase
    .from('company_settings')
    .select('id')
    .limit(1)
    .single()

  if (!existing) {
    throw new Error('Ingen firmaindstillinger fundet')
  }

  const { error } = await supabase
    .from('company_settings')
    .update({ ...settings, updated_at: new Date().toISOString() })
    .eq('id', existing.id)

  if (error) throw new Error(error.message)
  revalidatePath('/settings/company')
  revalidatePath('/jobs')
}

export async function uploadCompanyLogo(formData: FormData) {
  const supabase = await createClient()
  const file = formData.get('file') as File

  if (!file) throw new Error('Ingen fil valgt')

  const ext = file.name.split('.').pop()
  const fileName = `logo-${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('company-assets')
    .upload(fileName, file, { upsert: true })

  if (uploadError) throw new Error(uploadError.message)

  const { data: { publicUrl } } = supabase.storage
    .from('company-assets')
    .getPublicUrl(fileName)

  // Update company settings with new logo URL
  const { data: existing } = await supabase
    .from('company_settings')
    .select('id')
    .limit(1)
    .single()

  if (existing) {
    await supabase
      .from('company_settings')
      .update({ logo_url: publicUrl, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
  }

  revalidatePath('/settings/company')
  return publicUrl
}
