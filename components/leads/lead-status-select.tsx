'use client'

import { updateLeadStatus } from '@/lib/actions/leads'
import type { LeadStatus } from '@/lib/types'
import { useTransition } from 'react'

const statuses: { value: LeadStatus; label: string }[] = [
  { value: 'new', label: 'Ny' },
  { value: 'contacted', label: 'Kontaktet' },
  { value: 'quote_sent', label: 'Tilbud sendt' },
  { value: 'won', label: 'Vundet' },
  { value: 'lost', label: 'Tabt' },
  { value: 'duplicate', label: 'Duplikat' },
]

export function LeadStatusSelect({ leadId, currentStatus }: { leadId: string; currentStatus: LeadStatus }) {
  const [isPending, startTransition] = useTransition()

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    startTransition(async () => {
      await updateLeadStatus(leadId, e.target.value)
    })
  }

  return (
    <select
      defaultValue={currentStatus}
      onChange={handleChange}
      disabled={isPending}
      className="h-9 rounded-lg border border-input bg-background px-3 py-1 text-sm focus:border-ring focus:ring-2 focus:ring-ring/50 disabled:opacity-50"
    >
      {statuses.map((s) => (
        <option key={s.value} value={s.value}>
          {s.label}
        </option>
      ))}
    </select>
  )
}
