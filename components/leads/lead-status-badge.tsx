import { Badge } from '@/components/ui/badge'
import type { LeadStatus } from '@/lib/types'

const statusConfig: Record<LeadStatus, { label: string; className: string }> = {
  new: { label: 'Ny', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  contacted: { label: 'Kontaktet', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  quote_sent: { label: 'Tilbud sendt', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  won: { label: 'Vundet', className: 'bg-green-600 text-white dark:bg-green-700' },
  lost: { label: 'Tabt', className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400' },
  duplicate: { label: 'Duplikat', className: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500' },
}

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  const config = statusConfig[status] || statusConfig.new
  return (
    <Badge className={config.className}>
      {config.label}
    </Badge>
  )
}
