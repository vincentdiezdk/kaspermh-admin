import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LeadStatusBadge } from '@/components/leads/lead-status-badge'
import { LeadSourceBadge } from '@/components/leads/lead-source-badge'
import { LeadStatusSelect } from '@/components/leads/lead-status-select'
import { LeadNotesForm } from '@/components/leads/lead-notes-form'
import { LeadActions } from '@/components/leads/lead-actions'
import { formatDate, formatPriceShort, formatPhone } from '@/lib/format'
import { ArrowLeft, User, Phone, Mail, MapPin } from 'lucide-react'
import Link from 'next/link'
import type { Lead, LeadStatus } from '@/lib/types'

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: lead, error } = await supabase
    .from('leads')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !lead) notFound()

  const typedLead = lead as Lead

  return (
    <div className="space-y-6 max-w-2xl">
      <Link
        href="/leads"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Tilbage til leads
      </Link>

      {/* Customer info */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <User className="h-5 w-5 text-green-600" />
                {lead.full_name}
              </h2>
              <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <a href={`tel:${lead.phone}`} className="text-green-600 hover:underline">
                    {formatPhone(lead.phone)}
                  </a>
                </div>
                {lead.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <a href={`mailto:${lead.email}`} className="hover:underline">
                      {lead.email}
                    </a>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>
                    {lead.address}
                    {lead.city && `, ${lead.zip_code} ${lead.city}`}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <LeadSourceBadge source={lead.source} />
              <LeadStatusBadge status={lead.status as LeadStatus} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Service details */}
      <Card>
        <CardContent className="pt-6 space-y-2">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Service:</span>
              <p className="font-medium">{lead.service_type || '–'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Areal:</span>
              <p className="font-medium">{lead.estimated_area ? `~${lead.estimated_area} m²` : '–'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Est. pris:</span>
              <p className="font-medium">{formatPriceShort(lead.calculated_price)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Oprettet:</span>
              <p className="font-medium">{formatDate(lead.created_at)}</p>
            </div>
          </div>
          {lead.message && (
            <div className="pt-2 border-t">
              <span className="text-sm text-muted-foreground">Besked:</span>
              <p className="text-sm mt-1 whitespace-pre-wrap">{lead.message}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status & Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <LeadStatusSelect leadId={lead.id} currentStatus={lead.status as LeadStatus} />

          <div className="border-t pt-4">
            <h3 className="text-sm font-medium mb-2">Interne noter</h3>
            <LeadNotesForm leadId={lead.id} currentNotes={lead.notes} />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Handlinger</CardTitle>
        </CardHeader>
        <CardContent>
          <LeadActions lead={typedLead} />
          {lead.converted_customer_id && (
            <p className="mt-3 text-sm text-muted-foreground">
              Konverteret til kunde:{' '}
              <Link href={`/customers/${lead.converted_customer_id}`} className="text-green-600 hover:underline">
                Se kunde
              </Link>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
