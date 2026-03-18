'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { sendPortalLink } from '@/lib/actions/portal'
import { Loader2 } from 'lucide-react'

export function SendPortalLinkButton({
  customerId,
  hasEmail,
}: {
  customerId: string
  hasEmail: boolean
}) {
  const [loading, setLoading] = useState(false)

  const handleSend = async () => {
    setLoading(true)
    try {
      await sendPortalLink(customerId)
      toast.success('Portallink sendt til kunden')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Kunne ikke sende portallink')
    } finally {
      setLoading(false)
    }
  }

  if (!hasEmail) {
    return (
      <Button variant="outline" disabled className="gap-2" title="Kunden har ingen email">
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
        Send portaladgang
      </Button>
    )
  }

  return (
    <Button
      variant="outline"
      onClick={handleSend}
      disabled={loading}
      className="gap-2"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      )}
      Send portaladgang
    </Button>
  )
}
