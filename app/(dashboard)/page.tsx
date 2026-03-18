import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { JobStatusBadge } from '@/components/jobs/job-status-badge'
import { ClipboardList, Wrench, FileText, CreditCard, MapPin, ArrowRight, AlertTriangle } from 'lucide-react'
import { formatPriceShort, formatDate, formatTime, formatDateShort } from '@/lib/format'
import Link from 'next/link'
import type { JobStatus } from '@/lib/types'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user!.id)
    .single()

  const greeting = getGreeting()
  const name = profile?.full_name?.split(' ')[0] || 'bruger'
  const todayFormatted = getTodayFormatted()

  const today = new Date().toISOString().split('T')[0]

  // Next 3 days
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const day2 = new Date()
  day2.setDate(day2.getDate() + 2)
  const day3 = new Date()
  day3.setDate(day3.getDate() + 3)
  const nextDates = [tomorrow, day2, day3].map((d) => d.toISOString().split('T')[0])

  // Fetch live stats in parallel
  const [
    { count: newLeadsCount },
    { count: pendingQuotesCount },
    { data: todaysJobs },
    { data: upcomingJobs },
  ] = await Promise.all([
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'new'),
    supabase.from('quotes').select('*', { count: 'exact', head: true }).eq('status', 'sent'),
    supabase
      .from('jobs')
      .select('*, customer:customers(full_name)')
      .eq('scheduled_date', today)
      .order('scheduled_time', { ascending: true }),
    supabase
      .from('jobs')
      .select('*, customer:customers(full_name)')
      .in('scheduled_date', nextDates)
      .order('scheduled_date', { ascending: true })
      .order('scheduled_time', { ascending: true }),
  ])

  // Calculate unpaid total from invoiced jobs
  const { data: unpaidJobsList } = await supabase
    .from('jobs')
    .select('services, invoice_sent_at')
    .or('status.eq.invoiced,status.eq.completed')
    .is('paid_at', null)

  let unpaidTotal = 0
  let overdueCount = 0
  const now = Date.now()
  if (unpaidJobsList) {
    for (const j of unpaidJobsList) {
      const services = typeof j.services === 'string' ? JSON.parse(j.services) : j.services
      if (Array.isArray(services)) {
        unpaidTotal += services.reduce((sum: number, s: { line_total: number }) => sum + (s.line_total || 0), 0)
      }
      if (j.invoice_sent_at) {
        const days = Math.floor((now - new Date(j.invoice_sent_at).getTime()) / (1000 * 60 * 60 * 24))
        if (days > 14) overdueCount++
      }
    }
  }

  // Group upcoming by date
  const upcomingByDate: Record<string, typeof todaysJobs> = {}
  if (upcomingJobs) {
    for (const job of upcomingJobs) {
      if (!upcomingByDate[job.scheduled_date]) upcomingByDate[job.scheduled_date] = []
      upcomingByDate[job.scheduled_date]!.push(job)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with greeting */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          {greeting}, {name} 👋
        </h2>
        <p className="text-muted-foreground">{todayFormatted}</p>
      </div>

      {/* Alert badges */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
        <Link href="/leads?status=new">
          <Card className="cursor-pointer hover:ring-2 hover:ring-red-200 transition-all border-red-200 bg-red-50/50">
            <CardContent className="flex items-center gap-3 p-4">
              <span className="text-2xl">🔴</span>
              <div>
                <p className="text-2xl font-bold">{newLeadsCount || 0}</p>
                <p className="text-sm text-muted-foreground">nye leads</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/quotes?status=sent">
          <Card className="cursor-pointer hover:ring-2 hover:ring-yellow-200 transition-all border-yellow-200 bg-yellow-50/50">
            <CardContent className="flex items-center gap-3 p-4">
              <span className="text-2xl">🟡</span>
              <div>
                <p className="text-2xl font-bold">{pendingQuotesCount || 0}</p>
                <p className="text-sm text-muted-foreground">tilbud udestående</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/jobs?status=invoiced">
          <Card className="cursor-pointer hover:ring-2 hover:ring-green-200 transition-all border-green-200 bg-green-50/50">
            <CardContent className="flex items-center gap-3 p-4">
              <span className="text-2xl">💰</span>
              <div>
                <p className="text-2xl font-bold">{formatPriceShort(unpaidTotal)}</p>
                <p className="text-sm text-muted-foreground">ubetalt</p>
                {overdueCount > 0 && (
                  <p className="text-xs text-amber-600 font-medium flex items-center gap-1 mt-0.5">
                    <AlertTriangle className="h-3 w-3" />
                    {overdueCount} forfalden{overdueCount !== 1 ? 'e' : ''}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Today's jobs */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Dagens jobs ({todaysJobs?.length || 0})</CardTitle>
          <Link href="/jobs">
            <Button variant="ghost" size="sm" className="gap-1 text-green-600">
              Se alle
              <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {!todaysJobs || todaysJobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ingen jobs planlagt i dag</p>
          ) : (
            <div className="space-y-3">
              {todaysJobs.map((job) => (
                <div key={job.id} className="flex items-center justify-between rounded-lg border p-3 gap-2">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {job.scheduled_time && (
                        <span className="text-sm font-bold tabular-nums">{formatTime(job.scheduled_time)}</span>
                      )}
                      <span className="text-sm font-medium truncate">
                        {(job.customer as { full_name: string } | null)?.full_name || 'Ukendt kunde'}
                      </span>
                      <JobStatusBadge status={job.status as JobStatus} />
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">{job.address}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(job.address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="outline" size="sm" className="gap-1 min-h-[44px]">
                        <MapPin className="h-3 w-3" />
                        <span className="hidden sm:inline">Navigation</span>
                      </Button>
                    </a>
                    <Link href={`/jobs/${job.id}`}>
                      <Button variant="outline" size="sm" className="min-h-[44px]">
                        Åbn job
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Coming up - next 3 days */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Kommende dage</CardTitle>
        </CardHeader>
        <CardContent>
          {Object.keys(upcomingByDate).length === 0 ? (
            <p className="text-sm text-muted-foreground">Ingen jobs de næste 3 dage</p>
          ) : (
            <div className="space-y-4">
              {nextDates.map((dateStr) => {
                const dayJobs = upcomingByDate[dateStr]
                if (!dayJobs || dayJobs.length === 0) return null
                return (
                  <div key={dateStr}>
                    <h4 className="text-sm font-semibold text-muted-foreground mb-2">
                      {formatDateShort(dateStr)} — {dayJobs.length} job{dayJobs.length !== 1 ? 's' : ''}
                    </h4>
                    <div className="space-y-1">
                      {dayJobs.map((job) => (
                        <Link key={job.id} href={`/jobs/${job.id}`}>
                          <div className="flex items-center justify-between rounded-lg border p-2 hover:bg-muted/50 transition-colors">
                            <div className="flex items-center gap-2 text-sm min-w-0">
                              {job.scheduled_time && (
                                <span className="font-medium tabular-nums">{formatTime(job.scheduled_time)}</span>
                              )}
                              <span className="truncate">
                                {(job.customer as { full_name: string } | null)?.full_name || 'Ukendt'}
                              </span>
                            </div>
                            <JobStatusBadge status={job.status as JobStatus} />
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'God morgen'
  if (hour < 18) return 'God eftermiddag'
  return 'God aften'
}

function getTodayFormatted(): string {
  const DANISH_DAYS = ['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag']
  const DANISH_MONTHS = [
    'januar', 'februar', 'marts', 'april', 'maj', 'juni',
    'juli', 'august', 'september', 'oktober', 'november', 'december',
  ]
  const d = new Date()
  return `${DANISH_DAYS[d.getDay()]} ${d.getDate()}. ${DANISH_MONTHS[d.getMonth()]}`
}
