'use client'

import { updateQuoteStatus, duplicateQuote } from '@/lib/actions/quotes'
import { Button } from '@/components/ui/button'
import { Send, Check, X, Copy } from 'lucide-react'
import { useTransition, useState } from 'react'
import type { QuoteStatus } from '@/lib/types'

export function QuoteActions({
  quoteId,
  status,
  acceptToken,
}: {
  quoteId: string
  status: QuoteStatus
  acceptToken: string | null
}) {
  const [isPending, startTransition] = useTransition()
  const [toast, setToast] = useState<string | null>(null)

  function handleSend() {
    startTransition(async () => {
      await updateQuoteStatus(quoteId, 'sent')
      setToast('Tilbud markeret som sendt. Email-integration kommer i næste fase.')
      setTimeout(() => setToast(null), 5000)
    })
  }

  function handleAccept() {
    startTransition(async () => {
      await updateQuoteStatus(quoteId, 'accepted')
    })
  }

  function handleDecline() {
    if (!confirm('Marker tilbud som afvist?')) return
    startTransition(async () => {
      await updateQuoteStatus(quoteId, 'declined')
    })
  }

  function handleDuplicate() {
    startTransition(async () => {
      await duplicateQuote(quoteId)
    })
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        {status === 'draft' && (
          <Button
            onClick={handleSend}
            disabled={isPending}
            className="gap-2 bg-green-600 hover:bg-green-700 text-white"
          >
            <Send className="h-4 w-4" />
            Send tilbud
          </Button>
        )}
        {status === 'sent' && (
          <>
            <Button
              onClick={handleAccept}
              disabled={isPending}
              className="gap-2 bg-green-600 hover:bg-green-700 text-white"
            >
              <Check className="h-4 w-4" />
              Marker som accepteret
            </Button>
            <Button
              variant="destructive"
              onClick={handleDecline}
              disabled={isPending}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              Marker som afvist
            </Button>
          </>
        )}
        <Button
          variant="outline"
          onClick={handleDuplicate}
          disabled={isPending}
          className="gap-2"
        >
          <Copy className="h-4 w-4" />
          Dupliker
        </Button>
      </div>

      {acceptToken && status === 'sent' && (
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground mb-1">Accept-link (del manuelt):</p>
          <code className="text-xs break-all">
            {typeof window !== 'undefined' ? window.location.origin : ''}/api/accept-quote?token={acceptToken}
          </code>
        </div>
      )}

      {toast && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
          {toast}
        </div>
      )}
    </div>
  )
}
