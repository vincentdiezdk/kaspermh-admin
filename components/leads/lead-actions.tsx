'use client'

import { convertLeadToCustomer, updateLeadStatus } from '@/lib/actions/leads'
import { Button } from '@/components/ui/button'
import { FileText, UserPlus, Phone, X } from 'lucide-react'
import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { Lead } from '@/lib/types'

export function LeadActions({ lead }: { lead: Lead }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleConvert() {
    if (!confirm('Konverter denne lead til en kunde?')) return
    startTransition(async () => {
      await convertLeadToCustomer(lead.id)
    })
  }

  function handleMarkLost() {
    if (!confirm('Marker denne lead som tabt?')) return
    startTransition(async () => {
      await updateLeadStatus(lead.id, 'lost')
    })
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      <Button
        variant="outline"
        className="gap-2"
        onClick={() => router.push(`/quotes/new?leadId=${lead.id}`)}
        disabled={isPending}
      >
        <FileText className="h-4 w-4" />
        Opret tilbud
      </Button>
      <Button
        variant="outline"
        className="gap-2"
        onClick={handleConvert}
        disabled={isPending || !!lead.converted_customer_id}
      >
        <UserPlus className="h-4 w-4" />
        Konverter til kunde
      </Button>
      <Button variant="outline" className="gap-2" render={<a href={`tel:${lead.phone}`} />}>
        <Phone className="h-4 w-4" />
        Ring nu
      </Button>
      <Button
        variant="destructive"
        className="gap-2"
        onClick={handleMarkLost}
        disabled={isPending || lead.status === 'lost'}
      >
        <X className="h-4 w-4" />
        Marker som tabt
      </Button>
    </div>
  )
}
