export type LeadStatus = 'new' | 'contacted' | 'quote_sent' | 'won' | 'lost' | 'duplicate'
export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'declined' | 'expired'
export type JobStatus = 'scheduled' | 'en_route' | 'arrived' | 'in_progress' | 'completed' | 'invoiced' | 'cancelled'
export type CustomerSource = 'website' | 'phone' | 'referral' | 'manual'
export type ServiceUnit = 'm2' | 'stk' | 'time' | 'fast_pris'

export interface Lead {
  id: string
  full_name: string
  email: string | null
  phone: string
  address: string
  city: string | null
  zip_code: string | null
  service_type: string | null
  estimated_area: number | null
  message: string | null
  calculated_price: number | null
  status: LeadStatus
  assigned_to: string | null
  converted_customer_id: string | null
  source: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Customer {
  id: string
  full_name: string
  email: string | null
  phone: string
  address: string
  city: string
  zip_code: string
  notes: string | null
  source: CustomerSource | null
  created_at: string
  updated_at: string
}

export interface Service {
  id: string
  name: string
  description: string | null
  unit: ServiceUnit
  base_price: number
  min_price: number | null
  is_active: boolean
  sort_order: number
}

export interface QuoteLineItem {
  service_id: string
  service_name: string
  quantity: number
  unit: ServiceUnit
  unit_price: number
  line_total: number
}

export interface Quote {
  id: string
  quote_number: string
  customer_id: string
  lead_id: string | null
  line_items: QuoteLineItem[]
  subtotal: number
  vat_amount: number
  total_incl_vat: number
  notes: string | null
  valid_until: string | null
  status: QuoteStatus
  sent_at: string | null
  accepted_at: string | null
  declined_at: string | null
  accept_token: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  customer?: Customer
}

export interface Job {
  id: string
  job_number: string
  customer_id: string
  quote_id: string | null
  scheduled_date: string
  scheduled_time: string | null
  estimated_duration: number | null
  assigned_user_id: string | null
  vehicle_id: string | null
  status: JobStatus
  address: string
  services: QuoteLineItem[]
  internal_notes: string | null
  customer_notes: string | null
  created_at: string
  customer?: Customer
}
