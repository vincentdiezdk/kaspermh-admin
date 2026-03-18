'use client'

import { updateLeadNotes } from '@/lib/actions/leads'
import { Button } from '@/components/ui/button'
import { useTransition } from 'react'

export function LeadNotesForm({ leadId, currentNotes }: { leadId: string; currentNotes: string | null }) {
  const [isPending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await updateLeadNotes(leadId, formData.get('notes') as string)
    })
  }

  return (
    <form action={handleSubmit}>
      <textarea
        name="notes"
        defaultValue={currentNotes || ''}
        placeholder="Tilføj interne noter..."
        rows={4}
        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-ring focus:ring-2 focus:ring-ring/50"
      />
      <Button type="submit" disabled={isPending} className="mt-2 bg-green-600 hover:bg-green-700 text-white">
        {isPending ? 'Gemmer...' : 'Gem noter'}
      </Button>
    </form>
  )
}
