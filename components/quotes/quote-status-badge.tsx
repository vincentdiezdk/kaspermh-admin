import { Badge } from '@/components/ui/badge'
import type { QuoteStatus } from '@/lib/types'

const statusConfig: Record<QuoteStatus, { label: string; className: string }> = {
  draft: { label: 'Kladde', className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400' },
  sent: { label: 'Sendt', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  accepted: { label: 'Accepteret', className: 'bg-green-600 text-white dark:bg-green-700' },
  declined: { label: 'Afvist', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  expired: { label: 'Udløbet', className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
}

export function QuoteStatusBadge({ status }: { status: QuoteStatus }) {
  const config = statusConfig[status] || statusConfig.draft
  return (
    <Badge className={config.className}>
      {config.label}
    </Badge>
  )
}
