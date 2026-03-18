import { createClient } from '@/lib/supabase/server'
import { QuoteWizard } from '@/components/quotes/quote-wizard'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default async function NewQuotePage({
  searchParams,
}: {
  searchParams: Promise<{ leadId?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  // Get all customers for search
  const { data: customers } = await supabase
    .from('customers')
    .select('id, full_name, email, phone, address, city, zip_code')
    .order('full_name')

  // Get active services
  const { data: services } = await supabase
    .from('services')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')

  // If coming from a lead, pre-fill data
  let leadData = null
  if (params.leadId) {
    const { data: lead } = await supabase
      .from('leads')
      .select('*')
      .eq('id', params.leadId)
      .single()

    if (lead) {
      leadData = lead
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <Link
        href="/quotes"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Tilbage til tilbud
      </Link>

      <div>
        <h2 className="text-2xl font-bold tracking-tight">Nyt tilbud</h2>
        <p className="text-muted-foreground">Opret et nyt tilbud til en kunde</p>
      </div>

      <QuoteWizard
        customers={customers || []}
        services={services || []}
        leadData={leadData}
      />
    </div>
  )
}
