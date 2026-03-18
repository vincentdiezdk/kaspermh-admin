'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Search } from 'lucide-react'
import { GlobalSearch } from '@/components/global-search'
import { NotificationBell } from '@/components/notification-bell'

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

export function Header({ userId }: { userId: string }) {
  const pathname = usePathname()
  const title = routeTitles[pathname] || 'KasperMH Admin'
  const [searchOpen, setSearchOpen] = useState(false)

  return (
    <>
      <header className="flex h-14 items-center gap-3 border-b bg-white px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="h-5" />
        <h1 className="text-lg font-semibold">{title}</h1>

        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 md:h-8 md:w-8"
            onClick={() => setSearchOpen(true)}
            aria-label="Søg (Ctrl+K)"
          >
            <Search className="size-5 md:size-4" />
          </Button>
          <NotificationBell userId={userId} />
        </div>
      </header>

      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  )
}
