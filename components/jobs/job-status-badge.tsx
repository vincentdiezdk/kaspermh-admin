import { Badge } from '@/components/ui/badge'
import type { JobStatus } from '@/lib/types'

const statusConfig: Record<JobStatus, { label: string; className: string }> = {
  scheduled: { label: 'Planlagt', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  en_route: { label: 'Undervejs', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  arrived: { label: 'Ankommet', className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  in_progress: { label: 'I gang', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  completed: { label: 'Afsluttet', className: 'bg-green-600 text-white dark:bg-green-700' },
  invoiced: { label: 'Faktureret', className: 'border-green-600 text-green-700 bg-transparent border dark:border-green-500 dark:text-green-400' },
  cancelled: { label: 'Annulleret', className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400' },
}

export function JobStatusBadge({ status }: { status: JobStatus }) {
  const config = statusConfig[status] || statusConfig.scheduled
  return (
    <Badge className={config.className}>
      {config.label}
    </Badge>
  )
}
