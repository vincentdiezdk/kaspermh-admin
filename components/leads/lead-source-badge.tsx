import { Badge } from '@/components/ui/badge'

const sourceConfig: Record<string, { label: string; className: string }> = {
  hjemmeside: { label: 'Hjemmeside', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  prisberegner: { label: 'Prisberegner', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  website: { label: 'Hjemmeside', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  kontaktformular: { label: 'Kontaktformular', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  exit_intent: { label: 'Exit-popup', className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  manual: { label: 'Manuel', className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
}

export function LeadSourceBadge({ source }: { source: string | null }) {
  if (!source) return null
  const config = sourceConfig[source] || sourceConfig.manual
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  )
}
