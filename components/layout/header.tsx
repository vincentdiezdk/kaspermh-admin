'use client'

import { usePathname } from 'next/navigation'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'

const routeTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/leads': 'Leads',
  '/customers': 'Kunder',
  '/quotes': 'Tilbud',
  '/jobs': 'Jobs',
  '/route-planner': 'Køreplan',
  '/reports': 'Rapporter',
  '/settings': 'Indstillinger',
  '/settings/services': 'Services',
  '/settings/vehicles': 'Køretøjer',
  '/settings/team': 'Team',
}

export function Header() {
  const pathname = usePathname()
  const title = routeTitles[pathname] || 'KasperMH Admin'

  return (
    <header className="flex h-14 items-center gap-3 border-b bg-white px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="h-5" />
      <h1 className="text-lg font-semibold">{title}</h1>
    </header>
  )
}
