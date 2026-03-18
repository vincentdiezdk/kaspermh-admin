'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface Notification {
  id: string
  type: string
  title: string
  message: string
  href: string | null
  read: boolean
  created_at: string
}

export function useNotifications(userId: string | null) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  // Fetch initial notifications
  useEffect(() => {
    if (!userId) return

    const supabase = createClient()

    async function fetch() {
      const { data } = await supabase
        .from('notifications')
        .select('id, type, title, message, href, read, created_at')
        .eq('user_id', userId)
        .eq('dismissed', false)
        .order('created_at', { ascending: false })
        .limit(20)

      if (data) {
        setNotifications(data)
        setUnreadCount(data.filter(n => !n.read).length)
      }
    }

    fetch()
  }, [userId])

  // Subscribe to realtime INSERT events
  useEffect(() => {
    if (!userId) return

    const supabase = createClient()

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotif = payload.new as Notification
          setNotifications(prev => [newNotif, ...prev].slice(0, 20))
          setUnreadCount(prev => prev + 1)

          // Browser notification
          if (typeof window !== 'undefined' && Notification.permission === 'granted') {
            new Notification(newNotif.title, { body: newNotif.message })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  const markAsRead = useCallback(async (id: string) => {
    const supabase = createClient()
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id)

    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    )
    setUnreadCount(prev => Math.max(0, prev - 1))
  }, [])

  const markAllAsRead = useCallback(async () => {
    if (!userId) return
    const supabase = createClient()
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false)

    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
  }, [userId])

  const dismissAll = useCallback(async () => {
    if (!userId) return
    const supabase = createClient()
    await supabase
      .from('notifications')
      .update({ dismissed: true })
      .eq('user_id', userId)

    setNotifications([])
    setUnreadCount(0)
  }, [userId])

  return { notifications, unreadCount, markAsRead, markAllAsRead, dismissAll }
}
