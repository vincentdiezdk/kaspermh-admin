'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Inbox, UserPlus, FileCheck, FileX, CheckCircle, CreditCard, AlertTriangle, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet'
import { useNotifications, type Notification } from '@/hooks/use-notifications'

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  new_lead: UserPlus,
  quote_accepted: FileCheck,
  quote_rejected: FileX,
  job_completed: CheckCircle,
  payment_overdue: AlertTriangle,
  payment_received: CreditCard,
  new_employee: UserPlus,
  system: Info,
}

function relativeTime(dateStr: string): string {
  const now = Date.now()
  const date = new Date(dateStr).getTime()
  const diff = Math.floor((now - date) / 1000)

  if (diff < 60) return 'Lige nu'
  if (diff < 3600) return `${Math.floor(diff / 60)} min siden`
  if (diff < 86400) return `${Math.floor(diff / 3600)} timer siden`
  if (diff < 604800) return `${Math.floor(diff / 86400)} dage siden`
  return new Date(dateStr).toLocaleDateString('da-DK')
}

export function NotificationBell({ userId }: { userId: string }) {
  const { notifications, unreadCount, markAsRead, markAllAsRead, dismissAll } = useNotifications(userId)
  const [open, setOpen] = useState(false)
  const router = useRouter()

  // Request browser notification permission
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      // Small delay to not be intrusive on first load
      const timer = setTimeout(() => {
        Notification.requestPermission()
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleClick = useCallback((notif: Notification) => {
    if (!notif.read) {
      markAsRead(notif.id)
    }
    if (notif.href) {
      router.push(notif.href)
    }
    setOpen(false)
  }, [markAsRead, router])

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="relative h-11 w-11 md:h-8 md:w-8"
        onClick={() => setOpen(true)}
        aria-label="Notifikationer"
      >
        <Bell className="size-5 md:size-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-sm">
          <SheetHeader className="border-b">
            <div className="flex items-center justify-between">
              <SheetTitle>Notifikationer</SheetTitle>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="xs"
                  className="text-green-600 hover:text-green-700"
                  onClick={markAllAsRead}
                >
                  Marker alle som læst
                </Button>
              )}
            </div>
            <SheetDescription className="sr-only">Dine seneste notifikationer</SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
                <Inbox className="size-8" />
                <p className="text-sm">Ingen notifikationer</p>
              </div>
            ) : (
              <div className="divide-y">
                {notifications.map((notif) => {
                  const Icon = TYPE_ICONS[notif.type] || Info
                  return (
                    <button
                      key={notif.id}
                      onClick={() => handleClick(notif)}
                      className={`flex w-full items-start gap-3 p-3 text-left transition-colors hover:bg-muted/50 ${
                        !notif.read ? 'bg-green-50' : ''
                      }`}
                    >
                      <div className={`mt-0.5 rounded-full p-1.5 ${!notif.read ? 'bg-green-100 text-green-600' : 'bg-muted text-muted-foreground'}`}>
                        <Icon className="size-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${!notif.read ? 'font-semibold' : 'font-medium'}`}>
                          {notif.title}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {notif.message}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground/70">
                          {relativeTime(notif.created_at)}
                        </p>
                      </div>
                      {!notif.read && (
                        <div className="mt-2 h-2 w-2 rounded-full bg-green-500 shrink-0" />
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {notifications.length > 0 && (
            <SheetFooter className="border-t">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={dismissAll}
              >
                Ryd alle
              </Button>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
