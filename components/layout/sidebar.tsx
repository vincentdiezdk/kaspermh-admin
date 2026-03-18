'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  FileText,
  Wrench,
  Map,
  BarChart3,
  Settings,
  Leaf,
  ChevronDown,
  LogOut,
  Briefcase,
  Car,
  UserCog,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const mainNavItems = [
  { title: 'Dashboard', href: '/', icon: LayoutDashboard },
  { title: 'Leads', href: '/leads', icon: ClipboardList },
  { title: 'Kunder', href: '/customers', icon: Users },
  { title: 'Tilbud', href: '/quotes', icon: FileText },
  { title: 'Jobs', href: '/jobs', icon: Wrench },
  { title: 'Køreplan', href: '/route-planner', icon: Map },
  { title: 'Rapporter', href: '/reports', icon: BarChart3 },
]

const settingsSubItems = [
  { title: 'Services', href: '/settings/services', icon: Briefcase },
  { title: 'Køretøjer', href: '/settings/vehicles', icon: Car },
  { title: 'Team', href: '/settings/team', icon: UserCog },
]

interface AppSidebarProps {
  user?: { full_name: string; email: string } | null
}

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const initials = user?.full_name
    ? user.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '??'

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-600">
            <Leaf className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight">
            KasperMH
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    render={<Link href={item.href} />}
                    isActive={isActive(item.href)}
                    className={cn(
                      isActive(item.href) &&
                        'bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800'
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              <Collapsible defaultOpen={pathname.startsWith('/settings')}>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    render={<CollapsibleTrigger />}
                    className={cn(
                      isActive('/settings') &&
                        'bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800'
                    )}
                  >
                    <Settings className="h-4 w-4" />
                    <span>Indstillinger</span>
                    <ChevronDown className="ml-auto h-4 w-4 transition-transform data-[panel-open]:rotate-180" />
                  </SidebarMenuButton>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {settingsSubItems.map((item) => (
                        <SidebarMenuSubItem key={item.href}>
                          <SidebarMenuSubButton
                            render={<Link href={item.href} />}
                            isActive={isActive(item.href)}
                            className={cn(
                              isActive(item.href) &&
                                'bg-green-50 text-green-700'
                            )}
                          >
                            <item.icon className="h-4 w-4" />
                            <span>{item.title}</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-green-100 text-green-700 text-sm font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {user?.full_name || 'Bruger'}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {user?.email || ''}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-gray-100 transition-colors"
            title="Log ud"
          >
            <LogOut className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
